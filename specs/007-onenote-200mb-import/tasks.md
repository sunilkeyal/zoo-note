---
description: "Task list for OneNote import 200 MB limit increase"
---

# Tasks: Increase OneNote Import Size Limit to 200 MB

**Input**: Design documents from `/specs/007-onenote-200mb-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-changes.md

**Tests**: Included — Constitution §1.4 (Testable Code) mandates coverage, and existing
import tests assert the old 50 MB boundary and must be updated.

**Organization**: Tasks are grouped by user story (from spec.md) for independent
implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish have no story label)

## Path Conventions

Next.js single project — all source under `src/` at repository root.

---

## Phase 1: Setup

**Purpose**: Confirm baseline before changing the limit. No new dependencies or structure.

- [X] T001 On branch `007-onenote-200mb-import`, capture the current green baseline: run `npm test -- onenote-presign onenote-upload` and confirm existing tests pass against the 50 MB limit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: N/A — this feature is isolated constant/copy edits with no shared
infrastructure to build first.

No foundational tasks. User story work can begin immediately after Setup.

---

## Phase 3: User Story 1 - Import a large OneNote notebook (Priority: P1) 🎯 MVP

**Goal**: Files up to 200 MB (`.onepkg`/`.one`) are accepted across every import entry
point, and the adjacent rejection message names the new 200 MB maximum.

**Independent Test**: Submit a valid `.onepkg` between 50 MB and 200 MB — it is accepted
and the import proceeds; submit a file > 200 MB — it is rejected with a message naming
200 MB.

### Implementation for User Story 1

- [X] T002 [P] [US1] In `src/app/api/notes/import/onenote/presign/route.ts` change `MAX_IMPORT_SIZE` from `50 * 1024 * 1024` to `200 * 1024 * 1024` and update the error string to `"File too large (max 200MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections."`
- [X] T003 [P] [US1] In `src/app/api/notes/import/onenote/upload/route.ts` change `MAX_IMPORT_SIZE` from `50 * 1024 * 1024` to `200 * 1024 * 1024` and update the error string to `"File too large (max 200MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections."`
- [X] T004 [P] [US1] In `src/app/api/notes/import/onenote/route.ts` (legacy sync path) change `MAX_SIZE` from `50 * 1024 * 1024` to `200 * 1024 * 1024` and correct the misleading error string (currently "max 4MB") to `"File too large (max 200MB). Try a smaller section (.one) or notebook (.onepkg)."`
- [X] T005 [P] [US1] In `src/contexts/ImportContext.tsx` change the client-side `MAX_IMPORT_SIZE` from `50 * 1024 * 1024` to `200 * 1024 * 1024` and update the toast description to `"Maximum import size is 200MB. For larger notebooks, configure R2 storage or split the notebook into smaller sections."`

**Checkpoint**: A 50–200 MB file imports successfully; a >200 MB file is rejected with a
200 MB message. MVP is functional.

---

## Phase 4: User Story 2 - Clear rejection above the new limit (Priority: P2)

**Goal**: Automated regression proving files > 200 MB are rejected before processing with
an actionable message that names the 200 MB maximum, and that the exact-limit boundary is
accepted.

**Independent Test**: Run the import test suites; over-limit cases return 400 with a
message matching `/200MB/`, and a file of exactly 200 MB is accepted.

**Depends on**: Phase 3 (assertions target the new 200 MB behavior). May be written
test-first (TDD) before Phase 3 edits if preferred — the tests then start red and go
green once Phase 3 lands.

### Tests for User Story 2

- [X] T006 [P] [US2] Update `src/__tests__/onenote-presign.test.ts`: change the over-limit `fileSize` to exceed 200 MB, assert 400 and message matches `/200MB/`, and add a case asserting a `fileSize` of exactly `209715200` (200 MB) is accepted
- [X] T007 [P] [US2] Update `src/__tests__/onenote-upload.test.ts`: change the over-limit `file.size` to exceed 200 MB, assert 400 and message matches `/200MB/`, and add a case asserting a file of exactly `209715200` bytes is accepted

**Checkpoint**: Import test suites pass and lock in the 200 MB boundary and messaging.

---

## Phase 5: User Story 3 - Accurate limit shown in the UI (Priority: P3)

**Goal**: The import screen displays 200 MB as the maximum.

**Independent Test**: Open the import sheet — the size guidance reads "Max 200MB".

### Implementation for User Story 3

- [X] T008 [US3] In `src/components/ImportExportSheet.tsx` change the guidance copy from "Max 50MB." to "Max 200MB." (leave surrounding text unchanged)

**Checkpoint**: UI shows the correct maximum with no remaining "50MB" references.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify consistency and full-suite health.

- [X] T009 Search `src/` for residual limits — confirm no remaining `50 * 1024 * 1024`, `"max 50MB"`, `"50MB"`, or `"Max 50MB"` occurrences in application code (exclude `docs/` historical plans)
- [X] T010 Run `npm run lint` and `npm test` — confirm all pass
- [ ] T011 [P] Perform manual validation per [quickstart.md](./quickstart.md) Scenarios 1–5 (accept 120 MB, exact-200 MB boundary, >200 MB rejection message, UI copy, async completion without timeout)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → must run first.
- **Foundational (Phase 2)** → none.
- **User Story 1 (Phase 3)** → the MVP; delivers accept + reject behavior. Depends on Setup only.
- **User Story 2 (Phase 4)** → depends on US1 (or written test-first). Independent of US3.
- **User Story 3 (Phase 5)** → depends on Setup only; independent of US2. Can run in parallel with US2.
- **Polish (Phase 6)** → after US1–US3.

## Parallel Opportunities

- **Within US1**: T002, T003, T004, T005 are all `[P]` (four different files).
- **Within US2**: T006, T007 are `[P]` (two different test files).
- **Across stories**: US2 and US3 can proceed in parallel once US1 is complete.

## Implementation Strategy

- **MVP scope**: User Story 1 (Phase 3) alone delivers the feature — files up to 200 MB
  are accepted and over-limit files are rejected with the correct message.
- **Incremental delivery**: US1 → add US2 regression tests → US3 UI copy → polish.
</content>
