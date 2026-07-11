import { Db } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

const CF_API_BASE = "https://api.cloudflare.com/client/v4"
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const BUCKET_NAME = process.env.R2_BUCKET_NAME!
const CF_API_TOKEN = process.env.CF_API_TOKEN!

function cfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    "Content-Type": "application/json",
  }
}

function cfUrl(path: string): string {
  return `${CF_API_BASE}/accounts/${ACCOUNT_ID}${path}`
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

// --- Public API ---

export interface R2StorageMetrics {
  totalObjects: number
  totalBytes: number
}

export async function getR2StorageMetrics(db?: Db): Promise<R2StorageMetrics> {
  const resolvedDb = db ?? await connectToDatabase()
  const cached = await getCached(resolvedDb, "storage")
  if (cached) return cached as R2StorageMetrics

  const res = await fetch(cfUrl(`/r2/buckets/${BUCKET_NAME}/metrics/summary`), {
    headers: cfHeaders(),
  })
  if (!res.ok) throw new Error(`CF API error: ${res.status}`)
  const json = await res.json()

  const result: R2StorageMetrics = {
    totalObjects: json.objects?.total ?? 0,
    totalBytes: json.storage?.totalBytes ?? 0,
  }

  await setCache(resolvedDb, "storage", result)
  return result
}

export interface R2RequestMetrics {
  requests: { get: number; put: number; delete: number }
  bandwidth: { egress: number; ingress: number }
}

export async function getR2RequestMetrics(range: number, db?: Db): Promise<R2RequestMetrics> {
  const resolvedDb = db ?? await connectToDatabase()
  const cacheKey = `requests_${range}`
  const cached = await getCached(resolvedDb, cacheKey)
  if (cached) return cached as R2RequestMetrics

  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(
    cfUrl(`/r2/buckets/${BUCKET_NAME}/metrics/requests?since=${since}`),
    { headers: cfHeaders() }
  )
  if (!res.ok) throw new Error(`CF API error: ${res.status}`)
  const json = await res.json()

  const result: R2RequestMetrics = {
    requests: {
      get: json.requests?.get ?? 0,
      put: json.requests?.put ?? 0,
      delete: json.requests?.delete ?? 0,
    },
    bandwidth: {
      egress: json.bandwidth?.egress ?? 0,
      ingress: json.bandwidth?.ingress ?? 0,
    },
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
  const params = new URLSearchParams()
  if (options.limit) params.set("limit", String(options.limit))
  if (options.cursor) params.set("cursor", options.cursor)

  const res = await fetch(
    cfUrl(`/r2/buckets/${BUCKET_NAME}/objects?${params}`),
    { headers: cfHeaders() }
  )
  if (!res.ok) throw new Error(`CF API error: ${res.status}`)
  const json = await res.json()

  return {
    objects: (json.result ?? []).map((o: any) => ({
      key: o.key,
      size: o.size,
      lastModified: o.lastModified,
    })),
    cursor: json.result_info?.cursor ?? null,
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
