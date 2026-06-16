# Admin Sidebar Section Design

## Overview

Restructure the left sidebar to add a labeled "Notes" section for folders/notes and an "Admin" section at the bottom with administrative navigation items. Admin section is only visible to users with `role === "admin"`. Admin pages show sample data as placeholders for future implementation.

## Sidebar Layout

The sidebar (`NotesSidebar.tsx`) is restructured with two sections inside `SidebarContent`:

### Notes Section
- Section header text: "Notes" (uppercase label, no icon)
- Contains the existing folder/note hierarchy (unchanged behavior)
- Visible to all authenticated users

### Admin Section
- Placed at the bottom of `SidebarContent`, below all folders
- Separated by a `SidebarSeparator` component
- Section header text: "Admin" (uppercase label, no icon)
- Contains 9 nav items, each linking to an `/admin/*` route:
  - **Dashboard** — `/admin` — `LayoutDashboard` icon
  - **Trash** — `/admin/trash` — `Trash2` icon
  - **Import / Export** — `/admin/import-export` — `FileUp` icon
  - **Activity / Analytics** — `/admin/analytics` — `BarChart3` icon
  - **Backup & Restore** — `/admin/backup` — `Database` icon
  - **User Management** — `/admin/users` — `Users` icon
  - **Role Management** — `/admin/roles` — `Shield` icon
  - **Audit Logs** — `/admin/audit` — `ScrollText` icon
  - **System Settings** — `/admin/settings` — `Settings` icon
- Only rendered when `session?.user?.role === "admin"`
- Each item uses `SidebarMenuButton` with `render={<Link href={item.route} />}` prop for navigation
- Active state highlights the current admin route using:
  - Exact match (`pathname === "/admin"`) for Dashboard
  - Prefix match (`pathname.startsWith(item.route)`) for other items (handles sub-routes)

## Admin Routes

### Layout (`src/app/admin/layout.tsx`)
- Wraps admin pages with `SidebarProvider > NotesSidebar + SidebarInset + AppHeader`
- Same header component as the main page (sidebar trigger + theme toggle)
- Uses the same `NotesSidebar` component (which now conditionally shows admin items)

### Placeholder Pages
Each admin page renders:
- Page title (`h1`)
- Brief description
- Sample/placeholder data relevant to the page topic
- A note that full functionality is coming soon

Pages:
| Route | Title | Description | Sample Data |
|-------|-------|-------------|-------------|
| `/admin` | Dashboard | Overview of system stats and activity | Stats grid (users, notes, active today, storage) |
| `/admin/trash` | Trash | View all deleted notes across users | Table of sample deleted notes |
| `/admin/import-export` | Import / Export | Bulk export/import notes | Export format cards + import drop zone |
| `/admin/analytics` | Activity / Analytics | Charts for notes created, active users | Bar chart + top users list |
| `/admin/backup` | Backup & Restore | Manage database backups | Table of sample backup entries |
| `/admin/users` | User Management | Manage user accounts | Table of sample users with roles |
| `/admin/roles` | Role Management | Define roles and permissions | Role cards with user counts |
| `/admin/audit` | Audit Logs | View user activity and system events | Table of sample audit log entries |
| `/admin/settings` | System Settings | Configure application settings | Settings fields with sample values |

## Components Modified

### `src/components/NotesSidebar.tsx`
- Add imports: `usePathname` from `next/navigation`, `Link` from `next/link`, admin icons from `lucide-react`
- Add `adminItems` config array (outside component) with route, label, icon mappings
- Add `const pathname = usePathname()` hook
- In `SidebarContent`:
  - Add "Notes" section label before folders
  - After folders, add `SidebarSeparator` then conditionally render "Admin" section with nav items
- Each nav item uses `SidebarMenuButton` with `render` prop for `<Link>` navigation
- Active state logic: exact match for Dashboard, prefix match for sub-route capable items

## Auth & Middleware

### `src/lib/auth.config.ts` (new file)
- Edge-compatible auth config shared between middleware and full auth
- Contains: `pages`, `session` strategy, and callbacks (`authorized`, `jwt`, `session`)
- The `authorized` callback checks `auth?.user?.role === "admin"` for `/admin/*` routes
- The `jwt` callback propagates `role` from user to token
- The `session` callback propagates `role` from token to session

### `src/middleware.ts`
- Re-exports `auth` from `NextAuth(authConfig)` for Edge Runtime usage
- Does NOT import `lib/auth.ts` (avoids Node.js modules like `bcryptjs`, MongoDB driver)

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
- `src/lib/auth.config.ts`

## Seed Users

The seed script (`src/lib/seed.ts`) creates three default accounts on first run:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| user | user123 | user |
| viewer | viewer123 | viewer |

Password environment variable overrides: `ADMIN_PASSWORD`, `USER_PASSWORD`, `VIEWER_PASSWORD`.

## Edge Cases

- Clicking a note in the sidebar while on an admin page navigates back to `/` (the home page) and sets the active note
- Admin section does NOT appear when sidebar is collapsed (icon-only mode)
- No actual admin functionality is implemented — all admin pages show sample data
- The `role` field on the session is populated by JWT callback in `auth.config.ts` (already implemented)
- Direct URL access to `/admin/*` is guarded by middleware — non-admin users are redirected to login
