# UI Enhancements Batch 1

## Overview

Eleven UI polish and enhancement items for the notes app: layout reordering, typography adjustments, new controls, and persistence improvements.

## Changes

### 1. Move toolbar above note title

**Current:** Editor toolbar is rendered inside `NoteEditor.tsx`, below the title and divider in `MainArea.tsx`.

**New layout order:** Toolbar bar → Title → Divider → Editor content.

**Implementation:** Extract the toolbar `<Box>` from `NoteEditor.tsx` into `MainArea.tsx`. Pass the `editor` instance from `NoteEditor` up to `MainArea` so toolbar controls (bold, italic, heading select, etc.) can call editor commands. Use a callback ref or forward the editor via a prop pattern.

### 2. Enable font size for H1/H2/H3

**Current:** The font-size `<Select>` is disabled when `editor.isActive('heading')` is true.

**New:** Remove the `disabled` prop. The `setFontSize` command already works on heading nodes — enabling it lets users override heading sizes inline.

### 3. Reduce heading sizes

Update CSS in `globals.css`:

- H1: `1.5rem` → `1.4rem`
- H2: `1.25rem` → `1.2rem`
- H3: `1.1rem` → `1.05rem`

### 4. Increase note title size

In `MainArea.tsx`: change title `fontSize` from `'1.35rem'` to `'1.6rem'`.

### 5. Font size options

Replace `FONT_SIZES` array in `NoteEditor.tsx`:

```
['10', '11', '12', '13', '14', '15', '16', '17', '18', '20', '24']
```

Removed: `32`. Added: `10`, `11`, `13`, `15`, `17`, `20`.

### 6. Default paragraph font size 15

In `globals.css`: `.ProseMirror` already has `font-size: 15px` — confirm it's not overridden. In `NoteEditor.tsx`, change the font-size `<Select>` default value from `'16'` to `'15'`.

### 7. Reduce line spacing

Update `globals.css`:

- `.ProseMirror` line-height: `1.7` → `1.5`
- `.ProseMirror p` margin-bottom: `0.5rem` → `0.3rem`
- `.ProseMirror li` margin-bottom: `0.25rem` → `0.15rem`

### 8. Icon library confirmation

All icons are from `@mui/icons-material`. MUI offers 2000+ icons. For expand/collapse all, `UnfoldMoreIcon` and `UnfoldLessIcon` are recommended.

### 9. Increase note details width

In `MainArea.tsx` and `globals.css`: change `maxWidth` from `960` to `1140`.

### 10. Persist folder expand/collapse state

**Current:** `expandedFolders: Set<string>` in `NoteContext` is in-memory only; lost on refresh.

**New:** On mount, read `localStorage.getItem('expandedFolders')` (JSON array, parse into `Set`). On every change to `expandedFolders`, write `Array.from(expandedFolders)` to localStorage. Use `useEffect` for both operations.

### 11. Expand/Collapse all folders

Add two `IconButton` components in `NotesSidebar.tsx` sidebar header, next to the existing New Note and New Folder buttons:

- **Expand All** (`UnfoldMoreIcon`): iterates all folder IDs and expands each
- **Collapse All** (`UnfoldLessIcon`): clears all expanded folder IDs

Both buttons use the same `expandedFolders` state and `toggleFolder` mechanism from context.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/MainArea.tsx` | Add toolbar above title, increase title font size to 1.6rem, maxWidth 960→1140 |
| `src/components/NoteEditor.tsx` | Remove toolbar block, update FONT_SIZES, remove heading font-size disable, default 15 |
| `src/components/NotesSidebar.tsx` | Add Expand All / Collapse All icon buttons |
| `src/contexts/NoteContext.tsx` | Add localStorage persistence for expandedFolders |
| `src/styles/globals.css` | Update heading sizes, line-height, margins, maxWidth |
