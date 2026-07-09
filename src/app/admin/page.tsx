"use client"

import React, { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { LayoutDashboard, RefreshCw, FileText, Users, HardDrive, Trash2, UserCheck } from "lucide-react"
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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis } from "recharts"

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

  // Re-fetch when navigating to this page or when range changes
  useEffect(() => {
    fetchStats(range)
  }, [fetchStats, range, pathname])

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
                    <Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
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
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
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
                  <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Storage growth line chart */}
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
      </section>
    </div>
  )
}
