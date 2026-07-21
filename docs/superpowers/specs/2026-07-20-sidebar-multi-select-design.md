# Sidebar Multi-Select — Design Spec

**Date:** 2026-07-20  
**Branch:** `feat/sidebar-multi-select`  
**Status:** Implemented

---

## Overview

Add multi-select capability to the sidebar for both notes and folders. Users can select multiple items using CTRL+click (toggle) and SHIFT+click (range), then perform bulk operations via right-click context menu: bulk delete (move to trash) and bulk add to favorites. Plain click navigates to the note.

---

## Selection State

### New hook: `useMultiSelect`

**File:** `src/hooks/use-multi-select.ts`

Uses `useReducer` for atomic state updates (fixes React batching bug with separate `useState` calls).

```ts
interface UseMultiSelectReturn {
  selectedIds: Set<string>
  lastSelectedId: string | null
  isSelecting: boolean
  toggleSelect: (id: string) => void
  selectRange: (id: string, allIds: string[]) => void
  selectAll: (allIds: string[]) => void
  clearSelection: () => void
}
```

**State:**
- `selectedIds: Set<string>` — IDs of currently selected items
- `lastSelectedId: string | null` — anchor point for SHIFT+range selection
- `isSelecting: boolean` — derived from `selectedIds.size > 0`

**Methods:**
- `toggleSelect(id)` — Add or remove a single ID from the set. Update `lastSelectedId`.
- `selectRange(id, allIds)` — Select all items between `lastSelectedId` and `id` in `allSidebarIds` order (inclusive). If no `lastSelectedId`, treat as `toggleSelect`.
- `selectAll(allIds)` — Select all provided IDs.
- `clearSelection()` — Reset `selectedIds` to empty, `lastSelectedId` to null.

Click orchestration is handled in the component (not the hook) via `preSelectIdRef` and `skipNextClearRef`.

---

## Click Behavior

| State | Action | Result |
|-------|--------|--------|
| Any | CTRL/SHIFT held + Click note | Toggle/select note |
| Any | CTRL/SHIFT held + Click folder | Toggle/select folder |
| Selecting | Plain click note | Clears selection, navigates to note, remembers anchor via `preSelectIdRef` |
| Selecting | Plain click folder | Clears selection |
| Any | SHIFT+Click note/folder | Range select from lastSelectedId to clicked item |
| Any | Escape | Clear all selection |
| Any | Ctrl+A (while selecting) | Select all items in sidebar order |

**Plain click anchor behavior:**
- First plain click remembers `preSelectIdRef` (no selection until CTRL/SHIFT held)
- Second CTRL/SHIFT click selects the anchor along with the new item
- Plain click while selecting clears selection first

---

## Visual Feedback

Selected items receive:
- Background: `!bg-stone-300 dark:!bg-stone-700` (with `!important`)

No checkboxes. No border accent. Selection indicated purely through background highlight.

**Sidebar list only** — not Recent, Favorites, or Home page grids.

---

## Selection Bar

**Removed from sidebar UI.** SelectionBar component exists but is not rendered in the sidebar.

---

## Context Menu Behavior

### When items are selected (bulk context menu)

Right-clicking any selected item shows the bulk context menu:

```
  N items selected              ← ContextMenuLabel (muted text, wrapped in ContextMenuGroup)
  ─────────────────────────
  Add to Favorites              ← ContextMenuItem, smart label (see below)
  ─────────────────────────
  Move to Trash (N)             ← ContextMenuItem, destructive (red)
```

**Smart favorite label:**
- All selected notes favorited → "Remove from Favorites"
- No selected notes favorited → "Add to Favorites"
- Mixed → "Add to Favorites (N already added)"

**Smart favorite behavior:**
- When label is "Remove from Favorites" → toggles all selected notes
- When label is "Add to Favorites" (pure or mixed) → only toggles unfavorited notes, preserving already-favorited ones

**Bulk delete behavior:**
- When a folder and its notes are both selected → folder is preserved, only notes are deleted
- When only folders selected → folders are deleted
- When only notes selected → notes are deleted

### When no items are selected (single-item context menu)

Existing behavior unchanged — shows Rename, Download PDF, Favorite toggle, Move to Trash.

### Transition

Switching between bulk and single-item menus happens automatically based on `isSelecting`. When selection is cleared, right-click reverts to single-item menu.

---

## Bulk Operations

### Bulk Trash

1. Show confirmation dialog (`BulkDeleteDialog`) with dynamic text
2. On confirm: call `deleteNote(id)` for selected notes, `deleteFolder(id)` for selected folders (parallel)
3. Clear selection
4. Show toast: "{n} items moved to trash"

### Bulk Favorite

1. No confirmation needed (reversible operation)
2. Call `toggleFavorite(id)` only for notes that need toggling (parallel)
3. Clear selection
4. Show toast: "{n} notes updated"

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| SHIFT+Click with no prior selection | Select just the clicked item |
| CTRL+Click on already-selected item | Deselect it; if last selected, clear `lastSelectedId` |
| CTRL+SHIFT+Click | Selects anchor + range (anchor from `preSelectIdRef`) |
| Click folder then SHIFT+Click note | Range spans visual sidebar order (folders + notes interleaved, including in-folder notes) |
| Drag-and-drop while selecting | Cancel selection, proceed with drag |
| Rename while selecting | Cancel selection, proceed with rename |
| Route change while selecting | Clear selection (with `skipNextClearRef` guard for plain click navigation) |
| All items in range already selected | No change |
| Single item selected + right-click | Shows bulk menu with that 1 item (not single-item menu) |
| Folder + notes selected for trash | Folder preserved, notes deleted |
| Mixed favorite state | Smart label shows count, only unfavorited notes toggled |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Escape | Clear all selection, clear `preSelectIdRef` |
| Ctrl+A / Cmd+A | Select all visible items in sidebar order (when selecting) |

**Ctrl+A sidebar order:** Folders first (with their in-folder notes interleaved), then root notes.

---

## Internal Refs

| Ref | Purpose |
|-----|---------|
| `preSelectIdRef` | Remembers anchor from plain click; first CTRL/SHIFT click selects it along with new item |
| `skipNextClearRef` | Prevents `pathname` useEffect from clearing selection on plain click navigation |

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-multi-select.ts` | **New** — selection state hook (useReducer) |
| `src/components/BulkDeleteDialog.tsx` | **New** — confirmation dialog with dynamic bulk delete text |
| `src/components/NotesSidebar.tsx` | Modified — selection behavior, bulk context menus, toasts, cleanup |
| `src/components/SelectionBar.tsx` | **New** — count + Clear bar (exists but not rendered in sidebar) |
| `src/app/visual/page.tsx` | **New** — visual demo page for testing selection behavior |
| `src/__tests__/use-multi-select.test.ts` | **New** — unit tests for hook |
| `src/__tests__/notes-sidebar.test.tsx` | Modified — multi-select integration tests |

---

## Success Criteria

1. Users can select multiple notes/folders in the sidebar using CTRL+click and SHIFT+click
2. Selected items are visually highlighted with a stone background
3. Right-click on selected items shows bulk Delete and Favorite options with smart labels
4. Bulk trash preserves folders when their notes are also selected
5. Bulk favorite only toggles notes that need toggling (smart behavior)
6. Selection clears on Escape, route change, drag start, or rename start
7. Existing single-item context menu behavior is preserved when no items are selected
8. Plain click navigates to notes and remembers anchor for next CTRL/SHIFT selection
