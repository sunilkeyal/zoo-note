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

Tables are stored as standard Tiptap/ProseMirror HTML in the note's `content` field — no schema changes. The existing debounced `updateNote` path saves them automatically.

---

## Export Support

### ZIP Export (`src/lib/export.ts`)

The ZIP export stores raw HTML — Tiptap's table HTML (`<table>`, `<tr>`, `<th>`, `<td>`) is already included in the content string. No code change needed for ZIP export.

### ZIP Import (`src/lib/import.ts`)

Imported HTML content is loaded directly into the editor. With the Tiptap Table extension registered, the editor will parse standard table HTML into its node structure on load. No code change needed.

### PDF Export (`src/lib/pdf.ts`)

The inline `EDITOR_STYLES` constant currently has no table CSS. Table styles must be added:

```css
table { border-collapse: collapse; width: 100%; margin: 8px 0; }
th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
th { background: #f3f4f6; font-weight: 600; }
```

### Markdown Export (`src/lib/export.ts`)

`convertHtmlToMarkdown` uses Turndown, which does not handle `<table>` tags by default (renders them as raw HTML). To produce clean GFM pipe-table syntax, install `turndown-plugin-gfm` and register the `tables` plugin on the Turndown service instance.

---

## OneNote Import (`src/lib/onenote/import.ts`)

The OneNote vendor converter outputs HTML files that may contain `<table>` elements. Tiptap will parse standard `<table>/<tr>/<td>/<th>` HTML correctly, but OneNote tables often carry inline styles, `<colgroup>`/`<col>` elements, `border` attributes, and complex cell styling that conflicts with the app's table CSS.

A new `normalizeOneNoteTables(html: string): string` function is added to `src/lib/onenote/import.ts`. It:

1. Removes `<colgroup>` and `<col>` elements (Tiptap does not use them)
2. Strips `border`, `cellpadding`, `cellspacing`, `width`, `height` attributes from `<table>`, `<tr>`, `<td>`, `<th>` tags (the existing `stripFontStyles` covers inline style properties but not HTML attributes)
3. Converts OneNote's `<th scope="col">` header cells to plain `<th>` (scope attribute is not meaningful to Tiptap)

This function is called in the per-page processing pipeline after `extractBodyContent` and `stripFontStyles`. Rowspan/colspan attributes are preserved as-is (they round-trip through Tiptap's HTML parser, even though merge/split UI is out of scope for this iteration).

---

## Error Handling & Edge Cases

- Grid picker caps at 8×8; larger tables can be grown post-insertion via add-row/add-column
- Deleting the last row or column deletes the entire table (Tiptap default — acceptable)
- Toggle header row uses Tiptap's built-in `toggleHeaderRow` command
- Cell merging is explicitly out of scope for this iteration
- Context menu only intercepts right-clicks when cursor is inside a table; all other right-clicks are unaffected
- `normalizeOneNoteTables` is a best-effort pass; malformed or deeply nested OneNote tables degrade gracefully (raw HTML renders in the editor rather than crashing)

---

## Testing

- Unit tests for `TableGridPicker`: grid renders 64 cells, hover highlights correct region, click calls `insertTable` with correct row/col counts
- Unit tests for `TableFloatingToolbar`: shows when `editor.isActive("table")` is true, hides otherwise; each button calls the correct Tiptap command
- Unit tests for `TableContextMenu`: intercepts contextmenu event inside table, passes through outside table
- Unit test for `normalizeOneNoteTables`: removes colgroup, strips HTML attributes, leaves rowspan/colspan intact
- Integration test: insert table via grid picker → toolbar actions add/delete rows and columns → content persists in note JSON
- Integration test: ZIP export round-trip — table HTML is preserved in exported content and re-imports correctly
