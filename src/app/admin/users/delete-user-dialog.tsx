"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { UserRow } from "./users-table"

interface Props {
  open: boolean
  user: UserRow | null
  onClose: () => void
  onDeleted: (userId: string) => void
}

export default function DeleteUserDialog({ open, user, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    if (!user) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to delete user")
        return
      }

      onDeleted(user._id)
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>{user?.displayName}</strong> ({user?.email})?
            This will also delete all of their notes and folders. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600 px-6">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
