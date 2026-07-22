import { describe, it, expect, vi, beforeEach } from "vitest"

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn() }))

const mockGetImportJob = vi.fn()
vi.mock("@/lib/onenote/import-job", () => ({
  getImportJob: (...args: unknown[]) => mockGetImportJob(...args),
}))

const mockStorageSaveRaw = vi.fn()
const mockIsR2 = vi.fn()
vi.mock("@/lib/storage", () => ({
  isR2: () => mockIsR2(),
  storageSaveRaw: (...args: unknown[]) => mockStorageSaveRaw(...args),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function makeFile(name = "notebook.onepkg", sizeBytes = 1024): File {
  const buf = Buffer.alloc(sizeBytes, "x")
  return new File([buf], name, { type: "application/octet-stream" })
}

function makeRequest(opts: { jobId?: string; file?: File | null } = {}): Request {
  const url = `http://localhost/api/notes/import/onenote/upload${
    opts.jobId ? `?jobId=${opts.jobId}` : ""
  }`
  const req = new Request(url, { method: "POST" })
  // Mock formData() since jsdom cannot parse multipart bodies from binary File objects.
  if (opts.file === null) {
    // Simulate missing file field
    const emptyFd = new FormData()
    req.formData = async () => emptyFd
  } else {
    const fd = new FormData()
    fd.append("file", opts.file ?? makeFile())
    req.formData = async () => fd
  }
  return req
}

const MOCK_SESSION = { user: { id: "user-123", name: "Test" } }
const MOCK_JOB = { _id: { toHexString: () => "job-abc" }, userId: "user-123", status: "uploading", r2Key: "imports/job-abc/source.onepkg" }

// ── tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/notes/import/onenote/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsR2.mockReturnValue(false)
  })

  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest({ jobId: "job-abc" }) as any)
    expect(res.status).toBe(401)
  })

  it("returns 400 when STORAGE_PROVIDER=r2", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    mockIsR2.mockReturnValue(true)

    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest({ jobId: "job-abc" }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/STORAGE_PROVIDER=r2/)
  })

  it("returns 400 when jobId query param is missing", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)

    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest() as any) // no jobId
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/jobId/)
  })

  it("returns 404 when job is not found", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)
    mockGetImportJob.mockResolvedValue(null)

    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest({ jobId: "bad-id" }) as any)
    expect(res.status).toBe(404)
  })

  it("returns 409 when job is not in uploading state", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)
    mockGetImportJob.mockResolvedValue({ ...MOCK_JOB, status: "converting" })

    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest({ jobId: "job-abc" }) as any)
    expect(res.status).toBe(409)
  })

  it("returns 400 when file exceeds 50 MB with actionable message", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)
    mockGetImportJob.mockResolvedValue(MOCK_JOB)

    const bigFile = makeFile("big.onepkg", 51 * 1024 * 1024)
    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest({ jobId: "job-abc", file: bigFile }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/50MB/)
    expect(body.error).toMatch(/STORAGE_PROVIDER=r2/)
  })

  it("returns 200 and calls storageSaveRaw on success", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)
    mockGetImportJob.mockResolvedValue(MOCK_JOB)
    mockStorageSaveRaw.mockResolvedValue(undefined)

    const file = makeFile("notebook.onepkg", 1024)
    const { POST } = await import("@/app/api/notes/import/onenote/upload/route")
    const res = await POST(makeRequest({ jobId: "job-abc", file }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockStorageSaveRaw).toHaveBeenCalledWith(
      MOCK_JOB.r2Key,
      expect.any(Buffer),
      "application/octet-stream"
    )
  })
})
