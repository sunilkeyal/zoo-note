"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Folder } from "@/types"

interface FolderPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: Folder[]
  onSelect: (folderId: string | null) => void
  onCancel?: () => void
}

export default function FolderPickerModal({
  open,
  onOpenChange,
  folders,
  onSelect,
  onCancel,
}: FolderPickerModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const handleConfirm = () => {
    onSelect(selectedFolderId)
    onOpenChange(false)
    setSelectedFolderId(null)
  }

  const handleDismiss = () => {
    onOpenChange(false)
    setSelectedFolderId(null)
    onCancel?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Folder</DialogTitle>
          <DialogDescription>
            Choose a folder for your new note, or leave it in the root.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`px-3 py-2 rounded-md text-sm text-left transition-colors ${
              selectedFolderId === null
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            No folder (root)
          </button>
          {folders.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No folders available. Create a folder first to organize your notes.
            </p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder._id}
                onClick={() => setSelectedFolderId(folder._id)}
                className={`px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  selectedFolderId === folder._id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {folder.name}
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
