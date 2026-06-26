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
}

export default function ResetPasswordDialog({ open, user, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<string | null>(null)

  async function handleReset() {
    if (!user) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/users/${user._id}/reset-password`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to reset password")
        return
      }

      setResult(data.temporaryPassword)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setResult(null)
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Password Reset</DialogTitle>
              <DialogDescription>
                The password has been reset. Share the new temporary password with the user.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Temporary password:</strong>{" "}
                <code className="bg-background px-2 py-0.5 rounded">{result}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-2">An email has also been sent.</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Generate a new temporary password for <strong>{user?.displayName}</strong>?
                An email will be sent to {user?.email} with the new credentials.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-red-600 px-6">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleReset} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
