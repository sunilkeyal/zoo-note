# Mobile UI Redesign

## Overview

Redesign the mobile experience for zoo-note with a bottom-tab navigation pattern, 2-column note grid with folder filtering, and fixes for known touch/keyboard issues. Desktop layout remains unchanged.

## Approach

**Chosen: Bottom Tab Navigation (mobile) + Sidebar (desktop)**

On mobile (<768px), replace the sidebar with a 4-tab bottom navigation bar. On desktop (≥768px), keep the current collapsible sidebar. The `useIsMobile()` hook controls which navigation pattern renders.

This supersedes the previous spec (`2026-06-30-mobile-responsive-design.md`) which proposed progressive enhancement of the existing sidebar. The new design replaces the sidebar on mobile entirely.

## Navigation

### Mobile (<768px)

4-tab bottom bar with fixed position:

| Tab | Icon | Content |
|-----|------|---------|
| Home | 🏠 | Notes grid with folder filters |
| Favorites | ⭐ | Starred notes grid |
| Recent | 🕐 | Last 20 edited notes grid |
| More | ⋯ | Account, Import/Export, Admin access |

Tab bar height: 56px + safe-area-inset-bottom. Active tab uses accent color (#2563eb).

### Desktop (≥768px)

No change — current sidebar layout with collapsible sidebar, `SidebarTrigger` in header, `Ctrl/Cmd+B` toggle.

## Home Screen (Mobile)

### Folder Filter Row

Horizontal scrollable row of pill-shaped filter chips below the header:

- **All Notes** (default)
- **Work**
- **Personal**
- **Ideas**

Tapping a chip filters the grid. Active chip: dark background (#111827) with white text. Inactive: light gray (#f3f4f6).

### 2-Column Note Grid

Cards arranged in a 2-column CSS grid (`grid-template-columns: 1fr 1fr`, gap: 8px).

Each card (variant K style):

```
┌─────────────────────────┐
│ ████████ accent bar ████ │  ← 5px color bar (note.color)
│                         │
│  Note Title Here     ★  │  ← bold 13px, 2-line clamp, star if favorite
│                         │
│  Preview text that      │  ← 11px, gray, 3-line clamp
│  shows up to three      │
│  lines of content...    │
│                         │
├─────────────────────────┤
│ 2m ago      342 words   │  ← 10px footer with timestamp + word count
└─────────────────────────┘
```

Card specs:
- Border: 1px solid #e5e7eb
- Border radius: 10px
- Color accent bar: 5px height at top
- Star indicator: ★ (12px, #f59e0b), positioned absolute top-right when `note.favorite === true`
- Title: 13px, font-weight 700, 2-line clamp
- Preview: 11px, color #6b7280, 3-line clamp
- Footer: separated by 1px border-top, flex row with timestamp (left) and word count (right)
- No folder name inside the card (folder context provided by filter chips)

### Sort Order

Notes sorted by `updatedAt` descending (last modified first). When "All Notes" is selected, all notes appear in this order. When a specific folder is selected, notes within that folder are sorted the same way.

### Floating Action Button

FAB (+) in bottom-right corner:
- 48px diameter, circular, blue (#2563eb)
- White "+" icon, 24px
- Box shadow: 0 4px 12px rgba(37,99,235,0.4)
- Positioned absolute: bottom 64px (above tab bar), right 16px
- Opens full-screen New Note editor

## Favorites Screen

Same 2-column grid as Home, but filtered to notes where `favorite === true`. No folder filter row (favorites span all folders).

## Recent Screen

Same 2-column grid as Home, sorted by `updatedAt` descending, limited to last 20 notes. No folder filter row.

## Search

Triggered by tapping the 🔍 icon in the Home header.

Full-screen overlay:
- Back arrow (←) returns to previous screen
- Auto-focused search input
- Real-time results as user types (no submit button)
- Searches note titles AND content
- Results displayed in the same 2-column grid
- Empty state: "Type to search across all notes"
- No results state: "No results for [query]"

## New Note Flow

Triggered by tapping the FAB (+) on Home.

Full-screen editor:
- Header: back arrow (←) + "New Note" title + "Save" button (blue)
- Title input: 18px bold, placeholder "Note title"
- Folder picker: horizontal chip row (Work, Personal, Ideas), one selected at a time
- Editor area: TipTap contentEditable, takes remaining vertical space
- Mobile toolbar at bottom: Bold, Italic, Underline, Strikethrough, Heading, Lists, Tasks, Table, Color, Highlight, Image
- Save: creates note with selected folder, returns to Home
- Back arrow: discards draft (with confirmation if content exists)

## New Folder Flow

Triggered by a "New Folder" button in the Home filter row (add as the last chip with "+" icon).

Full-screen form:
- Header: back arrow (←) + "New Folder" title + "Create" button (blue, disabled when empty)
- Name input: 14px, placeholder "e.g. Projects"
- Duplicate validation: inline error "A folder with this name already exists"
- Existing folders list below the input
- Create: adds folder to the filter chips, returns to Home

## More Screen

Replaces the sidebar's secondary navigation on mobile.

Sections:
- **Account**: Profile (email), Appearance
- **Data**: Import (OneNote, Markdown, PDF), Export
- **Admin**: Dashboard (role-gated, only visible to admin users)

Each item: icon + label + description + chevron (›). Tapping opens the corresponding screen.

Sign Out at the bottom.

## Settings Screen

Accessed from More > Appearance.

- **Theme**: Light / Dark / System (pill selector)
- **Sidebar Density**: Compact / Default / Comfortable (pill selector) — for desktop sidebar
- **Editor Font Size**: current value + chevron to sub-page
- **Spell Check**: toggle

## Admin Dashboard

Accessed from More > Admin (role-gated).

Stats cards (2x2 grid):
- Users count
- Notes count
- Storage usage
- Imports count

Management links (list):
- User Management
- All Notes (browse/moderate)
- Folder Management
- System Settings
- Audit Logs

## Fix: Touch Targets

### Problem

Mobile toolbar buttons use `h-5 w-5` (20px) icons. Apple HIG recommends 44px minimum touch targets.

### Solution

Wrap each toolbar button in a container with `min-h-[44px] min-w-[44px]` and `flex items-center justify-center`. The icon stays 20px but the tap area becomes 44px.

Apply the same fix to:
- Mobile toolbar buttons in `MainArea.tsx`
- Tab bar icons in the bottom navigation
- Folder filter chips (already use `padding: 6px 14px` which is close to 44px)

## Fix: Virtual Keyboard Overlap

### Problem

When the virtual keyboard opens, the fixed bottom toolbar overlaps the keyboard and content area.

### Solution

Use the `window.visualViewport` API:

```typescript
useEffect(() => {
  const handleResize = () => {
    if (window.visualViewport) {
      const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75
      setKeyboardOpen(isKeyboardOpen)
    }
  }
  window.visualViewport?.addEventListener('resize', handleResize)
  return () => window.visualViewport?.removeEventListener('resize', handleResize)
}, [])
```

When keyboard is open:
- Hide the bottom mobile toolbar
- Reduce bottom padding on the editor scroll area
- The editor content scrolls with the viewport naturally

When keyboard closes:
- Restore the bottom toolbar
- Restore bottom padding

## Fix: TrashTable Mobile Layout

### Problem

The TrashTable uses a standard HTML table that overflows on mobile screens.

### Solution

On mobile (<768px), render notes as a 2-column grid using the same card pattern as Home, but with restore/delete actions:

```
┌─────────────────────────┐
│ Note Title Here         │
│ Work · 2 days ago       │
├─────────────────────────┤
│ Restore      Delete     │  ← action buttons in footer
└─────────────────────────┘
```

On desktop (≥768px), keep the current table layout.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MainArea.tsx` | Touch target fix for mobile toolbar, keyboard overlap handling |
| `src/components/NotesSidebar.tsx` | Hidden on mobile when bottom tabs are active |
| `src/components/AppHeader.tsx` | Adapted for mobile: show title, hide sidebar trigger |
| `src/components/TrashTable.tsx` | Card layout on mobile |
| `src/components/HomePage.tsx` | Remove or adapt — Home tab replaces this on mobile |
| `src/app/globals.css` | Bottom tab bar styles, keyboard handling CSS |
| `src/app/notes/layout.tsx` | Conditional: sidebar layout (desktop) vs tabs layout (mobile) |
| `src/app/favorites/layout.tsx` | Same conditional layout |
| `src/app/recent/layout.tsx` | Same conditional layout |
| `src/app/trash/layout.tsx` | Same conditional layout |
| **New** `src/components/MobileTabBar.tsx` | Bottom tab bar component |
| **New** `src/components/NoteCardGrid.tsx` | 2-column grid with folder filters |
| **New** `src/components/MobileSearch.tsx` | Full-screen search overlay |
| **New** `src/components/MobileNewNote.tsx` | Full-screen new note editor |
| **New** `src/components/MobileNewFolder.tsx` | New folder form |
| **New** `src/components/MobileMore.tsx` | More screen with settings/admin links |
| **New** `src/components/MobileSettings.tsx` | Settings screen |
| **New** `src/components/MobileAdmin.tsx` | Admin dashboard screen |

## Non-Goals

- No changes to the desktop sidebar layout
- No changes to the TipTap editor internals — only toolbar wrapper and touch targets
- No changes to auth pages (already responsive)
- No new CSS framework — Tailwind v4 stays
- No offline/PWA support in this phase
- No changes to the existing test suite (tests remain desktop-focused, new mobile tests added separately)

## Success Criteria

1. Mobile (<768px) shows 4-tab bottom navigation instead of sidebar
2. Home screen shows folder filter chips + 2-column note grid
3. Tapping a note opens full-screen editor
4. FAB (+) creates a new note with folder selection
5. Search works with real-time results in 2-column grid
6. Favorites and Recent screens show filtered/sorted notes in 2-column grid
7. More screen provides access to Settings, Import/Export, Admin
8. All touch targets are ≥44px on mobile
9. Virtual keyboard does not overlap the editor or toolbar
10. TrashTable renders as cards on mobile
11. Desktop layout is completely unchanged
12. All existing tests still pass
