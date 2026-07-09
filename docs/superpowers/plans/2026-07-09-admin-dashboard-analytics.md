# Admin Dashboard Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder admin dashboard with a data-driven single-scroll analytics page featuring KPI cards, time-series charts, an activity feed, and a per-user breakdown table — while removing the now-redundant Analytics nav item.

**Architecture:** One new API route (`GET /api/admin/stats?range=7|30|90`) runs all MongoDB aggregations in parallel and returns four buckets (kpis, charts, users, activity). The dashboard page is a client component that fetches on mount, on re-navigation, and on manual refresh. Charts are rendered with the shadcn Chart component (Recharts wrapper).

**Tech Stack:** Next.js 16 (App Router), MongoDB 6, shadcn/ui (chart, card, table, toggle-group, badge, skeleton, button), Recharts (via shadcn chart), Vitest + Testing Library

## Global Constraints

- Branch: `feat/admin-dashboard-analytics` — do NOT merge or push to main
- All MongoDB queries must be admin-gated (401 unauthenticated, 403 non-admin)
- Use `connectToDatabase` from `@/lib/mongodb` and `auth` from `@/lib/auth` — do not create new DB utilities
- GridFS bucket name is `images` (collections: `images.files`, `images.chunks`) — NOT `fs.files`
- Image metadata stores `userId` at `metadata.userId`
- Follow the existing test pattern: `vi.mock("@/lib/mongodb", ...)`, `vi.mock("@/lib/auth", ...)`, dynamic `import()` inside each test
- shadcn style is `base-nova`, CSS variables enabled — do not hardcode colors, use `hsl(var(--...))` tokens
- No new npm packages except those installed via `npx shadcn@latest add`
- Run `npm test` after every task to confirm nothing is broken

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/ui/chart.tsx` | **Create** (via shadcn CLI) | Recharts wrapper — bar, line, tooltip, legend |
| `src/app/api/admin/stats/route.ts` | **Create** | Stats API — all MongoDB aggregations |
| `src/app/admin/page.tsx` | **Rewrite** | Dashboard UI — KPIs, charts, feed, user table |
| `src/app/admin/analytics/page.tsx` | **Delete** | Removed — content moves to dashboard |
| `src/components/NotesSidebar.tsx` | **Modify** | Remove Analytics entry from `adminItems` |
| `src/__tests__/admin-stats-api.test.ts` | **Create** | API route unit tests |
| `src/__tests__/notes-sidebar.test.tsx` | **Modify** | Remove assertion for 'Analytics' nav item |

---

## Task 1: Install shadcn Chart + Cleanup

**Files:**
- Create: `src/components/ui/chart.tsx` (via CLI)
- Delete: `src/app/admin/analytics/page.tsx`
- Modify: `src/components/NotesSidebar.tsx`
- Modify: `src/__tests__/notes-sidebar.test.tsx`

**Interfaces:**
- Produces: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent` — imported from `@/components/ui/chart` by Task 3 (dashboard UI)

- [ ] **Step 1: Install the shadcn chart component**

Run from project root:
```bash
npx shadcn@latest add chart
```
Accept all prompts. This creates `src/components/ui/chart.tsx` and adds `recharts` to `package.json`.

- [ ] **Step 2: Verify chart component installed**

Check that `src/components/ui/chart.tsx` exists and `recharts` appears in `package.json` dependencies.

- [ ] **Step 3: Delete the analytics page**

Delete `src/app/admin/analytics/page.tsx`. Then remove the now-empty directory `src/app/admin/analytics/`.

- [ ] **Step 4: Remove Analytics from the sidebar `adminItems`**

In `src/components/NotesSidebar.tsx`, locate `adminItems` (around line 344):

```ts
// Before
const adminItems = [
  { route: "/admin",           label: "Dashboard",        icon: LayoutDashboard, iconColor: "text-violet-600 dark:text-violet-500" },
  { route: "/admin/analytics", label: "Analytics",        icon: BarChart3,       iconColor: "text-cyan-700 dark:text-cyan-600" },
  { route: "/admin/backup",    label: "Backup & Restore", icon: Database,        iconColor: "text-teal-600 dark:text-teal-500" },
  ...
]
```

Remove the `analytics` entry entirely. Also remove the `BarChart3` import from the lucide-react import line at the top if it is no longer used anywhere else in the file.

- [ ] **Step 5: Fix the sidebar test**

In `src/__tests__/notes-sidebar.test.tsx` at line 323, remove the assertion that checks for the Analytics nav item:
```ts
// Remove this line:
expect(screen.getByText('Analytics')).toBeInTheDocument()
```
Leave the `Audit Logs` assertion untouched.

- [ ] **Step 6: Run tests**

```bash
npm test
```
Expected: all tests pass (the sidebar test no longer looks for 'Analytics').

- [ ] **Step 7: Commit**

```
git add -A && git commit -m "chore: install shadcn chart, remove analytics nav + page"
```

---

## Task 2: Stats API Route (TDD)

**Files:**
- Create: `src/__tests__/admin-stats-api.test.ts`
- Create: `src/app/api/admin/stats/route.ts`

**Interfaces:**
- Consumes: `connectToDatabase` from `@/lib/mongodb`, `auth` from `@/lib/auth`
- Produces: `GET /api/admin/stats?range=7|30|90` → `{ kpis, charts, users, activity }` (shape below)

### Response shape (TypeScript)

```ts
type StatsResponse = {
  kpis: {
    totalUsers: number
    activeToday: number      // distinct users with note updatedAt >= today midnight
    newThisWeek: number      // users created in last 7 days
    totalNotes: number       // non-deleted notes
    storageUsedBytes: number // sum of images.files length
    trashItemCount: number   // deleted notes + deleted folders
  } | null

  charts: {
    notesPerDay:      { date: string; count: number }[]  // "YYYY-MM-DD", last N days
    activeUsersPerDay: { date: string; count: number }[] // distinct userId by updatedAt date
    storageTrend:     { date: string; bytes: number }[]  // cumulative bytes by upload date
  } | null

  users: {
    id: string
    displayName: string
    email: string
    noteCount: number
    folderCount: number
    storageBytes: number
    isActive: boolean
  }[] | null  // top 10 by noteCount desc

  activity: {
    userId: string
    userName: string
    action: "created note" | "created folder"
    target: string      // note title or folder name
    createdAt: string   // ISO string
  }[] | null  // last 10 creates, ordered by createdAt desc
}
```

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/admin-stats-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = { collection: vi.fn() }

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
      if (name === "users")       return makeCol([5])
      if (name === "notes")       return makeCol([20])
      if (name === "folders")     return makeCol([8])
      if (name === "images.files") return makeCol([{ _id: null, total: 1024 * 1024 }])
      return makeCol([])
    })
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
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- admin-stats-api
```
Expected: all tests fail (module does not exist yet).

- [ ] **Step 3: Create `src/app/api/admin/stats/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

const VALID_RANGES = [7, 30, 90] as const
type Range = (typeof VALID_RANGES)[number]

function parseRange(param: string | null): Range {
  const n = parseInt(param || "7", 10)
  return (VALID_RANGES as readonly number[]).includes(n) ? (n as Range) : 7
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const range = parseRange(new URL(request.url).searchParams.get("range"))
  const cutoff = daysAgo(range)
  const today = todayMidnight()
  const weekAgo = daysAgo(7)

  const db = await connectToDatabase()

  const [kpis, charts, users, activity] = await Promise.all([
    // ── KPIs ──────────────────────────────────────────────────────────────────
    (async () => {
      try {
        const [
          totalUsers,
          newThisWeek,
          totalNotes,
          totalFolders,
          trashNotes,
          trashFolders,
          activeTodayIds,
          storageAgg,
        ] = await Promise.all([
          db.collection("users").countDocuments({}),
          db.collection("users").countDocuments({ createdAt: { $gte: weekAgo } }),
          db.collection("notes").countDocuments({ isDeleted: { $ne: true } }),
          db.collection("folders").countDocuments({ isDeleted: { $ne: true } }),
          db.collection("notes").countDocuments({ isDeleted: true }),
          db.collection("folders").countDocuments({ isDeleted: true }),
          db.collection("notes").distinct("userId", { updatedAt: { $gte: today } }),
          db.collection("images.files").aggregate([
            { $group: { _id: null, total: { $sum: "$length" } } },
          ]).toArray(),
        ])
        return {
          totalUsers,
          newThisWeek,
          activeToday: activeTodayIds.length,
          totalNotes,
          storageUsedBytes: (storageAgg[0]?.total as number) ?? 0,
          trashItemCount: trashNotes + trashFolders,
        }
      } catch {
        return null
      }
    })(),

    // ── Charts ─────────────────────────────────────────────────────────────────
    (async () => {
      try {
        const dateGroupExpr = (field: string) => ({
          $dateToString: { format: "%Y-%m-%d", date: `$${field}` },
        })

        const [notesRaw, activeUsersRaw, storageRaw] = await Promise.all([
          db.collection("notes").aggregate([
            { $match: { createdAt: { $gte: cutoff }, isDeleted: { $ne: true } } },
            { $group: { _id: dateGroupExpr("createdAt"), count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]).toArray(),

          db.collection("notes").aggregate([
            { $match: { updatedAt: { $gte: cutoff } } },
            { $group: { _id: { date: dateGroupExpr("updatedAt"), userId: "$userId" } } },
            { $group: { _id: "$_id.date", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]).toArray(),

          db.collection("images.files").aggregate([
            { $match: { uploadDate: { $gte: cutoff } } },
            { $group: { _id: dateGroupExpr("uploadDate"), bytes: { $sum: "$length" } } },
            { $sort: { _id: 1 } },
          ]).toArray(),
        ])

        return {
          notesPerDay: notesRaw.map((r: any) => ({ date: r._id as string, count: r.count as number })),
          activeUsersPerDay: activeUsersRaw.map((r: any) => ({ date: r._id as string, count: r.count as number })),
          storageTrend: storageRaw.map((r: any) => ({ date: r._id as string, bytes: r.bytes as number })),
        }
      } catch {
        return null
      }
    })(),

    // ── Top users ──────────────────────────────────────────────────────────────
    (async () => {
      try {
        const rows = await db.collection("users").aggregate([
          {
            $lookup: {
              from: "notes",
              let: { uid: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$userId", "$$uid"] }, { $ne: ["$isDeleted", true] }] } } },
                { $count: "n" },
              ],
              as: "notesAgg",
            },
          },
          {
            $lookup: {
              from: "folders",
              let: { uid: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$userId", "$$uid"] }, { $ne: ["$isDeleted", true] }] } } },
                { $count: "n" },
              ],
              as: "foldersAgg",
            },
          },
          {
            $lookup: {
              from: "images.files",
              let: { uid: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $eq: ["$metadata.userId", "$$uid"] } } },
                { $group: { _id: null, total: { $sum: "$length" } } },
              ],
              as: "storageAgg",
            },
          },
          {
            $project: {
              displayName: 1,
              email: 1,
              isActive: 1,
              noteCount: { $ifNull: [{ $arrayElemAt: ["$notesAgg.n", 0] }, 0] },
              folderCount: { $ifNull: [{ $arrayElemAt: ["$foldersAgg.n", 0] }, 0] },
              storageBytes: { $ifNull: [{ $arrayElemAt: ["$storageAgg.total", 0] }, 0] },
            },
          },
          { $sort: { noteCount: -1 } },
          { $limit: 10 },
        ]).toArray()

        return rows.map((r: any) => ({
          id: r._id.toString(),
          displayName: r.displayName ?? r.email,
          email: r.email,
          noteCount: r.noteCount,
          folderCount: r.folderCount,
          storageBytes: r.storageBytes,
          isActive: r.isActive !== false,
        }))
      } catch {
        return null
      }
    })(),

    // ── Activity feed ──────────────────────────────────────────────────────────
    (async () => {
      try {
        const [recentNotes, recentFolders] = await Promise.all([
          db.collection("notes").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "users",
                let: { uid: "$userId" },
                pipeline: [
                  { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$uid"] } } },
                  { $project: { displayName: 1 } },
                ],
                as: "user",
              },
            },
            {
              $project: {
                userId: 1,
                userName: { $ifNull: [{ $arrayElemAt: ["$user.displayName", 0] }, "Unknown"] },
                action: { $literal: "created note" },
                target: "$title",
                createdAt: 1,
              },
            },
          ]).toArray(),

          db.collection("folders").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "users",
                let: { uid: "$userId" },
                pipeline: [
                  { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$uid"] } } },
                  { $project: { displayName: 1 } },
                ],
                as: "user",
              },
            },
            {
              $project: {
                userId: 1,
                userName: { $ifNull: [{ $arrayElemAt: ["$user.displayName", 0] }, "Unknown"] },
                action: { $literal: "created folder" },
                target: "$name",
                createdAt: 1,
              },
            },
          ]).toArray(),
        ])

        const combined = [...recentNotes, ...recentFolders]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)

        return combined.map((r: any) => ({
          userId: r.userId ?? "",
          userName: r.userName,
          action: r.action,
          target: r.target,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        }))
      } catch {
        return null
      }
    })(),
  ])

  return NextResponse.json({ success: true, data: { kpis, charts, users, activity } })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- admin-stats-api
```
Expected: all 7 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add -A && git commit -m "feat: GET /api/admin/stats with parallel MongoDB aggregations"
```

---

## Task 3: Admin Dashboard UI

**Files:**
- Modify: `src/app/admin/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `GET /api/admin/stats?range=7|30|90` (Task 2)
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `@/components/ui/chart` (Task 1)
- Consumes: existing shadcn components — `Card`, `CardContent`, `CardHeader`, `CardTitle` from `@/components/ui/card`; `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from `@/components/ui/table`; `ToggleGroup`, `ToggleGroupItem` from `@/components/ui/toggle-group`; `Badge` from `@/components/ui/badge`; `Button` from `@/components/ui/button`; `Skeleton` from `@/components/ui/skeleton`

- [ ] **Step 1: Verify required shadcn components exist**

Check that these files exist (all should already be installed):
- `src/components/ui/card.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/chart.tsx` (installed in Task 1)

If any are missing, install with: `npx shadcn@latest add <name>`

- [ ] **Step 2: Rewrite `src/app/admin/page.tsx`**

Replace the entire file content. The component is `"use client"`. Structure:

```tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { LayoutDashboard, RefreshCw, FileText, FolderOpen, Users, HardDrive, Trash2, UserCheck } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────────

type Range = "7" | "30" | "90"

type StatsData = {
  kpis: {
    totalUsers: number
    activeToday: number
    newThisWeek: number
    totalNotes: number
    storageUsedBytes: number
    trashItemCount: number
  } | null
  charts: {
    notesPerDay: { date: string; count: number }[]
    activeUsersPerDay: { date: string; count: number }[]
    storageTrend: { date: string; bytes: number }[]
  } | null
  users: {
    id: string
    displayName: string
    email: string
    noteCount: number
    folderCount: number
    storageBytes: number
    isActive: boolean
  }[] | null
  activity: {
    userId: string
    userName: string
    action: string
    target: string
    createdAt: string
  }[] | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── KPI card sub-component ─────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, loading,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="size-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("7")
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  const fetchStats = useCallback(async (r: Range) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/stats?range=${r}`)
      if (!res.ok) throw new Error("Failed to load stats")
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Unknown error")
      setData(json.data)
    } catch (e: any) {
      setError(e.message ?? "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch when navigating to this page or when range changes
  useEffect(() => {
    fetchStats(range)
  }, [fetchStats, range, pathname])

  const { kpis, charts, users, activity } = data ?? {}

  const chartConfig = {
    count: { label: "Count", color: "hsl(var(--chart-1))" },
    bytes: { label: "Storage", color: "hsl(var(--chart-2))" },
  }

  return (
    <div className="space-y-8">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <LayoutDashboard className="size-5 text-violet-600 dark:text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">System overview and activity</p>
        </div>
        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(v) => v && setRange(v as Range)}
          className="shrink-0"
        >
          <ToggleGroupItem value="7" aria-label="Last 7 days">7d</ToggleGroupItem>
          <ToggleGroupItem value="30" aria-label="Last 30 days">30d</ToggleGroupItem>
          <ToggleGroupItem value="90" aria-label="Last 90 days">90d</ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(range)}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchStats(range)}>Try again</Button>
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">System Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Users"   value={kpis ? String(kpis.totalUsers)   : "—"} icon={Users}      loading={loading && !kpis} />
          <KpiCard label="Active Today"  value={kpis ? String(kpis.activeToday)  : "—"} sub={kpis ? `${Math.round((kpis.activeToday / Math.max(kpis.totalUsers, 1)) * 100)}% of users` : undefined} icon={UserCheck} loading={loading && !kpis} />
          <KpiCard label="New This Week" value={kpis ? String(kpis.newThisWeek)  : "—"} icon={Users}      loading={loading && !kpis} />
          <KpiCard label="Total Notes"   value={kpis ? kpis.totalNotes.toLocaleString() : "—"} icon={FileText}  loading={loading && !kpis} />
          <KpiCard label="Storage Used"  value={kpis ? formatBytes(kpis.storageUsedBytes) : "—"} icon={HardDrive} loading={loading && !kpis} />
          <KpiCard label="Trash Items"   value={kpis ? String(kpis.trashItemCount) : "—"} icon={Trash2}    loading={loading && !kpis} />
        </div>
      </section>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Activity Trends — Last {range} Days</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Notes per day */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Notes Created / Day</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && !charts ? (
                <Skeleton className="h-32 w-full" />
              ) : charts?.notesPerDay.length ? (
                <ChartContainer config={chartConfig} className="h-32 w-full">
                  <BarChart data={charts.notesPerDay}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Active users per day */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Active Users / Day</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && !charts ? (
                <Skeleton className="h-32 w-full" />
              ) : charts?.activeUsersPerDay.length ? (
                <ChartContainer config={chartConfig} className="h-32 w-full">
                  <BarChart data={charts.activeUsersPerDay}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Note trend (full width line chart) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Note Creation Trend — Last {range} Days</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !charts ? (
              <Skeleton className="h-40 w-full" />
            ) : charts?.notesPerDay.length ? (
              <ChartContainer config={chartConfig} className="h-40 w-full">
                <LineChart data={charts.notesPerDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data available</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Recent activity feed ────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Recent Activity</p>
        <Card>
          <CardContent className="p-0">
            {loading && !activity ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : activity?.length ? (
              <div className="divide-y">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="size-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                      {a.userName[0]?.toUpperCase()}
                    </span>
                    <span className="font-medium truncate">{a.userName}</span>
                    <span className="text-muted-foreground">{a.action}</span>
                    <span className="font-medium flex-1 truncate">{a.target}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Top users table ─────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Top Users by Activity</p>
        <Card>
          <CardContent className="p-0">
            {loading && !users ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : users?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Notes</TableHead>
                    <TableHead className="text-right">Folders</TableHead>
                    <TableHead className="text-right">Storage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{u.noteCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{u.folderCount}</TableCell>
                      <TableCell className="text-right">{formatBytes(u.storageBytes)}</TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "secondary"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">
          Showing top 10 ·{" "}
          <Link href="/admin/users" className="underline hover:text-foreground">
            View all in User Management →
          </Link>
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: all tests pass (dashboard page is client-only, no new tests needed).

- [ ] **Step 4: Verify in browser**

Navigate to `http://localhost:3000/admin`. Confirm:
- Page header shows Dashboard title + 7d/30d/90d toggle + Refresh button
- 6 KPI cards visible (or skeletons while loading)
- Two bar charts and one line chart render
- Activity feed section is visible
- Top users table is visible
- "Analytics" is gone from the left sidebar nav

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat: admin dashboard — KPIs, charts, activity feed, user table"
```

---

## Done

All three tasks complete. The feature branch `feat/admin-dashboard-analytics` is ready for review. Do not merge to `main` without PR review.

**Verification checklist before opening PR:**
- [ ] `npm test` passes with no failures
- [ ] Dashboard loads data on first visit
- [ ] Navigating away and back refreshes data
- [ ] Refresh button works
- [ ] Time-range toggle (7d/30d/90d) re-fetches and updates charts
- [ ] Analytics nav item no longer appears in sidebar
- [ ] Error banner shows if API returns non-200
- [ ] No TypeScript errors (`npx tsc --noEmit`)
