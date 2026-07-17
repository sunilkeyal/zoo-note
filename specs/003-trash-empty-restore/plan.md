# Implementation Plan: Trash Empty & Restore Buttons

**Branch**: `003-trash-empty-restore` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-trash-empty-restore/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add prominent "Empty Trash" and "Restore All" buttons to the trash page, allowing users to perform bulk trash operations with a single click and confirmation. The feature builds on the existing trash system with soft deletes and 7-day auto-purge, maintaining the current context menu functionality as an alternative.

## Technical Context

**Language/Version**: TypeScript 6, React 19, Next.js 16

**Primary Dependencies**: shadcn/ui, Tailwind CSS 4, MongoDB 6, next-auth 5

**Storage**: MongoDB (soft-deleted notes/folders with 7-day auto-purge)

**Testing**: Vitest 4, @testing-library/react 16

**Target Platform**: Web application (responsive, mobile-first)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Task completion under 30 seconds, error rate <1%

**Constraints**: Must maintain offline-resilient architecture, support keyboard navigation, meet WCAG AA standards

**Scale/Scope**: Single user trash management, existing trash system with soft deletes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

**1.1 Data Privacy First**: PASS - Feature operates on already soft-deleted data, no new data exposure

**1.2 Offline-Resilient Architecture**: PASS - Bulk operations will handle network failures gracefully, maintain client-server state consistency

**1.3 Accessibility & Responsiveness**: PASS - Buttons will support keyboard navigation, include ARIA labels, meet WCAG AA standards, mobile-responsive design

**1.4 Testable Code**: PASS - Will include Vitest tests for bulk operations, integration tests for user flows

**1.5 Consistent User Experience**: PASS - Will use shadcn/ui primitives, Tailwind CSS, follow existing component patterns, maintain theme support

**1.6 Branch-Based Development**: PASS - Using feature branch `003-trash-empty-restore`

**2.1 Code Quality**: PASS - TypeScript strict mode, ESLint compliance, error boundaries

**2.2 Dependency Management**: PASS - No new dependencies required, using existing project dependencies

**2.3 API Design**: PASS - Will use existing trash API endpoints with proper HTTP status codes

**2.4 Database & Storage**: PASS - Maintains soft deletes, preserves data integrity, uses existing MongoDB indexes

### Post-Design Check (Phase 1)

**1.1 Data Privacy First**: PASS - Design operates on existing soft-deleted data, no new data exposure risks

**1.2 Offline-Resilient Architecture**: PASS - Design includes retry logic, graceful error handling, and state consistency

**1.3 Accessibility & Responsiveness**: PASS - Design includes keyboard navigation, ARIA labels, WCAG AA compliance, mobile-responsive buttons

**1.4 Testable Code**: PASS - Design includes unit tests, integration tests, and edge case tests

**1.5 Consistent User Experience**: PASS - Design uses existing shadcn/ui components, Tailwind CSS, and follows existing patterns

**1.6 Branch-Based Development**: PASS - Using feature branch `003-trash-empty-restore`

**2.1 Code Quality**: PASS - Design maintains TypeScript strict mode, ESLint compliance, error boundaries

**2.2 Dependency Management**: PASS - No new dependencies required

**2.3 API Design**: PASS - Design uses existing API endpoints with proper contracts

**2.4 Database & Storage**: PASS - Design maintains data integrity, uses existing indexes

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── trash/
│       └── page.tsx          # Trash page with Empty Trash and Restore All buttons
├── components/
│   ├── EmptyTrashDialog.tsx  # Reuse existing confirmation dialog
│   └── TrashTable.tsx        # Existing trash table component
├── contexts/
│   └── NoteContext.tsx        # Existing trash operations (restoreItems, permanentDeleteItems)
└── __tests__/
    └── trash-buttons.test.tsx # New tests for button functionality

tests/
├── integration/
│   └── trash-bulk-operations.test.tsx  # Integration tests for bulk operations
└── unit/
    └── trash-buttons.test.tsx          # Unit tests for button components
```

**Structure Decision**: Single project structure (Next.js full-stack application). Feature adds buttons to existing trash page component, reuses existing dialog and context functions, and includes new tests for button functionality.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
