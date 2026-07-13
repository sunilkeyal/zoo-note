"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2, Upload, AlertCircle, CheckCircle, Loader2, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { toast } from "sonner"

interface ImportJob {
  _id: string
  userId: string
  user: { email: string; displayName: string } | null
  filename: string
  fileSize: number
  status: string
  progress: {
    totalPages: number
    processedPages: number
    currentStage: string
  } | null
  result: {
    foldersCreated: number
    notesImported: number
    imagesImported: number
  } | null
  error: string | null
  createdAt: string
  updatedAt: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800"><CheckCircle size={12} className="mr-1" /> completed</Badge>
    case "failed":
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800"><AlertCircle size={12} className="mr-1" /> failed</Badge>
    case "processing":
    case "uploading":
    case "converting":
    case "pending":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800"><Loader2 size={12} className="mr-1 animate-spin" /> {status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}

export default function ImportsPage() {
  const { data: session } = useSession()
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [cleanupJob, setCleanupJob] = useState<ImportJob | null>(null)
  const [cleaning, setCleaning] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("sortField", "createdAt")
      params.set("sortDir", "desc")

      const res = await fetch(`/api/admin/imports?${params}`)
      const data = await res.json()
      if (data.success) {
        setJobs(data.data.jobs)
        setTotal(data.data.total)
      }
    } catch {
      toast.error("Failed to load import jobs")
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  async function handleCleanup() {
    if (!cleanupJob) return
    setCleaning(true)
    try {
      const res = await fetch(`/api/admin/imports/${cleanupJob._id}/cleanup`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Cleanup complete", {
          description: `Deleted ${data.data.notesDeleted} notes, ${data.data.foldersDeleted} folders, ${data.data.imagesDeleted} images.`,
        })
        setCleanupJob(null)
        fetchJobs()
      } else {
        toast.error("Cleanup failed", { description: data.error })
      }
    } catch {
      toast.error("Cleanup failed", { description: "Network error" })
    } finally {
      setCleaning(false)
    }
  }

  const canCleanup = (status: string) =>
    status === "failed"

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="size-5 text-purple-600" />
          <h1 className="text-2xl font-bold">Import Jobs</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total} total</span>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Filename</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="space-y-2 py-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No import jobs found.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job._id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={job.filename}>
                    {job.filename}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.user?.email || job.userId}
                  </TableCell>
                  <TableCell>{statusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.result ? (
                      <span className="text-sm text-muted-foreground">
                        {job.result.notesImported} notes, {job.result.foldersCreated} folders, {job.result.imagesImported} images
                      </span>
                    ) : job.progress ? (
                      <span className="text-sm text-muted-foreground">
                        {job.progress.processedPages}/{job.progress.totalPages} pages
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-red-500 text-sm" title={job.error || undefined}>
                    {job.error || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {canCleanup(job.status) ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCleanupJob(job)}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Cleanup
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4 text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pl-1.5! hover:text-muted-foreground", page <= 1 && "pointer-events-none opacity-50")}
                onClick={() => setPage(Math.max(1, page - 1))}
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:block">Previous</span>
              </Button>
            </PaginationItem>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <Button
                    variant={p === page ? "outline" : "ghost"}
                    size="icon"
                    className="h-8 w-8 hover:text-muted-foreground"
                    aria-current={p === page ? "page" : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pr-1.5! hover:text-muted-foreground", page >= totalPages && "pointer-events-none opacity-50")}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                aria-label="Go to next page"
              >
                <span className="hidden sm:block">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm">
          Page {page} of {totalPages} ({total} total)
        </span>
      </div>

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={!!cleanupJob} onOpenChange={(open) => { if (!open) setCleanupJob(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clean Up Import</DialogTitle>
            <DialogDescription>
              This will permanently delete all data created by this import. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cleanupJob && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filename</span>
                <span className="font-medium">{cleanupJob.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{cleanupJob.user?.email || cleanupJob.userId}</span>
              </div>
              {cleanupJob.result && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium">{cleanupJob.result.notesImported}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Folders</span>
                    <span className="font-medium">{cleanupJob.result.foldersCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Images</span>
                    <span className="font-medium">{cleanupJob.result.imagesImported}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupJob(null)} disabled={cleaning}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCleanup} disabled={cleaning}>
              {cleaning ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
