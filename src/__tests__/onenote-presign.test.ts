import { describe, it, expect, vi, beforeEach } from "vitest"

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn() }))

const mockGetActiveImportJob = vi.fn()
const mockCreateImportJob = vi.fn()
const mockUpdateImportJob = vi.fn()
vi.mock("@/lib/onenote/import-job", () => ({
  getActiveImportJob: (...args: unknown[]) => mockGetActiveImportJob(...args),
  createImportJob: (...args: unknown[]) => mockCreateImportJob(...args),
  updateImportJob: (...args: unknown[]) => mockUpdateImportJob(...args),
}))

const mockGetPresignedUploadUrl = vi.fn()
const mockIsR2 = vi.fn()
vi.mock("@/lib/storage", () => ({
  isR2: () => mockIsR2(),
  getPresignedUploadUrl: (...args: unknown[]) => mockGetPresignedUploadUrl(...args),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/notes/import/onenote/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const MOCK_SESSION = { user: { id: "user-123" } }
const MOCK_JOB = { _id: { toHexString: () => "job-abc" } }

// ── tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/notes/import/onenote/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveImportJob.mockResolvedValue(null)
    mockCreateImportJob.mockResolvedValue(MOCK_JOB)
    mockUpdateImportJob.mockResolvedValue(undefined)
  })

  // ── local provider (new behaviour) ─────────────────────────────────────────

  it("returns localUpload:true when STORAGE_PROVIDER=local", async () => {
    mockIsR2.mockReturnValue(false)
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    const res = await POST(makeRequest({ filename: "test.onepkg", fileSize: 1024 }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.jobId).toBe("job-abc")
    expect(body.localUpload).toBe(true)
    expect(body.uploadUrl).toBeUndefined()
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled()
  })

  it("does not call getPresignedUploadUrl for local provider", async () => {
    mockIsR2.mockReturnValue(false)
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    await POST(makeRequest({ filename: "test.one", fileSize: 512 }) as any)
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled()
  })

  // ── R2 provider (regression — behaviour must be unchanged) ─────────────────

  it("returns uploadUrl (no localUpload) when STORAGE_PROVIDER=r2", async () => {
    mockIsR2.mockReturnValue(true)
    mockGetPresignedUploadUrl.mockResolvedValue("https://r2.example.com/presigned")
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    const res = await POST(makeRequest({ filename: "test.onepkg", fileSize: 1024 }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.uploadUrl).toBe("https://r2.example.com/presigned")
    expect(body.localUpload).toBeUndefined()
  })

  // ── shared validation (both providers) ─────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockIsR2.mockReturnValue(false)
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    const res = await POST(makeRequest({ filename: "test.onepkg", fileSize: 1024 }) as any)
    expect(res.status).toBe(401)
  })

  it("returns 400 with actionable message when file exceeds 200 MB", async () => {
    mockIsR2.mockReturnValue(false)
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    const res = await POST(makeRequest({ filename: "big.onepkg", fileSize: 201 * 1024 * 1024 }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/200MB/)
    expect(body.error).toMatch(/STORAGE_PROVIDER=r2/)
  })

  it("accepts a file of exactly 200 MB", async () => {
    mockIsR2.mockReturnValue(false)
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    const res = await POST(makeRequest({ filename: "limit.onepkg", fileSize: 200 * 1024 * 1024 }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 409 when an import is already in progress", async () => {
    mockIsR2.mockReturnValue(false)
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as any)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as any)
    mockGetActiveImportJob.mockResolvedValue({ _id: "existing-job" })

    const { POST } = await import("@/app/api/notes/import/onenote/presign/route")
    const res = await POST(makeRequest({ filename: "test.onepkg", fileSize: 1024 }) as any)
    expect(res.status).toBe(409)
  })
})
