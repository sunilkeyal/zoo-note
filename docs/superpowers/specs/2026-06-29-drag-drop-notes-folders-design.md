# Drag & Drop Notes and Folders — Design Spec

Date: 2026-06-29

## Overview

Add smooth drag-and-drop reordering for notes and folders in the sidebar, with visual drop indicators. Notes can be moved within a folder, between folders, and to/from the root level. Folders can be reordered and, when moved, carry all their notes with them.

## Requirements

1. Notes are draggable within the same folder (reorder), to another folder, or to the root level.
2. A horizontal drop indicator line shows exactly where the note will be placed (between existing notes).
3. Drag preview shows a ghost/semi-transparent copy of the item being dragged.
4. Folders are draggable to reorder them in the sidebar.
5. When a folder is dragged, all its nested notes move with it (folderId stays the same).
6. Notes can be dropped onto a folder to become a child of that folder (appended as last note).
7. Root-level notes (no folder) are rendered in their own section of the sidebar and are sortable.
8. Root-level note creation is supported via the existing "New Note" button when no folder is selected.
9. Animations are smooth during drag and on drop (using @dnd-kit's built-in sortable animations).
10. All operations persist to the backend via existing API endpoints.

## Data Model Changes

### Folder — add `position` field
```typescript
interface Folder {
  _id: string;
  name: string;
  userId?: string;
  position: number;         // NEW: for folder ordering
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}
```

No changes to the Note type — it already has `position` and `folderId`.

## API Changes

### `GET /api/folders` — return sorted by position
Add `.sort({ position: 1, name: 1 })` to the MongoDB query.

### `POST /api/folders` — accept optional `position`
Accept `position` in the request body. Default to `(maxPosition + 1000)` if omitted.

### `PUT /api/folders/[id]` — support `position` update
Currently only supports `name` rename. Add support for updating `position`. Body: `{ position: number }`.

### `PUT /api/notes/[id]` — already supports `folderId` and `position`
No changes needed; the endpoint already handles `folderId: null` (move to root).

## Component Architecture

### New Dependency
- `@dnd-kit/core` — `DndContext`, `DragOverlay`
- `@dnd-kit/sortable` — `SortableContext`, `useSortable`, `verticalListSortingStrategy`, `sortableKeyboardCoordinates`
- `@dnd-kit/utilities` — `CSS.transform` for animations

### Sidebar Structure (NotesSidebar.tsx)

```
DndContext
  ├── SortableContext (folders)
  │   └── folders.map(folder =>
  │       SortableFolder
  │         ├── Collapsible trigger (folder name, icon, chevron)
  │         │   └── onDragOver: accept note drops into this folder
  │         └── Collapsible content
  │             └── SortableContext (notes in folder)
  │                 └── notes.map(note =>
  │                     SortableNote
  │                       └── DropIndicator (shown when hovering between notes)
  │                 )
  ├── RootNotesSection
  │   └── SortableContext (root notes)
  │       └── rootNotes.map(note =>
  │           SortableNote
  │             └── DropIndicator
  │       )
  └── DragOverlay
      ├── NoteDragPreview (semi-transparent note card)
      └── FolderDragPreview (semi-transparent folder row)
```

### Key Behaviors

**Collision detection strategy:**
- When dragging a note: detect the closest droppable (note item or folder item)
- When over a folder's collapsible trigger area: treat as "add to folder" (append)
- When over a note item: insert above/below based on cursor position within the item (top 40% = before, bottom 60% = after)
- When dragging a folder: only allow drop on the folder list (no nesting folders)

**Drop indicator:**
- A 2px horizontal line spanning the sidebar width, colored with the theme accent color
- Shown at the exact insertion point (before/after the hovered item)
- Uses CSS transitions for smooth appearance/disappearance

**Position calculation:**
- When inserting between two items at indices `i` and `i+1`: `position = (notes[i].position + notes[i+1].position) / 2`
- When appending to end: `position = lastNote.position + 1000`
- When prepending: `position = firstNote.position / 2`
- Same algorithm for folders

**DragOverlay:**
- Shows a semi-transparent (opacity-50) copy of the dragged item
- For notes: shows title with note icon
- For folders: shows folder name with folder icon
- Uses `DragOverlay` component from @dnd-kit/core

## Files Modified

| File | Changes |
|------|---------|
| `src/components/NotesSidebar.tsx` | Major refactor: add DndContext, SortableContext, DragOverlay, drop indicators, root notes section |
| `src/contexts/NoteContext.tsx` | Add `moveFolder(folderId, position)` method; update `fetchFolders` to sort by position |
| `src/app/api/folders/route.ts` | Add position to POST body; sort GET by position |
| `src/app/api/folders/[id]/route.ts` | Add position update support to PUT |
| `src/types/index.ts` | Add `position: number` to Folder interface |

## Position Algorithm (Fractional Indexing)

Same strategy currently used for notes:

```typescript
function computePosition(
  items: { position: number }[],
  targetIndex: number
): number {
  const before = items[targetIndex - 1]?.position ?? null;
  const after = items[targetIndex]?.position ?? null;

  if (before === null && after === null) return 1000;
  if (before === null) return after! / 2;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}
```

## Error Handling

- If the API call fails during a drop operation, the item snaps back to its original position (default @dnd-kit behavior with `useSortable`)
- A toast/notification can be added in a follow-up, but the snap-back provides clear visual feedback
- The optimistic state update + API call pattern: update local state immediately, then fire the API call. If the API fails, revert.

## Root-Level Note Creation Button

Add a "New Note" button next to the existing "New Folder" button in the sidebar header. This button:

- Creates a new untitled note with `folderId: undefined` (root-level)
- Appends it to the bottom of the root-level notes list
- Automatically selects it (sets `activeNoteId`)
- Matches the styling and size of the "New Folder" button

The existing "New Folder" button behavior is unchanged.

## Out of Scope

- Keyboard-based drag-and-drop (handled by @dnd-kit keyboard support via `sortableKeyboardCoordinates`)
- Drag to trash (no)
- Multi-select drag (no)
- Drag to reorder at the note-detail level (no)
