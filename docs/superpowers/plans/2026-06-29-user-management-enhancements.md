# User Management Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace text action buttons in the admin users table with icon+tooltip buttons, consolidate password management into the Edit dialog, and send an email when an admin sets a new password.

**Architecture:** Four source files are modified and two are deleted. No new files are created. The password-change flow moves from a separate auto-generate dialog into an optional field on the existing Edit dialog; the API PUT handler is extended to hash and save the password and fire-and-forget an email.

**Tech Stack:** Next.js 15 App Router, TypeScript, MongoDB, bcryptjs, lucide-react, shadcn/ui (Tooltip, Input, Button), Vitest + Testing Library

## Global Constraints

- Branch: `feature/user-management-enhancements` — never commit to `main`
- Run tests with: `npx vitest run` from project root
- All lucide-react icons imported from `lucide-react`
- shadcn Tooltip components imported from `@/components/ui/tooltip`
- bcryptjs imported as `import bcrypt from "bcryptjs"`
- Email helper imported from `@/lib/email`

---

### Task 1: Remove the reset-password flow

**Files:**
- Delete: `src/app/admin/users/reset-password-dialog.tsx`
- Delete: `src/app/api/admin/users/[id]/reset-password/route.ts`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/users/users-table.tsx`
- Modify: `src/app/__tests__/admin-users-api.test.ts`

**Interfaces:**
- Produces: `UsersTable` no longer has an `onResetPassword` prop; `page.tsx` no longer renders `<ResetPasswordDialog>`

- [ ] **Step 1: Delete the two obsolete files**

```bash
rm src/app/admin/users/reset-password-dialog.tsx
rm src/app/api/admin/users/[id]/reset-password/route.ts
```

- [ ] **Step 2: Remove `onResetPassword` from `users-table.tsx`**

In `src/app/admin/users/users-table.tsx`, remove the `onResetPassword` prop from the `Props` interface and from the destructured parameters, and remove the Reset PW button from the JSX.

Remove from the `Props` interface:
```ts
onResetPassword: (user: UserRow) => void
```

Remove from the destructured props list:
```ts
onToggleActive, onEdit, onResetPassword, onDelete,
```
Replace with:
```ts
onToggleActive, onEdit, onDelete,
```

Remove the entire Reset PW button from the actions cell:
```tsx
<Button variant="ghost" size="sm" onClick={() => onResetPassword(u)}>
  Reset PW
</Button>
```

- [ ] **Step 3: Clean up `page.tsx`**

In `src/app/admin/users/page.tsx`:

Remove the import line:
```ts
import ResetPasswordDialog from "./reset-password-dialog"
```

Remove the state variable declaration:
```ts
const [resetPwUser, setResetPwUser] = useState<UserRow | null>(null)
```

Remove the `onResetPassword` prop from `<UsersTable>`:
```tsx
onResetPassword={setResetPwUser}
```

Remove the entire `<ResetPasswordDialog>` element (it appears after `<DeleteUserDialog>`):
```tsx
<ResetPasswordDialog
  open={!!resetPwUser}
  user={resetPwUser}
  onClose={() => setResetPwUser(null)}
/>
```

- [ ] **Step 4: Remove the reset-password tests from `admin-users-api.test.ts`**

In `src/app/__tests__/admin-users-api.test.ts`, delete the entire `describe("POST /api/admin/users/[id]/reset-password", ...)` block (the two `it(...)` tests inside it, and the outer `describe` wrapper).

- [ ] **Step 5: Run tests — expect green**

```bash
npx vitest run src/__tests__/admin-users-api.test.ts
```

Expected: all remaining tests pass, no references to the deleted files.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove separate reset-password flow from user management"
```

---

### Task 2: Replace text buttons with icon buttons + tooltips

**Files:**
- Modify: `src/app/admin/users/users-table.tsx`

**Interfaces:**
- Consumes: `onEdit: (user: UserRow) => void`, `onDelete: (user: UserRow) => void` (unchanged signatures)
- Produces: Actions cell renders two icon buttons (Pencil, Trash2) each wrapped in a shadcn Tooltip

- [ ] **Step 1: Add imports at the top of `users-table.tsx`**

Add to the existing imports:
```ts
import { Pencil, Trash2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
```

- [ ] **Step 2: Replace the actions cell content**

Find the existing actions `<td>` content (the `!isCurrentUser &&` block with text buttons) and replace it with:

```tsx
<td className="p-3 text-right">
  {!isCurrentUser && (
    <TooltipProvider>
      <div className="flex justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => onEdit(u)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit user</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete(u)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete user</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )}
</td>
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass (no tests directly cover the icon buttons, but nothing should break).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/users-table.tsx
git commit -m "feat: replace text action buttons with icon buttons and tooltips"
```

---

### Task 3: Add optional password field to the Edit User dialog

**Files:**
- Modify: `src/app/admin/users/edit-user-dialog.tsx`

**Interfaces:**
- Produces: `handleSubmit` sends `{ email, displayName, role, password }` to `PUT /api/admin/users/:id` when `newPassword.trim()` is non-empty; omits `password` key entirely when blank

- [ ] **Step 1: Write a failing test for the password field submission**

In `src/app/__tests__/admin-users-api.test.ts`, add this test inside the existing `describe("PUT /api/admin/users/[id]", ...)` block:

```ts
it("hashes and saves password when newPassword is provided in the PUT body", async () => {
  const { auth } = await import("@/lib/auth")
  vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

  const bcrypt = await import("bcryptjs")
  const mockHash = vi.mocked(bcrypt.default.hash)
  mockHash.mockResolvedValue("hashed_new_pw" as never)

  const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
  const mockFindOne = vi.fn()
    .mockResolvedValueOnce({
      _id: { toString: () => "000000000000000000000001" },
      email: "u@u.com",
      displayName: "User",
      role: "user",
    })
    .mockResolvedValueOnce({
      _id: { toString: () => "000000000000000000000001" },
      email: "u@u.com",
      displayName: "User",
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

  mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

  const { PUT } = await import("@/app/api/admin/users/[id]/route")
  const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "NewPass123!" }),
  })
  const res = await PUT(req, { params: { id: "000000000000000000000001" } })
  expect(res.status).toBe(200)

  const updateCall = mockUpdateOne.mock.calls[0]
  expect(updateCall[1].$set.passwordHash).toBe("hashed_new_pw")
  expect(mockHash).toHaveBeenCalledWith("NewPass123!", 12)
})

it("sends password reset email when password is changed via PUT", async () => {
  const { auth } = await import("@/lib/auth")
  vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

  const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
  const mockFindOne = vi.fn()
    .mockResolvedValueOnce({
      _id: { toString: () => "000000000000000000000001" },
      email: "u@u.com",
      displayName: "User",
      role: "user",
    })
    .mockResolvedValueOnce({
      _id: { toString: () => "000000000000000000000001" },
      email: "u@u.com",
      displayName: "User",
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

  mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

  const { PUT } = await import("@/app/api/admin/users/[id]/route")
  const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "NewPass123!" }),
  })
  await PUT(req, { params: { id: "000000000000000000000001" } })

  // Give fire-and-forget a tick to run
  await new Promise((r) => setTimeout(r, 0))

  const { sendPasswordResetByAdminEmail } = await import("@/lib/email")
  expect(vi.mocked(sendPasswordResetByAdminEmail)).toHaveBeenCalledWith("u@u.com", "NewPass123!")
})

it("does not update password or send email when password field is blank", async () => {
  const { auth } = await import("@/lib/auth")
  vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

  const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
  const mockFindOne = vi.fn()
    .mockResolvedValueOnce({
      _id: { toString: () => "000000000000000000000001" },
      email: "u@u.com",
      displayName: "User",
      role: "user",
    })
    .mockResolvedValueOnce({
      _id: { toString: () => "000000000000000000000001" },
      email: "u@u.com",
      displayName: "User",
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

  mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

  const { PUT } = await import("@/app/api/admin/users/[id]/route")
  const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "New Name", password: "" }),
  })
  await PUT(req, { params: { id: "000000000000000000000001" } })

  const updateCall = mockUpdateOne.mock.calls[0]
  expect(updateCall[1].$set.passwordHash).toBeUndefined()

  await new Promise((r) => setTimeout(r, 0))
  const { sendPasswordResetByAdminEmail } = await import("@/lib/email")
  expect(vi.mocked(sendPasswordResetByAdminEmail)).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the new tests — expect FAIL**

```bash
npx vitest run src/__tests__/admin-users-api.test.ts
```

Expected: the three new tests fail with something like "passwordHash is undefined" or "sendPasswordResetByAdminEmail not called".

- [ ] **Step 3: Update the Edit dialog UI**

Replace the entire contents of `src/app/admin/users/edit-user-dialog.tsx` with:

```tsx
"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"
import type { UserRow } from "./users-table"

interface Props {
  open: boolean
  user: UserRow | null
  onClose: () => void
  onUpdated: (user: any) => void
}

export default function EditUserDialog({ open, user, onClose, onUpdated }: Props) {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("user")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setDisplayName(user.displayName)
      setRole(user.role)
      setNewPassword("")
      setShowPassword(false)
      setError("")
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError("")

    const body: Record<string, string> = { email, displayName, role }
    if (newPassword.trim()) {
      body.password = newPassword.trim()
    }

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update user")
        return
      }

      onUpdated(data.data)
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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Display Name</Label>
              <Input
                id="edit-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={role} onValueChange={(value) => { if (value !== null) setRole(value) }}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests (still expect FAIL on the new API tests)**

```bash
npx vitest run src/__tests__/admin-users-api.test.ts
```

The three new tests about password hashing/emailing are still failing — the API route hasn't been updated yet. That's correct at this stage.

- [ ] **Step 5: Commit the dialog change**

```bash
git add src/app/admin/users/edit-user-dialog.tsx src/app/__tests__/admin-users-api.test.ts
git commit -m "feat: add optional new-password field to edit user dialog"
```

---

### Task 4: Update the PUT API to hash and email the new password

**Files:**
- Modify: `src/app/api/admin/users/[id]/route.ts`

**Interfaces:**
- Consumes: `PUT` body now accepts optional `password: string`; `sendPasswordResetByAdminEmail(to: string, temporaryPassword: string)` from `@/lib/email`
- Produces: when `password` is present and non-empty, `$set` includes `passwordHash`; `sendPasswordResetByAdminEmail` is called fire-and-forget

- [ ] **Step 1: Add bcrypt and email imports to the PUT route**

At the top of `src/app/api/admin/users/[id]/route.ts`, add after the existing imports:

```ts
import bcrypt from "bcryptjs"
import { sendPasswordResetByAdminEmail } from "@/lib/email"
```

- [ ] **Step 2: Add password handling inside the PUT handler**

In the PUT handler, after the `isActive` block and before the `update.updatedAt = new Date()` line, add:

```ts
if (body.password !== undefined && typeof body.password === "string" && body.password.trim().length > 0) {
  update.passwordHash = await bcrypt.hash(body.password.trim(), 12)
}
```

After the `updateOne` call succeeds and before the final `return NextResponse.json(...)`, add the fire-and-forget email (use the email from the update object if the admin changed it, otherwise fall back to the original user email):

```ts
if (update.passwordHash) {
  const emailRecipient = update.email ?? user.email
  sendPasswordResetByAdminEmail(emailRecipient, body.password.trim()).catch((err) =>
    console.error("[Admin] Failed to send password change email:", err)
  )
}
```

- [ ] **Step 3: Run the new tests — expect green**

```bash
npx vitest run src/__tests__/admin-users-api.test.ts
```

Expected: all tests pass including the three new password tests.

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/[id]/route.ts
git commit -m "feat: hash and email new password when admin sets it via PUT"
```
