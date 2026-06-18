# Role & Permission Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure roles from three (admin/user/viewer) to two (admin/user), reorganize navigation with /workspace/* paths for user-level features, and add user-scoping to notes/folders.

**Architecture:** Modify auth middleware to allow /workspace/* for any authenticated user while keeping /admin/* admin-only. Split sidebar nav into WORKSPACE (all users) and ADMIN (admin only) sections. Add userId filtering to all API CRUD operations. Auto-migrate existing data on startup.

**Tech Stack:** Next.js 16 (App Router), TypeScript, MongoDB, NextAuth v5

---
### Task 0: Create feature branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feat/role-permission-restructure
```

---

### Task 1: Update types with userId

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add userId to Folder and Note interfaces**

Open `src/types/index.ts` and add `userId?: string` to both `Folder` and `Note` interfaces:

```typescript
export interface Folder {
  _id: string;
  name: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;
  userId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}
```

---

### Task 2: Seed — remove viewer, add migration

**Files:**
- Modify: `src/lib/seed.ts`

- [ ] **Step 1: Remove viewer user from seed**

Remove the viewer entry from `seedUsers` array:

```typescript
const seedUsers = [
  { username: "admin",  email: "admin@example.com",   displayName: "Admin User", password: process.env.ADMIN_PASSWORD || "admin123",   role: "admin" },
  { username: "user",   email: "user@example.com",    displayName: "Regular User", password: process.env.USER_PASSWORD || "user123",  role: "user" },
]
```

- [ ] **Step 2: Add migration logic to ensureAdmin**

After the seeding loop and before `seedingDone = true`, add a migration that assigns existing notes/folders without a `userId` to the admin user:

```typescript
const adminUser = await db.collection("users").findOne({ username: "admin" })
if (adminUser) {
  const adminId = adminUser._id.toString()
  await db.collection("notes").updateMany(
    { userId: { $exists: false } },
    { $set: { userId: adminId } }
  )
  await db.collection("folders").updateMany(
    { userId: { $exists: false } },
    { $set: { userId: adminId } }
  )
}
```

Place this right before `seedingDone = true`.

---

### Task 3: Auth middleware — add /workspace/* rule

**Files:**
- Modify: `src/lib/auth.config.ts`

- [ ] **Step 1: Add /workspace/* to authorized callback**

In the `authorized` callback, add a `/workspace` check before the `/admin` check:

```typescript
async authorized({ request, auth }) {
  const { pathname } = request.nextUrl
  if (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname.startsWith("/api/auth")) {
    return true
  }
  if (pathname.startsWith("/workspace")) {
    return !!auth
  }
  if (pathname.startsWith("/admin")) {
    return auth?.user?.role === "admin"
  }
  return !!auth
},
```

The `/workspace` check comes first, allowing any authenticated user in. The `/admin` check still requires `role === "admin"`.

---

### Task 4: Notes API — add userId filtering

**Files:**
- Modify: `src/app/api/notes/route.ts`
- Modify: `src/app/api/notes/[id]/route.ts`

- [ ] **Step 1: Update GET in notes/route.ts**

Add `userId: session.user.id` to the find filter:

```typescript
const notes = await collection
  .find({ userId: session.user.id })
  .project({ title: 1, content: 1, folderId: 1, position: 1, createdAt: 1, updatedAt: 1, userId: 1 })
  .sort({ position: 1, updatedAt: -1 })
  .toArray()
```

And add `userId` to the mapped result:

```typescript
const mapped: Note[] = notes.map((n) => ({
  _id: n._id.toString(),
  title: n.title,
  content: n.content || "",
  folderId: n.folderId || undefined,
  userId: n.userId || undefined,
  position: n.position ?? 0,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
}))
```

- [ ] **Step 2: Update POST in notes/route.ts**

Add `userId: session.user.id` to the inserted document:

```typescript
const doc: Record<string, unknown> = {
  title: title.trim(),
  content: "",
  position: position ?? 0,
  userId: session.user.id,
  createdAt: now,
  updatedAt: now,
}
```

- [ ] **Step 3: Update PUT in notes/[id]/route.ts**

Add `userId` to the find filter:

```typescript
const result = await collection.findOneAndUpdate(
  { _id: objectId, userId: session.user.id },
  { $set: update },
  { returnDocument: "after" }
)
```

- [ ] **Step 4: Update DELETE in notes/[id]/route.ts**

Add `userId` to the delete filter:

```typescript
const result = await collection.deleteOne({ _id: objectId, userId: session.user.id })
```

---

### Task 5: Folders API — add userId filtering

**Files:**
- Modify: `src/app/api/folders/route.ts`
- Modify: `src/app/api/folders/[id]/route.ts`

- [ ] **Step 1: Update GET in folders/route.ts**

Add `userId: session.user.id` to the find filter:

```typescript
const folders = await collection
  .find({ userId: session.user.id })
  .sort({ createdAt: -1 })
  .toArray()
```

And add `userId` to the mapped result:

```typescript
const mapped: Folder[] = folders.map((f) => ({
  _id: f._id.toString(),
  name: f.name,
  userId: f.userId || undefined,
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
}))
```

- [ ] **Step 2: Update POST in folders/route.ts**

Add `userId: session.user.id` to the inserted document:

```typescript
const result = await collection.insertOne({
  name: name.trim(),
  userId: session.user.id,
  createdAt: now,
  updatedAt: now,
})
```

- [ ] **Step 3: Update PUT in folders/[id]/route.ts**

Add `userId` to the find filter:

```typescript
const result = await foldersCollection.findOneAndUpdate(
  { _id: objectId, userId: session.user.id },
  { $set: { name: name.trim(), updatedAt: new Date() } },
  { returnDocument: "after" }
)
```

- [ ] **Step 4: Update DELETE in folders/[id]/route.ts**

Add `userId` to the delete filter:

```typescript
const deleteResult = await foldersCollection.deleteOne({ _id: objectId, userId: session.user.id })
```

Also update the notes deleteMany to only delete notes owned by the user:

```typescript
const notesDelete = await notesCollection.deleteMany({ folderId: id, userId: session.user.id })
```

---

### Task 6: Move Trash page to /workspace/trash

**Files:**
- Create: `src/app/workspace/trash/page.tsx`
- Delete: `src/app/admin/trash/page.tsx`

- [ ] **Step 1: Create workspace/trash directory and page**

```bash
New-Item -ItemType Directory -Path "src/app/workspace/trash" -Force
```

Create `src/app/workspace/trash/page.tsx` with the same content as the current `src/app/admin/trash/page.tsx`:

```typescript
export default function TrashPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Trash</h1>
      <p className="text-muted-foreground mb-6">View all deleted notes across users, batch restore or permanently delete.</p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Deleted By</th>
              <th className="text-left p-3 font-medium">Deleted At</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              { title: "Meeting Notes - Q2 Review", user: "Alice", date: "2026-06-14" },
              { title: "Shopping List", user: "Bob", date: "2026-06-13" },
              { title: "Project Ideas Brainstorm", user: "Alice", date: "2026-06-12" },
              { title: "Old API Documentation", user: "Charlie", date: "2026-06-10" },
            ].map((item) => (
              <tr key={item.title} className="border-b last:border-0">
                <td className="p-3">{item.title}</td>
                <td className="p-3 text-muted-foreground">{item.user}</td>
                <td className="p-3 text-muted-foreground">{item.date}</td>
                <td className="p-3 text-right">
                  <span className="text-muted-foreground text-xs">Restore | Delete</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Showing sample data. Full trash management will be available soon.</p>
    </div>
  )
}
```

- [ ] **Step 2: Delete old admin/trash/page.tsx**

```bash
Remove-Item -LiteralPath "src/app/admin/trash/page.tsx"
```

---

### Task 7: Move Import/Export page to /workspace/import-export

**Files:**
- Create: `src/app/workspace/import-export/page.tsx`
- Delete: `src/app/admin/import-export/page.tsx`

- [ ] **Step 1: Create workspace/import-export directory and page**

```bash
New-Item -ItemType Directory -Path "src/app/workspace/import-export" -Force
```

Create `src/app/workspace/import-export/page.tsx` with the same content as the current `src/app/admin/import-export/page.tsx`:

```typescript
export default function ImportExportPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Import / Export</h1>
      <p className="text-muted-foreground mb-6">Bulk export notes to Markdown/JSON; import from external sources.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Export</h3>
          <p className="text-sm text-muted-foreground mb-4">Download all notes in your preferred format.</p>
          <div className="flex gap-2">
            <div className="rounded border border-dashed px-4 py-2 text-sm text-muted-foreground">Export as Markdown</div>
            <div className="rounded border border-dashed px-4 py-2 text-sm text-muted-foreground">Export as JSON</div>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Import</h3>
          <p className="text-sm text-muted-foreground mb-4">Import notes from external sources.</p>
          <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
            Drop files here or click to browse
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Full import/export functionality will be available soon.</p>
    </div>
  )
}
```

- [ ] **Step 2: Delete old admin/import-export/page.tsx**

```bash
Remove-Item -LiteralPath "src/app/admin/import-export/page.tsx"
```

---

### Task 8: Create workspace layout

**Files:**
- Create: `src/app/workspace/layout.tsx`

- [ ] **Step 1: Create workspace layout**

Create `src/app/workspace/layout.tsx`:

```typescript
"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  if (status !== "authenticated") {
    return null
  }

  return (
    <SidebarProvider>
      <NotesSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

---

### Task 9: Update NotesSidebar — split nav, remove roles entry

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Split adminItems into workspaceItems and adminItems**

Replace the `adminItems` array with two separate arrays:

```typescript
const workspaceItems = [
  { route: "/workspace/trash",          label: "Trash",            icon: Trash2 },
  { route: "/workspace/import-export",  label: "Import / Export",  icon: FileUp },
]

const adminItems = [
  { route: "/admin",           label: "Dashboard",        icon: LayoutDashboard },
  { route: "/admin/analytics", label: "Analytics",        icon: BarChart3 },
  { route: "/admin/backup",    label: "Backup & Restore", icon: Database },
  { route: "/admin/users",     label: "User Management",  icon: Users },
  { route: "/admin/audit",     label: "Audit Logs",       icon: ScrollText },
  { route: "/admin/settings",  label: "System Settings",  icon: Settings },
]
```

Note: `Shield` import is no longer needed (removed with Role Management). Remove it from the lucide-react import on line 70.

- [ ] **Step 2: Render workspace section for all authenticated users**

Replace the admin-only section in the sidebar content with two sections. First, add the WORKSPACE section (always visible for authenticated users) after the Notes section:

Find this block (around lines 418-439):
```typescript
{session?.user?.role === "admin" && (
  <>
    <SidebarSeparator className="my-2" />
    <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
      Admin
    </div>
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <SidebarMenu>
          {adminItems.map((item) => (
            <SidebarMenuItem key={item.route}>
              <SidebarMenuButton render={<Link href={item.route} />} isActive={item.route === "/admin" ? pathname === "/admin" : pathname.startsWith(item.route)}>
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </>
)}
```

Replace it with:

```typescript
{/* Workspace section — visible to all authenticated users */}
<SidebarSeparator className="my-2" />
<div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
  Workspace
</div>
<SidebarGroup className="py-0">
  <SidebarGroupContent>
    <SidebarMenu>
      {workspaceItems.map((item) => (
        <SidebarMenuItem key={item.route}>
          <SidebarMenuButton render={<Link href={item.route} />} isActive={pathname.startsWith(item.route)}>
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>

{/* Admin section — admin users only */}
{session?.user?.role === "admin" && (
  <>
    <SidebarSeparator className="my-2" />
    <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
      Admin
    </div>
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <SidebarMenu>
          {adminItems.map((item) => (
            <SidebarMenuItem key={item.route}>
              <SidebarMenuButton render={<Link href={item.route} />} isActive={item.route === "/admin" ? pathname === "/admin" : pathname.startsWith(item.route)}>
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </>
)}
```

- [ ] **Step 3: Remove Shield from lucide-react import**

On line 70, change:
```typescript
import { LogOut, Settings, User as UserIcon, Rocket, LayoutDashboard, Database, Users, Shield, ScrollText, FileUp, BarChart3 } from "lucide-react"
```

To:
```typescript
import { LogOut, Settings, User as UserIcon, Rocket, LayoutDashboard, Database, Users, ScrollText, FileUp, BarChart3 } from "lucide-react"
```

---

### Task 10: Remove admin roles page

**Files:**
- Delete: `src/app/admin/roles/page.tsx`

- [ ] **Step 1: Delete roles page**

```bash
Remove-Item -LiteralPath "src/app/admin/roles"
```

- [ ] **Step 2: Remove empty roles directory if needed**

```bash
Remove-Item -LiteralPath "src/app/admin/roles" -Recurse
```

Note: On Windows, `Remove-Item` with `-Recurse` removes the directory and all its contents.

---

### Task 11: Build and verify

- [ ] **Step 1: Run the build to verify everything compiles**

```bash
npm run build
```

Expected: Successful build with no TypeScript errors.

- [ ] **Step 2: Verify the dev server starts**

```bash
npm run dev
```

Check that:
1. Login works for both admin and user accounts
2. Workspace section shows Trash and Import/Export for both roles
3. Admin section only shows for admin users
4. Role Management is gone from the sidebar
5. Notes are scoped per-user (admin sees admin's notes, user sees user's notes)
