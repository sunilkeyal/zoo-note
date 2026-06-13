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
  folderName: string
  notesCount: number
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteFolderDialog({
  open,
  folderName,
  notesCount,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete folder?</DialogTitle>
          <DialogDescription>
            This will permanently delete the folder <strong>&quot;{folderName}&quot;</strong>
            {notesCount > 0 && (
              <> and all <strong>{notesCount}</strong> notes inside it</>
            )}.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
