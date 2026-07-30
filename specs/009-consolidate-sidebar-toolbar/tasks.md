---
description: "Task list for Consolidate Sidebar Toolbar"
---

# Tasks: Consolidate Sidebar Toolbar

**Input**: Design documents from `/specs/009-consolidate-sidebar-toolbar/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-behavior.md](./contracts/ui-behavior.md)

**Tests**: Included. The project Constitution (1.4 Testable Code) requires test coverage for new/changed UI behavior, and the plan specifies test updates.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All paths are repository-relative.

## Path Conventions

Single Next.js web app: components in `src/components/`, layouts in `src/app/`, tests in `src/__tests__/`.

---

## Phase 1: Setup

**Purpose**: Prepare the working branch. No new tooling or dependencies are required.

- [X] T001 Ensure all work happens on feature branch `009-consolidate-sidebar-toolbar` (create/checkout if not present), per Constitution 1.6.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. This feature has no shared infrastructure or data prerequisites; each user story touches distinct files and can proceed after Setup.

**Checkpoint**: Setup complete — user story implementation can begin. US1 → US2 have a sequence dependency (US2 removes the bar only after US1 relocates the toggle); US3 is independent and may run in parallel with US1/US2.

---

## Phase 3: User Story 1 - Toggle theme from the sidebar toolbar (Priority: P1) 🎯 MVP

**Goal**: Present the dark/light theme toggle as the last control in the sidebar action toolbar, immediately after "Collapse all", separated by a divider, retaining existing theme behavior and persistence.

**Independent Test**: Open the app; confirm the theme toggle is the last toolbar item after "Collapse all" with a divider, clicking it switches light↔dark, and the choice persists across reload.

### Tests for User Story 1

- [X] T002 [P] [US1] Update [src/__tests__/notes-sidebar.test.tsx](../../src/__tests__/notes-sidebar.test.tsx): add tests asserting (a) a theme toggle renders as the last item in the sidebar toolbar after "Collapse all", (b) a divider separates it from "Collapse all", (c) clicking it calls `setTheme("dark")` when light and `setTheme("light")` when dark, and (d) it exposes an accessible label. Mock `@/contexts/ThemeSyncContext` `useThemeSync`.

### Implementation for User Story 1

- [X] T003 [US1] In [src/components/NotesSidebar.tsx](../../src/components/NotesSidebar.tsx): import `useThemeSync` from `@/contexts/ThemeSyncContext` and `Moon`/`Sun` from `lucide-react`; inside the `role="toolbar"` group, after the "Collapse all" `Tooltip`, add a small vertical divider (Tailwind, `bg-sidebar-border`) followed by a `Button variant="ghost" size="icon"` theme toggle wrapped in a `Tooltip`, matching the sizing of the adjacent buttons.
- [X] T004 [US1] In [src/components/NotesSidebar.tsx](../../src/components/NotesSidebar.tsx): wire the toggle to `setTheme(isDark ? "light" : "dark")`, render `Sun` when dark and `Moon` when light, and add an accessible label + tooltip text ("Switch to dark/light mode") consistent with other toolbar actions (FR-008).

**Checkpoint**: Theme toggle is fully functional inside the sidebar toolbar and independently testable.

---

## Phase 4: User Story 2 - Reclaim vertical space by removing the empty top bar (Priority: P2)

**Goal**: Remove the now-empty top bar (`AppHeader`) from the desktop and admin layouts so content occupies the reclaimed space; admin retains the theme toggle via the shared sidebar.

**Independent Test**: After US1, open a note/home and an admin view; confirm no empty top bar appears above the content and the theme toggle is still reachable in the sidebar.

**Depends on**: User Story 1 (the toggle must be relocated before the bar is removed).

### Tests for User Story 2

- [X] T005 [P] [US2] Delete obsolete test file [src/__tests__/app-header.test.tsx](../../src/__tests__/app-header.test.tsx) (the component is being removed).
- [X] T006 [P] [US2] In [src/__tests__/app-layout.test.tsx](../../src/__tests__/app-layout.test.tsx): remove the stale `vi.mock('@/components/AppHeader', …)` block; ensure the suite still passes without referencing `AppHeader`.

### Implementation for User Story 2

- [X] T007 [US2] In [src/components/AppLayout.tsx](../../src/components/AppLayout.tsx): remove the `<AppHeader />` element from the desktop (`SidebarInset`) branch and delete its `import AppHeader from "@/components/AppHeader"`.
- [X] T008 [P] [US2] In [src/app/admin/layout.tsx](../../src/app/admin/layout.tsx): remove the `<AppHeader />` element and delete its `import AppHeader from "@/components/AppHeader"`.
- [X] T009 [US2] Delete [src/components/AppHeader.tsx](../../src/components/AppHeader.tsx) (depends on T007 and T008 removing all usages).

**Checkpoint**: No empty top bar in desktop or admin layouts; content occupies the reclaimed vertical space; no dead `AppHeader` code remains.

---

## Phase 5: User Story 3 - Keep the editor formatting toolbar always visible while scrolling (Priority: P3)

**Goal**: Make the desktop editor formatting toolbar (Undo/Redo, font controls, Bold, Italic, …) stay fixed and visible while the note content scrolls, without overlapping content; title and metadata scroll away.

**Independent Test**: Open a long note on desktop, scroll the content, and confirm the formatting toolbar stays fixed and fully visible while title/metadata scroll away.

**Independent of** US1/US2 (different file) — may run in parallel.

### Tests for User Story 3

- [X] T010 [P] [US3] In [src/__tests__/main-area.test.tsx](../../src/__tests__/main-area.test.tsx): add an assertion that the desktop toolbar wrapper carries the sticky positioning classes (e.g., `sticky` and `top-0`) so it remains fixed during scroll.

### Implementation for User Story 3

- [X] T011 [US3] In [src/components/MainArea.tsx](../../src/components/MainArea.tsx): add Tailwind `sticky top-0 z-*` plus an opaque `bg-background` to the `DesktopToolbar` wrapper (`hidden md:block …`) so the formatting toolbar stays fixed at the top of the scroll viewport and does not show content bleeding through (FR-005, FR-006). Do not alter the title/metadata block or the mobile toolbar.

**Checkpoint**: Desktop formatting toolbar stays fixed while note content scrolls; mobile behavior unchanged.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify quality gates and the end-to-end experience.

- [X] T012 Run `npm run lint` and fix any issues in changed files (Constitution 2.1).
- [X] T013 Run `npm test` and ensure all suites pass, including updated `notes-sidebar`, `app-layout`, and `main-area` tests and the removed `app-header` test.
- [X] T014 Execute the manual validation steps in [quickstart.md](./quickstart.md) on a desktop viewport (US1–US3) and confirm the mobile layout regression check.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → precedes everything.
- **US1 (Phase 3)** → MVP; must complete before **US2 (Phase 4)** (bar removal depends on toggle relocation).
- **US3 (Phase 5)** → independent; can run in parallel with US1/US2.
- **Within US2**: T007 and T008 (different files, parallel) must both complete before T009 (delete component).
- **Polish (Phase 6)** → after all implementation tasks.

## Parallel Opportunities

- Test-writing tasks across stories touch different files and can run in parallel: **T002 [US1]**, **T005/T006 [US2]**, **T010 [US3]**.
- **US3 (T010, T011)** can be developed alongside **US1** and **US2** since it only touches `MainArea.tsx`.
- **T007** and **T008** (removing `AppHeader` usage in two different layout files) can run in parallel.

## Implementation Strategy

1. **MVP first**: Deliver **US1** (relocate the theme toggle) — this alone is a shippable increment.
2. **Incremental delivery**: Then **US2** (remove the empty bar) once the toggle is safely relocated.
3. **Parallel track**: **US3** (fixed editor toolbar) can proceed independently and merge whenever ready.
4. Finish with the **Polish** phase (lint, full test run, manual quickstart validation).
