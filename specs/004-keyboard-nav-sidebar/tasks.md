# Tasks: Keyboard Navigation for Left Sidebar

**Input**: Design documents from `/specs/004-keyboard-nav-sidebar/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new dependencies needed — project already has React, TypeScript, Vitest, and Radix UI.

No tasks required. Proceed directly to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hook and data attributes that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Create `useSidebarKeyboardNav` hook with roving tabindex core in `src/hooks/use-sidebar-keyboard-nav.ts` — manages `focusedIndex` state, queries `[data-sidebar-nav-item]` elements, builds focusable items list, sets `tabIndex={0}` on focused item and `tabIndex={-1}` on all others
- [x] T002 [P] Add `data-sidebar-nav-item` attribute to all `SidebarMenuButton` instances in `src/components/NotesSidebar.tsx` — navigation links (Home, Favorites, Recent, Trash), folder headers, note items (root and nested), toolbar buttons (New Note, New Folder, Search), admin links, footer menu button
- [x] T003 [P] Add `tabIndex={-1}` to the `<main>` element in `src/components/ui/sidebar.tsx` (SidebarInset) so it can receive programmatic focus for Escape key behavior
- [x] T004 [P] Add `data-slot="sidebar-content"` attribute to the `SidebarContent` component in `src/components/ui/sidebar.tsx` so the hook can scope its query to the sidebar container

**Checkpoint**: Hook exists with core roving tabindex logic; all sidebar items have `data-sidebar-nav-item`; sidebar content has scoping attribute

---

## Phase 3: User Story 1 - Navigate Sidebar Items with Arrow Keys (Priority: P1) 🎯 MVP

**Goal**: Users can press Up/Down arrow keys to move focus through visible sidebar items

**Independent Test**: Click a sidebar item, press ArrowDown/ArrowUp to move between items. Focus wraps at boundaries (stays on first/last). Collapsed folder children are skipped.

### Implementation for User Story 1

- [x] T005 [US1] Implement ArrowDown handler in `src/hooks/use-sidebar-keyboard-nav.ts` — on ArrowDown key, increment `focusedIndex` if not at last item, skip items inside collapsed `CollapsibleContent` (check ancestor `data-state`), scroll focused item into view with `scrollIntoView({ block: 'nearest' })`
- [x] T006 [US1] Implement ArrowUp handler in `src/hooks/use-sidebar-keyboard-nav.ts` — on ArrowUp key, decrement `focusedIndex` if not at first item, skip items inside collapsed `CollapsibleContent`, scroll focused item into view
- [x] T007 [US1] Implement DOM mutation observer in `src/hooks/use-sidebar-keyboard-nav.ts` — use `MutationObserver` on sidebar content to rebuild focusable items list when folders expand/collapse or notes are added/removed; adjust `focusedIndex` to stay on the same item when possible
- [x] T008 [US1] Implement focus indicator styles in `src/hooks/use-sidebar-keyboard-nav.ts` — apply `bg-sidebar-accent` background highlight + `ring-2 ring-ring` focus ring to the focused item via inline style or className toggle; remove styles from previously focused item
- [x] T009 [US1] Integrate hook into `src/components/NotesSidebar.tsx` — call `useSidebarKeyboardNav(sidebarRef)` where `sidebarRef` is a ref on the `<Sidebar>` component; pass ref to the hook; add `onKeyDown` handler from hook to the sidebar content area

**Checkpoint**: Arrow key navigation works end-to-end. Focus moves up/down through all visible items. Collapsed sections are skipped. Focus indicator is visible.

---

## Phase 4: User Story 2 - Activate Sidebar Items with Enter (Priority: P2)

**Goal**: Users can press Enter to activate the focused sidebar item (navigate, expand/collapse, trigger button)

**Independent Test**: Use arrow keys to focus a navigation link, press Enter → page navigates. Focus a folder, press Enter → folder expands/collapses, focus stays. Focus a toolbar button, press Enter → action triggers.

### Implementation for User Story 2

- [x] T010 [US2] Implement Enter key handler in `src/hooks/use-sidebar-keyboard-nav.ts` — on Enter key, get the focused item element and dispatch a `click` event on it; for folder items (identified by containing `CollapsibleTrigger`), the click will toggle expand/collapse; for navigation links, the click will trigger route navigation; prevent default to avoid double-firing on buttons
- [x] T011 [US2] Ensure Enter does not interfere with rename inputs in `src/hooks/use-sidebar-keyboard-nav.ts` — check if the focused element is an `<input>` or `<textarea>` before handling Enter; if so, let the native event propagate (existing rename Enter/Escape handlers in NotesSidebar.tsx will handle it)

**Checkpoint**: Enter activates any focused sidebar item. Rename input Enter still works correctly.

---

## Phase 5: User Story 3 - Escape Returns Focus from Sidebar + Context Menu (Priority: P3)

**Goal**: Users can press Escape to exit the sidebar, and Shift+F10 to open context menus

**Independent Test**: Focus a sidebar item, press Escape → focus moves to main content. Press Shift+F10 on a note → context menu opens.

### Implementation for User Story 3

- [x] T012 [US3] Implement Escape key handler in `src/hooks/use-sidebar-keyboard-nav.ts` — on Escape key, find the `<main>` element (via `data-slot="sidebar-content"` sibling or `document.querySelector('main')`), call `.focus()`, reset `focusedIndex` to -1
- [x] T013 [US3] Implement Shift+F10 context menu handler in `src/hooks/use-sidebar-keyboard-nav.ts` — on Shift+F10 or Apps key, get the focused item element and dispatch a `contextmenu` event on it with `button: 2` to trigger the existing Radix ContextMenu; call `event.preventDefault()` to suppress the browser's default context menu
- [x] T014 [US3] Ensure Shift+F10 does not fire on items without context menus in `src/hooks/use-sidebar-keyboard-nav.ts` — check if the focused element is inside a `ContextMenuTrigger` before dispatching; if not, ignore the shortcut

**Checkpoint**: Escape exits sidebar. Shift+F10 opens context menu on notes/folders. Existing context menu behavior (right-click) unchanged.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, edge cases, and verification

- [x] T015 [P] Add ARIA attributes in `src/components/NotesSidebar.tsx` — add `role="tree"` to the folder/note container, `role="treeitem"` to folder and note items, `aria-expanded` on folder items, `role="menu"` on toolbar and admin sections, `role="menuitem"` on toolbar buttons and admin links, `aria-current="page"` on active navigation link
- [x] T016 [P] Handle collapsed sidebar (icon-only mode) edge case in `src/hooks/use-sidebar-keyboard-nav.ts` — when sidebar is in icon-only mode (`data-collapsible="icon"`), query only visible icon buttons for focusable items; ensure arrow keys work on the smaller set of items
- [x] T017 [P] Handle search input edge case in `src/hooks/use-sidebar-keyboard-nav.ts` — when the search input is focused, do not intercept ArrowUp/ArrowDown (let the search dropdown handle its own keyboard navigation); detect search input focus via `document.activeElement` check or a `data-search-active` attribute
- [x] T018 Run `npm run lint` and fix any ESLint violations in modified files (`src/hooks/use-sidebar-keyboard-nav.ts`, `src/components/NotesSidebar.tsx`, `src/components/ui/sidebar.tsx`)
- [x] T019 Run `npm test -- --run` and verify all existing tests still pass; no regressions from keyboard navigation changes
- [x] T020 Run quickstart.md validation scenarios manually — verify all 9 scenarios pass in the browser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — skip (no tasks)
- **Foundational (Phase 2)**: No dependencies — start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion. Can run in parallel with US1.
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion. Can run in parallel with US1 and US2.
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — Independent of US1 (both modify the same hook file, so sequential in practice)
- **User Story 3 (P3)**: Can start after Phase 2 — Independent of US1/US2 (same hook file constraint)

### Within Each User Story

- Implementation tasks are sequential within the hook file (T005→T006→T007→T008→T009 for US1)
- Integration task (T009) comes last in US1
- US2 and US3 tasks extend the same hook, so they build on US1's foundation

### Parallel Opportunities

- T002, T003, T004 (data attributes, main tabIndex, sidebar-content attribute) can run in parallel
- T015, T016, T017 (ARIA, collapsed sidebar, search input) can run in parallel
- US2 and US3 can be implemented in parallel once US1's hook foundation is in place (different sections of the same hook)

---

## Parallel Example: Foundational Phase

```bash
# Launch all parallel foundational tasks together:
Task: "Add data-sidebar-nav-item to all SidebarMenuButton in NotesSidebar.tsx"
Task: "Add tabIndex={-1} to SidebarInset main element in sidebar.tsx"
Task: "Add data-slot=sidebar-content to SidebarContent in sidebar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (hook + data attributes)
2. Complete Phase 3: User Story 1 (arrow key navigation)
3. **STOP and VALIDATE**: Arrow keys move focus through sidebar items
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 2 → Foundation ready (hook exists, items tagged)
2. Phase 3 → Arrow keys work → Deploy/Demo (MVP!)
3. Phase 4 → Enter activation works → Deploy/Demo
4. Phase 5 → Escape + context menu works → Deploy/Demo
5. Phase 6 → Polish + accessibility → Final release

---

## Notes

- All tasks modify at most 3 files: `src/hooks/use-sidebar-keyboard-nav.ts` (new), `src/components/NotesSidebar.tsx` (modify), `src/components/ui/sidebar.tsx` (modify)
- The hook file is the core deliverable — all keyboard logic lives there
- No new npm dependencies required
- Constitution principle 1.3 (Accessibility) is directly fulfilled by this feature
- Constitution principle 1.4 (Testable Code) is addressed by T019 (existing tests pass) — no new test file required since the feature is pure event handling (existing integration tests in quickstart.md cover manual validation)
