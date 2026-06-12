# Folder Grouping for Notes

## Overview
Add folder grouping to organize notes into folders in the sidebar. Users can create, rename, and delete folders, and each note belongs to exactly one folder.

## Data Model

### Folder interface
```
interface Folder {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

### Note interface (updated)
```
interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;   // null/undefined = "Quick Notes" concept
  createdAt: string;
  updatedAt: string;
}
```

### MongoDB
- New `folders` collection storing Folder documents
- Existing `notes` collection — each note gains an optional `folderId` field referencing a Folder `_id`
- Notes with no `folderId` are considered "Quick Notes" (the default folder shown in the UI)

## API Endpoints

### Folders
```
GET  /api/folders            → { success: true, data: Folder[] }
POST /api/folders            → body: { name: string } → { success: true, data: Folder }
PUT  /api/folders/[id]       → body: { name: string } → { success: true, data: Folder }
DELETE /api/folders/[id]     → deletes folder + all notes inside
                              → { success: true, data: { deletedFolder: string, deletedNotesCount: number } }
```

### Notes (updated)
```
POST /api/notes              → body: { title: string, folderId?: string }
PUT  /api/notes/[id]         → body: { title?, content?, folderId? }
```

All endpoints require authentication (session check via `getServerSession`).

### Delete folder behavior
- Server deletes the folder document from the `folders` collection
- Server deletes all notes with matching `folderId` from the `notes` collection
- Response includes the count of deleted notes so the UI can show confirmation

## UI Components

### NotesSidebar (restructured)
- Sidebar header: icon buttons for "New Note" (`+`) and "New Folder" (`📁`)
- Search bar (unchanged from current)
- Folder rows, each expandable to show notes inside:
  - Folder row shows: 📁 icon, folder name, note count badge
  - Click folder row → expands/collapses to show/hide notes inside
  - Expand/collapse has smooth height animation
- Notes listed under their folder with indentation
- "Quick Notes" folder always present (hardcoded, notes with no folderId)
- Drag-and-drop a note onto a different folder to move it
- Right-click context menu on folders: "Rename", "Delete"
- Right-click context menu on notes: "Move to folder" → submenu listing folders, "Delete"
- Double-click folder name → inline rename (input replaces text)
- Double-click note title → inline rename

### DeleteFolderDialog (new)
- Warning popup when deleting a folder
- Shows: "Delete folder '[name]' and all [N] notes inside?"
- Confirm/Cancel buttons
- Uses existing MUI `Dialog` component (similar to `DeleteConfirmDialog`)

### AppHeader (updated)
- Hamburger menu icon on tablet/mobile to toggle sidebar visibility
- Sidebar states: permanent (desktop), persistent (tablet), temporary (mobile)

## State Management (NoteContext)

Add to `NoteContext`:
- `folders: Folder[]` — list of folders
- `expandedFolders: Set<string>` — which folders are expanded in the sidebar
- `fetchFolders()` — load folders from API
- `createFolder(name)` — create folder
- `renameFolder(id, name)` — rename folder
- `deleteFolder(id)` — delete folder with cascade
- `moveNote(noteId, folderId)` — move note to folder

## Responsive Breakpoints

| Breakpoint | Sidebar Behavior |
|---|---|
| >900px | Permanent drawer (current) |
| 600-900px | Persistent drawer, hamburger toggle in header |
| <600px | Temporary drawer, overlay, hamburger toggle |

## Implementation Order

1. Add `Folder` type and update `Note` type
2. Create `src/pages/api/folders.ts` and `src/pages/api/folders/[id].ts`
3. Update `src/pages/api/notes.ts` and `src/pages/api/notes/[id].ts` with `folderId` support
4. Update `NoteContext` with folders state and actions
5. Restructure `NotesSidebar` with expandable folders, inline rename, context menus
6. Create `DeleteFolderDialog` component
7. Update `AppHeader` with responsive hamburger toggle
8. Add drag-and-drop support for moving notes between folders
9. Test all CRUD flows and responsive behavior
