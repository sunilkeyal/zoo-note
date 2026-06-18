# Workspace Trash Design

## Overview

Add soft-delete trash functionality for notes and folders. Deleted items are moved to a per-user trash view with batch restore and permanent delete. Items auto-purge after 7 days via MongoDB TTL index. Admins have a cross-user trash view.

## Data Model Changes

### Note type additions (`src/types/index.ts`)
```
isDeleted?: boolean     // true when in trash
deletedAt?: string      // ISO date — TTL index drives auto-purge
```

### Folder type additions
```
isDeleted?: boolean
deletedAt?: string
```

### MongoDB Indexes
- `{ userId: 1, isDeleted: 1 }` on `notes` and `folders` collections — efficient per-user trash queries
- `{ deletedAt: 1 }` with `expireAfterSeconds: 604800` on both collections — TTL auto-purge 7 days after the `deletedAt` timestamp

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `DELETE` | `/api/notes/[id]` | Soft-delete: sets `isDeleted: true`, `deletedAt: new Date()` |
| `DELETE` | `/api/folders/[id]` | Soft-deletes the folder AND all notes inside (same fields) |
| `GET` | `/api/trash` | Current user's trash — returns notes + folders where `isDeleted: true`, sorted by `deletedAt` desc |
| `POST` | `/api/trash/restore` | Batch restore — body `{ noteIds: string[], folderIds: string[] }`, sets `isDeleted: false`, clears `deletedAt` |
| `DELETE` | `/api/trash` | Batch permanent delete — body `{ noteIds: string[], folderIds: string[] }`, hard-deletes from MongoDB |
| `GET` | `/api/admin/trash` | Admin only — all users' trash, optional `userId` query param to filter |

### Folder Restore Behavior
- Restoring a folder restores the folder only — its notes remain in trash with `isDeleted: true`
- Restoring a note that belongs to a deleted folder also restores the folder (via the selection lock mechanism)
- To restore a folder with all its notes, the user selects the folder + all its notes in the trash UI (or uses individual restore on each)

### Existing Query Changes
All existing `GET /api/notes` and `GET /api/folders` queries must filter `isDeleted: { $ne: true }` so deleted items don't appear in the active workspace.

## Selection Logic (Trash UI)

- Selecting a note that belongs to a deleted folder → the folder is auto-selected and **locked** (cannot be unselected while any of its notes are selected)
- Selecting a folder does **not** auto-select its notes — user picks individual notes to restore/purge alongside the folder
- Deselecting all notes within a folder → folder unlocks and can be individually unselected
- This ensures restoring a note always restores its parent folder, while giving the user flexibility to restore/purge a folder alone or with specific notes

## UI: Approach 1 — Type Badge

### Table Layout (shared by user + admin trash)

| Column | Content |
|--------|---------|
| Checkbox | With lock indicator when selection is forced |
| Name | Icon + title. Folders in bold with "N notes" badge. Notes show parent folder inline. |
| Type badge | Color-coded pill: amber "Folder" / blue "Note" |
| Deleted By | Admin only — user name |
| Deleted At | ISO date formatted for locale |
| Auto-purge | Countdown text (e.g. "5 days", "expiring today") |
| Actions | Restore and Delete buttons per row |

### Bulk Action Bar
- Appears when items are selected
- Shows count breakdown (e.g. "1 folder + 2 notes selected")
- "Restore Selected" button (outline)
- "Delete Forever" button (destructive)

### Empty State
- Centered message: "Trash is empty"

### States
- Loading: skeleton rows matching table structure
- Error: inline error banner with retry
- Empty: empty state message as above
- Edge case — trying to restore a folder that has already been purged by TTL: skip with warning toast

## Component Architecture

### New Files
- `src/app/api/trash/route.ts` — GET user trash data
- `src/app/api/trash/restore/route.ts` — POST batch restore
- `src/app/api/trash/route.ts` — DELETE batch permanent (extend existing)
- `src/app/api/admin/trash/route.ts` — GET admin trash data
- `src/components/TrashTable.tsx` — Reusable trash table with selection logic, bulk bar, type badges, loading/empty/error states
- `src/components/TrashPageShell.tsx` — Page wrapper with heading, description, context info

### Modified Files
- `src/app/workspace/trash/page.tsx` — Replace stub with full implementation using TrashTable
- `src/types/index.ts` — Add `isDeleted`, `deletedAt` fields to Note and Folder
- `src/app/api/notes/[id]/route.ts` — Change DELETE from hard-delete to soft-delete
- `src/app/api/folders/[id]/route.ts` — Change DELETE to soft-delete folder + notes inside
- `src/app/api/notes/route.ts` — Add `isDeleted: { $ne: true }` filter to GET
- `src/app/api/folders/route.ts` — Add `isDeleted: { $ne: true }` filter to GET
- `src/contexts/NoteContext.tsx` — Add `trash` state, `fetchTrash`, `restoreItems`, `permanentDeleteItems` actions
- `src/components/NotesSidebar.tsx` — Update delete handlers (soft-delete flow)
- `src/components/DeleteConfirmDialog.tsx` — Update text from "cannot be undone" to "will be moved to trash"
- `src/components/DeleteFolderDialog.tsx` — Same text update
- `src/lib/mongodb.ts` — Add TTL index on `notes.deletedAt` and `folders.deletedAt`

### MongoDB Index Setup
In `src/lib/mongodb.ts`, add:
```
await db.collection("notes").createIndex(
  { deletedAt: 1 }, { expireAfterSeconds: 604800 }
).catch(() => {})
await db.collection("folders").createIndex(
  { deletedAt: 1 }, { expireAfterSeconds: 604800 }
).catch(() => {})
await db.collection("notes").createIndex(
  { userId: 1, isDeleted: 1 }
).catch(() => {})
await db.collection("folders").createIndex(
  { userId: 1, isDeleted: 1 }
).catch(() => {})
```
TTL of 604800 seconds = 7 days. MongoDB checks TTL indexes once per 60 seconds.

## Future / Stretch
- Admin trash page with user filter dropdown
- Sortable columns in trash table
- Search/filter within trash
