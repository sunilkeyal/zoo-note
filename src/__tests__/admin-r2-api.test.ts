import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = { collection: vi.fn() }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/cf-r2", () => ({
  getR2StorageMetrics: vi.fn(),
  getR2RequestMetrics: vi.fn(),
  getR2ObjectList: vi.fn(),
  estimateR2Cost: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.STORAGE_PROVIDER = 'r2'
  process.env.CF_API_TOKEN = 'test-cf-token'
  process.env.R2_ACCESS_KEY_ID = 'test-key'
  process.env.R2_BUCKET_NAME = 'test-bucket'
})

describe("GET /api/admin/r2 — auth guards", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/r2/route")
    const res = await GET(new Request("http://localhost/api/admin/r2"))
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "user" } } as any)

    const { GET } = await import("@/app/api/admin/r2/route")
    const res = await GET(new Request("http://localhost/api/admin/r2"))
    expect(res.status).toBe(403)
  })
})

describe("GET /api/admin/r2 — storage metric", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("returns storage metrics for metric=storage", async () => {
    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    vi.mocked(getR2StorageMetrics).mockResolvedValue({ totalObjects: 100, totalBytes: 5000 })

    const { GET } = await import("@/app/api/admin/r2/route")
    const res = await GET(new Request("http://localhost/api/admin/r2?metric=storage"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.totalObjects).toBe(100)
    expect(body.data.totalBytes).toBe(5000)
  })

  it("returns request metrics for metric=requests", async () => {
    const { getR2RequestMetrics } = await import("@/lib/cf-r2")
    vi.mocked(getR2RequestMetrics).mockResolvedValue({
      requests: { get: 5000, put: 200, delete: 50 },
      bandwidth: { egress: 1000, ingress: 500 },
    })

    const { GET } = await import("@/app/api/admin/r2/route")
    const res = await GET(new Request("http://localhost/api/admin/r2?metric=requests&range=30"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.requests.get).toBe(5000)
  })

  it("returns cost estimate for metric=cost", async () => {
    const { getR2StorageMetrics, getR2RequestMetrics, estimateR2Cost } = await import("@/lib/cf-r2")
    vi.mocked(getR2StorageMetrics).mockResolvedValue({ totalObjects: 50, totalBytes: 2000 })
    vi.mocked(getR2RequestMetrics).mockResolvedValue({
      requests: { get: 1000, put: 100, delete: 10 },
      bandwidth: { egress: 500, ingress: 200 },
    })
    vi.mocked(estimateR2Cost).mockReturnValue(0)

    const { GET } = await import("@/app/api/admin/r2/route")
    const res = await GET(new Request("http://localhost/api/admin/r2?metric=cost&range=30"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.cost).toBe(0)
  })

  it("defaults to metric=storage for invalid metric", async () => {
    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    vi.mocked(getR2StorageMetrics).mockResolvedValue({ totalObjects: 10, totalBytes: 100 })

    const { GET } = await import("@/app/api/admin/r2/route")
    const res = await GET(new Request("http://localhost/api/admin/r2?metric=invalid"))
    expect(res.status).toBe(200)
  })
})
