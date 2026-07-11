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
