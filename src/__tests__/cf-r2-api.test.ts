import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockDb = {
  collection: vi.fn(),
}

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe("getR2StorageMetrics", () => {
  it("returns total objects and bytes from CF API", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return { findOne: vi.fn(), insertOne: vi.fn() }
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        objects: { total: 150 },
        storage: { totalBytes: 5368709120 },
      }),
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result).toEqual({
      totalObjects: 150,
      totalBytes: 5368709120,
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/r2/buckets/"),
      expect.objectContaining({ headers: expect.any(Object) })
    )
  })

  it("returns cached metrics when cache is fresh", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue({
        metric: "storage",
        data: { totalObjects: 100, totalBytes: 1000 },
        updatedAt: new Date(),
      }),
      updateOne: vi.fn(),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return {}
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result).toEqual({ totalObjects: 100, totalBytes: 1000 })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("getR2RequestMetrics", () => {
  it("returns request counts and bandwidth", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return {}
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        requests: { get: 5000, put: 200, delete: 50 },
        bandwidth: { egress: 1073741824, ingress: 524288000 },
      }),
    })

    const { getR2RequestMetrics } = await import("@/lib/cf-r2")
    const result = await getR2RequestMetrics(30)

    expect(result).toEqual({
      requests: { get: 5000, put: 200, delete: 50 },
      bandwidth: { egress: 1073741824, ingress: 524288000 },
    })
  })
})

describe("estimateR2Cost", () => {
  it("calculates cost within free tier as $0", async () => {
    const { estimateR2Cost } = await import("@/lib/cf-r2")
    const cost = estimateR2Cost({
      totalBytes: 5 * 1024 * 1024 * 1024,
      requestsGet: 5000000,
      requestsPut: 1000000,
      egressBytes: 500 * 1024 * 1024,
    })
    expect(cost).toBe(0)
  })

  it("calculates overage costs correctly", async () => {
    const { estimateR2Cost } = await import("@/lib/cf-r2")
    const cost = estimateR2Cost({
      totalBytes: 15 * 1024 * 1024 * 1024,
      requestsGet: 15000000,
      requestsPut: 12000000,
      egressBytes: 2 * 1024 * 1024 * 1024,
    })
    expect(cost).toBeCloseTo(10.875, 2)
  })
})
