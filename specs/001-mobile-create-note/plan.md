# Implementation Plan: Mobile Create Note Enhancement

**Branch**: `feat/mobile-create-note` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md) (v2)

**Input**: Feature specification from `/specs/001-mobile-create-note/spec.md`

## Summary

Enhance the mobile note creation flow to match desktop behavior: tap "+" to create a note immediately on the server, then edit directly in the editor with the full formatting toolbar. Context-aware folder selection (picker in Home view, direct in folder view). No auto-deletion of empty notes.

## Critical Architecture Insight

```
THE ROOT CAUSE OF ALL PREVIOUS BUGS
════════════════════════════════════

  src/app/page.tsx (/)              src/app/notes/layout.tsx (/notes/*)
  ┌────────────────────────┐        ┌────────────────────────┐
  │  <AppLayout> ← INSTANCE A      │  <AppLayout> ← INSTANCE B (DIFFERENT!)
  │    <HomePage />         │        │    {children}           │
  │  </AppLayout>           │        │  </AppLayout>           │
  └────────────────────────┘        └────────────────────────┘

  When navigating / → /notes/[id]:
  • AppLayout A UNMOUNTS (state destroyed)
  • AppLayout B MOUNTS (fresh state)
  • All local state (mobileScreen, selectedFolder, etc.) is LOST

  NoteProvider (shared context) PERSISTS — notes/folders/createNote survive.
```

**The fix**: Don't navigate to `/notes/[id]` for mobile note creation. Instead, render the editor **inline** within the same AppLayout instance — exactly like desktop does.

```
NEW APPROACH (matching desktop)
═══════════════════════════════

  Desktop:  createNote() → setActiveNoteId(id) → MainArea re-renders (same layout)
  Mobile:   createNote() → setActiveNoteId(id) → setMobileScreen("note-detail") → MainArea renders inline

  No routing. No layout change. Same AppLayout. Same state. Same back behavior.
```

## Technical Context

**Language/Version**: TypeScript 6, React 19, Next.js 16

**Primary Dependencies**: TipTap (rich text editor), shadcn/ui (components), Tailwind CSS 4

**Storage**: MongoDB (notes), Cloudflare R2 (images via S3 SDK)

**Testing**: Vitest + Testing Library (React + DOM + user-event), jsdom

**Target Platform**: Mobile web (responsive, 768px breakpoint), works on iOS Safari and Android Chrome

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Note creation API call < 500ms, toolbar interaction < 100ms, autosave debounce 600ms/1000ms

**Constraints**: 44x44px minimum touch targets, toolbar hidden when keyboard open, tab bar hidden during editing

**Scale/Scope**: Single feature enhancement, modifies 2-3 existing components, no new API endpoints needed

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| 1.1 Data Privacy First | ✅ PASS | No new data exposure; reuses existing authenticated API |
| 1.2 Offline-Resilient Architecture | ✅ PASS | Autosave handles network failures; note created immediately on server |
| 1.3 Accessibility & Responsiveness | ✅ PASS | 44x44px touch targets enforced; mobile-first design |
| 1.4 Testable Code | ✅ PASS | New components will have Vitest tests |
| 1.5 Consistent User Experience | ✅ PASS | Reuses existing toolbar and editor patterns; matches desktop behavior |
| 1.6 Branch-Based Development | ✅ PASS | Feature branch `feat/mobile-create-note` |
| 2.1 Code Quality | ✅ PASS | TypeScript strict mode, no `any` types |
| 2.2 Dependency Management | ✅ PASS | No new dependencies; reuses existing TipTap and shadcn/ui |
| 2.3 API Design | ✅ PASS | Reuses existing POST /api/notes and PUT /api/notes/:id |
| 2.4 Database & Storage | ✅ PASS | No schema changes; reuses existing Note model |

## Project Structure

### Source Code (repository root)

```text
src/
├── components/
│   ├── AppLayout.tsx           # MODIFY: Add "note-detail" screen, render MainArea inline, handle back navigation
│   ├── FolderPickerModal.tsx   # KEEP: Already works correctly
│   ├── MainArea.tsx            # MODIFY: Remove deferred creation logic, remove cleanup effect, simplify to existing-note-only mode
│   ├── MobileFolderDetail.tsx  # KEEP: Already has "+" FAB
│   └── MobileTabBar.tsx        # No changes needed
├── app/
│   └── notes/
│       └── new/
│           └── page.tsx        # REMOVE: No longer needed (editor rendered inline)
└── __tests__/
    └── components/
        └── AppLayout.test.tsx  # MODIFY: Update tests for new flow
```

**Structure Decision**: Simplify by removing the `/notes/new` route entirely. The editor is rendered inline within AppLayout when `mobileScreen === "note-detail"`. This eliminates the dual-AppLayout problem completely.

## Implementation Design

### Approach: Inline Editor Rendering

Instead of navigating to `/notes/[id]`, we add a new mobile screen state `"note-detail"` and render MainArea directly within the same AppLayout instance.

```
FLOW: Home Tab "+" Button
═════════════════════════

  User taps "+"
       │
       ▼
  ┌──────────────┐
  │ Folder Picker │
  │    Modal      │
  └──────┬───────┘
         │
    ┌────┴────┐
    │ Cancel  │ Confirm
    │    │    │    │
    │    ▼    │    ▼
    │  Stay   │ createNote({ title: "Untitled Note", folderId })
    │  Home   │    │
    │         │    ▼
    │         │ setActiveNoteId(note._id)
    │         │    │
    │         │    ▼
    │         │ savePreviousScreen("home")
    │         │    │
    │         │    ▼
    │         │ setMobileScreen("note-detail")
    │         │    │
    │         │    ▼
    │         │ MainArea renders INLINE (same AppLayout)
    │         │    │
    │         │    ▼
    │         │ User types → autosave works as before
    │         │    │
    │         │    ▼
    │         │ Back button → setMobileScreen(previousScreen)
    │         │    │
    │         │    ▼
    │         │ Returns to Home
    └─────────┘

FLOW: Folder View "+" Button
════════════════════════════

  User taps "+" in folder view
       │
       ▼
  createNote({ title: "Untitled Note", folderId: currentFolder._id })
       │
       ▼
  setActiveNoteId(note._id)
       │
       ▼
  savePreviousScreen("folder-detail")
       │
       ▼
  setMobileScreen("note-detail")
       │
       ▼
  MainArea renders INLINE (same AppLayout)
       │
       ▼
  User types → autosave works as before
       │
       ▼
  Back button → setMobileScreen(previousScreen)
       │
       ▼
  Returns to Folder View
```

### Key Changes

1. **AppLayout.tsx**: Add `"note-detail"` to `MobileScreen` type. Add `previousScreen` state. When `mobileScreen === "note-detail"`, render `<MainArea />` inline (hidden tab bar, show back arrow). Back button restores `previousScreen`.

2. **AppLayout.tsx FAB (home)**: Open folder picker. On confirm: `createNote()` → `setActiveNoteId()` → `setMobileScreen("note-detail")`.

3. **AppLayout.tsx FAB (folder view)**: `createNote()` → `setActiveNoteId()` → `setMobileScreen("note-detail")`.

4. **MainArea.tsx**: Remove `isNewNote`/`folderId` props. Remove deferred creation logic. Remove cleanup effect. Restore to simple existing-note-only mode (the way it was before this feature).

5. **Remove `src/app/notes/new/page.tsx`**: No longer needed.

6. **FolderPickerModal.tsx**: Keep as-is (already works correctly).

### What Gets Reverted/Removed

| File | Change | Reason |
|------|--------|--------|
| `MainArea.tsx` | Remove `isNewNote`, `folderId` props | Editor is always for existing notes |
| `MainArea.tsx` | Remove deferred creation in `handleUpdate`/`handleTitleChange` | Note is created before editor loads |
| `MainArea.tsx` | Remove `hasCreatedNoteRef` | No deferred creation |
| `MainArea.tsx` | Remove `router` import | No redirect needed |
| `src/app/notes/new/page.tsx` | Delete file | Editor rendered inline |
| `AppLayout.tsx` | Remove `pendingNoteId` state | Note created before picker opens |
| `AppLayout.tsx` | Remove `isCreatingNote` state (or keep for debounce) | Simple creation flow |
| `AppLayout.tsx` | Remove `sessionStorage` nav context | No routing, so no state loss |

### What Gets Added

| File | Change | Reason |
|------|--------|--------|
| `AppLayout.tsx` | Add `"note-detail"` to `MobileScreen` | New screen state for inline editor |
| `AppLayout.tsx` | Add `previousScreen` state | Track where to go back to |
| `AppLayout.tsx` | Render `<MainArea />` when `mobileScreen === "note-detail"` | Inline editor |
| `AppLayout.tsx` | Back button: `setMobileScreen(previousScreen)` | Return to previous view |
| `AppLayout.tsx` | Home FAB: picker → createNote → note-detail | New flow |
| `AppLayout.tsx` | Folder FAB: createNote → note-detail | New flow |

## Complexity Tracking

> No constitution violations to justify — all principles pass.
