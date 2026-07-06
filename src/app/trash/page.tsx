"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import TrashTable from "@/components/TrashTable"
import { useNotes } from "@/contexts/NoteContext"

export default function TrashPage() {
  const { trashItems, trashLoading, trashError, fetchTrash, restoreItems, permanentDeleteItems } = useNotes()
  const [hasLoaded, setHasLoaded] = useState(false)

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

  const handleRestore = async (noteIds: string[], folderIds: string[]) => {
    await restoreItems(noteIds, folderIds)
  }

  const handlePermanentDelete = async (noteIds: string[], folderIds: string[]) => {
    await permanentDeleteItems(noteIds, folderIds)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
          <Trash2 className="size-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-xs text-muted-foreground">Recently deleted notes and folders</p>
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
    </div>
  )
}
