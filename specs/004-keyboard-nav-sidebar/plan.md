# Implementation Plan: Keyboard Navigation for Left Sidebar

**Branch**: `004-keyboard-nav-sidebar` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-keyboard-nav-sidebar/spec.md`

## Summary

Add arrow-key navigation (Up/Down), Enter to activate, Escape to exit, and Shift+F10 for context menus to the left sidebar. Uses a roving tabindex pattern on the existing `SidebarMenuButton` components. No new data model or API changes required — this is a pure client-side UI accessibility enhancement.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 15

**Primary Dependencies**: React (built-in), Radix UI (already in use via context menu/collapsible), @base-ui/react (use-render pattern already in sidebar primitives), @dnd-kit (already in use for drag-and-drop)

**Storage**: N/A (no persistence needed for keyboard navigation state)

**Testing**: Vitest + React Testing Library (existing test infrastructure)

**Target Platform**: Desktop web browsers (sidebar is desktop-only per AppLayout)

**Project Type**: Web application (Next.js)

**Performance Goals**: Focus management must not cause layout thrashing; arrow key response must feel instantaneous (< 16ms frame budget)

**Constraints**: Must not break existing Ctrl/Cmd+B shortcut, existing Enter in rename inputs, or existing context menu behavior. Must work across all sidebar density modes (spacious/default/compact).

**Scale/Scope**: Single component modification (NotesSidebar.tsx) + one new custom hook. No new components needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --- | --- | --- |
| 1.1 Data Privacy First | PASS | No data handling changes |
| 1.2 Offline-Resilient Architecture | PASS | No network calls added |
| 1.3 Accessibility & Responsiveness | PASS | This feature directly fulfills "Keyboard navigation MUST be supported for all interactive elements" |
| 1.4 Testable Code | PASS | Will add Vitest tests for keyboard navigation hook |
| 1.5 Consistent User Experience | PASS | Uses existing Tailwind patterns, shadcn/ui primitives, focus-visible:ring-2 pattern |
| 1.6 Branch-Based Development | PASS | Working on feature branch 004-keyboard-nav-sidebar |
| 2.1 Code Quality | PASS | TypeScript strict, no `any` types planned |
| 2.2 Dependency Management | PASS | No new dependencies — uses React built-in APIs |
| 2.3 API Design | PASS | No API changes |
| 2.4 Database & Storage | PASS | No database changes |

**Gate result**: All pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-keyboard-nav-sidebar/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no data model changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── hooks/
│   └── use-sidebar-keyboard-nav.ts    # NEW — roving tabindex + arrow key logic
├── components/
│   ├── NotesSidebar.tsx               # MODIFY — integrate keyboard nav hook, add data-slot attributes
│   └── ui/
│       └── sidebar.tsx                # MODIFY — add data-slot to SidebarMenuButton for selector targeting
└── __tests__/
    └── hooks/
        └── use-sidebar-keyboard-nav.test.ts  # NEW — keyboard navigation tests

tests/
├── integration/
│   └── sidebar-keyboard-nav.test.tsx  # NEW — integration tests
└── (existing test files unchanged)
```

**Structure Decision**: Single-project web app. Feature is contained to one new hook, one test file, and modifications to two existing files. No structural changes needed.

## Complexity Tracking

No constitution violations. No complexity tracking needed.
