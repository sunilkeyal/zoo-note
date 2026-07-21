"use client"

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  noteCount: number
  folderCount: number
  onClose: () => void
  onConfirm: () => void
}

export default function BulkDeleteDialog({ open, noteCount, folderCount, onClose, onConfirm }: Props) {
  const parts: string[] = []
  if (noteCount > 0) parts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`)
  if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? "s" : ""}`)
  const summary = parts.join(" and ")

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            Are you sure you want to move {summary} to trash? They will be automatically purged after 7 days.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Move to Trash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
