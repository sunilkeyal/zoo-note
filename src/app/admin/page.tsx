"use client"

import React, { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { LayoutDashboard, RefreshCw, FileText, Folder, Users, HardDrive, Trash2, UserCheck, Sparkles, ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis } from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────────

type Range = "7" | "30" | "90"

type StatsData = {
  kpis: {
    totalUsers: number
    activeToday: number
    newThisWeek: number
    totalNotes: number
    totalFolders: number
    storageUsedBytes: number
    storageBreakdown: {
      databases: { name: string; sizeOnDisk: number; isAppDb: boolean }[]
      totalBytes: number
    } | null
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

type R2BucketInfo = {
  name: string
  objectCount: number
  payloadSize: number
  isPrimary: boolean
}

type R2StorageData = {
  totalObjects: number
  totalBytes: number
  buckets: R2BucketInfo[]
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
}

function percent(total: number, part: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0
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

// ── Collapsible section wrapper ───────────────────────────────────────────────

function CollapsibleSection({
  title, icon: Icon, defaultOpen = true, children,
}: {
  title: string; icon: React.ElementType; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-xl">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{title}</p>
          </div>
          {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ── Chart config ─────────────────────────────────────────────────────────────

const chartConfig = {
  count: { label: "Count", color: "var(--chart-1)" },
  bytes: { label: "Storage", color: "var(--chart-2)" },
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("7")
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cleanupPending, setCleanupPending] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number; freedBytes: number } | null>(null)
  const [cleanupConfirm, setCleanupConfirm] = useState(false)
  const [sweepConfirm, setSweepConfirm] = useState(false)
  const [sweepPending, setSweepPending] = useState(false)
  const [sweepResult, setSweepResult] = useState<{ orphanedFound: number; filesDeleted: number } | null>(null)
  const [r2Storage, setR2Storage] = useState<R2StorageData>(null)
  const [r2Requests, setR2Requests] = useState<R2RequestData>(null)
  const [r2Cost, setR2Cost] = useState<R2CostData>(null)
  const [r2Objects, setR2Objects] = useState<R2ObjectData>(null)
  const [r2Loading, setR2Loading] = useState(true)
  const [r2Error, setR2Error] = useState<string | null>(null)
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [])

  const runCleanup = useCallback(async () => {
    setCleanupPending(true)
    setCleanupConfirm(false)
    setCleanupResult(null)
    try {
      const res = await fetch("/api/admin/orphaned-images", { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Cleanup failed")
      setCleanupResult(json.data)
      fetchStats(range)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cleanup failed")
    } finally {
      setCleanupPending(false)
    }
  }, [fetchStats, range])

  const runSweep = useCallback(async () => {
    setSweepPending(true)
    setSweepConfirm(false)
    setSweepResult(null)
    try {
      const res = await fetch("/api/admin/r2/sweep", { method: "POST" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Sweep failed")
      setSweepResult(json.data)
      fetchStats(range)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sweep failed")
    } finally {
      setSweepPending(false)
    }
  }, [fetchStats, range])

  // Re-fetch when navigating to this page or when range changes
  useEffect(() => {
    fetchStats(range)
  }, [fetchStats, range, pathname])

  const fetchR2Metrics = useCallback((r: Range) => {
    setR2Loading(true)
    setR2Error(null)
    Promise.all([
      fetch("/api/admin/r2?metric=storage").then(r => r.json()),
      fetch(`/api/admin/r2?metric=requests&range=${r}`).then(r => r.json()),
      fetch(`/api/admin/r2?metric=cost&range=${r}`).then(r => r.json()),
      fetch("/api/admin/r2?metric=objects&limit=10").then(r => r.json()),
    ]).then(([storage, requests, cost, objects]) => {
      if (storage.notConfigured) {
        setR2Error(JSON.stringify({ storageProvider: storage.storageProvider, missingVars: storage.missingVars }))
        setR2Loading(false)
        return
      }
      if (!storage.success) throw new Error(storage.error || "Failed to load storage metrics")
      setR2Storage(storage.data)
      setR2Requests(requests.data)
      setR2Cost(cost.data)
      setR2Objects(objects.data)
      setR2Loading(false)
    }).catch((e) => {
      setR2Error(e instanceof Error ? e.message : "Failed to load R2 metrics")
      setR2Loading(false)
    })
  }, [])

  useEffect(() => {
    fetchR2Metrics(range)
  }, [fetchR2Metrics, range])

  const { kpis, charts, users, activity } = data ?? {}

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
          value={[range]}
          onValueChange={(v: string[]) => {
            const n = v[0]
            if (n === "7" || n === "30" || n === "90") setRange(n)
          }}
          className="shrink-0"
        >
          <ToggleGroupItem value="7" aria-label="Last 7 days">7d</ToggleGroupItem>
          <ToggleGroupItem value="30" aria-label="Last 30 days">30d</ToggleGroupItem>
          <ToggleGroupItem value="90" aria-label="Last 90 days">90d</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchStats(range); fetchR2Metrics(range) }}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Reload Stats
          </Button>
          <div className="h-6 w-px bg-border" />
          {!cleanupConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setCleanupConfirm(true); setCleanupResult(null) }}
              disabled={cleanupPending}
            >
              Delete Orphaned Images
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Delete all images not referenced in any note?</span>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={runCleanup}>Yes, delete</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCleanupConfirm(false)}>Cancel</Button>
            </div>
          )}
          {!sweepConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setSweepConfirm(true); setSweepResult(null) }}
              disabled={sweepPending}
            >
              Delete Orphaned R2 Imports
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Scan R2 import files and delete any without a matching job?</span>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={runSweep}>Yes, delete</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSweepConfirm(false)}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchStats(range)}>Try again</Button>
        </div>
      )}

      {/* ── Cleanup success messages ──────────────────────────────────────── */}
      {cleanupResult && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Deleted {cleanupResult.deletedCount} orphaned image{cleanupResult.deletedCount !== 1 ? "s" : ""}, freed {formatBytes(cleanupResult.freedBytes)}.
        </div>
      )}
      {sweepResult && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Found {sweepResult.orphanedFound} orphaned import{sweepResult.orphanedFound !== 1 ? "s" : ""}, deleted {sweepResult.filesDeleted} file{sweepResult.filesDeleted !== 1 ? "s" : ""}.
        </div>
      )}

      {/* ── Summary KPIs ───────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Users" value={kpis ? String(kpis.totalUsers) : "—"} sub={kpis ? `${kpis.activeToday} active today` : undefined} icon={Users} loading={loading && !kpis} />
          <KpiCard label="Total Notes" value={kpis ? kpis.totalNotes.toLocaleString() : "—"} sub={kpis ? `+${kpis.newThisWeek} this week` : undefined} icon={FileText} loading={loading && !kpis} />
          <KpiCard
            label="MongoDB"
            value={loading && !kpis ? "—" : kpis?.storageBreakdown ? formatBytes(kpis.storageBreakdown.totalBytes) : "—"}
            sub={kpis?.storageBreakdown ? `${percent(512 * 1024 * 1024, kpis.storageBreakdown.totalBytes)}% of 512 MB` : undefined}
            icon={HardDrive}
            loading={loading && !kpis}
          />
          <KpiCard
            label="R2 Cost"
            value={r2Loading ? "—" : `$${(r2Cost?.cost ?? 0).toFixed(2)}`}
            sub={r2Storage?.totalBytes ? `${formatBytes(r2Storage.totalBytes)} stored` : undefined}
            icon={Sparkles}
            loading={r2Loading && !r2Cost}
          />
        </div>
      </section>

      {/* ── Application Metrics ────────────────────────────────────────────── */}
      <CollapsibleSection title="Application Metrics" icon={FileText}>
        {/* App KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Active Today" value={kpis ? String(kpis.activeToday) : "—"} sub={kpis ? `${Math.round((kpis.activeToday / Math.max(kpis.totalUsers, 1)) * 100)}% of users` : undefined} icon={UserCheck} loading={loading && !kpis} />
          <KpiCard label="New This Week" value={kpis ? String(kpis.newThisWeek) : "—"} icon={Users} loading={loading && !kpis} />
          <KpiCard label="Total Folders" value={kpis ? kpis.totalFolders.toLocaleString() : "—"} icon={Folder} loading={loading && !kpis} />
          <KpiCard label="Trash Items" value={kpis ? String(kpis.trashItemCount) : "—"} icon={Trash2} loading={loading && !kpis} />
          <KpiCard label="Total Users" value={kpis ? String(kpis.totalUsers) : "—"} icon={Users} loading={loading && !kpis} />
          <KpiCard label="Total Notes" value={kpis ? kpis.totalNotes.toLocaleString() : "—"} icon={FileText} loading={loading && !kpis} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Notes Created / Day</CardTitle></CardHeader>
            <CardContent>
              {loading && !charts ? (
                <Skeleton className="h-32 w-full" />
              ) : charts?.notesPerDay.length ? (
                <ChartContainer config={chartConfig} className="h-32 w-full">
                  <BarChart data={charts.notesPerDay}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Active Users / Day</CardTitle></CardHeader>
            <CardContent>
              {loading && !charts ? (
                <Skeleton className="h-32 w-full" />
              ) : charts?.activeUsersPerDay.length ? (
                <ChartContainer config={chartConfig} className="h-32 w-full">
                  <BarChart data={charts.activeUsersPerDay}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Users */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Top Users (all time)</p>
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
        </div>
      </CollapsibleSection>

      {/* ── Infrastructure ─────────────────────────────────────────────────── */}
      <CollapsibleSection title="Infrastructure" icon={HardDrive}>
        {/* R2 error */}
        {r2Error && (() => {
          let parsed: { storageProvider?: string; missingVars?: string[] } | null = null
          try { parsed = JSON.parse(r2Error) } catch { /* plain error string */ }

          if (parsed?.storageProvider === "local") {
            return (
              <div className="rounded-md bg-muted border p-3 text-sm text-muted-foreground mb-4">
                <p className="font-medium">R2 metrics unavailable in local mode</p>
                <p className="text-xs mt-1">Using local filesystem storage (<code>STORAGE_PROVIDER=local</code>). R2 metrics are only shown when deployed with <code>STORAGE_PROVIDER=r2</code>.</p>
              </div>
            )
          }

          if (parsed?.storageProvider === "r2" && parsed.missingVars?.length) {
            return (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300 mb-4">
                <p className="font-medium">R2 credentials incomplete</p>
                <p className="text-xs mt-1">Storage provider is set to R2 but the following env vars are missing:</p>
                <ul className="text-xs mt-1 list-disc list-inside">
                  {parsed.missingVars.map(v => <li key={v}><code>{v}</code></li>)}
                </ul>
              </div>
            )
          }

          return (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4">
              <p className="font-medium">Failed to load R2 metrics</p>
              <p className="text-xs mt-1">{r2Error}</p>
            </div>
          )
        })()}

        {/* Storage cards side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* MongoDB storage */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">MongoDB Storage</p>
              </div>
              {loading && !kpis ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : kpis?.storageBreakdown ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{formatBytes(kpis.storageBreakdown.totalBytes)}</p>
                    <p className="text-xs text-muted-foreground">/ 512 MB ({percent(512 * 1024 * 1024, kpis.storageBreakdown.totalBytes)}%)</p>
                  </div>
                  <Progress value={percent(512 * 1024 * 1024, kpis.storageBreakdown.totalBytes)} className="h-1.5 mt-2" />
                  {kpis.storageBreakdown.databases.filter((d) => d.isAppDb).map((db) => (
                    <div key={db.name} className="mt-2">
                      <p className="text-[9px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold">Primary</p>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold">{db.name}</span>
                        <span className="font-medium">{formatBytes(db.sizeOnDisk)}</span>
                      </div>
                    </div>
                  ))}
                  {kpis.storageBreakdown.databases.filter((d) => !d.isAppDb).length > 0 && (
                    <>
                      <div className="border-t my-1.5" />
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">System</p>
                      {kpis.storageBreakdown.databases.filter((d) => !d.isAppDb).map((db) => (
                        <div key={db.name} className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{db.name}</span>
                          <span>{formatBytes(db.sizeOnDisk)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {/* R2 storage */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">R2 Storage</p>
              </div>
              {r2Loading ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{formatBytes(r2Storage?.totalBytes ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">/ 10 GB ({percent(10 * 1024 * 1024 * 1024, r2Storage?.totalBytes ?? 0)}%)</p>
                  </div>
                  <Progress value={percent(10 * 1024 * 1024 * 1024, r2Storage?.totalBytes ?? 0)} className="h-1.5 mt-2" />
                  {(r2Storage?.buckets ?? []).filter((b) => b.isPrimary).map((b) => (
                    <div key={b.name} className="mt-2">
                      <p className="text-[9px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold">Primary</p>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold">{b.name}</span>
                        <span className="font-medium">{b.objectCount.toLocaleString()} objects &middot; {formatBytes(b.payloadSize)}</span>
                      </div>
                    </div>
                  ))}
                  {(r2Storage?.buckets ?? []).filter((b) => !b.isPrimary).length > 0 && (
                    <>
                      <div className="border-t my-1.5" />
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Other Buckets</p>
                      {(r2Storage?.buckets ?? []).filter((b) => !b.isPrimary).map((b) => (
                        <div key={b.name} className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{b.name}</span>
                          <span>{b.objectCount.toLocaleString()} objects &middot; {formatBytes(b.payloadSize)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* R2 Operations KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <KpiCard label="Total Objects" value={r2Loading ? "" : String(r2Storage?.totalObjects ?? 0)} icon={FileText} loading={r2Loading} />
          <KpiCard label="Total Buckets" value={r2Loading ? "" : String(r2Storage?.buckets?.length ?? 0)} icon={HardDrive} loading={r2Loading} />
          <KpiCard label="Egress" value={r2Loading ? "" : formatBytes(r2Requests?.bandwidth.egress ?? 0)} icon={FileText} loading={r2Loading} />
          <KpiCard label="Ingress" value={r2Loading ? "" : formatBytes(r2Requests?.bandwidth.ingress ?? 0)} icon={FileText} loading={r2Loading} />
          <KpiCard label="GET Requests" value={r2Loading ? "" : (r2Requests?.requests.get ?? 0).toLocaleString()} icon={FileText} loading={r2Loading} />
          <KpiCard label="PUT Requests" value={r2Loading ? "" : (r2Requests?.requests.put ?? 0).toLocaleString()} icon={FileText} loading={r2Loading} />
        </div>

        {/* Cost estimate */}
        <Card className="mt-4">
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

        {/* Largest files */}
        {r2Objects && r2Objects.objects.length > 0 && (
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm">Largest Files (R2)</CardTitle></CardHeader>
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
      </CollapsibleSection>

      {/* ── Activity ───────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Activity" icon={UserCheck}>
        {/* Storage growth chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Storage Growth — Last {range} Days</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !charts ? (
              <Skeleton className="h-40 w-full" />
            ) : charts?.storageTrend.length ? (
              <ChartContainer config={chartConfig} className="h-40 w-full">
                <LineChart data={charts.storageTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="bytes" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity feed */}
        <Card className="mt-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Activity</CardTitle></CardHeader>
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
      </CollapsibleSection>
    </div>
  )
}
