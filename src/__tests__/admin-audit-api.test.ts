import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = { collection: vi.fn() }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe("GET /api/admin/audit — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/audit/route")
    const res = await GET(new Request("http://localhost/api/admin/audit"))
    expect(res.status).toBe(401)
  })
})

describe("GET /api/admin/audit — response", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("returns paginated audit logs", async () => {
    const auditCol = {
      countDocuments: vi.fn().mockResolvedValue(25),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([
                { userId: "u1", userName: "Alice", action: "note.create", target: "Test", timestamp: new Date() },
              ]),
            }),
          }),
        }),
      }),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "audit_logs") return auditCol
      return {}
    })

    const { GET } = await import("@/app/api/admin/audit/route")
    const res = await GET(new Request("http://localhost/api/admin/audit?page=1&limit=20"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.logs).toHaveLength(1)
    expect(body.data.total).toBe(25)
  })
})
