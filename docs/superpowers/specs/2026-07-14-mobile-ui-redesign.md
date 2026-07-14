# Mobile UI Redesign

## Overview

Redesign the mobile experience for zoo-note with a 5-tab bottom navigation bar, 2-column note grid, folder browsing, and fixes for known touch/keyboard issues. Desktop layout remains unchanged.

## Approach

**Chosen: Bottom Tab Navigation (mobile) + Sidebar (desktop)**

On mobile (<768px), replace the sidebar with a 5-tab bottom navigation bar. On desktop (≥768px), keep the current collapsible sidebar. The `useIsMobile()` hook controls which navigation pattern renders.

This supersedes the previous spec (`2026-06-30-mobile-responsive-design.md`) which proposed progressive enhancement of the existing sidebar. The new design replaces the sidebar on mobile entirely.

## Navigation

### Mobile (<768px)

5-tab bottom bar with fixed position (`fixed bottom-0`):

| Tab | Icon | Content |
|-----|------|---------|
| Home | 🏠 | All notes in 2-column grid |
| Folders | 📁 | Folder cards with note counts |
| Search | 🔍 | Full-screen search overlay |
| Favorites | ⭐ | Starred notes grid |
| More | ⋯ | Account, Import/Export, Admin access |

Tab bar height: ~50px (py-2 + icon + label). Active tab uses blue (#2563eb). Fixed at bottom with z-40.

### Desktop (≥768px)

No change — current sidebar layout with collapsible sidebar, `SidebarTrigger` in header, `Ctrl/Cmd+B` toggle.

## Mobile Header

Fixed header with ZooNote branding:

```
[ZooNote logo] ZooNote · [Screen Title]
```

- Logo: `/ZooNote.png` (24px)
- App name: "ZooNote" (14px, semibold)
- Separator: "·" (gray)
- Screen title: changes per screen (Notes, Folders, Favorites, etc.)

On note detail (`/notes/[id]`), header shows back arrow (←) + "Edit Note".

## Home Screen (Mobile)

Clean 2-column grid of all notes — no folder filter chips.

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
- Bottom padding: `pb-20` inside scroll area so last cards aren't cut off by fixed tab bar

### Sort Order

Notes sorted by `updatedAt` descending (last modified first).

### Floating Action Button

FAB (+) in bottom-right corner:
- 48px diameter, circular, blue (#2563eb)
- White "+" icon, 24px
- Box shadow: 0 4px 12px rgba(37,99,235,0.4)
- Fixed position: bottom-20 (80px), right-16px (above tab bar)
- Opens full-screen New Note editor

## Folders Screen (Mobile)

Grid of folder cards with note counts.

### Folder Cards

2-column grid of folder cards:

```
┌─────────────────────────┐
│ 💼 Work                 │  ← icon + name
│                         │
│ 3                       │  ← note count (bold, 22px)
│ notes                   │  ← label (11px, gray)
└─────────────────────────┘
```

Card specs:
- Border: 1px solid #e5e7eb
- Border radius: 12px
- Padding: 16px
- Background: folder color + 40% opacity
- Icon: 20px emoji
- Name: 14px, semibold
- Note count: 22px, bold
- Label: 11px, gray

### "+ New Folder" Button

Dashed border button at bottom of grid:
- Border: 1px dashed #d1d5db
- Border radius: 12px
- Centered text: "+ New Folder" (13px, gray)

## Folder Detail Screen

Accessed by tapping a folder card in the Folders tab.

Header shows: ← back arrow + folder icon + folder name + note count.

Same 2-column note grid as Home, filtered to notes in that folder.

## Favorites Screen

Same 2-column grid as Home, but filtered to notes where `favorite === true`. No folder filter row (favorites span all folders).

## Search Screen

Accessed via the Search tab in bottom navigation.

Full-screen search:
- Auto-focused search input
- Real-time results as user types (no submit button)
- Searches note titles AND content
- Results displayed in the same 2-column grid
- Empty state: "Type to search across all notes"
- No results state: "No results for [query]"
- Back arrow (←) in header returns to previous tab

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

Triggered by the "+ New Folder" button in the Folders tab.

Full-screen form:
- Header: back arrow (←) + "New Folder" title + "Create" button (blue, disabled when empty)
- Name input: 14px, placeholder "e.g. Projects"
- Duplicate validation: inline error "A folder with this name already exists"
- Existing folders list below the input
- Create: adds folder, returns to Folders tab

## Note Detail (Mobile)

When a note is tapped (from any screen), the app navigates to `/notes/[id]`.

Mobile layout:
- Header: back arrow (←) + "Edit Note" (hides tab bar)
- Editor renders full-screen (MainArea component)
- Tab bar is hidden while editing
- Back arrow calls `router.back()`

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

## Files Modified

| File | Changes |
|------|---------|
| `src/components/AppLayout.tsx` | **New** — Shared layout: sidebar (desktop) / tabs (mobile) |
| `src/components/MobileTabBar.tsx` | **New** — 5-tab bottom navigation |
| `src/components/NoteCardGrid.tsx` | **New** — 2-column grid with optional folder filters |
| `src/components/MobileFolders.tsx` | **New** — Folder cards grid with note counts |
| `src/components/MobileFolderDetail.tsx` | **New** — Notes within a specific folder |
| `src/components/MobileSearch.tsx` | **New** — Full-screen search overlay |
| `src/components/MobileNewNote.tsx` | **New** — Full-screen new note editor |
| `src/components/MobileNewFolder.tsx` | **New** — New folder form |
| `src/components/MobileMore.tsx` | **New** — More screen with settings/admin links |
| `src/components/MobileSettings.tsx` | **New** — Settings screen |
| `src/components/MobileAdmin.tsx` | **New** — Admin dashboard screen |
| `src/components/MainArea.tsx` | Touch target fix (44px min) + keyboard overlap handling |
| `src/components/TrashTable.tsx` | Card layout on mobile |
| `src/app/globals.css` | Mobile tab bar styles, keyboard handling |
| `src/app/notes/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/favorites/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/recent/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/trash/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/page.tsx` | Wrap with `<AppLayout>` for mobile support |

## Non-Goals

- No changes to the desktop sidebar layout
- No changes to the TipTap editor internals — only toolbar wrapper and touch targets
- No changes to auth pages (already responsive)
- No new CSS framework — Tailwind v4 stays
- No offline/PWA support in this phase
- More screen items (Import, Export, Settings) are mockups — real functionality deferred

## Success Criteria

1. Mobile (<768px) shows 5-tab bottom navigation instead of sidebar
2. Home screen shows clean 2-column note grid (no folder filter bar)
3. Folders tab shows folder cards with note counts, tapping shows folder detail
4. Search is accessible as a bottom tab
5. Tapping a note opens full-screen editor with back button
6. FAB (+) creates a new note with folder selection
7. Favorites screen shows starred notes in 2-column grid
8. More screen provides access to Settings, Import/Export, Admin (mockups)
9. All touch targets are ≥44px on mobile
10. Virtual keyboard does not overlap the editor or toolbar
11. TrashTable renders as cards on mobile
12. Desktop layout is completely unchanged
13. All existing tests still pass (520 tests)
