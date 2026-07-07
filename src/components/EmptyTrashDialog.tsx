import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  noteCount: number
  folderCount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function EmptyTrashDialog({ open, noteCount, folderCount, onConfirm, onCancel }: Props) {
  const parts: string[] = []
  if (noteCount > 0) parts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`)
  if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? "s" : ""}`)
  const description = `Permanently delete ${parts.join(" and ")}? This cannot be undone.`

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Empty Trash</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Empty Trash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
