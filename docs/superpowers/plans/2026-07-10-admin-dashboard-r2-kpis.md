# Admin Dashboard Enhancements + R2 KPIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cloudflare R2 storage/bandwidth/request KPIs to the admin dashboard and fill in the three placeholder pages (Settings, Audit Logs, Backup & Restore) with real functionality.

**Architecture:** Server-side Cloudflare R2 Analytics API wrapper with MongoDB TTL-based caching. Each new feature follows the existing pattern: lib module → API route → page UI. Settings, Audit, and Backup use new MongoDB collections with CRUD API routes.

**Tech Stack:** Next.js 16 App Router, TypeScript 6, shadcn/ui (base-nova), Recharts, MongoDB (native driver v6), Vitest, Cloudflare R2 API (S3-compatible + Analytics API)

---

## File Structure

```
src/lib/cf-r2.ts              — NEW: Cloudflare R2 API wrapper + MongoDB caching
src/lib/settings.ts           — NEW: Settings CRUD operations
src/lib/audit.ts              — NEW: Audit logging helper
src/lib/backup.ts             — NEW: Backup/restore operations

src/app/api/admin/r2/route.ts           — NEW: R2 metrics API
src/app/api/admin/settings/route.ts     — NEW: Settings CRUD API
src/app/api/admin/audit/route.ts        — NEW: Audit logs API
src/app/api/admin/backup/route.ts       — NEW: Backup list/create API
src/app/api/admin/backup/[id]/route.ts  — NEW: Backup delete/download/restore API

src/app/admin/page.tsx        — MODIFY: Add R2 KPI section
src/app/admin/settings/page.tsx  — MODIFY: Replace placeholder with real settings
src/app/admin/audit/page.tsx     — MODIFY: Replace placeholder with real audit logs
src/app/admin/backup/page.tsx    — MODIFY: Replace placeholder with real backup UI

src/__tests__/cf-r2-api.test.ts          — NEW
src/__tests__/admin-r2-api.test.ts       — NEW
src/__tests__/admin-settings-api.test.ts — NEW
src/__tests__/admin-audit-api.test.ts    — NEW
src/__tests__/admin-backup-api.test.ts   — NEW
```

---

### Task 1: Cloudflare R2 API wrapper with MongoDB caching

**Files:**
- Create: `src/lib/cf-r2.ts`
- Create: `src/__tests__/cf-r2-api.test.ts`

- [ ] **Step 1: Write the failing test for R2 metrics functions**

```typescript
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
      insertOne: vi.fn().mockResolvedValue({}),
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
      insertOne: vi.fn(),
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
      insertOne: vi.fn().mockResolvedValue({}),
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
      totalBytes: 5 * 1024 * 1024 * 1024, // 5GB (under 10GB free)
      requestsGet: 5000000, // 5M (under 10M free)
      requestsPut: 1000000, // 1M (under 10M free)
      egressBytes: 500 * 1024 * 1024, // 500MB (under 1GB free)
    })
    expect(cost).toBe(0)
  })

  it("calculates overage costs correctly", async () => {
    const { estimateR2Cost } = await import("@/lib/cf-r2")
    const cost = estimateR2Cost({
      totalBytes: 15 * 1024 * 1024 * 1024, // 15GB → 5GB overage × $0.015
      requestsGet: 15000000, // 15M → 5M overage × $0.36/M
      requestsPut: 12000000, // 12M → 2M overage × $4.50/M
      egressBytes: 2 * 1024 * 1024 * 1024, // 2GB → 1GB overage × $0.00 (free)
    })
    // 5 × 0.015 + 5 × 0.36 / 1000000 × 1000000 + 2 × 4.50 / 1000000 × 1000000 + 0
    // = 0.075 + 1.80 + 9.00 + 0 = 10.875
    expect(cost).toBeCloseTo(10.875, 2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/cf-r2-api.test.ts`
Expected: FAIL — module `@/lib/cf-r2` not found

- [ ] **Step 3: Implement `src/lib/cf-r2.ts`**

```typescript
import { Db } from "mongodb"

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
  if (age > 5 * 60 * 1000) return null // 5-min TTL
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
  if (db) {
    const cached = await getCached(db, "storage")
    if (cached) return cached as R2StorageMetrics
  }

  const res = await fetch(cfUrl(`/r2/buckets/${BUCKET_NAME}/metrics/summary`), {
    headers: cfHeaders(),
  })
  if (!res.ok) throw new Error(`CF API error: ${res.status}`)
  const json = await res.json()

  const result: R2StorageMetrics = {
    totalObjects: json.result?.objects?.total ?? 0,
    totalBytes: json.result?.storage?.totalBytes ?? 0,
  }

  if (db) await setCache(db, "storage", result)
  return result
}

export interface R2RequestMetrics {
  requests: { get: number; put: number; delete: number }
  bandwidth: { egress: number; ingress: number }
}

export async function getR2RequestMetrics(range: number, db?: Db): Promise<R2RequestMetrics> {
  const cacheKey = `requests_${range}`
  if (db) {
    const cached = await getCached(db, cacheKey)
    if (cached) return cached as R2RequestMetrics
  }

  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(
    cfUrl(`/r2/buckets/${BUCKET_NAME}/metrics/requests?since=${since}`),
    { headers: cfHeaders() }
  )
  if (!res.ok) throw new Error(`CF API error: ${res.status}`)
  const json = await res.json()

  const result: R2RequestMetrics = {
    requests: {
      get: json.result?.requests?.get ?? 0,
      put: json.result?.requests?.put ?? 0,
      delete: json.result?.requests?.delete ?? 0,
    },
    bandwidth: {
      egress: json.result?.bandwidth?.egress ?? 0,
      ingress: json.result?.bandwidth?.ingress ?? 0,
    },
  }

  if (db) await setCache(db, cacheKey, result)
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
  storageBytes: 10 * 1024 * 1024 * 1024,       // 10GB
  classARequests: 10_000_000,                     // 10M PUT/etc
  classBRequests: 10_000_000,                     // 10M GET
  egressBytes: 1 * 1024 * 1024 * 1024,           // 1GB
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
  const egressOverageGB = Math.max(0, (metrics.egressBytes - FREE_TIER.egressBytes) / (1024 * 1024 * 1024))

  const storageCost = storageOverageGB * OVERAGE_PRICES.storagePerGB
  const classACost = classAOverage * OVERAGE_PRICES.classAPerMillion
  const classBCost = classBOverage * OVERAGE_PRICES.classBPerMillion
  const egressCost = egressOverageGB * 0 // egress is free on R2

  return Math.round((storageCost + classACost + classBCost + egressCost) * 100) / 100
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/cf-r2-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cf-r2.ts src/__tests__/cf-r2-api.test.ts
git commit -m "feat: add Cloudflare R2 API wrapper with MongoDB caching and cost estimation"
```

---

### Task 2: R2 metrics API route

**Files:**
- Create: `src/app/api/admin/r2/route.ts`
- Create: `src/__tests__/admin-r2-api.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-r2-api.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/app/api/admin/r2/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getR2StorageMetrics, getR2RequestMetrics, getR2ObjectList, estimateR2Cost } from "@/lib/cf-r2"

const VALID_RANGES = [7, 30, 90] as const
type Range = (typeof VALID_RANGES)[number]

function parseRange(param: string | null): Range {
  const n = parseInt(param || "7", 10)
  return (VALID_RANGES as readonly number[]).includes(n) ? (n as Range) : 7
}

const VALID_METRICS = ["storage", "requests", "cost", "objects"] as const
type Metric = (typeof VALID_METRICS)[number]

function parseMetric(param: string | null): Metric {
  return (VALID_METRICS as readonly string[]).includes(param || "") ? (param as Metric) : "storage"
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const metric = parseMetric(params.get("metric"))
  const range = parseRange(params.get("range"))

  try {
    const db = await connectToDatabase()
    let data: unknown

    switch (metric) {
      case "storage":
        data = await getR2StorageMetrics(db)
        break
      case "requests":
        data = await getR2RequestMetrics(range, db)
        break
      case "cost": {
        const [storage, requests] = await Promise.all([
          getR2StorageMetrics(db),
          getR2RequestMetrics(range, db),
        ])
        const cost = estimateR2Cost({
          totalBytes: storage.totalBytes,
          requestsGet: requests.requests.get,
          requestsPut: requests.requests.put,
          egressBytes: requests.bandwidth.egress,
        })
        data = { storage, requests, cost }
        break
      }
      case "objects": {
        const limit = parseInt(params.get("limit") || "20", 10)
        const cursor = params.get("cursor") || undefined
        data = await getR2ObjectList({ limit, cursor })
        break
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("R2 metrics error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch R2 metrics" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-r2-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/r2/route.ts src/__tests__/admin-r2-api.test.ts
git commit -m "feat: add R2 metrics API route with storage, requests, cost, and objects endpoints"
```

---

### Task 3: Dashboard R2 KPI section

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add R2 types and state to the dashboard**

Open `src/app/admin/page.tsx`. Add the following types after the existing `StatsData` type (around line 50):

```typescript
type R2StorageData = {
  totalObjects: number
  totalBytes: number
} | null

type R2RequestData = {
  requests: { get: number; put: number; delete: number }
  bandwidth: { egress: number; ingress: number }
} | null

type R2CostData = {
  storage: R2StorageData
  requests: R2RequestData
  cost: number
} | null

type R2ObjectData = {
  objects: { key: string; size: number; lastModified: string }[]
  cursor: string | null
} | null
```

Add these state variables inside the component, after the existing state declarations:

```typescript
const [r2Storage, setR2Storage] = useState<R2StorageData>(null)
const [r2Requests, setR2Requests] = useState<R2RequestData>(null)
const [r2Cost, setR2Cost] = useState<R2CostData>(null)
const [r2Objects, setR2Objects] = useState<R2ObjectData>(null)
const [r2Loading, setR2Loading] = useState(true)
```

- [ ] **Step 2: Add R2 data fetching**

Add a new `useEffect` block (or add to existing fetch callback) to load R2 data:

```typescript
useEffect(() => {
  setR2Loading(true)
  Promise.all([
    fetch("/api/admin/r2?metric=storage").then(r => r.json()),
    fetch(`/api/admin/r2?metric=requests&range=${range}`).then(r => r.json()),
    fetch(`/api/admin/r2?metric=cost&range=${range}`).then(r => r.json()),
    fetch("/api/admin/r2?metric=objects&limit=10").then(r => r.json()),
  ]).then(([storage, requests, cost, objects]) => {
    setR2Storage(storage.data)
    setR2Requests(requests.data)
    setR2Cost(cost.data)
    setR2Objects(objects.data)
    setR2Loading(false)
  }).catch(() => setR2Loading(false))
}, [range])
```

- [ ] **Step 3: Add the R2 KPI section JSX**

Add this block after the existing charts section (before the "Recent Activity" section). Find the closing `</div>` of the charts section and insert after it:

```tsx
{/* --- R2 Storage KPIs --- */}
<div className="space-y-4">
  <h2 className="text-lg font-semibold flex items-center gap-2">
    <HardDrive className="size-5" />
    Cloudflare R2 Storage
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    <KpiCard
      label="Total Objects"
      value={r2Loading ? "" : String(r2Storage?.totalObjects ?? 0)}
      icon={FileText}
      loading={r2Loading}
    />
    <KpiCard
      label="Storage Used"
      value={r2Loading ? "" : formatBytes(r2Storage?.totalBytes ?? 0)}
      icon={HardDrive}
      loading={r2Loading}
    />
    <KpiCard
      label="Egress (period)"
      value={r2Loading ? "" : formatBytes(r2Requests?.bandwidth.egress ?? 0)}
      icon={FileText}
      loading={r2Loading}
    />
    <KpiCard
      label="Ingress (period)"
      value={r2Loading ? "" : formatBytes(r2Requests?.bandwidth.ingress ?? 0)}
      icon={FileText}
      loading={r2Loading}
    />
    <KpiCard
      label="GET Requests"
      value={r2Loading ? "" : (r2Requests?.requests.get ?? 0).toLocaleString()}
      icon={FileText}
      loading={r2Loading}
    />
    <KpiCard
      label="PUT Requests"
      value={r2Loading ? "" : (r2Requests?.requests.put ?? 0).toLocaleString()}
      icon={FileText}
      loading={r2Loading}
    />
  </div>

  {/* Cost estimate */}
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground font-medium">Estimated Monthly Cost</p>
      </div>
      {r2Loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-2xl font-bold">${(r2Cost?.cost ?? 0).toFixed(2)}</p>
      )}
    </CardContent>
  </Card>

  {/* Largest files table */}
  {r2Objects && r2Objects.objects.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Largest Files</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {r2Objects.objects.map((obj) => (
              <TableRow key={obj.key}>
                <TableCell className="font-mono text-xs">{obj.key}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatBytes(obj.size)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )}
</div>
```

- [ ] **Step 4: Verify the app builds**

Run: `npx next build` (or just `npx tsc --noEmit` for type checking)
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add R2 storage KPIs section to admin dashboard"
```

---

### Task 4: Settings lib

**Files:**
- Create: `src/lib/settings.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/admin-settings-api.test.ts`:

```typescript
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

describe("GET /api/admin/settings — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/settings/route")
    const res = await GET(new Request("http://localhost/api/admin/settings"))
    expect(res.status).toBe(401)
  })
})

describe("GET /api/admin/settings — response", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("returns settings from DB merged with env defaults", async () => {
    const settingsCol = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { key: "app_name", value: "My Notes", updatedAt: new Date() },
        ]),
      }),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "app_settings") return settingsCol
      return {}
    })

    const { GET } = await import("@/app/api/admin/settings/route")
    const res = await GET(new Request("http://localhost/api/admin/settings"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.app_name).toBe("My Notes")
    expect(body.data.storage_provider).toBeDefined()
  })
})

describe("PUT /api/admin/settings — updates", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("updates allowed settings", async () => {
    const settingsCol = {
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "app_settings") return settingsCol
      return {}
    })

    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: "New Name" }),
    })

    const { PUT } = await import("@/app/api/admin/settings/route")
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(settingsCol.updateOne).toHaveBeenCalled()
  })

  it("rejects invalid max_upload_size_mb", async () => {
    const settingsCol = { updateOne: vi.fn() }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "app_settings") return settingsCol
      return {}
    })

    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_upload_size_mb: "abc" }),
    })

    const { PUT } = await import("@/app/api/admin/settings/route")
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-settings-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/settings.ts`**

```typescript
import { Db } from "mongodb"

export interface AppSetting {
  key: string
  value: string
  updatedAt: Date
}

const DEFAULTS: Record<string, string> = {
  app_name: "ZooNote",
  note_visibility: "private",
  max_upload_size_mb: "10",
  session_timeout_hours: "24",
  allow_signup: "true",
}

const ENV_OVERRIDES: Record<string, string | undefined> = {
  storage_provider: process.env.STORAGE_PROVIDER ?? "local",
  r2_bucket_name: process.env.R2_BUCKET_NAME ?? "",
  r2_account_id: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
}

const EDITABLE_KEYS = new Set(["app_name", "note_visibility", "max_upload_size_mb", "session_timeout_hours", "allow_signup"])

const VALIDATORS: Record<string, (v: string) => boolean> = {
  max_upload_size_mb: (v) => { const n = parseInt(v, 10); return !isNaN(n) && n > 0 && n <= 100 },
  session_timeout_hours: (v) => { const n = parseInt(v, 10); return !isNaN(n) && n > 0 && n <= 720 },
  allow_signup: (v) => v === "true" || v === "false",
  note_visibility: (v) => ["private", "public"].includes(v),
}

export async function getAllSettings(db: Db): Promise<Record<string, string>> {
  const docs = await db.collection<AppSetting>("app_settings").find({}).toArray()
  const stored = Object.fromEntries(docs.map((d) => [d.key, d.value]))
  return { ...DEFAULTS, ...ENV_OVERRIDES, ...stored }
}

export async function updateSettings(
  db: Db,
  updates: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  for (const [key, value] of Object.entries(updates)) {
    if (!EDITABLE_KEYS.has(key)) {
      return { success: false, error: `Setting "${key}" is not editable` }
    }
    const validator = VALIDATORS[key]
    if (validator && !validator(value)) {
      return { success: false, error: `Invalid value for "${key}"` }
    }
  }

  const col = db.collection<AppSetting>("app_settings")
  for (const [key, value] of Object.entries(updates)) {
    await col.updateOne(
      { key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true }
    )
  }

  return { success: true }
}

export function isEditable(key: string): boolean {
  return EDITABLE_KEYS.has(key)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-settings-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts src/__tests__/admin-settings-api.test.ts
git commit -m "feat: add settings CRUD lib with validation and env overrides"
```

---

### Task 5: Settings API routes

**Files:**
- Create: `src/app/api/admin/settings/route.ts`

- [ ] **Step 1: Implement the settings API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getAllSettings, updateSettings } from "@/lib/settings"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = await connectToDatabase()
    const settings = await getAllSettings(db)
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error("Settings fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const db = await connectToDatabase()
    const result = await updateSettings(db, body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run tests to verify they pass (re-run existing tests)**

Run: `npx vitest run src/__tests__/admin-settings-api.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/settings/route.ts
git commit -m "feat: add settings API routes (GET/PUT)"
```

---

### Task 6: Settings page UI

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Replace the placeholder settings page**

Replace the entire content of `src/app/admin/settings/page.tsx` with:

```tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Settings, Lock, Save, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

type SettingsData = Record<string, string>

const EDITABLE_SECTIONS = [
  {
    title: "General",
    description: "Application-wide display settings",
    settings: [
      { key: "app_name", label: "App Name", type: "text" },
      { key: "note_visibility", label: "Default Note Visibility", type: "select", options: ["private", "public"] },
    ],
  },
  {
    title: "Security",
    description: "Authentication and session settings",
    settings: [
      { key: "session_timeout_hours", label: "Session Timeout (hours)", type: "number" },
      { key: "allow_signup", label: "Allow New Signups", type: "toggle" },
    ],
  },
  {
    title: "Uploads",
    description: "File upload limits",
    settings: [
      { key: "max_upload_size_mb", label: "Max Upload Size (MB)", type: "number" },
    ],
  },
]

const ENV_SETTINGS = [
  { key: "storage_provider", label: "Storage Provider" },
  { key: "r2_bucket_name", label: "R2 Bucket Name" },
  { key: "r2_account_id", label: "R2 Account ID" },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edits, setEdits] = useState<SettingsData>({})
  const [isDirty, setIsDirty] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const body = await res.json()
      if (body.success) {
        setSettings(body.data)
        setEdits({})
        setIsDirty(false)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      })
      const body = await res.json()
      if (body.success) {
        setSettings((prev) => ({ ...prev, ...edits }))
        setEdits({})
        setIsDirty(false)
      }
    } finally {
      setSaving(false)
    }
  }

  function getValue(key: string): string {
    return edits[key] ?? settings[key] ?? ""
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center shrink-0">
            <Settings className="size-5 text-slate-700 dark:text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-xs text-muted-foreground">Configure application-wide settings</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center shrink-0">
            <Settings className="size-5 text-slate-700 dark:text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-xs text-muted-foreground">Configure application-wide settings</p>
          </div>
        </div>
        {isDirty && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {EDITABLE_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              {section.settings.map((s) => (
                <div key={s.key} className="space-y-1">
                  <Label className="text-xs">{s.label}</Label>
                  {s.type === "toggle" ? (
                    <Switch
                      checked={getValue(s.key) === "true"}
                      onCheckedChange={(checked) => handleChange(s.key, checked ? "true" : "false")}
                    />
                  ) : s.type === "select" ? (
                    <select
                      className="w-full max-w-xs rounded border px-3 py-2 text-sm bg-background"
                      value={getValue(s.key)}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    >
                      {s.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={s.type}
                      className="max-w-xs"
                      value={getValue(s.key)}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Env-controlled (read-only) settings */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold">Storage</h3>
              <p className="text-xs text-muted-foreground">Environment-controlled settings (read-only)</p>
            </div>
            {ENV_SETTINGS.map((s) => (
              <div key={s.key} className="space-y-1">
                <Label className="text-xs">{s.label}</Label>
                <div className="flex items-center gap-2">
                  <div className="rounded border px-3 py-2 text-sm bg-muted/30 max-w-xs">
                    {settings[s.key] || "(not set)"}
                  </div>
                  <Lock className="size-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build` or `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat: replace settings placeholder with functional settings page"
```

---

### Task 7: Audit lib

**Files:**
- Create: `src/lib/audit.ts`

- [ ] **Step 1: Implement `src/lib/audit.ts`**

```typescript
import { Db, ObjectId } from "mongodb"

export interface AuditLogEntry {
  _id?: ObjectId
  userId: string
  userName: string
  action: string
  target: string
  details?: Record<string, unknown>
  ip: string
  userAgent: string
  timestamp: Date
}

export async function logAuditEvent(
  db: Db,
  entry: Omit<AuditLogEntry, "timestamp">
): Promise<void> {
  await db.collection<AuditLogEntry>("audit_logs").insertOne({
    ...entry,
    timestamp: new Date(),
  })
}

export async function getAuditLogs(
  db: Db,
  options: {
    userId?: string
    action?: string
    from?: Date
    to?: Date
    page?: number
    limit?: number
  } = {}
): Promise<{ logs: AuditLogEntry[]; total: number; page: number; limit: number }> {
  const { userId, action, from, to, page = 1, limit = 20 } = options

  const filter: Record<string, unknown> = {}
  if (userId) filter.userId = userId
  if (action) filter.action = action
  if (from || to) {
    filter.timestamp = {}
    if (from) (filter.timestamp as Record<string, Date>).$gte = from
    if (to) (filter.timestamp as Record<string, Date>).$lte = to
  }

  const col = db.collection<AuditLogEntry>("audit_logs")
  const total = await col.countDocuments(filter)
  const logs = await col
    .find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  return { logs, total, page, limit }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/audit.ts
git commit -m "feat: add audit logging helper with query support"
```

---

### Task 8: Audit API routes

**Files:**
- Create: `src/app/api/admin/audit/route.ts`
- Create: `src/__tests__/admin-audit-api.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-audit-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/admin/audit/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getAuditLogs } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const page = parseInt(params.get("page") || "1", 10)
  const limit = parseInt(params.get("limit") || "20", 10)
  const userId = params.get("userId") || undefined
  const action = params.get("action") || undefined
  const from = params.get("from") ? new Date(params.get("from")!) : undefined
  const to = params.get("to") ? new Date(params.get("to")!) : undefined

  try {
    const db = await connectToDatabase()
    const data = await getAuditLogs(db, { userId, action, from, to, page, limit })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Audit logs error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-audit-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/audit/route.ts src/__tests__/admin-audit-api.test.ts
git commit -m "feat: add audit logs API route with pagination and filtering"
```

---

### Task 9: Audit page UI

**Files:**
- Modify: `src/app/admin/audit/page.tsx`

- [ ] **Step 1: Replace the placeholder audit page**

Replace the entire content of `src/app/admin/audit/page.tsx` with:

```tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ScrollText, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type AuditLog = {
  userId: string
  userName: string
  action: string
  target: string
  details?: Record<string, unknown>
  ip: string
  userAgent: string
  timestamp: string
}

type AuditData = {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

const ACTION_COLORS: Record<string, string> = {
  "auth.login": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "auth.logout": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  "auth.signup": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "note.create": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "note.update": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "note.delete": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "user.create": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "user.update": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "user.delete": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "settings.update": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AuditPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState("")
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (actionFilter) params.set("action", actionFilter)
      const res = await fetch(`/api/admin/audit?${params}`)
      const body = await res.json()
      if (body.success) setData(body.data)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
          <ScrollText className="size-5 text-orange-600 dark:text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-xs text-muted-foreground">View user activity and system events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Filter by action (e.g. note.create)"
          className="max-w-xs"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log, i) => (
                  <React.Fragment key={i}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    >
                      <TableCell className="w-8">
                        {expandedRow === i ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono" title={log.timestamp}>
                        {timeAgo(log.timestamp)}
                      </TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_COLORS[log.action] ?? ""}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{log.target}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{log.ip}</TableCell>
                    </TableRow>
                    {expandedRow === i && log.details && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-xs text-muted-foreground">
            Page {data?.page} of {totalPages} ({data?.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/audit/page.tsx
git commit -m "feat: replace audit logs placeholder with functional paginated table"
```

---

### Task 10: Backup lib

**Files:**
- Create: `src/lib/backup.ts`

- [ ] **Step 1: Implement `src/lib/backup.ts`**

```typescript
import { Db, ObjectId } from "mongodb"
import { execSync } from "child_process"
import { join } from "path"
import { mkdtemp, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { storageSave, storageRead, storageDelete } from "@/lib/storage"

export interface BackupEntry {
  _id?: ObjectId
  filename: string
  size: number
  storagePath: string
  status: "completed" | "failed" | "in_progress"
  createdAt: Date
  notes: string
}

export async function createBackup(db: Db, notes: string = ""): Promise<BackupEntry> {
  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.gz`
  const storagePath = `backups/${filename}`

  const entry: BackupEntry = {
    filename,
    size: 0,
    storagePath,
    status: "in_progress",
    createdAt: new Date(),
    notes,
  }

  const result = await db.collection<BackupEntry>("backups").insertOne(entry)
  entry._id = result.insertedId

  try {
    const tmpDir = await mkdtemp(join(tmpdir(), "zoo-backup-"))
    const dumpPath = join(tmpDir, "dump")

    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/zoo-note"
    execSync(`mongodump --uri="${mongoUri}" --out="${dumpPath}"`, { timeout: 300000 })

    // Compress the dump directory (tar.gz on unix, we'll use mongodump's archive mode instead)
    const archivePath = join(tmpDir, "backup.gz")
    execSync(`mongodump --uri="${mongoUri}" --archive="${archivePath}" --gzip`, { timeout: 300000 })

    const data = await readFile(archivePath)
    await storageSave(`backup-${result.insertedId}`, data, "application/gzip")

    await db.collection<BackupEntry>("backups").updateOne(
      { _id: result.insertedId },
      { $set: { size: data.length, status: "completed" } }
    )
    entry.size = data.length
    entry.status = "completed"

    await rm(tmpDir, { recursive: true, force: true })
  } catch (error) {
    await db.collection<BackupEntry>("backups").updateOne(
      { _id: result.insertedId },
      { $set: { status: "failed" } }
    )
    entry.status = "failed"
    throw error
  }

  return entry
}

export async function listBackups(db: Db): Promise<BackupEntry[]> {
  return db
    .collection<BackupEntry>("backups")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()
}

export async function deleteBackup(db: Db, id: ObjectId): Promise<boolean> {
  const entry = await db.collection<BackupEntry>("backups").findOne({ _id: id })
  if (!entry) return false

  await storageDelete(`backup-${id}`)
  const result = await db.collection<BackupEntry>("backups").deleteOne({ _id: id })
  return result.deletedCount > 0
}

export async function restoreBackup(db: Db, id: ObjectId): Promise<void> {
  const entry = await db.collection<BackupEntry>("backups").findOne({ _id: id })
  if (!entry) throw new Error("Backup not found")
  if (entry.status !== "completed") throw new Error("Backup is not in completed state")

  const data = await storageRead(`backup-${id}`)
  if (!data) throw new Error("Backup file not found in storage")

  const tmpDir = await mkdtemp(join(tmpdir(), "zoo-restore-"))
  const archivePath = join(tmpDir, "backup.gz")
  const { writeFile } = await import("fs/promises")
  await writeFile(archivePath, data)

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/zoo-note"
  try {
    execSync(`mongorestore --uri="${mongoUri}" --archive="${archivePath}" --gzip --drop`, { timeout: 300000 })
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

export async function downloadBackup(id: ObjectId): Promise<{ data: Buffer; filename: string } | null> {
  const data = await storageRead(`backup-${id}`)
  if (!data) return null

  const db = await (await import("@/lib/mongodb")).connectToDatabase()
  const entry = await db.collection<BackupEntry>("backups").findOne({ _id: id })
  return { data, filename: entry?.filename ?? `backup-${id}.gz` }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/backup.ts
git commit -m "feat: add backup/restore lib with mongodump/mongorestore and storage integration"
```

---

### Task 11: Backup API routes

**Files:**
- Create: `src/app/api/admin/backup/route.ts`
- Create: `src/app/api/admin/backup/[id]/route.ts`
- Create: `src/__tests__/admin-backup-api.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
      { filename: "backup-1.gz", size: 1000, storagePath: "backups/backup-1.gz", status: "completed", createdAt: new Date(), notes: "" },
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
      filename: "backup-new.gz", size: 500, storagePath: "backups/backup-new.gz",
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-backup-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/admin/backup/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { createBackup, listBackups } from "@/lib/backup"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = await connectToDatabase()
    const data = await listBackups(db)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Backup list error:", error)
    return NextResponse.json({ success: false, error: "Failed to list backups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const db = await connectToDatabase()
    const backup = await createBackup(db, body.notes ?? "")
    return NextResponse.json({ success: true, data: backup })
  } catch (error) {
    console.error("Backup creation error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create backup" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Implement `src/app/api/admin/backup/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { deleteBackup, restoreBackup, downloadBackup } from "@/lib/backup"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const db = await connectToDatabase()
    const deleted = await deleteBackup(db, new ObjectId(id))
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Backup not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Backup delete error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete backup" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    if (body.confirm !== "RESTORE") {
      return NextResponse.json(
        { success: false, error: 'Type "RESTORE" to confirm' },
        { status: 400 }
      )
    }

    const db = await connectToDatabase()
    await restoreBackup(db, new ObjectId(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Backup restore error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to restore backup" },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const result = await downloadBackup(new ObjectId(id))
    if (!result) {
      return NextResponse.json({ success: false, error: "Backup not found" }, { status: 404 })
    }

    return new NextResponse(result.data, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    console.error("Backup download error:", error)
    return NextResponse.json({ success: false, error: "Failed to download backup" }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-backup-api.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/backup/route.ts src/app/api/admin/backup/[id]/route.ts src/__tests__/admin-backup-api.test.ts
git commit -m "feat: add backup API routes (list, create, delete, restore, download)"
```

---

### Task 12: Backup page UI

**Files:**
- Modify: `src/app/admin/backup/page.tsx`

- [ ] **Step 1: Replace the placeholder backup page**

Replace the entire content of `src/app/admin/backup/page.tsx` with:

```tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Database, Download, Trash2, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type BackupEntry = {
  _id: string
  filename: string
  size: number
  status: "completed" | "failed" | "in_progress"
  createdAt: string
  notes: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoreDialog, setRestoreDialog] = useState<BackupEntry | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState("")
  const [restoring, setRestoring] = useState(false)

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backup")
      const body = await res.json()
      if (body.success) setBackups(body.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBackups() }, [fetchBackups])

  // Auto-refresh if any backup is in progress
  useEffect(() => {
    const hasInProgress = backups.some((b) => b.status === "in_progress")
    if (!hasInProgress) return
    const interval = setInterval(fetchBackups, 30000)
    return () => clearInterval(interval)
  }, [backups, fetchBackups])

  async function handleCreateBackup() {
    setCreating(true)
    try {
      await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Manual backup" }),
      })
      await fetchBackups()
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this backup permanently?")) return
    await fetch(`/api/admin/backup/${id}`, { method: "DELETE" })
    await fetchBackups()
  }

  async function handleRestore() {
    if (!restoreDialog || restoreConfirm !== "RESTORE") return
    setRestoring(true)
    try {
      const res = await fetch(`/api/admin/backup/${restoreDialog._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESTORE" }),
      })
      const body = await res.json()
      if (body.success) {
        setRestoreDialog(null)
        setRestoreConfirm("")
        alert("Restore completed successfully")
      } else {
        alert(`Restore failed: ${body.error}`)
      }
    } finally {
      setRestoring(false)
    }
  }

  function handleDownload(id: string) {
    window.open(`/api/admin/backup/${id}`, "_blank")
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
            <Database className="size-5 text-teal-600 dark:text-teal-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Backup & Restore</h1>
            <p className="text-xs text-muted-foreground">Manage database backups and restore points</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchBackups()}>
            <RefreshCw className="size-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateBackup} disabled={creating}>
            {creating ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Create Backup
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Backup</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No backups yet. Create your first backup above.
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell className="font-mono text-xs">{b.filename}</TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(b.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBytes(b.size)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[b.status] ?? ""}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {b.status === "completed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(b._id)}
                            >
                              <Download className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setRestoreDialog(b); setRestoreConfirm("") }}
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(b._id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restore confirmation dialog */}
      <Dialog open={!!restoreDialog} onOpenChange={() => setRestoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              This will replace the current database with the backup <strong>{restoreDialog?.filename}</strong>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-destructive font-medium">
              Type RESTORE to confirm:
            </p>
            <Input
              placeholder="RESTORE"
              value={restoreConfirm}
              onChange={(e) => setRestoreConfirm(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={restoreConfirm !== "RESTORE" || restoring}
              onClick={handleRestore}
            >
              {restoring ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/backup/page.tsx
git commit -m "feat: replace backup placeholder with functional backup/restore page"
```

---

### Task 13: Full test suite and final verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run type checking**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linting**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 4: Verify the build succeeds**

Run: `npx next build`
Expected: Build completes successfully
