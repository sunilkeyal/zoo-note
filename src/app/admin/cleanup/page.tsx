"use client"

import React, { useState, useCallback } from "react"
import { Trash2, RefreshCw, Loader2, CheckCircle, Image, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
}

interface OrphanedImage {
  id: string
  size: number
  filename: string
  userId?: string
}

export default function CleanupPage() {
  const [imageData, setImageData] = useState<{
    orphaned: OrphanedImage[]
    orphanedCount: number
    orphanedBytes: number
    referencedCount: number
    totalImages: number
  } | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageDeleting, setImageDeleting] = useState(false)

  const [r2Data, setR2Data] = useState<{
    imports: { prefix: string; fileCount: number; totalBytes: number }[]
    imageFiles: { count: number; totalBytes: number }
    otherFiles: { count: number; totalBytes: number }
    totalObjects: number
    totalBytes: number
  } | null>(null)
  const [r2Loading, setR2Loading] = useState(false)
  const [r2Deleting, setR2Deleting] = useState(false)

  const [noteData, setNoteData] = useState<{
    summary: {
      totalNotes: number
      activeNotes: number
      trashedNotes: number
      totalImages: number
      orphanedImages: number
      orphanedImageBytes: number
      r2ObjectCount: number
    }
    notesByUser: { userId: string; count: number }[]
    orphanedImages: { id: string; size: number; filename: string; userId?: string }[]
  } | null>(null)
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteActionLoading, setNoteActionLoading] = useState(false)

  const scanImages = useCallback(async () => {
    setImageLoading(true)
    try {
      const res = await fetch("/api/admin/orphaned-images")
      const data = await res.json()
      if (data.success) {
        setImageData(data.data)
      } else {
        toast.error(data.error || "Failed to scan images")
      }
    } catch {
      toast.error("Failed to scan images")
    } finally {
      setImageLoading(false)
    }
  }, [])

  const scanR2 = useCallback(async () => {
    setR2Loading(true)
    try {
      const res = await fetch("/api/admin/r2/scan", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setR2Data(data.data)
      } else {
        toast.error(data.error || "Failed to scan R2")
      }
    } catch {
      toast.error("Failed to scan R2")
    } finally {
      setR2Loading(false)
    }
  }, [])

  const scanNotes = useCallback(async () => {
    setNoteLoading(true)
    try {
      const res = await fetch("/api/admin/orphaned-notes")
      const notesData = await res.json()
      if (notesData.success) {
        setNoteData(notesData.data)
      } else {
        toast.error(notesData.error || "Failed to scan notes")
      }
    } catch {
      toast.error("Failed to scan notes")
    } finally {
      setNoteLoading(false)
    }
  }, [])

  const deleteAllR2 = useCallback(async () => {
    setR2Deleting(true)
    try {
      const res = await fetch("/api/admin/orphaned-notes?mode=all", { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Deleted ${data.data.r2ObjectsDeleted} R2 objects, ${data.data.deletedNotes} notes, ${data.data.deletedFolders} folders`)
        scanR2()
        scanNotes()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch {
      toast.error("Failed to delete R2 objects")
    } finally {
      setR2Deleting(false)
    }
  }, [scanR2, scanNotes])

  const deleteAllOrphanedNotes = useCallback(async (mode: "all" | "byUser", userId?: string) => {
    setNoteActionLoading(true)
    try {
      const params = new URLSearchParams({ mode })
      if (userId) params.set("userId", userId)
      const res = await fetch(`/api/admin/orphaned-notes?${params}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Deleted ${data.data.deletedNotes} notes, ${data.data.deletedFolders} folders, ${data.data.deletedImages} orphaned images`)
        scanNotes()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch {
      toast.error("Failed to delete notes")
    } finally {
      setNoteActionLoading(false)
    }
  }, [scanNotes])

  const deleteAllOrphanedImages = useCallback(async () => {
    setImageDeleting(true)
    try {
      const res = await fetch("/api/admin/orphaned-images", { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Deleted ${data.data.deletedCount} orphaned images (${formatBytes(data.data.freedBytes)} freed)`)
        scanImages()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch {
      toast.error("Failed to delete images")
    } finally {
      setImageDeleting(false)
    }
  }, [scanImages])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Trash2 className="size-5 text-amber-600 dark:text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cleanup</h1>
          <p className="text-xs text-muted-foreground">Remove orphaned images and notes without folders</p>
        </div>
      </div>

      {/* Orphaned Images */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Orphaned GridFS Images</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={scanImages} disabled={imageLoading}>
                {imageLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
                Scan
              </Button>
              {imageData && imageData.orphanedCount > 0 && (
                <Button variant="destructive" size="sm" onClick={deleteAllOrphanedImages} disabled={imageDeleting}>
                  {imageDeleting ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
                  Delete All ({imageData.orphanedCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {imageData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Total images</p>
                  <p className="font-semibold">{imageData.totalImages}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Referenced</p>
                  <p className="font-semibold text-green-600">{imageData.referencedCount}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Orphaned</p>
                  <p className="font-semibold text-red-600">{imageData.orphanedCount}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Wasted space</p>
                  <p className="font-semibold text-amber-600">{formatBytes(imageData.orphanedBytes)}</p>
                </div>
              </div>
              {imageData.orphaned.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {imageData.orphaned.slice(0, 50).map((img) => (
                    <div key={img.id} className="flex items-center justify-between text-xs rounded-md border p-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono truncate block">{img.filename || img.id}</span>
                        <span className="text-muted-foreground">{formatBytes(img.size)}{img.userId ? ` · user ${img.userId}` : ""}</span>
                      </div>
                    </div>
                  ))}
                  {imageData.orphaned.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center">...and {imageData.orphaned.length - 50} more</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Click Scan to check for orphaned images</p>
          )}
        </CardContent>
      </Card>

      {/* R2 Storage */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">R2 Storage</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={scanR2} disabled={r2Loading}>
                {r2Loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
                Scan R2
              </Button>
              {r2Data && r2Data.totalObjects > 0 && (
                <Button variant="destructive" size="sm" onClick={() => {
                  if (window.confirm(`Delete ALL ${r2Data.totalObjects} R2 objects (${formatBytes(r2Data.totalBytes)})? This cannot be undone.`)) {
                    deleteAllR2()
                  }
                }} disabled={r2Deleting}>
                  {r2Deleting ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
                  Delete ALL R2 ({r2Data.totalObjects})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {r2Data ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Total objects</p>
                  <p className="font-semibold">{r2Data.totalObjects}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Total size</p>
                  <p className="font-semibold text-amber-600">{formatBytes(r2Data.totalBytes)}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Import prefixes</p>
                  <p className="font-semibold">{r2Data.imports.length}</p>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {r2Data.imports.map((imp) => (
                  <div key={imp.prefix} className="flex items-center justify-between text-xs rounded-md border p-2">
                    <span className="font-mono truncate">{imp.prefix}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{imp.fileCount} files · {formatBytes(imp.totalBytes)}</span>
                  </div>
                ))}
                {r2Data.imageFiles.count > 0 && (
                  <div className="flex items-center justify-between text-xs rounded-md border p-2">
                    <span className="font-mono">image files (root)</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{r2Data.imageFiles.count} files · {formatBytes(r2Data.imageFiles.totalBytes)}</span>
                  </div>
                )}
                {r2Data.otherFiles.count > 0 && (
                  <div className="flex items-center justify-between text-xs rounded-md border p-2">
                    <span className="font-mono">other files</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{r2Data.otherFiles.count} files · {formatBytes(r2Data.otherFiles.totalBytes)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Click Scan R2 to check storage</p>
          )}
        </CardContent>
      </Card>

      {/* Orphaned Notes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Notes Collection</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={scanNotes} disabled={noteLoading}>
                {noteLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
                Scan
              </Button>
              {noteData && noteData.summary.totalNotes > 0 && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => deleteAllOrphanedNotes("all")} disabled={noteActionLoading}>
                    {noteActionLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
                    Delete ALL ({noteData.summary.totalNotes})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {noteData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Total notes</p>
                  <p className="font-semibold">{noteData.summary.totalNotes}</p>
                  {noteData.summary.trashedNotes > 0 && (
                    <p className="text-[10px] text-muted-foreground">{noteData.summary.trashedNotes} in trash</p>
                  )}
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">GridFS images</p>
                  <p className="font-semibold">{noteData.summary.totalImages}</p>
                  {noteData.summary.orphanedImages > 0 && (
                    <p className="text-[10px] text-red-500">{noteData.summary.orphanedImages} orphaned</p>
                  )}
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">R2 objects</p>
                  <p className="font-semibold">{noteData.summary.r2ObjectCount}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Orphaned image bytes</p>
                  <p className="font-semibold text-amber-600">{formatBytes(noteData.summary.orphanedImageBytes)}</p>
                </div>
              </div>
              {noteData.notesByUser.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Notes by user</p>
                  <div className="space-y-1">
                    {noteData.notesByUser.map((u) => (
                      <div key={u.userId} className="flex items-center justify-between text-xs rounded-md border p-2">
                        <span className="font-mono truncate">{u.userId}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{u.count} notes</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => {
                              if (window.confirm(`Delete all ${u.count} notes for this user?`)) {
                                deleteAllOrphanedNotes("byUser", u.userId)
                              }
                            }}
                            disabled={noteActionLoading}
                          >
                            Delete user notes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {noteData.orphanedImages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Orphaned GridFS images ({noteData.orphanedImages.length})</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {noteData.orphanedImages.slice(0, 50).map((img) => (
                      <div key={img.id} className="flex items-center justify-between text-xs rounded-md border p-2 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <span className="font-mono truncate block">{img.filename || img.id}</span>
                          <span className="text-muted-foreground">{formatBytes(img.size)}{img.userId ? ` · user ${img.userId}` : ""}</span>
                        </div>
                      </div>
                    ))}
                    {noteData.orphanedImages.length > 50 && (
                      <p className="text-xs text-muted-foreground text-center">...and {noteData.orphanedImages.length - 50} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Click Scan to see storage breakdown</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
