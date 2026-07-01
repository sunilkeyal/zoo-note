"use client"

import { useState, useEffect } from "react"
import { X, Eye, EyeOff } from "lucide-react"
import { useSession, signOut } from "next-auth/react"

interface AccountSheetProps {
  open: boolean
  onClose: () => void
}

export default function AccountSheet({ open, onClose }: AccountSheetProps) {
  const { data: session, update } = useSession()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)

  // Re-populate from session whenever the sheet opens
  useEffect(() => {
    if (open) {
      setName(session?.user?.name ?? "")
      setEmail(session?.user?.email ?? "")
      setNewPassword("")
      setConfirmPassword("")
      setErrors({})
      setSuccessMsg("")
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Name is required."
    if (!email.trim()) {
      errs.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    setLoading(true)
    setSuccessMsg("")
    setErrors({})

    const body: Record<string, string> = { name, email }
    if (newPassword) {
      body.newPassword = newPassword
    }

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      setLoading(false)
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ email: data.error })
        } else if (data.error?.toLowerCase().includes("new password")) {
          setErrors({ newPassword: data.error })
        } else {
          setErrors({ form: data.error })
        }
        return
      }

      const { changed } = data as { changed: string[] }

      if (changed.includes("email") || changed.includes("password")) {
        setSuccessMsg("Saved! Signing you out…")
        setTimeout(() => signOut({ callbackUrl: "/login" }), 500)
      } else {
        if (changed.includes("name")) {
          await update({ name })
        }
        setSuccessMsg("Account updated.")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      setErrors({ form: "Network error. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-label="Close account sheet overlay"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Account settings"
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form wraps scrollable body + sticky footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Avatar row */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shrink-0 select-none">
                {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-xs text-gray-400">{session?.user?.email ?? ""}</p>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Change password
            </p>

            {/* New password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (at least 8 characters)"
                  className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 pr-8 ${
                    errors.newPassword
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 pr-8 ${
                    errors.confirmPassword
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.form && <p className="text-xs text-red-500">{errors.form}</p>}
            {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}
          </div>

          {/* Sticky footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
