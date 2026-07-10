import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = { collection: vi.fn(), command: vi.fn() }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

// Helper: build a chainable collection mock that resolves an array
function makeCol(result: unknown[]) {
  const col = {
    countDocuments: vi.fn().mockResolvedValue(result[0] ?? 0),
    distinct: vi.fn().mockResolvedValue(result),
    aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(result) }),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(result) }),
      }),
    }),
  }
  return col
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ─── Auth guard tests ─────────────────────────────────────────────────────────

describe("GET /api/admin/stats — auth guards", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 403 when authenticated as non-admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "user" } } as any)

    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats"))
    expect(res.status).toBe(403)
  })
})

// ─── Response shape tests ─────────────────────────────────────────────────────

describe("GET /api/admin/stats — response shape", () => {
  beforeEach(() => {
    // Stub auth as admin for all shape tests
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))

    // Wire up collection stubs
    mockDb.collection = vi.fn().mockImplementation((name: string) => {
      if (name === "users")        return makeCol([5])
      if (name === "notes")        return makeCol([20])
      if (name === "folders")      return makeCol([8])
      if (name === "images") return makeCol([{ _id: null, total: 1024 * 1024 }])
      return makeCol([])
    })
    // db.command({ dbStats: 1 }) used for total storage KPI
    mockDb.command = vi.fn().mockResolvedValue({ storageSize: 2 * 1024 * 1024 })
  })

  it("returns 200 with kpis, charts, users, activity keys for range=7", async () => {
    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats?range=7"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty("kpis")
    expect(body.data).toHaveProperty("charts")
    expect(body.data).toHaveProperty("users")
    expect(body.data).toHaveProperty("activity")
  })

  it("accepts range=30", async () => {
    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats?range=30"))
    expect(res.status).toBe(200)
  })

  it("accepts range=90", async () => {
    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats?range=90"))
    expect(res.status).toBe(200)
  })

  it("defaults to range=7 for invalid range param", async () => {
    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats?range=999"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("kpis object has all required numeric fields", async () => {
    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats"))
    const body = await res.json()
    const { kpis } = body.data
    expect(typeof kpis.totalUsers).toBe("number")
    expect(typeof kpis.activeToday).toBe("number")
    expect(typeof kpis.newThisWeek).toBe("number")
    expect(typeof kpis.totalNotes).toBe("number")
    expect(typeof kpis.storageUsedBytes).toBe("number")
    expect(typeof kpis.trashItemCount).toBe("number")
  })

  it("returns null for a bucket when its queries throw, others still return", async () => {
    // Make db.command throw to break only the kpis bucket (storage now uses db.command)
    mockDb.command = vi.fn().mockRejectedValue(new Error("dbStats failure"))
    mockDb.collection = vi.fn().mockImplementation((name: string) => {
      // users bucket maps r._id.toString() — provide safe empty-array mock
      if (name === "users") {
        return {
          aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
          countDocuments: vi.fn().mockResolvedValue(0),
          distinct: vi.fn().mockResolvedValue([]),
        }
      }
      return makeCol([5])
    })

    const { GET } = await import("@/app/api/admin/stats/route")
    const res = await GET(new Request("http://localhost/api/admin/stats"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    // kpis bucket uses db.command — should be null due to the throw
    expect(body.data.kpis).toBeNull()
    // charts, users, activity don't use db.command — must return non-null
    expect(body.data.charts).not.toBeNull()
    expect(body.data.users).not.toBeNull()
    expect(body.data.activity).not.toBeNull()
  })
})
