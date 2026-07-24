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
import { Trash2, Upload, AlertCircle, CheckCircle, Loader2, ChevronLeftIcon, ChevronRightIcon, ArrowUp, RotateCcw, Wrench, Search, RefreshCw } from "lucide-react"
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
  r2Key: string | null
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
  const [retryJob, setRetryJob] = useState<ImportJob | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [recoverJob, setRecoverJob] = useState<ImportJob | null>(null)
  const [recovering, setRecovering] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResults, setScanResults] = useState<{
    imports: {
      prefix: string
      jobId: string | null
      jobExists: boolean
      jobStatus: string | null
      fileCount: number
      totalBytes: number
      htmlFileCount: number
      hasConverted: boolean
    }[]
    imageFiles: { count: number; totalBytes: number }
    otherFiles: { count: number; totalBytes: number }
    totalObjects: number
    totalBytes: number
  } | null>(null)
  const [recoveringPrefix, setRecoveringPrefix] = useState<string | null>(null)

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

  async function handleRetry() {
    if (!retryJob) return
    setRetrying(true)
    try {
      const res = await fetch(`/api/admin/imports/${retryJob._id}/retry`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Import retry started", {
          description: "The import has been reset to processing. Use the status poller to track progress.",
        })
        setRetryJob(null)
        fetchJobs()
      } else {
        toast.error("Retry failed", { description: data.error })
      }
    } catch {
      toast.error("Retry failed", { description: "Network error" })
    } finally {
      setRetrying(false)
    }
  }

  async function handleRecovery() {
    if (!recoverJob) return
    setRecovering(true)
    try {
      const res = await fetch("/api/admin/r2/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: recoverJob._id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Recovery complete", {
          description: `Recovered ${data.data.notesImported} notes, ${data.data.foldersCreated} folders, ${data.data.imagesImported} images.`,
        })
        setRecoverJob(null)
        fetchJobs()
      } else {
        toast.error("Recovery failed", { description: data.error })
      }
    } catch {
      toast.error("Recovery failed", { description: "Network error" })
    } finally {
      setRecovering(false)
    }
  }

  async function handleScanR2() {
    setScanLoading(true)
    setScanResults(null)
    try {
      const res = await fetch("/api/admin/r2/scan", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setScanResults(data.data)
      } else {
        toast.error("Scan failed", { description: data.error })
      }
    } catch {
      toast.error("Scan failed", { description: "Network error" })
    } finally {
      setScanLoading(false)
    }
  }

  async function handleRecoverPrefix(prefix: string, userId: string) {
    setRecoveringPrefix(prefix)
    try {
      const res = await fetch("/api/admin/r2/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, userId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Recovery complete", {
          description: `Recovered ${data.data.notesImported} notes, ${data.data.foldersCreated} folders, ${data.data.imagesImported} images.`,
        })
        fetchJobs()
        // Refresh scan results
        handleScanR2()
      } else {
        toast.error("Recovery failed", { description: data.error })
      }
    } catch {
      toast.error("Recovery failed", { description: "Network error" })
    } finally {
      setRecoveringPrefix(null)
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
            onClick={() => { setScanOpen(true); setScanResults(null); handleScanR2() }}
          >
            <Search size={14} className="mr-1" />
            Scan R2
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
                    <div className="flex items-center justify-end gap-1">
                      {job.status === "failed" && job.r2Key && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecoverJob(job)}
                        >
                          <Wrench size={14} className="mr-1" />
                          Recover
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRetryJob(job)}
                        >
                          <RotateCcw size={14} className="mr-1" />
                          Retry
                        </Button>
                      )}
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
                      ) : null}
                    </div>
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

      {/* Retry Confirmation Dialog */}
      <Dialog open={!!retryJob} onOpenChange={(open) => { if (!open) setRetryJob(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry Failed Import</DialogTitle>
            <DialogDescription>
              This will reset the import to processing state. The status poller will pick it up and continue processing from where it left off.
            </DialogDescription>
          </DialogHeader>
          {retryJob && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filename</span>
                <span className="font-medium">{retryJob.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{retryJob.user?.email || retryJob.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Error</span>
                <span className="font-medium text-red-500">{retryJob.error || "—"}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetryJob(null)} disabled={retrying}>
              Cancel
            </Button>
            <Button onClick={handleRetry} disabled={retrying}>
              {retrying ? "Retrying..." : "Retry Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recovery Confirmation Dialog */}
      <Dialog open={!!recoverJob} onOpenChange={(open) => { if (!open) setRecoverJob(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recover Import from R2</DialogTitle>
            <DialogDescription>
              This will scan R2 for converted files under this job&apos;s prefix and create notes from them. A new recovery job will be created to track progress.
            </DialogDescription>
          </DialogHeader>
          {recoverJob && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filename</span>
                <span className="font-medium">{recoverJob.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{recoverJob.user?.email || recoverJob.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">R2 Key</span>
                <span className="font-medium font-mono text-xs">{recoverJob.r2Key || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Error</span>
                <span className="font-medium text-red-500">{recoverJob.error || "—"}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoverJob(null)} disabled={recovering}>
              Cancel
            </Button>
            <Button onClick={handleRecovery} disabled={recovering}>
              {recovering ? "Recovering..." : "Recover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan R2 Dialog */}
      <Dialog open={scanOpen} onOpenChange={(open) => { if (!open) setScanOpen(false) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scan R2 for Orphaned Imports</DialogTitle>
            <DialogDescription>
              Lists all import prefixes in R2. Prefixes without a matching job in the database are orphaned and can be recovered.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {scanLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Scanning R2...</span>
              </div>
            ) : scanResults ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Import artifacts</p>
                    <p className="text-lg font-semibold">{scanResults.imports.length} prefixes</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(scanResults.imports.reduce((s, p) => s + p.totalBytes, 0))}</p>
                  </div>
                  <div className="rounded-md border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Image files</p>
                    <p className="text-lg font-semibold">{scanResults.imageFiles.count}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(scanResults.imageFiles.totalBytes)}</p>
                  </div>
                </div>
                {scanResults.otherFiles.count > 0 && (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Other files</p>
                    <p className="text-lg font-semibold">{scanResults.otherFiles.count}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(scanResults.otherFiles.totalBytes)}</p>
                  </div>
                )}
                {scanResults.imports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No import files found in R2.</p>
                ) : (
                  <div className="space-y-2">
                    {scanResults.imports.map((p) => (
                      <div key={p.prefix} className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs truncate">{p.prefix}</span>
                            {p.jobExists ? (
                              <Badge variant="secondary" className="shrink-0">job exists ({p.jobStatus})</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0">orphaned</Badge>
                            )}
                            {p.hasConverted && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 shrink-0">{p.htmlFileCount} pages</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {p.fileCount} files, {formatFileSize(p.totalBytes)}
                          </p>
                        </div>
                        {p.hasConverted && !p.jobExists && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 shrink-0"
                            disabled={recoveringPrefix === p.prefix}
                            onClick={() => {
                              const userId = window.prompt("Enter the user ID to assign recovered notes to:")
                              if (userId) handleRecoverPrefix(p.prefix, userId)
                            }}
                          >
                            {recoveringPrefix === p.prefix ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <Wrench size={14} className="mr-1" />
                                Recover
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>
              Close
            </Button>
            {!scanLoading && (
              <Button variant="outline" onClick={handleScanR2}>
                <RefreshCw size={14} className="mr-1" />
                Rescan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
