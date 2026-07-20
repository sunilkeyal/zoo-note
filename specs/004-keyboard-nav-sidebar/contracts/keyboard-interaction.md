# UI Contracts: Keyboard Navigation for Left Sidebar

**Date**: 2026-07-20
**Feature**: 004-keyboard-nav-sidebar

## Keyboard Interaction Contract

This document defines the keyboard interaction contract for the left sidebar navigation.

### Keys and Actions

| Key | Context | Action |
| --- | --- | --- |
| `ArrowDown` | Sidebar item focused | Move focus to next visible item |
| `ArrowUp` | Sidebar item focused | Move focus to previous visible item |
| `Enter` | Sidebar item focused | Activate item (navigate, expand/collapse, trigger button) |
| `Escape` | Sidebar item focused | Move focus to main content area |
| `Shift+F10` | Sidebar item focused | Open context menu for focused item |
| `Tab` | Sidebar item focused | Move focus to next element outside sidebar (browser default) |
| `Shift+Tab` | Sidebar item focused | Move focus to previous element outside sidebar (browser default) |

### Focus Indicator Contract

- **Visual**: Background highlight matching existing hover style (`bg-sidebar-accent`) — outline and box-shadow are intentionally suppressed to avoid double indicators with the existing `focus-visible:ring-2` on `SidebarMenuButton`
- **Scope**: Only one item has keyboard focus at a time
- **Persistence**: Focus indicator disappears when focus leaves the sidebar

### Item Activation Contract

| Item Type | Enter Behavior |
| --- | --- |
| Navigation link (Home, Favorites, Recent, Trash) | Navigate to route |
| Note item | Open note in editor |
| Folder item | Expand/collapse folder; focus stays on folder |
| Toolbar button (New Note, New Folder, Search) | Trigger button action |
| Admin link | Navigate to admin page |
| Footer menu button | Open dropdown menu |

### ARIA Contract

- `role="tree"` on the sidebar content container (for tree-like items: folders + notes)
- `role="treeitem"` on folder and note items
- `aria-expanded` on folder items (true/false)
- `role="menu"` on toolbar and admin sections
- `role="menuitem"` on toolbar buttons and admin links
- `aria-current="page"` on active navigation link
- `tabIndex={0}` on focused item, `tabIndex={-1}` on all others (roving tabindex)
