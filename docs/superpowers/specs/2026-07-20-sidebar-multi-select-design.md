# Sidebar Multi-Select — Design Spec

**Date:** 2026-07-20  
**Branch:** `feat/sidebar-multi-select`  
**Status:** Draft

---

## Overview

Add multi-select capability to the sidebar for both notes and folders. Users can select multiple items using click, CTRL+click (toggle), and SHIFT+click (range), then perform bulk operations via right-click context menu: bulk delete (move to trash) and bulk add to favorites.

---

## Selection State

### New hook: `useMultiSelect`

**File:** `src/hooks/use-multi-select.ts`

```ts
interface UseMultiSelectReturn {
  selectedIds: Set<string>
  lastSelectedId: string | null
  isSelecting: boolean
  toggleSelect: (id: string) => void
  selectRange: (id: string, allIds: string[]) => void
  selectAll: (allIds: string[]) => void
  clearSelection: () => void
  handleItemClick: (id: string, allIds: string[]) => void
}
```

**State:**
- `selectedIds: Set<string>` — IDs of currently selected items
- `lastSelectedId: string | null` — anchor point for SHIFT+range selection
- `isSelecting: boolean` — derived from `selectedIds.size > 0`

**Methods:**
- `toggleSelect(id)` — Add or remove a single ID from the set. Update `lastSelectedId`. If set becomes empty, clear `lastSelectedId`.
- `selectRange(id, allIds)` — Select all items between `lastSelectedId` and `id` in `allIds` order (inclusive). If no `lastSelectedId`, treat as `toggleSelect`.
- `selectAll(allIds)` — Select all provided IDs.
- `clearSelection()` — Reset `selectedIds` to empty, `lastSelectedId` to null.
- `handleItemClick(id, allIds)` — Orchestrates click logic:
  - If `selectedIds` is empty: call `toggleSelect(id)` (enters selection mode)
  - If event.ctrlKey/cmdKey: call `toggleSelect(id)`
  - If event.shiftKey: call `selectRange(id, allIds)`
  - Otherwise: call `toggleSelect(id)` (same as first click behavior)

---

## Click Behavior

| State | Action | Result |
|-------|--------|--------|
| No selection active | Click note | Enter selection mode, select note |
| Selection active | Click note | Toggle that note |
| Any | CTRL+Click note | Toggle note (enters selection if not active) |
| Any | SHIFT+Click note | Range select from lastSelectedId to clicked |
| Selection active | Click folder | Toggle folder (same as note) |
| Selection active | Click empty area | Clear selection |

---

## Visual Feedback

Selected items receive:
- Background: `bg-blue-100` (light) / `bg-blue-900/30` (dark)
- Left border accent: `border-l-blue-500`

No checkboxes. Selection indicated purely through background highlight.

---

## Selection Bar

A compact bar appears at the top of the sidebar when `isSelecting` is true.

**Layout:**
```
 [N selected]              [Clear]
```

- Left: count label (e.g., "3 selected")
- Right: "Clear" button that calls `clearSelection()`
- Styled with primary background, white text, small font

---

## Context Menu Behavior

### When items are selected (bulk context menu)

Right-clicking any item while items are selected shows the bulk context menu:

```
  N items selected              ← ContextMenuLabel (muted text)
  ─────────────────────────
  Add to Favorites              ← ContextMenuItem, notes only (folders skipped)
  ─────────────────────────
  Move to Trash (N)             ← ContextMenuItem, destructive (red)
```

- "Add to Favorites": Calls `toggleFavorite(id)` for each selected note. Folders are silently skipped.
- "Move to Trash (N)": Opens a confirmation dialog, then calls `deleteNote(id)` for selected notes and `deleteFolder(id)` for selected folders.

### When no items are selected (single-item context menu)

Existing behavior unchanged — shows Rename, Download PDF, Favorite toggle, Move to Trash.

### Transition

Switching between bulk and single-item menus happens automatically based on `isSelecting`. When selection is cleared, right-click reverts to single-item menu.

---

## Bulk Operations

### Bulk Trash

1. Show confirmation dialog: "Move {n} note{s} and {m} folder{s} to trash?"
2. On confirm: call `deleteNote(id)` for each selected note, `deleteFolder(id)` for each selected folder (parallel)
3. Clear selection
4. Show toast: "{n} items moved to trash"

Reuses existing `DeleteConfirmDialog` component with dynamic message.

### Bulk Favorite

1. No confirmation needed (reversible operation)
2. Call `toggleFavorite(id)` for each selected note (parallel), skip folders
3. Clear selection
4. Show toast: "{n} notes added to favorites" / "{n} notes removed from favorites" (based on majority state of selected notes)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| SHIFT+Click with no prior selection | Select just the clicked item |
| CTRL+Click on already-selected item | Deselect it; if last selected, clear selection |
| Click folder then SHIFT+Click note | Range spans flat sidebar order (folders + notes interleaved) |
| Drag-and-drop while selecting | Cancel selection, proceed with drag |
| Rename while selecting | Cancel selection, proceed with rename |
| Route change while selecting | Clear selection |
| All items in range already selected | No change |
| Single item selected + right-click | Shows bulk menu with that 1 item (not single-item menu) |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Escape | Clear all selection |
| Ctrl+A / Cmd+A | Select all visible notes + folders (when sidebar focused) |

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-multi-select.ts` | **New** — selection state hook |
| `src/components/NotesSidebar.tsx` | Add selection behavior, selection bar, bulk context menu |
| `src/components/BulkContextMenu.tsx` | **New** — bulk operations context menu component |
| `src/components/SelectionBar.tsx` | **New** — selection count + clear bar |

---

## Success Criteria

1. Users can select multiple notes/folders in the sidebar using click, CTRL+click, and SHIFT+click
2. Selected items are visually highlighted with a blue background
3. Right-click on selected items shows bulk Delete and Favorite options
4. Bulk trash moves all selected items to trash after confirmation
5. Bulk favorite toggles favorite status for all selected notes
6. Selection clears on Escape, route change, or "Clear" button
7. Existing single-item context menu behavior is preserved when no items are selected
