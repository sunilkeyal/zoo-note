---

description: "Task list for Resizable Sidebar Navigation feature"

---

# Tasks: Resizable Sidebar Navigation

**Input**: Design documents from `/specs/008-resizable-sidebar/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Not requested in spec — manual validation per quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- All changes within existing layout and component files

---

## Phase 1: Setup

**Purpose**: Verify dependencies are installed

- [X] T001 Verify shadcn resizable component exists at `src/components/ui/resizable.tsx`
- [X] T002 Verify `react-resizable-panels` is in `package.json` dependencies

---

## Phase 2: Foundational

**Purpose**: Add `resizable` prop support to NotesSidebar component (used by both layouts)

- [X] T003 Add `resizable` prop to `NotesSidebar` component in `src/components/NotesSidebar.tsx` — when true, use `collapsible="none"` and apply `w-full h-full` class; when false/falsy, use existing `collapsible="icon"` behavior

**Checkpoint**: Foundation ready — both layouts can now consume the resizable sidebar

---

## Phase 3: User Story 1 — Main App Resizable Sidebar (Priority: P1) 🎯 MVP

**Goal**: Users can drag the resize handle to adjust sidebar width in the main notes view

**Independent Test**: Open `/` in a desktop browser, hover over the sidebar's right edge to see the resize handle, drag it left/right, observe sidebar and content area resizing proportionally

### Implementation

- [X] T004 [US1] Wrap sidebar + content in `ResizablePanelGroup` in `src/components/AppLayout.tsx` — add `ResizablePanel` for sidebar with `defaultSize="18%"` `minSize="200px"` `maxSize="25%"`, add `ResizableHandle withHandle`, add `ResizablePanel` for content (SidebarInset) with `defaultSize="82%"` `minSize="65%"`
- [X] T005 [P] [US1] Import `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` from `@/components/ui/resizable` in `src/components/AppLayout.tsx`
- [X] T006 [US1] Use `<NotesSidebar resizable />` in the sidebar panel in `src/components/AppLayout.tsx`

**Checkpoint**: Main app sidebar is resizable via drag handle

---

## Phase 4: User Story 2 — Admin App Resizable Sidebar (Priority: P2)

**Goal**: Admin users have the same sidebar resizing capability

**Independent Test**: Navigate to `/admin`, repeat the same drag interactions — sidebar resizes identically to the main app

### Implementation

- [X] T007 [US2] Apply the same `ResizablePanelGroup` pattern in `src/app/admin/layout.tsx` — with identical size defaults (`defaultSize="18%"`, `minSize="200px"`, `maxSize="25%"`)
- [X] T008 [P] [US2] Import `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` from `@/components/ui/resizable` in `src/app/admin/layout.tsx`
- [X] T009 [US2] Use `<NotesSidebar resizable />` in the admin layout's sidebar panel in `src/app/admin/layout.tsx`

**Checkpoint**: Admin sidebar is resizable. Both layouts work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify everything works end-to-end

- [X] T010 Run `npx tsc --noEmit` — verify zero new TypeScript errors
- [X] T011 Run `npm run build` — verify build succeeds without errors
- [X] T012 Run `quickstart.md` validation scenarios — verify resize works in both layouts, min/max constraints, mobile unaffected
- [X] T013 [P] Verify mobile views are unaffected — check that mobile tab bar and mobile layout sections render correctly without resize handle
- [X] T014 [P] Add middle-mouse-button handler to open note in new tab in `src/components/NotesSidebar.tsx` — `e.button === 1` triggers `window.open()` to `/notes/${note._id}`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — MUST complete before user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational — independent of US1
- **Polish (Phase 5)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational — fully independent of US1
- **User Story 3 (P3)**: Inherent in US1/US2 implementation (defaultSize prop) — no separate phase needed

### Parallel Opportunities

- T004 and T005 can run in parallel (same file but T005 is just an import)
- T007 and T008 can run in parallel
- US1 and US2 can be implemented in parallel by different developers
- T010, T011, T012, T013 can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Import and layout changes are sequential (same file):
Task: "Add imports in AppLayout.tsx"
Task: "Add ResizablePanelGroup wrapper in AppLayout.tsx"
Task: "Use NotesSidebar resizable in AppLayout.tsx"
```

## Parallel Example: User Stories 1 + 2

```bash
# Different files, can run in parallel:
Task: "AppLayout.tsx changes (US1)"
Task: "admin/layout.tsx changes (US2)"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test resize in main app
5. Deploy/demo if ready

### Full Delivery

1. Complete MVP (US1)
2. Add User Story 2 (admin layout)
3. Run polish tasks
4. All stories independently testable and working
