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
