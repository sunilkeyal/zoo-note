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
  process.env.R2_BUCKET_NAME = "zoo-note-local"
})

describe("getR2StorageMetrics", () => {
  it("returns total objects and bytes from CF GraphQL API", async () => {
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
        data: {
          viewer: {
            accounts: [{
              r2StorageAdaptiveGroups: [{
                max: {
                  objectCount: 150,
                  payloadSize: 5368709120,
                },
                dimensions: {
                  bucketName: "zoo-note-local",
                },
              }],
            }],
          },
        },
      }),
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result).toEqual({
      totalObjects: 150,
      totalBytes: 5368709120,
      buckets: [{
        name: "zoo-note-local",
        objectCount: 150,
        payloadSize: 5368709120,
        isPrimary: true,
      }],
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({ method: "POST" })
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

  it("returns zeros when no storage data exists", async () => {
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
        data: {
          viewer: {
            accounts: [{
              r2StorageAdaptiveGroups: [],
            }],
          },
        },
      }),
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result).toEqual({ totalObjects: 0, totalBytes: 0, buckets: [] })
  })
})

describe("getR2RequestMetrics", () => {
  it("returns request counts from CF GraphQL API", async () => {
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
        data: {
          viewer: {
            accounts: [{
              r2OperationsAdaptiveGroups: [
                { sum: { requests: 5000 }, dimensions: { actionType: "GetObject" } },
                { sum: { requests: 200 }, dimensions: { actionType: "PutObject" } },
                { sum: { requests: 50 }, dimensions: { actionType: "DeleteObject" } },
              ],
            }],
          },
        },
      }),
    })

    const { getR2RequestMetrics } = await import("@/lib/cf-r2")
    const result = await getR2RequestMetrics(30)

    expect(result.requests.get).toBe(5000)
    expect(result.requests.put).toBe(200)
    expect(result.requests.delete).toBe(50)
  })

  it("aggregates ListObjects and PutBucket as Class A", async () => {
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
        data: {
          viewer: {
            accounts: [{
              r2OperationsAdaptiveGroups: [
                { sum: { requests: 100 }, dimensions: { actionType: "ListObjects" } },
                { sum: { requests: 50 }, dimensions: { actionType: "PutBucket" } },
                { sum: { requests: 300 }, dimensions: { actionType: "HeadObject" } },
              ],
            }],
          },
        },
      }),
    })

    const { getR2RequestMetrics } = await import("@/lib/cf-r2")
    const result = await getR2RequestMetrics(30)

    expect(result.requests.get).toBe(300) // headObject = Class B
    expect(result.requests.put).toBe(150) // listObjects + getBucket = Class A
  })

  it("returns cached request metrics when cache is fresh", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue({
        metric: "requests_30",
        data: { requests: { get: 999, put: 888, delete: 777 }, bandwidth: { egress: 0, ingress: 0 } },
        updatedAt: new Date(),
      }),
      updateOne: vi.fn(),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return {}
    })

    const { getR2RequestMetrics } = await import("@/lib/cf-r2")
    const result = await getR2RequestMetrics(30)

    expect(result.requests.get).toBe(999)
    expect(mockFetch).not.toHaveBeenCalled()
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
