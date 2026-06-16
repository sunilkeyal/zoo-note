# Admin Sidebar Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Admin section to the left sidebar with 9 navigable placeholder pages, and label the existing folder area as "Notes".

**Architecture:** Admin items render conditionally in `NotesSidebar.tsx` based on user role. Each admin item links to a route under `src/app/admin/` with a shared layout using the same `SidebarProvider` + sidebar + header structure as the main page. Admin pages are simple placeholders.

**Tech Stack:** Next.js App Router, shadcn sidebar components, lucide-react icons, next-auth for role check

---

### Task 1: Create admin layout

**Files:**
- Create: `src/app/admin/layout.tsx`

- [ ] **Create admin layout file**

```tsx
"use client"

import React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

- [ ] **Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: create admin layout with sidebar and header"
```

---

### Task 2: Create all 9 admin placeholder pages

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/trash/page.tsx`
- Create: `src/app/admin/import-export/page.tsx`
- Create: `src/app/admin/analytics/page.tsx`
- Create: `src/app/admin/backup/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/roles/page.tsx`
- Create: `src/app/admin/audit/page.tsx`
- Create: `src/app/admin/settings/page.tsx`

- [ ] **Create Dashboard page (`src/app/admin/page.tsx`)**

```tsx
export default function DashboardPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Overview of system stats and activity.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create Trash page (`src/app/admin/trash/page.tsx`)**

```tsx
export default function TrashPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Trash</h1>
      <p className="text-muted-foreground mb-6">View all deleted notes across users, batch restore or permanently delete.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create Import / Export page (`src/app/admin/import-export/page.tsx`)**

```tsx
export default function ImportExportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Import / Export</h1>
      <p className="text-muted-foreground mb-6">Bulk export notes to Markdown/JSON; import from external sources.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create Activity / Analytics page (`src/app/admin/analytics/page.tsx`)**

```tsx
export default function AnalyticsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Activity / Analytics</h1>
      <p className="text-muted-foreground mb-6">Charts for notes created, active users, storage usage trends.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create Backup & Restore page (`src/app/admin/backup/page.tsx`)**

```tsx
export default function BackupPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Backup & Restore</h1>
      <p className="text-muted-foreground mb-6">Manage database backups and restore points.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create User Management page (`src/app/admin/users/page.tsx`)**

```tsx
export default function UsersPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">User Management</h1>
      <p className="text-muted-foreground mb-6">Manage user accounts, passwords, and access.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create Role Management page (`src/app/admin/roles/page.tsx`)**

```tsx
export default function RolesPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Role Management</h1>
      <p className="text-muted-foreground mb-6">Define roles and assign permissions.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create Audit Logs page (`src/app/admin/audit/page.tsx`)**

```tsx
export default function AuditPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Audit Logs</h1>
      <p className="text-muted-foreground mb-6">View user activity and system events.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Create System Settings page (`src/app/admin/settings/page.tsx`)**

```tsx
export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">System Settings</h1>
      <p className="text-muted-foreground mb-6">Configure application-wide settings.</p>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Coming soon.
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/app/admin/ && git commit -m "feat: create 9 admin placeholder pages"
```

---

### Task 3: Update NotesSidebar with Notes section label + Admin section

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Add imports for admin items**

Add to the lucide-react import block:
```tsx
import {
  LayoutDashboard,
  Trash2,
  FileUp,
  BarChart3,
  Database,
  Users,
  Shield,
  ScrollText,
} from "lucide-react"
```

Note: `Settings`, `Trash2`, and `Folder as FolderIcon` are already imported.

- [ ] **Add `usePathname` import and admin items config**

After the `useSession` import line, add:
```tsx
import { usePathname } from "next/navigation"
import Link from "next/link"
```

After the `folderIcons` block (before `export default function NotesSidebar`), add:
```tsx
const adminItems = [
  { route: "/admin",            label: "Dashboard",        icon: LayoutDashboard },
  { route: "/admin/trash",      label: "Trash",            icon: Trash2 },
  { route: "/admin/import-export", label: "Import / Export", icon: FileUp },
  { route: "/admin/analytics",  label: "Analytics",        icon: BarChart3 },
  { route: "/admin/backup",     label: "Backup & Restore", icon: Database },
  { route: "/admin/users",      label: "User Management",  icon: Users },
  { route: "/admin/roles",      label: "Role Management",  icon: Shield },
  { route: "/admin/audit",      label: "Audit Logs",       icon: ScrollText },
  { route: "/admin/settings",   label: "System Settings",  icon: Settings },
]
```

- [ ] **Add `usePathname` hook inside the component**

After `const { data: session } = useSession()`, add:
```tsx
const pathname = usePathname()
```

- [ ] **Replace `SidebarContent` block**

Replace the current:
```tsx
<SidebarContent>
  {folders.map(renderFolder)}
</SidebarContent>
```

With:
```tsx
<SidebarContent>
  <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
    Notes
  </div>
  {folders.map(renderFolder)}

  {session?.user?.role === "admin" && (
    <>
      <div className="mt-4 px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
        Admin
      </div>
      <SidebarGroup className="py-0">
        <SidebarGroupContent>
          <SidebarMenu>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.route}>
                <SidebarMenuButton asChild isActive={pathname === item.route}>
                  <Link href={item.route}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )}
</SidebarContent>
```

- [ ] **Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add Notes section label and Admin nav items to sidebar"
```

---

### Task 4: Verify build and fix any issues

- [ ] **Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Fix any issues found**, then commit
```bash
git add -A
git commit -m "fix: resolve build issues"
```
