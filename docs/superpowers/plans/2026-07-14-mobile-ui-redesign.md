# Mobile UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile sidebar with a 5-tab bottom navigation, add folder browsing, search tab, and fix touch/keyboard/table issues on mobile.

**Architecture:** Create a shared `AppLayout` component that conditionally renders sidebar (desktop) or bottom tabs (mobile). Build mobile-specific components (`MobileTabBar`, `NoteCardGrid`, `MobileFolders`, `MobileFolderDetail`, `MobileSearch`, `MobileNewNote`, `MobileNewFolder`, `MobileMore`, `MobileSettings`, `MobileAdmin`) as standalone components consuming the existing `NoteContext` data layer. Fix touch targets in `MainArea.tsx`, keyboard overlap via `visualViewport` API, and TrashTable overflow with a mobile card layout.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library, `useIsMobile` hook (768px breakpoint)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/AppLayout.tsx` | Shared layout: sidebar on desktop, tabs on mobile |
| `src/components/MobileTabBar.tsx` | 5-tab bottom navigation bar |
| `src/components/NoteCardGrid.tsx` | 2-column grid with optional folder filter chips |
| `src/components/MobileFolders.tsx` | Folder cards grid with note counts |
| `src/components/MobileFolderDetail.tsx` | Notes within a specific folder |
| `src/components/MobileSearch.tsx` | Full-screen search overlay |
| `src/components/MobileNewNote.tsx` | Full-screen new note editor |
| `src/components/MobileNewFolder.tsx` | New folder form |
| `src/components/MobileMore.tsx` | More screen (account, data, admin) |
| `src/components/MobileSettings.tsx` | Settings screen |
| `src/components/MobileAdmin.tsx` | Admin dashboard screen |
| `src/__tests__/mobile-tab-bar.test.tsx` | Tests for MobileTabBar |
| `src/__tests__/note-card-grid.test.tsx` | Tests for NoteCardGrid |
| `src/__tests__/mobile-folders.test.tsx` | Tests for MobileFolders |
| `src/__tests__/mobile-folder-detail.test.tsx` | Tests for MobileFolderDetail |
| `src/__tests__/mobile-search.test.tsx` | Tests for MobileSearch |
| `src/__tests__/mobile-new-note.test.tsx` | Tests for MobileNewNote |
| `src/__tests__/mobile-new-folder.test.tsx` | Tests for MobileNewFolder |
| `src/__tests__/mobile-more.test.tsx` | Tests for MobileMore |
| `src/__tests__/mobile-settings.test.tsx` | Tests for MobileSettings |
| `src/__tests__/mobile-admin.test.tsx` | Tests for MobileAdmin |
| `src/__tests__/app-layout.test.tsx` | Tests for AppLayout |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/notes/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/favorites/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/recent/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/trash/layout.tsx` | Replace inline layout with `<AppLayout>` |
| `src/app/page.tsx` | Wrap with `<AppLayout>` for mobile support |
| `src/components/MainArea.tsx` | Touch target fix (44px min) + keyboard overlap handling |
| `src/components/TrashTable.tsx` | Card layout on mobile |
| `src/app/globals.css` | Mobile tab bar styles, keyboard handling |

---

## Implementation Tasks

### Task 1: MobileTabBar Component ✅

- [x] Create `src/components/MobileTabBar.tsx` — 5-tab bottom nav (Home, Folders, Search, Favorites, More)
- [x] Create `src/__tests__/mobile-tab-bar.test.tsx` — 4 tests
- [x] Commit

### Task 2: NoteCardGrid Component ✅

- [x] Create `src/components/NoteCardGrid.tsx` — 2-column grid with optional `showFolderFilter` prop
- [x] Create `src/__tests__/note-card-grid.test.tsx` — 7 tests
- [x] Commit

### Task 3: MobileFolders Component ✅

- [x] Create `src/components/MobileFolders.tsx` — Folder cards grid with note counts
- [x] Create `src/__tests__/mobile-folders.test.tsx` — 5 tests
- [x] Commit

### Task 4: MobileFolderDetail Component ✅

- [x] Create `src/components/MobileFolderDetail.tsx` — Notes within a specific folder
- [x] Create `src/__tests__/mobile-folder-detail.test.tsx` — 5 tests
- [x] Commit

### Task 5: MobileSearch Component ✅

- [x] Create `src/components/MobileSearch.tsx` — Full-screen search with real-time filtering
- [x] Create `src/__tests__/mobile-search.test.tsx` — 6 tests
- [x] Commit

### Task 6: MobileNewNote Component ✅

- [x] Create `src/components/MobileNewNote.tsx` — Full-screen editor with folder picker
- [x] Create `src/__tests__/mobile-new-note.test.tsx` — 4 tests
- [x] Commit

### Task 7: MobileNewFolder Component ✅

- [x] Create `src/components/MobileNewFolder.tsx` — New folder form with duplicate validation
- [x] Create `src/__tests__/mobile-new-folder.test.tsx` — 4 tests
- [x] Commit

### Task 8: MobileMore Component ✅

- [x] Create `src/components/MobileMore.tsx` — More screen (account, data, admin)
- [x] Create `src/__tests__/mobile-more.test.tsx` — 6 tests
- [x] Commit

### Task 9: MobileSettings Component ✅

- [x] Create `src/components/MobileSettings.tsx` — Theme switcher
- [x] Create `src/__tests__/mobile-settings.test.tsx` — 3 tests
- [x] Commit

### Task 10: MobileAdmin Component ✅

- [x] Create `src/components/MobileAdmin.tsx` — Admin dashboard with stats
- [x] Create `src/__tests__/mobile-admin.test.tsx` — 3 tests
- [x] Commit

### Task 11: AppLayout Component ✅

- [x] Create `src/components/AppLayout.tsx` — Shared layout with conditional mobile/desktop
- [x] Create `src/__tests__/app-layout.test.tsx` — 2 tests
- [x] Commit

### Task 12: Wire Up Layouts ✅

- [x] Replace `src/app/notes/layout.tsx` with `<AppLayout>`
- [x] Replace `src/app/favorites/layout.tsx` with `<AppLayout>`
- [x] Replace `src/app/recent/layout.tsx` with `<AppLayout>`
- [x] Replace `src/app/trash/layout.tsx` with `<AppLayout>`
- [x] Wrap `src/app/page.tsx` with `<AppLayout>`
- [x] Commit

### Task 13: Fix Touch Targets ✅

- [x] Add `min-h-[44px] min-w-[44px]` to MobileToolbar buttons in MainArea.tsx
- [x] Tab bar already uses `min-h-[44px]`
- [x] Commit

### Task 14: Fix Keyboard Overlap ✅

- [x] Add `visualViewport` API detection in MainArea.tsx
- [x] Hide mobile toolbar when keyboard is open
- [x] Adjust padding when keyboard is open
- [x] Commit

### Task 15: Fix TrashTable Mobile ✅

- [x] Add card grid layout for mobile in TrashTable.tsx
- [x] Early return after hooks to satisfy Rules of Hooks
- [x] Commit

### Task 16: Add Mobile CSS ✅

- [x] Add `.mobile-layout` and `.keyboard-open` rules to globals.css
- [x] Commit

### Task 17: Bug Fixes ✅

- [x] Fix tab bar scrolling with content (fixed position)
- [x] Fix FAB scrolling with content (fixed position)
- [x] Fix editor layout on note detail route
- [x] Fix bottom padding inside scroll areas (pb-20)
- [x] Add ZooNote branding to mobile header
- [x] Render editor on `/notes/[id]` with back button, hide tab bar
- [x] Commit

### Task 18: Run Full Test Suite ✅

- [x] All 520 tests pass across 54 test files
- [x] Build compiles cleanly
- [x] Commit

---

## Final Status

| Metric | Value |
|--------|-------|
| Test Files | 54 passed |
| Tests | 520 passed |
| New Components | 11 |
| New Test Files | 11 |
| Modified Files | 9 |
| Commits | 20+ |
