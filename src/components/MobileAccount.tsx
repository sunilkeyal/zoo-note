"use client"

import { useState } from "react"

interface MobileAccountProps {
  name: string
  email: string
  onBack: () => void
  onSave?: (data: { name: string; email: string; newPassword?: string }) => Promise<{ changed: string[] }>
}

export default function MobileAccount({ name, email, onBack, onSave }: MobileAccountProps) {
  const [displayName, setDisplayName] = useState(name)
  const [displayEmail, setDisplayEmail] = useState(email)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!displayName.trim()) errs.name = "Name is required."
    if (!displayEmail.trim()) {
      errs.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(displayEmail)) {
      errs.email = "Invalid email format."
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) errs.newPassword = "New password must be at least 8 characters."
      if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match."
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (onSave) {
      setLoading(true)
      setErrors({})
      setSuccessMsg("")
      try {
        const body: { name: string; email: string; newPassword?: string } = { name: displayName, email: displayEmail }
        if (newPassword) body.newPassword = newPassword
        const result = await onSave(body)
        if (result.changed.includes("email") || result.changed.includes("password")) {
          setSuccessMsg("Saved! Redirecting to login…")
        } else {
          setSuccessMsg("Account updated.")
          setNewPassword("")
          setConfirmPassword("")
        }
      } catch (e) {
        setErrors({ form: e instanceof Error ? e.message : "Failed to save. Please try again." })
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Account</span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shrink-0 select-none">
              {displayName.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm font-semibold">{displayName || "User"}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <hr className="border-border" />

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                errors.name ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-blue-500"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Email address</label>
            <input
              type="email"
              value={displayEmail}
              onChange={(e) => setDisplayEmail(e.target.value)}
              className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                errors.email ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-blue-500"
              }`}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <hr className="border-border" />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Change password</p>

          {/* New password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (at least 8 characters)"
                className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 pr-8 ${
                  errors.newPassword ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? "🙈" : "👁"}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 pr-8 ${
                  errors.confirmPassword ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? "🙈" : "👁"}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
          </div>

          {errors.form && <p className="text-xs text-red-500">{errors.form}</p>}
          {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}
        </div>

        <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
