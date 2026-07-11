import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = { collection: vi.fn() }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/backup", () => ({
  createBackup: vi.fn(),
  listBackups: vi.fn(),
  deleteBackup: vi.fn(),
  restoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe("GET /api/admin/backup — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/backup/route")
    const res = await GET(new Request("http://localhost/api/admin/backup"))
    expect(res.status).toBe(401)
  })
})

describe("GET /api/admin/backup — response", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("returns list of backups", async () => {
    const { listBackups } = await import("@/lib/backup")
    vi.mocked(listBackups).mockResolvedValue([
      { filename: "backup-1.gz", size: 1000, storageKey: "backups/backup-1.gz", status: "completed", createdAt: new Date(), notes: "" },
    ])

    const { GET } = await import("@/app/api/admin/backup/route")
    const res = await GET(new Request("http://localhost/api/admin/backup"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})

describe("POST /api/admin/backup — create", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("triggers a new backup", async () => {
    const { createBackup } = await import("@/lib/backup")
    vi.mocked(createBackup).mockResolvedValue({
      filename: "backup-new.gz", size: 500, storageKey: "backups/backup-new.gz",
      status: "completed", createdAt: new Date(), notes: "test",
    })

    const req = new Request("http://localhost/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "test" }),
    })

    const { POST } = await import("@/app/api/admin/backup/route")
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(createBackup).toHaveBeenCalled()
  })
})
