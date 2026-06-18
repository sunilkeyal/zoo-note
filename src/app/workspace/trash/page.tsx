"use client"

import { useEffect } from "react"
import TrashTable from "@/components/TrashTable"
import { useNotes } from "@/contexts/NoteContext"

export default function TrashPage() {
  const { trashItems, trashLoading, trashError, fetchTrash, restoreItems, permanentDeleteItems } = useNotes()

  useEffect(() => {
    fetchTrash()
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

  const handleRestore = async (noteIds: string[], folderIds: string[]) => {
    await restoreItems(noteIds, folderIds)
  }

  const handlePermanentDelete = async (noteIds: string[], folderIds: string[]) => {
    await permanentDeleteItems(noteIds, folderIds)
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Trash</h1>
      <p className="text-muted-foreground mb-6">
        Notes and folders you deleted. Items are automatically purged after 7 days.
      </p>
      <TrashTable
        items={items}
        loading={trashLoading}
        error={trashError}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onRetry={fetchTrash}
      />
    </div>
  )
}
