# Role & Permission Restructure Design

## Overview

Restructure the application's role system from three roles (admin, user, viewer) to two roles (admin, user), reorganize navigation to separate admin-only and user-level features, and add user-scoping to notes and folders.

## Roles

- Remove the `viewer` role entirely (seed data, database)
- Two roles remain:
  - `admin` — "Admin User" — full system access including admin features
  - `user` — "User" — regular user access
- Remove Role Management page and sidebar entry

## URL Structure

| Path | Access | Description |
|------|--------|-------------|
| `/` | Any authenticated user | Main notes interface |
| `/workspace/trash` | Any authenticated user | Trash (moved from /admin/trash) |
| `/workspace/import-export` | Any authenticated user | Import/Export (moved from /admin/import-export) |
| `/admin` | Admin only | Dashboard |
| `/admin/analytics` | Admin only | Analytics |
| `/admin/backup` | Admin only | Backup & Restore |
| `/admin/users` | Admin only | User Management |
| `/admin/audit` | Admin only | Audit Logs |
| `/admin/settings` | Admin only | System Settings |

## Middleware (`src/lib/auth.config.ts`)

- `/workspace/*` — any authenticated user (no role check)
- `/admin/*` — `auth?.user?.role === "admin"` required
- All other routes — unchanged (any authenticated user)

## Sidebar (`src/components/NotesSidebar.tsx`)

**Section: NOTES** (all users — existing folder/note tree)

**Section: WORKSPACE** (all authenticated users)
- Trash → `/workspace/trash`
- Import / Export → `/workspace/import-export`

**Section: ADMIN** (admin users only)
- Dashboard → `/admin`
- Analytics → `/admin/analytics`
- Backup & Restore → `/admin/backup`
- User Management → `/admin/users`
- Audit Logs → `/admin/audit`
- System Settings → `/admin/settings`

**Removed:** Role Management entry

**Footer:** No changes — still displays username and role

## Admin Layout (`src/app/admin/layout.tsx`)

No changes — still checks `session?.user?.role !== "admin"` and redirects regular users.

## Workspace Layout (`src/app/workspace/layout.tsx`)

New layout component wrapping workspace pages with the same sidebar layout pattern as `src/app/layout.tsx`:
- `SidebarProvider > NotesSidebar + SidebarInset > AppHeader + children`
- No role check beyond authentication (any authenticated user)

## User-Scoped Notes and Folders

### Database Changes

- `notes` collection: add `userId` field (string — the user's `_id.toString()`)
- `folders` collection: add `userId` field (string — the user's `_id.toString()`)

### Type Changes (`src/types/index.ts`)

- `Folder` interface: add optional `userId?: string`
- `Note` interface: add optional `userId?: string`

### API Route Changes (`src/app/api/notes/*`, `src/app/api/folders/*`)

**GET requests:** Add `{ userId: session.user.id }` filter to queries so users only see their own data.

**POST requests:** Add `userId: session.user.id` to the inserted document.

**PUT/DELETE requests:** Add `userId: session.user.id` to the match filter to ensure users can only modify their own data.

### Migration (Startup)

Add to `src/lib/seed.ts` inside `ensureAdmin()`, after seeding users:

1. Find the admin user's `_id`
2. Update all notes/folders that have no `userId` field: `$set: { userId: adminUser._id.toString() }`

## Seed (`src/lib/seed.ts`)

- Remove the `viewer` user entry
- Only seed `admin` (Admin User, password: admin123) and `user` (Regular User, password: user123)

## Sidebar — Show Workspace Section for All Users

The `adminItems` array is split into two:
- `workspaceItems` — Trash, Import/Export — always rendered (no role gate)
- `adminItems` — Dashboard, Analytics, Backup & Restore, User Management, Audit Logs, System Settings — rendered only when `session?.user?.role === "admin"`

The section label changes from "ADMIN" to "WORKSPACE" for the user-level section. Admin items remain under an "ADMIN" label.

## Summary of Files Changed

| File | Change |
|------|--------|
| `docs/superpowers/specs/2026-06-18-role-permission-restructure-design.md` | New — this spec |
| `src/lib/seed.ts` | Remove viewer user; add migration logic |
| `src/lib/auth.config.ts` | Add `/workspace/*` to middleware rules |
| `src/types/index.ts` | Add `userId` to Note and Folder |
| `src/app/api/notes/route.ts` | Filter/create with userId |
| `src/app/api/notes/[id]/route.ts` | Filter with userId |
| `src/app/api/folders/route.ts` | Filter/create with userId |
| `src/app/api/folders/[id]/route.ts` | Filter with userId |
| `src/components/NotesSidebar.tsx` | Split adminItems, add workspaceItems, rename section |
| `src/app/workspace/layout.tsx` | New layout for workspace pages |
| `src/app/workspace/trash/page.tsx` | Moved from /admin/trash/page.tsx |
| `src/app/workspace/import-export/page.tsx` | Moved from /admin/import-export/page.tsx |
| `src/app/admin/layout.tsx` | No changes needed (remains admin-only) |

## Files Removed

| File | Reason |
|------|--------|
| `src/app/admin/roles/page.tsx` | Role Management removed |
| `src/app/admin/trash/page.tsx` | Moved to /workspace/trash |
| `src/app/admin/import-export/page.tsx` | Moved to /workspace/import-export |

## Non-Goals

- No actual implementation of admin features (Dashboard, Analytics, Backup, etc.) — these remain placeholders
- No database schema migrations system — simple direct field additions
- No actual trash/import-export functionality — these remain placeholder UIs
