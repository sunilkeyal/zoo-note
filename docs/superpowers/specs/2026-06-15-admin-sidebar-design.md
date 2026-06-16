# Admin Sidebar Section Design

## Overview

Restructure the left sidebar to add a labeled "Notes" section for folders/notes and an "Admin" section at the bottom with administrative navigation items. Admin section is only visible to users with `role === "admin"`. Admin pages are placeholder shells for future implementation.

## Sidebar Layout

The sidebar (`NotesSidebar.tsx`) is restructured with two sections inside `SidebarContent`:

### Notes Section
- Section header: "Notes" with an icon
- Contains the existing folder/note hierarchy (unchanged behavior)
- Visible to all authenticated users

### Admin Section
- Placed at the bottom of `SidebarContent`, below all folders
- Separated by a visual divider
- Section header: "Admin" with an icon
- Contains 9 nav items, each linking to an `/admin/*` route:
  - **Dashboard** — `/admin` — `LayoutDashboard` icon
  - **Trash** — `/admin/trash` — `Trash2` icon — View all deleted notes across users, batch restore/delete
  - **Import / Export** — `/admin/import-export` — `FileUp` / `FileDown` icon — Bulk import/export notes
  - **Activity / Analytics** — `/admin/analytics` — `BarChart3` icon — Charts for notes created, active users, storage
  - **Backup & Restore** — `/admin/backup` — `Database` icon
  - **User Management** — `/admin/users` — `Users` icon
  - **Role Management** — `/admin/roles` — `Shield` icon
  - **Audit Logs** — `/admin/audit` — `ScrollText` icon
  - **System Settings** — `/admin/settings` — `Settings` icon
- Only rendered when `session?.user?.role === "admin"`
- Items use Next.js `<Link>` and standard sidebar menu button components for consistent styling
- Active state highlights the current admin route

## Admin Routes

### Layout (`src/app/admin/layout.tsx`)
- Wraps admin pages with `SidebarProvider > NotesSidebar + SidebarInset + AppHeader`
- Same header component as the main page (sidebar trigger + theme toggle)
- Uses the same `NotesSidebar` component (which now conditionally shows admin items)

### Placeholder Pages
Each admin page renders:
- Page title (`h1`)
- Brief description
- "Coming soon" placeholder message
- Consistent styling

Pages:
| Route | Title | Description |
|-------|-------|-------------|
| `/admin` | Dashboard | Overview of system stats and activity |
| `/admin/trash` | Trash | View all deleted notes across users, batch restore or permanently delete |
| `/admin/import-export` | Import / Export | Bulk export notes to Markdown/JSON; import from external sources |
| `/admin/analytics` | Activity / Analytics | Charts for notes created, active users, storage usage trends |
| `/admin/backup` | Backup & Restore | Manage database backups and restore points |
| `/admin/users` | User Management | Manage user accounts, passwords, and access |
| `/admin/roles` | Role Management | Define roles and assign permissions |
| `/admin/audit` | Audit Logs | View user activity and system events |
| `/admin/settings` | System Settings | Configure application-wide settings |

## Components Modified

### `src/components/NotesSidebar.tsx`
- Add `"use client"` import for `usePathname` (from `next/navigation`)
- Add admin nav items array with route, label, icon mappings
- Add `usePathname()` to determine active admin route
- In `SidebarContent`:
  - Wrap folder list with a "Notes" section group/label
  - After folders, conditionally render "Admin" section with nav items
- Each nav item uses `SidebarMenuButton` with `isActive` based on `pathname.startsWith(item.route)`

## New Files Created

- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/backup/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/roles/page.tsx`
- `src/app/admin/audit/page.tsx`
- `src/app/admin/settings/page.tsx`
- `src/app/admin/trash/page.tsx`
- `src/app/admin/import-export/page.tsx`
- `src/app/admin/analytics/page.tsx`

## Constraints

- Admin section does NOT appear when sidebar is collapsed (icon-only mode)
- No actual admin functionality is implemented — all admin pages are placeholders
- Navigation to admin pages replaces the note editor; user returns to notes by clicking a note/folder in the sidebar
- The `role` field on the session is populated by JWT callback in `auth.ts` (already implemented)
