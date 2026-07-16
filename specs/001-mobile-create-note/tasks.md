# Tasks: Mobile Create Note Enhancement

**Input**: Design documents from `/specs/001-mobile-create-note/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are included per constitution principle 1.4 (Testable Code).

---

## Phase 1: Cleanup — Remove Deferred Creation & Route-Based Editor

**Purpose**: Strip out all the deferred creation logic, `/notes/new` route, and cleanup effects that were added in previous attempts. Restore MainArea to simple existing-note-only mode.

- [x] T001 Remove `src/app/notes/new/page.tsx` file (no longer needed)
- [x] T002 Remove `isNewNote` and `folderId` props from MainArea.tsx — restore to `export default function MainArea()` signature in src/components/MainArea.tsx
- [x] T003 Remove deferred creation logic from `handleUpdate` callback (the `if (isNewNote && !hasCreatedNoteRef.current)` block) in src/components/MainArea.tsx
- [x] T004 Remove deferred creation logic from `handleTitleChange` callback (the `if (isNewNote && !hasCreatedNoteRef.current)` block) in src/components/MainArea.tsx
- [x] T005 Remove `hasCreatedNoteRef` and `router` (useRouter) from MainArea.tsx in src/components/MainArea.tsx
- [x] T006 Restore `onUpdate` to `if (id) handleUpdate(id, ed.getHTML())` (remove `|| isNewNote` condition) in src/components/MainArea.tsx
- [x] T007 Restore `if (!activeNote) return null` guard (remove `&& !isNewNote`) in src/components/MainArea.tsx
- [x] T008 Restore `activeNote._id` in `handleTitleChange` call (remove `|| ""` fallback) in src/components/MainArea.tsx
- [x] T009 Restore "Last updated" display to use `activeNote.updatedAt` directly (remove conditional) in src/components/MainArea.tsx
- [x] T010 Remove `createNote` from `useNotes()` destructuring in MainArea.tsx (no longer needed)

**Checkpoint**: MainArea is back to simple existing-note-only mode. No deferred creation, no cleanup, no route handling.

---

## Phase 2: AppLayout — Add Inline Editor Screen

**Purpose**: Add `"note-detail"` as a new mobile screen state and render MainArea inline within the same AppLayout instance (matching desktop behavior).

- [x] T011 Add `"note-detail"` to `MobileScreen` type in src/components/AppLayout.tsx
- [x] T012 Add `previousScreen` state: `const [previousScreen, setPreviousScreen] = useState<MobileScreen>("home")` in src/components/AppLayout.tsx
- [x] T013 Add `activeNoteId` and `setActiveNoteId` to destructured imports from `useNotes()` in src/components/AppLayout.tsx
- [x] T014 Remove `sessionStorage` nav context logic (saveNavContext, restore useEffect, navContextRestoredRef) from AppLayout.tsx — no longer needed since we don't navigate between layout trees in src/components/AppLayout.tsx
- [x] T015 Remove `pendingNoteId` state, `isCreatingNote` state, and all related handlers (handleFolderPickerSelect, handleFolderPickerCancel) from AppLayout.tsx in src/components/AppLayout.tsx
- [x] T016 Remove unused imports: `createNote`, `updateNote`, `deleteNote` from useNotes() destructuring in src/components/AppLayout.tsx

**Checkpoint**: AppLayout cleaned up, ready for new inline editor logic.

---

## Phase 3: AppLayout — Home Tab "+" Flow

**Purpose**: Implement the home tab "+" button flow: folder picker → create note → show editor inline.

- [x] T017 Modify home tab FAB onClick: open folder picker (setShowFolderPicker(true)) — no note creation yet in src/components/AppLayout.tsx
- [x] T018 Implement `handleFolderPickerSelect(folderId)`: create note with `createNote({ title: "Untitled Note", folderId })`, then `setActiveNoteId(note._id)`, `setPreviousScreen("home")`, `setMobileScreen("note-detail")` in src/components/AppLayout.tsx
- [x] T019 Implement `handleFolderPickerCancel()`: just close picker (setShowFolderPicker(false)) — no delete needed in src/components/AppLayout.tsx

**Checkpoint**: Home tab "+" creates note and shows editor inline. Cancel does nothing.

---

## Phase 4: AppLayout — Folder View "+" Flow

**Purpose**: Implement the folder view "+" button flow: create note directly → show editor inline.

- [x] T020 Modify `handleNewNote`: create note with `createNote({ title: "Untitled Note", folderId: selectedFolder._id })`, then `setActiveNoteId(note._id)`, `setPreviousScreen("folder-detail")`, `setMobileScreen("note-detail")` in src/components/AppLayout.tsx

**Checkpoint**: Folder view "+" creates note and shows editor inline.

---

## Phase 5: AppLayout — Render Editor Inline & Back Navigation

**Purpose**: When `mobileScreen === "note-detail"`, render MainArea inline and handle back button.

- [x] T021 In the mobile layout screen content area, add: `if (mobileScreen === "note-detail") return <div className="flex-1 flex flex-col min-h-0"><MainArea /></div>` (import MainArea) in src/components/AppLayout.tsx
- [x] T022 Modify header: when `mobileScreen === "note-detail"`, show back arrow + "Edit Note" title (similar to current `isNoteDetail` logic but using mobileScreen state) in src/components/AppLayout.tsx
- [x] T023 Implement back button handler: `setMobileScreen(previousScreen)` when back arrow is clicked in "note-detail" screen in src/components/AppLayout.tsx
- [x] T024 Hide tab bar when `mobileScreen === "note-detail"` (update the tab bar conditional) in src/components/AppLayout.tsx

**Checkpoint**: Editor renders inline, back button returns to correct screen.

---

## Phase 6: AppLayout — Route-Based Note Detail (Direct URL Access)

**Purpose**: Handle direct navigation to `/notes/[id]` (e.g., bookmarks, desktop links) — show editor for existing notes.

- [x] T025 Keep the existing `isNoteDetail` check (`/^\/notes\/[^/]+$/.test(pathname)`) for direct URL access — when URL is `/notes/[id]`, set `activeNoteId` via useEffect and render MainArea inline in src/components/AppLayout.tsx
- [x] T026 When navigating directly to `/notes/[id]`, back button goes to `/` (home) — this is the fallback for direct URL access in src/components/AppLayout.tsx

**Checkpoint**: Direct URL access works, mobile create flow works, both use same inline editor.

---

## Phase 7: Polish & Testing

**Purpose**: Tests, lint, and final validation.

- [x] T027 Update AppLayout.test.tsx: test folder picker opens on FAB click, test note creation on picker confirm, test editor renders inline in src/__tests__/app-layout.test.tsx
- [x] T028 Run npm test — ensure 520+ pass (5 pre-existing admin-stats timeouts)
- [x] T029 Run npm run lint — ensure no new errors
- [ ] T030 Manual validation: Home tab + → picker → confirm → editor → back → home
- [ ] T031 Manual validation: Folder tab + → editor → back → folder view
- [ ] T032 Manual validation: Home tab + → picker → cancel → stays on home, no note created

---

## Dependencies & Execution Order

```
Phase 1 (Cleanup)  →  Phase 2 (Add Screen)  →  Phase 3 (Home Flow)
                                          ╲    ↗
                                           Phase 4 (Folder Flow)
                                                │
                                                ▼
                                          Phase 5 (Inline Editor + Back)
                                                │
                                                ▼
                                          Phase 6 (Direct URL Fallback)
                                                │
                                                ▼
                                          Phase 7 (Testing)
```

## Notes

- Each phase builds on the previous — follow the order
- Commit after each phase
- The key insight: **no routing for mobile creation** — editor renders inline in same AppLayout
- This eliminates the dual-AppLayout problem entirely
- `MainArea.tsx` changes are mostly reverting previous additions (cleanup, deferred creation)
- `AppLayout.tsx` changes are the core new logic (inline editor, back navigation)
