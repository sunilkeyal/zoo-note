# Table Support in Notes Editor — Design

**Date:** 2026-07-11  
**Branch:** feat/table-support  
**Status:** Approved

---

## Overview

Add table creation and editing to the ZooNote Tiptap editor. Users insert a table via a grid-size picker in the toolbar, then manage rows and columns through both a floating toolbar (always visible while inside the table) and a right-click context menu.

---

## Packages

Four first-party Tiptap packages are required — none exist in the project today:

- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-header`
- `@tiptap/extension-table-cell`

These integrate with the existing `useEditor` extensions array in `MainArea.tsx` the same way all other Tiptap extensions do.

---

## Components

### 1. `TableGridPicker` (`src/components/TableGridPicker.tsx`)

A hoverable/tappable grid used to choose the initial table dimensions before inserting.

- Renders an 8×8 grid of cells inside a shadcn `Popover`
- Hovering (desktop) or touching (mobile) highlights the selection region
- Clicking a cell inserts a table of that size via `editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run()`
- Shows a label below the grid ("3 × 4" etc.)
- Triggered from a `Table` icon button in both the desktop and mobile toolbars
- Uses shadcn `Tooltip` + `Popover`; no external dependencies beyond what is already installed

### 2. `TableFloatingToolbar` (`src/components/TableFloatingToolbar.tsx`)

A small floating action bar that appears whenever the editor cursor is inside a table node.

- Visibility controlled by listening to Tiptap's `transaction` event and checking `editor.isActive("table")`
- Positioned absolutely above the current table using a DOM ref and `getBoundingClientRect`
- Actions (all via Tiptap commands):
  - Add Row Above / Add Row Below
  - Add Column Left / Add Column Right
  - Delete Row / Delete Column
  - Toggle Header Row (toggles first row between `tableHeader` and `tableCell` nodes)
  - Delete Table
- Uses shadcn `Button` (icon variant, `size="sm"`) and `Separator` with lucide-react icons
- Uses shadcn `Tooltip` on each button

### 3. Table Context Menu (`src/components/TableContextMenu.tsx`)

Replaces the browser context menu when the user right-clicks inside a table.

- Listens for the native `contextmenu` event on the `EditorContent` wrapper
- Only intercepts when `editor.isActive("table")` is true; otherwise falls through to the browser default
- Renders a shadcn `DropdownMenu`-style popover positioned at the cursor coordinates
- Offers the same actions as the floating toolbar (add/delete row/column, toggle header, delete table)
- Dismisses on any action or outside click

---

## Toolbar Integration

### Desktop (`DesktopToolbar` in `MainArea.tsx`)

A new `Table` icon button with a `Popover` wrapping `TableGridPicker` is added after the image button, separated by a `Separator`. Follows the same `Tooltip` + `Toggle`/button pattern as other toolbar items.

### Mobile (`MobileToolbar` in `MainArea.tsx`)

The same `TableGridPicker` popover is added to the mobile toolbar's `+` overflow popover section, alongside font size and font family. A `Table` icon with a label "Insert Table" opens the grid picker inline.

---

## Styling

Table visual styles are added to `src/app/globals.css` under the `.note-editor` scope, matching the existing pattern:

- `table` — `border-collapse: collapse; width: 100%; margin: 1em 0`
- `td`, `th` — `border: 1px solid var(--border); padding: 6px 10px; min-width: 40px`
- `th` — `background: var(--muted); font-weight: 600; text-align: left`
- Selected cell highlight — Tiptap adds `.selectedCell` class; style with a subtle `background` tint
- Resize handle — Tiptap adds `.column-resize-handle`; style to match the app's border color

Column resizing (`resizable: true`) is enabled on the Table extension.

---

## Data & Persistence

Tables are stored as standard Tiptap/ProseMirror JSON in the note's `content` field — no schema changes. The existing debounced `updateNote` path saves them automatically. Export (PDF/HTML) renders tables via the existing serialization path without changes.

---

## Error Handling & Edge Cases

- Grid picker caps at 8×8; larger tables can be grown post-insertion via add-row/add-column
- Deleting the last row or column deletes the entire table (Tiptap default — acceptable)
- Toggle header row uses Tiptap's built-in `toggleHeaderRow` command
- Cell merging is explicitly out of scope for this iteration
- Context menu only intercepts right-clicks when cursor is inside a table; all other right-clicks are unaffected

---

## Testing

- Unit tests for `TableGridPicker`: grid renders 64 cells, hover highlights correct region, click calls `insertTable` with correct row/col counts
- Unit tests for `TableFloatingToolbar`: shows when `editor.isActive("table")` is true, hides otherwise; each button calls the correct Tiptap command
- Unit tests for `TableContextMenu`: intercepts contextmenu event inside table, passes through outside table
- Integration test: insert table via grid picker → toolbar actions add/delete rows and columns → content persists in note JSON
