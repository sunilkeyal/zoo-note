# Trash Context Menu — Design Spec

**Date:** 2026-07-07  
**Branch:** `feat/trash-context-menu`  
**Status:** Approved

---

## Overview

Add a right-click context menu to the Trash nav item in the sidebar. The menu provides quick-access bulk operations (Empty Trash, Restore All) and surfaces the auto-purge policy — without requiring the user to navigate to the Trash page first.

---

## Menu Structure

```
  3 notes, 1 folder          ← non-clickable ContextMenuLabel (muted text)
 ─────────────────────────
  Restore All                ← ContextMenuItem, disabled when trash empty
 ─────────────────────────
  Empty Trash                ← ContextMenuItem, disabled when trash empty, destructive (red)
 ─────────────────────────
  Auto-purges after 7 days  ← non-clickable ContextMenuLabel (muted/italic text)
```

- Item count label reads: `"{n} note{s}"`, `"{n} folder{s}"`, or `"{n} note{s}, {m} folder{s}"` depending on what's in trash.
- When trash is empty the label reads: `"Trash is empty"` and both action items are disabled (grayed out, not hidden).
- "Empty Trash" text is styled destructively (rose/red) to signal irreversibility.

---

## Architecture

### New component: `EmptyTrashDialog`

**File:** `src/components/EmptyTrashDialog.tsx`

Matches the existing pattern of `DeleteConfirmDialog.tsx` and `DeleteFolderDialog.tsx`.

**Props:**
```ts
interface Props {
  open: boolean
  noteCount: number
  folderCount: number
  onConfirm: () => void
  onCancel: () => void
}
```

**Behaviour:**
- Renders a `Dialog` with title "Empty Trash" and a description: "Permanently delete {n} note{s} and {m} folder{s}? This cannot be undone."
- Two buttons: "Cancel" (outline) and "Empty Trash" (destructive/red variant).
- Fires `onConfirm` when the destructive button is clicked; fires `onCancel` on cancel or dialog close.

### Changes to `NotesSidebar`

The Trash section currently renders:

```tsx
<SidebarMenuButton render={<Link href="/trash" />} ...>
  <Trash2 ... />
  <span>Trash</span>
</SidebarMenuButton>
```

This is wrapped in a `ContextMenu` / `ContextMenuTrigger` (same pattern used for notes and folders).

**State added to `NotesSidebar`:**
```ts
const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false)
```

**Data needed:**
- `trashItems` and `permanentDeleteItems` and `restoreItems` are already available via `useNotes()` — no new context additions required.

**Context menu items:**
1. `ContextMenuLabel` — item count string (computed from `trashItems`)
2. `ContextMenuSeparator`
3. `ContextMenuItem` — "Restore All", `disabled` when `totalItems === 0`, calls `restoreItems(allNoteIds, allFolderIds)`
4. `ContextMenuSeparator`
5. `ContextMenuItem` — "Empty Trash", `disabled` when `totalItems === 0`, destructive styling, opens `EmptyTrashDialog`
6. `ContextMenuSeparator`
7. `ContextMenuLabel` — "Auto-purges after 7 days" (muted/italic)

**`EmptyTrashDialog` placement:** rendered alongside the existing `DeleteConfirmDialog` and `DeleteFolderDialog` instances at the bottom of the `NotesSidebar` return JSX.

---

## Data Flow

```
Right-click Trash nav item
  → ContextMenu opens
  → User clicks "Restore All"
      → restoreItems(allNoteIds, allFolderIds)   [NoteContext]
  → User clicks "Empty Trash"
      → setEmptyTrashDialogOpen(true)
      → EmptyTrashDialog opens
          → User clicks "Empty Trash" (confirm)
              → permanentDeleteItems(allNoteIds, allFolderIds)  [NoteContext]
              → setEmptyTrashDialogOpen(false)
          → User clicks "Cancel"
              → setEmptyTrashDialogOpen(false)
```

---

## Error Handling

- `restoreItems` and `permanentDeleteItems` in `NoteContext` already handle errors internally (they return `ApiResponse`). No additional error handling needed in the sidebar.

---

## Testing

- New test file: `src/__tests__/trash-context-menu.test.tsx`
- Cases:
  - Context menu renders with correct item count label
  - Context menu renders "Trash is empty" label when no items
  - "Restore All" and "Empty Trash" are disabled when trash is empty
  - Clicking "Restore All" calls `restoreItems` with all note/folder IDs
  - Clicking "Empty Trash" opens `EmptyTrashDialog`
  - Confirming in `EmptyTrashDialog` calls `permanentDeleteItems` with all note/folder IDs
  - Cancelling `EmptyTrashDialog` does not call `permanentDeleteItems`
- `EmptyTrashDialog` unit tests (similar pattern to `DeleteConfirmDialog` tests):
  - Renders correct count in description
  - Singular/plural grammar ("1 note" vs "2 notes")
  - Confirm fires `onConfirm`, cancel fires `onCancel`

---

## Files Touched

| File | Change |
|------|--------|
| `src/components/EmptyTrashDialog.tsx` | New component |
| `src/components/NotesSidebar.tsx` | Wrap Trash nav item in `ContextMenu`, add dialog state |
| `src/__tests__/trash-context-menu.test.tsx` | New test file |

No API changes. No schema changes. No new context methods.
