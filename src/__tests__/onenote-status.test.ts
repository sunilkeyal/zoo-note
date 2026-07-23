import { describe, it, expect, vi, beforeEach } from "vitest"

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/mongodb", () => ({ connectToDatabase: vi.fn() }))

const mockGetImportJob = vi.fn()
const mockUpdateImportJob = vi.fn()
const mockClaimBatchLock = vi.fn()
const mockReleaseBatchLock = vi.fn()
vi.mock("@/lib/onenote/import-job", () => ({
  getImportJob: (...args: unknown[]) => mockGetImportJob(...args),
  updateImportJob: (...args: unknown[]) => mockUpdateImportJob(...args),
  claimBatchLock: (...args: unknown[]) => mockClaimBatchLock(...args),
  releaseBatchLock: (...args: unknown[]) => mockReleaseBatchLock(...args),
}))

const mockProcessPagesBatch = vi.fn()
vi.mock("@/lib/onenote/import", () => ({
  processPagesBatch: (...args: unknown[]) => mockProcessPagesBatch(...args),
}))

const mockCleanupImportData = vi.fn()
vi.mock("@/lib/onenote/cleanup", () => ({
  cleanupImportData: (...args: unknown[]) => mockCleanupImportData(...args),
}))

const mockDeleteByPrefix = vi.fn()
vi.mock("@/lib/storage", () => ({
  deleteByPrefix: (...args: unknown[]) => mockDeleteByPrefix(...args),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRequest(jobId?: string): Request {
  const url = `http://localhost/api/notes/import/onenote/status${jobId ? `?jobId=${jobId}` : ""}`
  const req = new Request(url, { method: "GET" })
  // The route reads `request.nextUrl` (NextRequest); provide it for the plain Request.
  Object.defineProperty(req, "nextUrl", { value: new URL(url) })
  return req
}

const MOCK_SESSION = { user: { id: "user-123" } }

function processingJob(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => "job-abc", toHexString: () => "job-abc" },
    userId: "user-123",
    r2Key: "imports/job-abc/source.onepkg",
    status: "processing",
    manifest: { htmlFiles: ["a.html", "b.html"], imageFiles: [], sections: [] },
    progress: { totalPages: 20, processedPages: 0, currentStage: "Importing..." },
    result: null,
    updatedAt: new Date(), // recent → not stale
    ...overrides,
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/notes/import/onenote/status — batch concurrency guard", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION as never)
    const { connectToDatabase } = await import("@/lib/mongodb")
    vi.mocked(connectToDatabase).mockResolvedValue({} as never)
    mockReleaseBatchLock.mockResolvedValue(undefined)
    mockUpdateImportJob.mockResolvedValue(undefined)
    mockDeleteByPrefix.mockResolvedValue(undefined)
  })

  it("processes a batch when it wins the lock claim", async () => {
    mockGetImportJob.mockResolvedValue(processingJob())
    mockClaimBatchLock.mockResolvedValue(processingJob())
    mockProcessPagesBatch.mockResolvedValue({
      pagesProcessed: 2,
      foldersCreated: 1,
      notesImported: 2,
      imagesImported: 3,
      done: false,
      errors: [],
    })

    const { GET } = await import("@/app/api/notes/import/onenote/status/route")
    const res = await GET(makeRequest("job-abc") as never)

    expect(res.status).toBe(200)
    expect(mockProcessPagesBatch).toHaveBeenCalledTimes(1)
    expect(mockReleaseBatchLock).toHaveBeenCalledTimes(1)
  })

  it("does NOT process a batch when the lock is already held (claim returns null)", async () => {
    mockGetImportJob.mockResolvedValue(processingJob())
    mockClaimBatchLock.mockResolvedValue(null) // another poll holds the lock

    const { GET } = await import("@/app/api/notes/import/onenote/status/route")
    const res = await GET(makeRequest("job-abc") as never)

    expect(res.status).toBe(200)
    expect(mockProcessPagesBatch).not.toHaveBeenCalled()
    expect(mockReleaseBatchLock).not.toHaveBeenCalled()
  })

  it("processes the batch only once across two concurrent polls", async () => {
    mockGetImportJob.mockResolvedValue(processingJob())

    // Simulate the atomic lock: only the first claim wins, subsequent claims get null.
    let held = false
    mockClaimBatchLock.mockImplementation(async () => {
      if (held) return null
      held = true
      return processingJob()
    })
    mockProcessPagesBatch.mockImplementation(async () => {
      // Simulate a batch slower than the poll interval.
      await new Promise((r) => setTimeout(r, 20))
      return { pagesProcessed: 2, foldersCreated: 1, notesImported: 2, imagesImported: 3, done: false, errors: [] }
    })

    const { GET } = await import("@/app/api/notes/import/onenote/status/route")
    const [r1, r2] = await Promise.all([
      GET(makeRequest("job-abc") as never),
      GET(makeRequest("job-abc") as never),
    ])

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(mockProcessPagesBatch).toHaveBeenCalledTimes(1)
  })

  it("releases the lock and marks failed when batch processing throws", async () => {
    mockGetImportJob.mockResolvedValue(processingJob())
    mockClaimBatchLock.mockResolvedValue(processingJob())
    mockProcessPagesBatch.mockRejectedValue(new Error("boom"))
    mockCleanupImportData.mockResolvedValue(undefined)

    const { GET } = await import("@/app/api/notes/import/onenote/status/route")
    const res = await GET(makeRequest("job-abc") as never)

    const body = await res.json()
    expect(body.status).toBe("failed")
    expect(mockReleaseBatchLock).toHaveBeenCalledWith(
      expect.anything(),
      "job-abc",
      expect.objectContaining({ status: "failed" })
    )
  })
})
