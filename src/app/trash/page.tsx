"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import TrashTable from "@/components/TrashTable"
import EmptyTrashDialog from "@/components/EmptyTrashDialog"
import { useNotes } from "@/contexts/NoteContext"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function TrashPage() {
  const { trashItems, trashLoading, trashError, fetchTrash, restoreItems, permanentDeleteItems } = useNotes()
  const [hasLoaded, setHasLoaded] = useState(false)
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false)
  const [isOperating, setIsOperating] = useState(false)

  useEffect(() => {
    fetchTrash().then(() => setHasLoaded(true))
  }, [fetchTrash])

  const items = [
    ...trashItems.folders.map((folder) => ({
      id: folder._id,
      title: folder.name,
      type: "folder" as const,
      userId: folder.userId,
      deletedAt: folder.deletedAt || "",
      notesCount: trashItems.notes.filter((n) => n.folderId === folder._id).length,
    })),
    ...trashItems.notes.map((note) => ({
      id: note._id,
      title: note.title,
      type: "note" as const,
      folderId: note.folderId,
      folderName: note.folderName,
      userId: note.userId,
      deletedAt: note.deletedAt || "",
    })),
  ]

  const trashTotalCount = trashItems.notes.length + trashItems.folders.length
  const hasTrashItems = trashTotalCount > 0

  const handleRestore = async (noteIds: string[], folderIds: string[]) => {
    await restoreItems(noteIds, folderIds)
  }

  const handlePermanentDelete = async (noteIds: string[], folderIds: string[]) => {
    await permanentDeleteItems(noteIds, folderIds)
  }

  const handleRestoreAll = async () => {
    setIsOperating(true)
    try {
      const noteIds = trashItems.notes.map((n) => n._id)
      const folderIds = trashItems.folders.map((f) => f._id)
      const result = await restoreItems(noteIds, folderIds)
      if (result.success) {
        toast.success("All items restored", {
          description: `Restored ${noteIds.length} note${noteIds.length !== 1 ? "s" : ""} and ${folderIds.length} folder${folderIds.length !== 1 ? "s" : ""}.`,
        })
      } else {
        toast.error("Restore failed", {
          description: result.error || "An unexpected error occurred.",
        })
      }
    } catch {
      toast.error("Network error", {
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsOperating(false)
    }
  }

  const handleEmptyTrashConfirm = async () => {
    setIsOperating(true)
    try {
      const noteIds = trashItems.notes.map((n) => n._id)
      const folderIds = trashItems.folders.map((f) => f._id)
      const result = await permanentDeleteItems(noteIds, folderIds)
      if (result.success) {
        toast.success("Trash emptied", {
          description: `Permanently deleted ${noteIds.length} note${noteIds.length !== 1 ? "s" : ""} and ${folderIds.length} folder${folderIds.length !== 1 ? "s" : ""}.`,
        })
        setEmptyTrashDialogOpen(false)
      } else {
        toast.error("Delete failed", {
          description: result.error || "An unexpected error occurred.",
        })
      }
    } catch {
      toast.error("Network error", {
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsOperating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
          <Trash2 className="size-5 text-rose-600 dark:text-rose-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-xs text-muted-foreground">Recently deleted notes and folders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasTrashItems || isOperating}
            onClick={handleRestoreAll}
            aria-label="Restore all items from trash"
          >
            Restore All
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!hasTrashItems || isOperating}
            onClick={() => setEmptyTrashDialogOpen(true)}
            aria-label="Empty trash permanently"
          >
            Empty Trash
          </Button>
        </div>
      </div>
      {hasLoaded && (
        <TrashTable
          items={items}
          loading={trashLoading}
          error={trashError}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onRetry={fetchTrash}
        />
      )}
      <EmptyTrashDialog
        open={emptyTrashDialogOpen}
        noteCount={trashItems.notes.length}
        folderCount={trashItems.folders.length}
        onConfirm={handleEmptyTrashConfirm}
        onCancel={() => setEmptyTrashDialogOpen(false)}
      />
    </div>
  )
}
