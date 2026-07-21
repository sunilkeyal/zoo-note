# Tasks: Welcome Empty State Mobile

**Input**: Design documents from `/specs/005-welcome-empty-state-mobile/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not requested in feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow project structure: `src/components/`, `src/app/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project runs and identify current mobile behavior

- [x] T001 Run `npm run dev` and verify mobile home page renders correctly
- [x] T002 Inspect current empty state in `src/components/NoteCardGrid.tsx` line 96
- [x] T003 Inspect current mobile font sizes in `src/app/globals.css` and `src/components/NoteCardGrid.tsx`

---

## Phase 2: User Story 1 - Display Welcome Message on Empty State (Priority: P1) 🎯 MVP

**Goal**: Replace bare "No Notes Yet" with a welcoming icon + message on mobile home page

**Independent Test**: Launch app with no notes on mobile viewport (< 768px), verify welcome message and icon appear

### Implementation for User Story 1

- [x] T004 [P] [US1] Import `BookOpen` icon from `lucide-react` in `src/components/NoteCardGrid.tsx`
- [x] T005 [US1] Replace empty state div (line 96) in `src/components/NoteCardGrid.tsx` with welcome card containing icon, "Welcome to ZooNote" heading, and subtitle text
- [x] T006 [US1] Style welcome card: centered layout, muted icon, primary heading, subtitle with "Tap + to create your first note" guidance in `src/components/NoteCardGrid.tsx`
- [x] T007 [US1] Verify welcome state disappears when notes exist in `src/components/NoteCardGrid.tsx`
- [x] T008 [US1] Verify welcome state reappears when all notes are deleted

**Checkpoint**: Welcome empty state functional on mobile with icon and message

---

## Phase 3: User Story 2 - Increase Mobile Font Size (Priority: P2)

**Goal**: Make text on mobile home page slightly larger and more readable

**Independent Test**: Compare font sizes before and after change on mobile device; text should be ~15% larger

### Implementation for User Story 2

- [x] T009 [P] [US2] Add mobile-specific font size classes to note card elements in `src/components/NoteCardGrid.tsx` (title, preview, footer text)
- [x] T010 [P] [US2] Increase folder filter chip text size in `src/components/NoteCardGrid.tsx` (line 76)
- [x] T011 [US2] Add mobile font size overrides to `src/app/globals.css` for mobile viewport (< 768px) if needed
- [x] T012 [US2] Verify font changes apply consistently across all mobile home page elements
- [x] T013 [US2] Verify desktop view remains unchanged at viewport >= 768px

**Checkpoint**: Mobile font sizes increased; desktop unaffected

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T014 [P] Run `npm run lint` and fix any issues
- [x] T015 [P] Run `npm run test` and verify all existing tests pass
- [x] T016 Run quickstart.md validation scenarios from `specs/005-welcome-empty-state-mobile/quickstart.md`
- [x] T017 Test on multiple mobile viewport sizes (375px, 390px, 414px) for responsive consistency

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion
- **User Story 2 (Phase 3)**: Can start after Phase 1; independent of US1 (different files/concerns)
- **Polish (Phase 4)**: Depends on US1 and US2 being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories
- **User Story 2 (P2)**: Independent of US1, can be worked in parallel

### Parallel Opportunities

- T004 and T005 are sequential (import before modify)
- T009 and T010 can run in parallel (different elements in same file)
- T014 and T015 can run in parallel (lint and test)

---

## Parallel Example: User Story 1

```bash
# US1 tasks are mostly sequential since they modify the same file
# T004 (import) → T005 (replace empty state) → T006 (style) → T007/T008 (verify)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 (welcome empty state)
3. **STOP and VALIDATE**: Test welcome state on mobile
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Verify current behavior documented
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Polish → Final validation → Release

---

## Notes

- [P] tasks = different files or no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
