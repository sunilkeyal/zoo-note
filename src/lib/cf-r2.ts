import { Db } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

const CF_API_BASE = "https://api.cloudflare.com/client/v4"

function getAccountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID ?? ""
}
function getBucketName(): string {
  return process.env.R2_BUCKET_NAME ?? ""
}

function cfHeaders(): Record<string, string> {
  const token = process.env.CF_API_TOKEN
  if (!token) throw new Error("CF_API_TOKEN env var is not set")
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

function cfUrl(path: string): string {
  return `${CF_API_BASE}/accounts/${getAccountId()}${path}`
}

// --- Cache helpers ---

interface CachedMetrics {
  metric: string
  data: unknown
  updatedAt: Date
}

async function getCached(db: Db, metric: string): Promise<unknown | null> {
  const doc = await db.collection<CachedMetrics>("r2_metrics").findOne({ metric })
  if (!doc) return null
  const age = Date.now() - doc.updatedAt.getTime()
  if (age > 5 * 60 * 1000) return null
  return doc.data
}

async function setCache(db: Db, metric: string, data: unknown): Promise<void> {
  await db.collection("r2_metrics").updateOne(
    { metric },
    { $set: { data, updatedAt: new Date() } },
    { upsert: true }
  )
}

// --- GraphQL helpers ---

async function gqlQuery(query: string, variables: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${CF_API_BASE}/graphql`, {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`CF GraphQL API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(`CF GraphQL errors: ${JSON.stringify(json.errors)}`)
  return json.data
}

// --- Public API ---

export interface R2BucketInfo {
  name: string
  objectCount: number
  payloadSize: number
  isPrimary: boolean
}

export interface R2StorageMetrics {
  totalObjects: number
  totalBytes: number
  buckets: R2BucketInfo[]
}

export async function getR2StorageMetrics(db?: Db): Promise<R2StorageMetrics> {
  const resolvedDb = db ?? await connectToDatabase()
  const cached = await getCached(resolvedDb, "storage")
  if (cached) return cached as R2StorageMetrics

  const { S3Client, ListBucketsCommand, ListObjectsV2Command } = await import("@aws-sdk/client-s3")
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${getAccountId()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  let bucketNames: string[]

  try {
    // Try S3 ListBuckets first (most accurate, real-time)
    const bucketsRes = await s3.send(new ListBucketsCommand({}))
    bucketNames = (bucketsRes.Buckets ?? []).map((b) => b.Name ?? "")
  } catch (s3Err) {
    // S3 ListBuckets needs account-level s3:ListBucket permission.
    // Fall back to CF GraphQL analytics for bucket enumeration.
    console.warn("S3 ListBuckets failed, falling back to GraphQL:", s3Err instanceof Error ? s3Err.message : s3Err)
    const now = new Date()
    const startDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString()
    const data = await gqlQuery(
      `query R2Storage($accountTag: string!, $startDate: Time, $endDate: Time) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            r2StorageAdaptiveGroups(
              limit: 10000
              filter: { datetime_geq: $startDate, datetime_leq: $endDate }
            ) {
              dimensions { bucketName }
            }
          }
        }
      }`,
      { accountTag: getAccountId(), startDate, endDate: now.toISOString() }
    )
    const groups = data.viewer.accounts[0]?.r2StorageAdaptiveGroups ?? []
    bucketNames = [...new Set(groups.map((g: any) => g.dimensions.bucketName).filter(Boolean) as string[])]
  }

  // For each bucket, list objects and sum sizes via S3
  const buckets: R2BucketInfo[] = []
  let totalObjects = 0
  let totalBytes = 0

  for (const name of bucketNames) {
    let objectCount = 0
    let payloadSize = 0
    let continuationToken: string | undefined

    try {
      do {
        const res = await s3.send(new ListObjectsV2Command({
          Bucket: name,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }))
        for (const obj of res.Contents ?? []) {
          objectCount++
          payloadSize += obj.Size ?? 0
        }
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
      } while (continuationToken)
    } catch {
      // Bucket might be inaccessible — skip it
      continue
    }

    totalObjects += objectCount
    totalBytes += payloadSize
    buckets.push({
      name,
      objectCount,
      payloadSize,
      isPrimary: name === getBucketName(),
    })
  }

  // Sort: primary first, then by size descending
  buckets.sort((a, b) => {
    if (a.isPrimary) return -1
    if (b.isPrimary) return 1
    return b.payloadSize - a.payloadSize
  })

  const result: R2StorageMetrics = {
    totalObjects,
    totalBytes,
    buckets,
  }

  await setCache(resolvedDb, "storage", result)
  return result
}

// Class A operations: PutObject, ListObjects, PutBucket, ListMultipartUploads, DeleteMultipleObjects
const CLASS_A_OPS = new Set(["PutObject", "ListObjects", "PutBucket", "ListMultipartUploads", "DeleteMultipleObjects"])
// Class B operations: GetObject, HeadObject, HeadBucket, CopyObject, SelectObject
const CLASS_B_OPS = new Set(["GetObject", "HeadObject", "HeadBucket", "CopyObject", "SelectObject"])

export interface R2RequestMetrics {
  requests: { get: number; put: number; delete: number }
  bandwidth: { egress: number; ingress: number }
}

export async function getR2RequestMetrics(range: number, db?: Db): Promise<R2RequestMetrics> {
  const resolvedDb = db ?? await connectToDatabase()
  const cacheKey = `requests_${range}`
  const cached = await getCached(resolvedDb, cacheKey)
  if (cached) return cached as R2RequestMetrics

  const now = new Date()
  const startDate = new Date(now.getTime() - range * 24 * 60 * 60 * 1000).toISOString()

  const data = await gqlQuery(
    `query R2Operations($accountTag: string!, $startDate: Time, $endDate: Time) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          r2OperationsAdaptiveGroups(
            limit: 10000
            filter: { datetime_geq: $startDate, datetime_leq: $endDate }
          ) {
            sum {
              requests
            }
            dimensions {
              actionType
            }
          }
        }
      }
    }`,
    { accountTag: getAccountId(), startDate, endDate: now.toISOString() }
  )

  const groups = data.viewer.accounts[0]?.r2OperationsAdaptiveGroups ?? []

  let get = 0
  let put = 0
  let delete_ = 0

  for (const group of groups) {
    const actionType: string = group.dimensions.actionType
    const requests: number = group.sum.requests ?? 0

    if (CLASS_A_OPS.has(actionType)) {
      put += requests
    } else if (CLASS_B_OPS.has(actionType)) {
      get += requests
    } else if (actionType === "DeleteObject") {
      delete_ += requests
    } else {
      // Unknown action type, count as Class A to be safe
      put += requests
    }
  }

  const result: R2RequestMetrics = {
    requests: { get, put, delete: delete_ },
    bandwidth: { egress: 0, ingress: 0 }, // Not available via GraphQL, estimated client-side
  }

  await setCache(resolvedDb, cacheKey, result)
  return result
}

export interface R2ObjectEntry {
  key: string
  size: number
  lastModified: string
}

export async function getR2ObjectList(
  options: { limit?: number; cursor?: string } = {}
): Promise<{ objects: R2ObjectEntry[]; cursor: string | null }> {
  // Use S3-compatible API for object listing (CF GraphQL token may lack r2:read)
  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3")
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${getAccountId()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  const res = await s3.send(new ListObjectsV2Command({
    Bucket: getBucketName(),
    MaxKeys: options.limit ?? 20,
    ContinuationToken: options.cursor || undefined,
  }))

  return {
    objects: (res.Contents ?? []).map((o) => ({
      key: o.Key ?? "",
      size: o.Size ?? 0,
      lastModified: o.LastModified?.toISOString() ?? "",
    })),
    cursor: res.IsTruncated ? (res.NextContinuationToken ?? null) : null,
  }
}

// --- Cost estimation ---

const FREE_TIER = {
  storageBytes: 10 * 1024 * 1024 * 1024,
  classARequests: 10_000_000,
  classBRequests: 10_000_000,
  egressBytes: 1 * 1024 * 1024 * 1024,
}

const OVERAGE_PRICES = {
  storagePerGB: 0.015,
  classAPerMillion: 4.50,
  classBPerMillion: 0.36,
}

export function estimateR2Cost(metrics: {
  totalBytes: number
  requestsGet: number
  requestsPut: number
  egressBytes: number
}): number {
  const storageOverageGB = Math.max(0, (metrics.totalBytes - FREE_TIER.storageBytes) / (1024 * 1024 * 1024))
  const classAOverage = Math.max(0, metrics.requestsPut - FREE_TIER.classARequests) / 1_000_000
  const classBOverage = Math.max(0, metrics.requestsGet - FREE_TIER.classBRequests) / 1_000_000

  const storageCost = storageOverageGB * OVERAGE_PRICES.storagePerGB
  const classACost = classAOverage * OVERAGE_PRICES.classAPerMillion
  const classBCost = classBOverage * OVERAGE_PRICES.classBPerMillion

  return storageCost + classACost + classBCost
}
