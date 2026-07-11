import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockDb = {
  collection: vi.fn(),
}

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

const mockS3Send = vi.fn()
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = mockS3Send },
  ListBucketsCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.R2_BUCKET_NAME = "zoo-note-local"
  process.env.R2_ACCESS_KEY_ID = "test-key"
  process.env.R2_SECRET_ACCESS_KEY = "test-secret"
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account"
})

describe("getR2StorageMetrics", () => {
  it("returns total objects and bytes from S3 API", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return {}
    })

    // Mock S3 ListBucketsCommand
    mockS3Send.mockResolvedValueOnce({
      Buckets: [{ Name: "zoo-note-local" }],
    })
    // Mock S3 ListObjectsV2Command for zoo-note-local
    mockS3Send.mockResolvedValueOnce({
      Contents: [
        { Key: "file1.png", Size: 100000 },
        { Key: "file2.jpg", Size: 200000 },
      ],
      IsTruncated: false,
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result).toEqual({
      totalObjects: 2,
      totalBytes: 300000,
      buckets: [{
        name: "zoo-note-local",
        objectCount: 2,
        payloadSize: 300000,
        isPrimary: true,
      }],
    })
    expect(mockS3Send).toHaveBeenCalledTimes(2)
  })

  it("returns cached metrics when cache is fresh", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue({
        metric: "storage",
        data: { totalObjects: 100, totalBytes: 1000, buckets: [] },
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

    expect(result).toEqual({ totalObjects: 100, totalBytes: 1000, buckets: [] })
    expect(mockS3Send).not.toHaveBeenCalled()
  })

  it("returns zeros when no buckets exist", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return {}
    })

    mockS3Send.mockResolvedValueOnce({
      Buckets: [],
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result).toEqual({ totalObjects: 0, totalBytes: 0, buckets: [] })
  })

  it("counts only existing buckets (no stale deleted buckets)", async () => {
    const metricsCol = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "r2_metrics") return metricsCol
      return {}
    })

    // Only 2 buckets exist (myfirstbucket was deleted)
    mockS3Send.mockResolvedValueOnce({
      Buckets: [{ Name: "zoo-note" }, { Name: "zoo-note-local" }],
    })
    // zoo-note: 4 objects
    mockS3Send.mockResolvedValueOnce({
      Contents: [
        { Key: "a.png", Size: 100 },
        { Key: "b.jpg", Size: 200 },
        { Key: "c.png", Size: 300 },
        { Key: "d.jpg", Size: 400 },
      ],
      IsTruncated: false,
    })
    // zoo-note-local: 4 objects
    mockS3Send.mockResolvedValueOnce({
      Contents: [
        { Key: "x.png", Size: 500 },
        { Key: "y.jpg", Size: 600 },
        { Key: "z.png", Size: 700 },
        { Key: "w.jpg", Size: 800 },
      ],
      IsTruncated: false,
    })

    const { getR2StorageMetrics } = await import("@/lib/cf-r2")
    const result = await getR2StorageMetrics()

    expect(result.totalObjects).toBe(8)
    expect(result.buckets).toHaveLength(2)
    expect(result.buckets.find(b => b.name === "zoo-note")?.objectCount).toBe(4)
    expect(result.buckets.find(b => b.name === "zoo-note-local")?.objectCount).toBe(4)
    // myfirstbucket should NOT appear
    expect(result.buckets.find(b => b.name === "myfirstbucket")).toBeUndefined()
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
