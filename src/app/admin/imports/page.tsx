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
import { Trash2, Upload, AlertCircle, CheckCircle, Loader2, ChevronLeftIcon, ChevronRightIcon, ArrowUp, HardDrive } from "lucide-react"
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
  const [sortField, setSortField] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [cleanupJob, setCleanupJob] = useState<ImportJob | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [r2CleanupJob, setR2CleanupJob] = useState<ImportJob | null>(null)
  const [r2Cleaning, setR2Cleaning] = useState(false)
  const [sweepDialogOpen, setSweepDialogOpen] = useState(false)
  const [sweeping, setSweeping] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("sortField", sortField)
      params.set("sortDir", sortDir)

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
  }, [page, limit, statusFilter, sortField, sortDir])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  function handleSortChange(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1)
  }

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

  async function handleR2Cleanup() {
    if (!r2CleanupJob) return
    setR2Cleaning(true)
    try {
      const res = await fetch(`/api/admin/imports/${r2CleanupJob._id}/cleanup-r2`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Temporary files cleaned", {
          description: data.filesDeleted > 0
            ? `Deleted ${data.filesDeleted} file${data.filesDeleted !== 1 ? "s" : ""} from R2.`
            : "No temporary files found (already cleaned).",
        })
        setR2CleanupJob(null)
        fetchJobs()
      } else {
        toast.error("R2 cleanup failed", { description: data.error })
      }
    } catch {
      toast.error("R2 cleanup failed", { description: "Network error" })
    } finally {
      setR2Cleaning(false)
    }
  }

  async function handleSweep() {
    setSweeping(true)
    try {
      const res = await fetch("/api/admin/r2/sweep", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast.success("Sweep complete", {
          description: `Found ${data.orphanedFound} orphaned import${data.orphanedFound !== 1 ? "s" : ""}, deleted ${data.filesDeleted} file${data.filesDeleted !== 1 ? "s" : ""}.`,
        })
        setSweepDialogOpen(false)
      } else {
        toast.error("Sweep failed", { description: data.error })
      }
    } catch {
      toast.error("Sweep failed", { description: "Network error" })
    } finally {
      setSweeping(false)
    }
  }

  const canCleanup = (status: string) =>
    status !== "completed"

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSweepDialogOpen(true)}
          >
            <HardDrive size={14} className="mr-1" />
            Sweep Orphans
          </Button>
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
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSortChange("filename")}>
                <div className="flex items-center gap-1">
                  Filename
                  {sortField === "filename" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSortChange("status")}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === "status" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSortChange("createdAt")}>
                <div className="flex items-center gap-1">
                  Created
                  {sortField === "createdAt" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
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
                    ) : job.status === "completed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setR2CleanupJob(job)}
                      >
                        Clean Temp Files
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
              This will cancel the import and permanently delete all data created by it. This action cannot be undone.
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

      {/* R2 Cleanup Confirmation Dialog */}
      <Dialog open={!!r2CleanupJob} onOpenChange={(open) => { if (!open) setR2CleanupJob(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clean Temporary Import Files</DialogTitle>
            <DialogDescription>
              This will delete the temporary files used during import (source file and converted files in R2). Your notes, folders, and images in the database will NOT be affected.
            </DialogDescription>
          </DialogHeader>
          {r2CleanupJob && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filename</span>
                <span className="font-medium">{r2CleanupJob.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{r2CleanupJob.user?.email || r2CleanupJob.userId}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setR2CleanupJob(null)} disabled={r2Cleaning}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleR2Cleanup} disabled={r2Cleaning}>
              {r2Cleaning ? "Cleaning..." : "Clean Temporary Files"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sweep Orphans Confirmation Dialog */}
      <Dialog open={sweepDialogOpen} onOpenChange={(open) => { if (!open) setSweepDialogOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sweep Orphaned R2 Files</DialogTitle>
            <DialogDescription>
              This will scan all R2 import files and delete any that don&apos;t have a matching import job in the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSweepDialogOpen(false)} disabled={sweeping}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSweep} disabled={sweeping}>
              {sweeping ? "Sweeping..." : "Sweep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
