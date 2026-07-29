# Mobile More Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile "More" menu to parity with the desktop sidebar by adding account editing, wiring import/export, fixing the Appearance theme toggle, and fixing Admin Dashboard navigation.

**Architecture:** Create two new full-screen mobile components (MobileAccount, MobileImportExport) following the existing MobileSettings pattern. Fix theme wiring in AppLayout using useThemeSync. Add router navigation to MobileAdmin. Wire everything through new MobileScreen types and MobileMore props.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-auth, next-themes, Tailwind CSS v4, Vitest + Testing Library

---

### Task 1: Fix Appearance Theme Toggle in MobileSettings

**Files:**
- Modify: `src/components/AppLayout.tsx:231-233`

**The bug:** `currentTheme` is hardcoded to `"light"` and `onThemeChange` is `() => {}`.

- [ ] **Step 1: Wire useThemeSync into AppLayout**

In `src/components/AppLayout.tsx`, add the import and wire the real theme values:

```tsx
// Add import at line ~21 (after useIsMobile import)
import { useThemeSync } from "@/contexts/ThemeSyncContext"
```

Inside the component function, after the existing hooks (around line 36):
```tsx
const { theme, setTheme } = useThemeSync()
```

Replace the MobileSettings rendering (lines 231-233):
```tsx
{mobileScreen === "settings" && (
  <MobileSettings currentTheme={theme || "light"} onBack={() => setMobileScreen("more")} onThemeChange={setTheme} />
)}
```

Also update the header title section. Add `"account"` and `"import-export"` to the header title display (around line 186):
```tsx
{mobileScreen === "account" && "Account"}
{mobileScreen === "import-export" && "Import / Export"}
```

- [ ] **Step 2: Run existing tests to verify no regressions**

```bash
npx vitest run src/__tests__/mobile-settings.test.tsx -v
```
Expected: All pass (the component itself doesn't change, just its wiring)

---

### Task 2: Fix Admin Dashboard Navigation Links

**Files:**
- Modify: `src/components/MobileAdmin.tsx`
- Modify: `src/__tests__/mobile-admin.test.tsx`

- [ ] **Step 1: Replace MobileAdmin with router-based navigation**

Current MobileAdmin has no `onClick` handlers on management items. Replace the component with one that uses `useRouter` and navigates to actual admin routes.

Write `src/components/MobileAdmin.tsx`:
```tsx
"use client"

import React from "react"
import { useRouter } from "next/navigation"

interface MobileAdminProps {
  stats: { users: number; notes: number; storage: string; imports: number }
  onBack: () => void
}

const adminLinks = [
  { icon: "📊", label: "Dashboard", desc: "System overview and metrics", route: "/admin" },
  { icon: "📥", label: "Import Jobs", desc: "View import history and status", route: "/admin/imports" },
  { icon: "👥", label: "User Management", desc: "View and manage user accounts", route: "/admin/users" },
  { icon: "🔧", label: "System Settings", desc: "App configuration and limits", route: "/admin/settings" },
]

export default function MobileAdmin({ stats, onBack }: MobileAdminProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Admin Dashboard</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { label: "Users", value: stats.users.toLocaleString(), color: "#dbeafe" },
            { label: "Notes", value: stats.notes.toLocaleString(), color: "#dcfce7" },
            { label: "Storage", value: stats.storage, color: "#fef3c7" },
            { label: "Imports", value: stats.imports.toLocaleString(), color: "#e0e7ff" },
          ].map((stat, i) => (
            <div key={i} className="p-3.5 rounded-[10px]" style={{ background: stat.color }}>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Management</div>
        {adminLinks.map((item, i) => (
          <div
            key={i}
            onClick={() => router.push(item.route)}
            className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer"
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <span className="text-muted-foreground">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update MobileAdmin tests**

Update `src/__tests__/mobile-admin.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileAdmin from '@/components/MobileAdmin'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('MobileAdmin', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders stats cards', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('1,247')).toBeInTheDocument()
    expect(screen.getByText('2.3 GB')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
  })

  it('renders management links', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Import Jobs')).toBeInTheDocument()
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('System Settings')).toBeInTheDocument()
  })

  it('navigates to admin routes on click', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('User Management'))
    expect(mockPush).toHaveBeenCalledWith('/admin/users')
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests to verify**

```bash
npx vitest run src/__tests__/mobile-admin.test.tsx -v
```
Expected: All 4 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/MobileAdmin.tsx src/__tests__/mobile-admin.test.tsx
git commit -m "fix: add router navigation to mobile admin dashboard links"
```

---

### Task 3: Create MobileAccount Component

**Files:**
- Create: `src/components/MobileAccount.tsx`
- Create: `src/__tests__/mobile-account.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/mobile-account.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MobileAccount from '@/components/MobileAccount'

describe('MobileAccount', () => {
  const mockOnBack = vi.fn()
  const defaultProps = {
    name: 'Test User',
    email: 'test@example.com',
    onBack: mockOnBack,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with user info', () => {
    render(<MobileAccount {...defaultProps} />)
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileAccount {...defaultProps} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('shows validation error for empty name', () => {
    render(<MobileAccount {...defaultProps} />)
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.click(screen.getByText('Save changes'))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
  })

  it('shows validation error for invalid email', () => {
    render(<MobileAccount {...defaultProps} />)
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'bad-email' } })
    fireEvent.click(screen.getByText('Save changes'))
    expect(screen.getByText('Invalid email format.')).toBeInTheDocument()
  })

  it('shows password mismatch error', () => {
    render(<MobileAccount {...defaultProps} />)
    const passwordInput = screen.getByPlaceholderText('New password (at least 8 characters)')
    const confirmInput = screen.getByPlaceholderText('Repeat new password')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmInput, { target: { value: 'different' } })
    fireEvent.click(screen.getByText('Save changes'))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('calls onSave with name and email on valid submit', async () => {
    const onSave = vi.fn(() => Promise.resolve({ changed: ['name'] }))
    render(<MobileAccount {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('Save changes'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'Test User', email: 'test@example.com' })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/mobile-account.test.tsx -v
```
Expected: FAIL — component not found

- [ ] **Step 3: Write MobileAccount component**

Create `src/components/MobileAccount.tsx`:
```tsx
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
      } catch {
        setErrors({ form: "Failed to save. Please try again." })
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

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/mobile-account.test.tsx -v
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/MobileAccount.tsx src/__tests__/mobile-account.test.tsx
git commit -m "feat: add mobile account screen for editing name/email/password"
```

---

### Task 4: Create MobileImportExport Component

**Files:**
- Create: `src/components/MobileImportExport.tsx`
- Create: `src/__tests__/mobile-import-export.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/mobile-import-export.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileImportExport from '@/components/MobileImportExport'

describe('MobileImportExport', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders export and import sections', () => {
    render(<MobileImportExport onBack={mockOnBack} />)
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Import Notes')).toBeInTheDocument()
    expect(screen.getByText('Import from OneNote')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileImportExport onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('renders export button', () => {
    render(<MobileImportExport onBack={mockOnBack} />)
    expect(screen.getByText('Export All Notes')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/mobile-import-export.test.tsx -v
```
Expected: FAIL — component not found

- [ ] **Step 3: Write MobileImportExport component**

Create `src/components/MobileImportExport.tsx`:
```tsx
"use client"

import { useState, useRef } from "react"
import { useNotes } from "@/contexts/NoteContext"
import { useImport } from "@/contexts/ImportContext"

interface MobileImportExportProps {
  onBack: () => void
}

type ExportState = "idle" | "loading"
type ImportState = "idle" | "loading" | "success" | "error"

export default function MobileImportExport({ onBack }: MobileImportExportProps) {
  const { fetchNotes, fetchFolders } = useNotes()
  const { job, startImport, cancelImport } = useImport()
  const [exportState, setExportState] = useState<ExportState>("idle")
  const [importState, setImportState] = useState<ImportState>("idle")
  const [importMessage, setImportMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onenoteFileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExportState("loading")
    try {
      const res = await fetch("/api/notes/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `zoonote-export-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent
    } finally {
      setExportState("idle")
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".zip")) {
      setImportState("error")
      setImportMessage("Only .zip files accepted")
      return
    }

    setImportState("loading")
    setImportMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/notes/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setImportState("error")
        setImportMessage(data.error || "Import failed")
        return
      }
      const r = data.data
      setImportState("success")
      setImportMessage(
        `Imported ${r.notesImported} note${r.notesImported !== 1 ? "s" : ""}, ` +
        `${r.foldersCreated} folder${r.foldersCreated !== 1 ? "s" : ""}, ` +
        `${r.imagesImported} image${r.imagesImported !== 1 ? "s" : ""}.`
      )
      fetchNotes()
      fetchFolders()
    } catch {
      setImportState("error")
      setImportMessage("Network error. Please try again.")
    }
  }

  async function handleOneNoteFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    startImport(file)
  }

  const isImporting = job.status !== "idle" && job.status !== "completed" && job.status !== "failed"

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Import / Export</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Export */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-1">Export</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Download a ZIP with all your notes, folders, and images.
          </p>
          <button
            onClick={handleExport}
            disabled={exportState === "loading"}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {exportState === "loading" ? "Exporting…" : "Export All Notes"}
          </button>
        </div>

        {/* Import ZIP */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-1">Import</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Select a previously exported ZIP file.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importState === "loading"}
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {importState === "loading" ? "Importing…" : "Import Notes"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileSelect}
          />
          {importState === "success" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-green-600">
              <span>{importMessage}</span>
            </div>
          )}
          {importState === "error" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
              <span>{importMessage}</span>
            </div>
          )}
        </div>

        {/* OneNote Import */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-1">Import from OneNote</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Import a OneNote notebook (.onepkg) or section (.one). Max 200MB.
          </p>
          <button
            onClick={() => onenoteFileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isImporting ? "Importing…" : "Select File"}
          </button>
          <input
            ref={onenoteFileInputRef}
            type="file"
            accept=".onepkg,.one"
            className="hidden"
            onChange={handleOneNoteFileSelect}
          />
          {job.status === "processing" && job.progress && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress.totalPages > 0 ? (job.progress.processedPages / job.progress.totalPages) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {job.progress.processedPages}/{job.progress.totalPages} pages
              </p>
            </div>
          )}
          {isImporting && (
            <div className="mt-3 flex items-start gap-2 text-xs text-blue-600">
              <span>{job.progress?.currentStage || "Processing..."}</span>
            </div>
          )}
          {isImporting && (
            <button
              onClick={cancelImport}
              className="mt-2 w-full rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Cancel Import
            </button>
          )}
          {job.status === "completed" && job.result && (
            <div className="mt-3 flex items-start gap-2 text-xs text-green-600">
              <span>
                Imported {job.result.foldersCreated} folder{job.result.foldersCreated !== 1 ? "s" : ""},{" "}
                {job.result.notesImported} note{job.result.notesImported !== 1 ? "s" : ""},{" "}
                {job.result.imagesImported} image{job.result.imagesImported !== 1 ? "s" : ""}.
              </span>
            </div>
          )}
          {job.status === "failed" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
              <span>{job.error || "Import failed"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/mobile-import-export.test.tsx -v
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/MobileImportExport.tsx src/__tests__/mobile-import-export.test.tsx
git commit -m "feat: add mobile import/export screen"
```

---

### Task 5: Update MobileMore Component with New Props

**Files:**
- Modify: `src/components/MobileMore.tsx`
- Modify: `src/__tests__/mobile-more.test.tsx`

- [ ] **Step 1: Add `onProfile` and `onImportExport` props**

Replace `src/components/MobileMore.tsx`:
```tsx
"use client"

import React from "react"

interface MobileMoreProps {
  isAdmin: boolean
  userName: string
  onSettings: () => void
  onAdmin: () => void
  onSignOut: () => void
  onProfile: () => void
  onImportExport: () => void
}

export default function MobileMore({ isAdmin, userName, onSettings, onAdmin, onSignOut, onProfile, onImportExport }: MobileMoreProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="px-4 pt-3 pb-2">
        <span className="text-lg font-bold">More</span>
      </div>

      <div className="px-4 flex-1 overflow-y-auto">
        {/* Account */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Account</div>
        <div onClick={onProfile} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
          <span className="text-lg">👤</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Profile</div>
            <div className="text-xs text-muted-foreground">{userName}</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
        <div onClick={onSettings} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
          <span className="text-lg">🎨</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Appearance</div>
            <div className="text-xs text-muted-foreground">Theme, density, font size</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>

        {/* Data */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1.5">Data</div>
        <div onClick={onImportExport} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
          <span className="text-lg">📥</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Import</div>
            <div className="text-xs text-muted-foreground">OneNote, Markdown, PDF</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
        <div onClick={onImportExport} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
          <span className="text-lg">📤</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Export</div>
            <div className="text-xs text-muted-foreground">Download all notes</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1.5">Admin</div>
            <div onClick={onAdmin} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
              <span className="text-lg">📊</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Admin Dashboard</div>
                <div className="text-xs text-muted-foreground">Users, stats, settings</div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
          </>
        )}

        {/* Sign Out */}
        <div className="py-4 text-center">
          <div onClick={onSignOut} className="text-xs text-destructive cursor-pointer">Sign Out</div>
          <div className="text-[11px] text-muted-foreground/40 mt-2">ZooNote v0.1.0</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update MobileMore tests**

Update `src/__tests__/mobile-more.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileMore from '@/components/MobileMore'

describe('MobileMore', () => {
  const mockOnSettings = vi.fn()
  const mockOnAdmin = vi.fn()
  const mockOnSignOut = vi.fn()
  const mockOnProfile = vi.fn()
  const mockOnImportExport = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all menu items', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('shows Admin Dashboard for admin users', () => {
    render(<MobileMore isAdmin={true} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('hides Admin Dashboard for non-admin users', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
  })

  it('calls onSettings when Appearance is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    fireEvent.click(screen.getByText('Appearance'))
    expect(mockOnSettings).toHaveBeenCalled()
  })

  it('calls onAdmin when Admin Dashboard is clicked', () => {
    render(<MobileMore isAdmin={true} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    fireEvent.click(screen.getByText('Admin Dashboard'))
    expect(mockOnAdmin).toHaveBeenCalled()
  })

  it('calls onSignOut when Sign Out is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    fireEvent.click(screen.getByText('Sign Out'))
    expect(mockOnSignOut).toHaveBeenCalled()
  })

  it('calls onProfile when Profile is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    fireEvent.click(screen.getByText('Profile'))
    expect(mockOnProfile).toHaveBeenCalled()
  })

  it('calls onImportExport when Import is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    fireEvent.click(screen.getByText('Import'))
    expect(mockOnImportExport).toHaveBeenCalled()
  })

  it('calls onImportExport when Export is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} onProfile={mockOnProfile} onImportExport={mockOnImportExport} />)
    fireEvent.click(screen.getByText('Export'))
    expect(mockOnImportExport).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/__tests__/mobile-more.test.tsx -v
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/MobileMore.tsx src/__tests__/mobile-more.test.tsx
git commit -m "feat: add profile and import/export navigation to mobile more menu"
```

---

### Task 6: Wire Everything in AppLayout

**Files:**
- Modify: `src/components/AppLayout.tsx`

- [ ] **Step 1: Add imports and screen routing**

In `src/components/AppLayout.tsx`:

After the existing imports (after line 22), add:
```tsx
import { useThemeSync } from "@/contexts/ThemeSyncContext"
import MobileAccount from "./MobileAccount"
import MobileImportExport from "./MobileImportExport"
```

Update the MobileScreen type (line 25) to add the new screens:
```tsx
type MobileScreen = "home" | "folders" | "folder-detail" | "favorites" | "more" | "search" | "new-folder" | "settings" | "admin" | "note-detail" | "account" | "import-export"
```

After `const isMobile = useIsMobile()` (line 35), add:
```tsx
const { theme, setTheme } = useThemeSync()
```

Replace the MobileMore rendering (lines 228-230) to include the new props:
```tsx
{mobileScreen === "more" && (
  <MobileMore
    isAdmin={isAdmin}
    userName={(session?.user as { email?: string })?.email || ""}
    onSettings={() => setMobileScreen("settings")}
    onAdmin={() => setMobileScreen("admin")}
    onSignOut={handleSignOut}
    onProfile={() => setMobileScreen("account")}
    onImportExport={() => setMobileScreen("import-export")}
  />
)}
```

Replace the MobileSettings rendering (lines 231-233):
```tsx
{mobileScreen === "settings" && (
  <MobileSettings currentTheme={theme || "light"} onBack={() => setMobileScreen("more")} onThemeChange={setTheme} />
)}
```

After the MobileSettings block, add the new screens:
```tsx
{mobileScreen === "account" && (
  <MobileAccount
    name={(session?.user as { name?: string })?.name || ""}
    email={(session?.user as { email?: string })?.email || ""}
    onBack={() => setMobileScreen("more")}
  />
)}
{mobileScreen === "import-export" && (
  <MobileImportExport onBack={() => setMobileScreen("more")} />
)}
```

Add header titles for the new screens (inside the header section, around line 186):
```tsx
{mobileScreen === "account" && "Account"}
{mobileScreen === "import-export" && "Import / Export"}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: No TypeScript errors

- [ ] **Step 3: Run all related tests**

```bash
npx vitest run src/__tests__/mobile-more.test.tsx src/__tests__/mobile-account.test.tsx src/__tests__/mobile-import-export.test.tsx src/__tests__/mobile-admin.test.tsx src/__tests__/mobile-settings.test.tsx -v
```
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/components/AppLayout.tsx
git commit -m "feat: wire mobile account and import-export screens into app layout"
```

---

### Self-Review Checklist

- [ ] **Spec coverage**: MobileAccount covers Profile editing, MobileImportExport covers Import/Export, Appearance fix uses useThemeSync, Admin links use router.push
- [ ] **Placeholder scan**: No TBD, TODO, "implement later" patterns
- [ ] **Type consistency**: MobileMoreProps includes onProfile and onImportExport; MobileScreen type includes "account" and "import-export"; MobileAccount, MobileImportExport props match what AppLayout passes
