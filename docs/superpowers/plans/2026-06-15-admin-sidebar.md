# Admin Sidebar Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Admin section to the left sidebar with 9 navigable placeholder pages, and label the existing folder area as "Notes".

**Architecture:** Admin items render conditionally in `NotesSidebar.tsx` based on user role. Each admin item links to a route under `src/app/admin/` with a shared layout using the same `SidebarProvider` + sidebar + header structure as the main page. An Edge-compatible auth config (`auth.config.ts`) handles middleware-level admin route guard and JWT role propagation.

**Tech Stack:** Next.js App Router, shadcn sidebar components, lucide-react icons, next-auth for role check

---

### Task 1: Create admin layout

**Files:**
- Create: `src/app/admin/layout.tsx`

Create layout that wraps admin pages with `SidebarProvider > NotesSidebar + SidebarInset + AppHeader + <main>`.

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

Commit: `feat: create admin layout with sidebar and header`

---

### Task 2: Create Edge-compatible auth config

**Files:**
- Create: `src/lib/auth.config.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/middleware.ts`

The middleware runs in Edge Runtime and cannot import Node.js modules (`bcryptjs`, MongoDB driver). Extract shared config (pages, session, callbacks) into `auth.config.ts` that both `lib/auth.ts` and `middleware.ts` can import.

**`src/lib/auth.config.ts`:**
- Export `authConfig` with `providers: []`, `pages`, `session`, and callbacks
- `authorized` callback: allow `/login` and `/api/auth`, check `auth?.user?.role === "admin"` for `/admin/*`, require auth for everything else
- `jwt` callback: propagate `role` and `id` from user to token
- `session` callback: propagate `role` and `id` from token to session

**`src/lib/auth.ts`:** Spread `authConfig`, override `providers` with Credentials provider.

**`src/middleware.ts`:** Re-export `NextAuth(authConfig).auth` — no imports from `lib/auth.ts`.

Commit: `fix: extract edge-safe auth config for middleware, fix admin route guard`

---

### Task 3: Create all 9 admin placeholder pages with sample data

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

Each page follows this structure but with topic-appropriate sample data:
```tsx
export default function PageName() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Title</h1>
      <p className="text-muted-foreground mb-6">Description</p>
      {/* Sample data specific to the page */}
      <p className="text-xs text-muted-foreground mt-2">Note about future functionality.</p>
    </div>
  )
}
```

Sample data per page:
- **Dashboard** — stats grid (total users, total notes, active today, storage used)
- **Trash** — table of sample deleted notes with title/user/date/actions
- **Import / Export** — export format cards + import drop zone
- **Activity / Analytics** — bar chart (CSS bars) + top users list
- **Backup & Restore** — table of sample backup entries with name/date/size/actions
- **User Management** — table of sample users with name/email/role/actions
- **Role Management** — role cards (Admin/User/Viewer) with user counts and permissions
- **Audit Logs** — table of sample audit log entries with time/user/action/details
- **System Settings** — settings fields (app name, visibility, upload size, session timeout)

Commit: `feat: add sample data and improved messages to admin placeholder pages`

---

### Task 4: Update NotesSidebar with Notes section label + Admin section

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

Changes:
1. Add imports: `usePathname` from `next/navigation`, `Link` from `next/link`, admin lucide icons
2. Add `adminItems` config array (9 items with route, label, icon)
3. Add `const pathname = usePathname()` after `useSession()`
4. Replace `SidebarContent`:
   - "Notes" section label (uppercase tracking-wider div)
   - Folders
   - `SidebarSeparator`
   - Conditional admin section (role-gated):
     - "Admin" section label
     - `SidebarGroup` with `SidebarMenu` of items
     - Each item uses `SidebarMenuButton render={<Link href={item.route} />}`
     - Active state: exact match for Dashboard, prefix match for others

Important implementation notes:
- `SidebarMenuButton` uses `render` prop (not `asChild`) for the Link — this is how the shadcn custom render system works
- Active state for Dashboard uses `pathname === "/admin"` to avoid highlighting on all admin routes
- Other items use `pathname.startsWith(item.route)` to handle future sub-routes (e.g., `/admin/users/edit/123`)

Commit: `feat: add Notes section label and Admin nav items to sidebar`

---

### Task 5: Verify build, fix issues, and seed users

**Files:**
- Modify: `src/lib/seed.ts`

**Build verification:**
1. Run `npm run build` — must pass with no errors
2. Fix any TypeScript or build issues found

**Common issues encountered:**
- `SidebarMenuButton` doesn't support `asChild` — use `render` prop instead
- Active state must handle Dashboard exact match vs. other items prefix match
- Middleware must not import Node.js modules (extract `auth.config.ts`)
- Clicking a sidebar note from an admin route must call `router.push("/")` to navigate back to the home page where the note editor renders

**Seed users (`src/lib/seed.ts`):**
Replace single admin seed with looped seeding of 3 users:

```ts
const seedUsers = [
  { username: "admin",  email: "admin@example.com",   displayName: "Admin User",    password: process.env.ADMIN_PASSWORD || "admin123",   role: "admin" },
  { username: "user",   email: "user@example.com",    displayName: "Regular User",  password: process.env.USER_PASSWORD || "user123",    role: "user" },
  { username: "viewer", email: "viewer@example.com",  displayName: "Viewer User",   password: process.env.VIEWER_PASSWORD || "viewer123", role: "viewer" },
]
```

Each user is upserted by username. Existing users are preserved.

Commit: `feat: seed user (user/user123) and viewer (viewer/viewer123) accounts`
