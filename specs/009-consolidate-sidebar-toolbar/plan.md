# Implementation Plan: Consolidate Sidebar Toolbar

**Branch**: `009-consolidate-sidebar-toolbar` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-consolidate-sidebar-toolbar/spec.md`

## Summary

Relocate the dark/light theme toggle from the near-empty top bar (`AppHeader`) into the sidebar action toolbar as the last item after "Collapse all" (separated by a divider), remove the now-empty top bar from the desktop and admin layouts, and make the desktop editor formatting toolbar stay fixed and visible while note content scrolls. This is a pure front-end layout/placement change reusing existing theme state; no data model, API, or storage changes are involved.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 19, Next.js 15 (App Router)

**Primary Dependencies**: Next.js, React, shadcn/ui primitives (Base UI), Tailwind CSS, lucide-react icons, TipTap editor, `ThemeSyncContext` (wraps `next-themes`)

**Storage**: N/A for this feature (theme preference persistence already handled by existing `ThemeSyncContext`)

**Testing**: Vitest + @testing-library/react (`npm test`)

**Target Platform**: Web (desktop browsers are primary; mobile layout is explicitly unchanged)

**Project Type**: Web application (single Next.js app)

**Performance Goals**: Theme switch is instant from the user's perspective; sticky toolbar must not introduce scroll jank (target smooth 60 fps scrolling)

**Constraints**: Tailwind CSS only (no inline styles/CSS-in-JS); shadcn/ui primitives preferred; dark/light theme support maintained; keyboard-operable with ARIA labels (WCAG AA)

**Scale/Scope**: Small, localized UI change touching ~4 component/layout files plus tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| 1.3 Accessibility & Responsiveness | PASS — relocated theme toggle keeps keyboard operability, tooltip, and an ARIA label; sidebar toolbar already uses `role="toolbar"`. Mobile layout untouched. |
| 1.4 Testable Code | PASS — update `notes-sidebar` tests to assert the toggle presence/behavior; remove obsolete `AppHeader` test; add a fixed-toolbar assertion for `MainArea`. |
| 1.5 Consistent User Experience | PASS — reuse existing `Button`, `Tooltip`, and separator primitives with Tailwind classes; theme support preserved; follows existing sidebar toolbar pattern. |
| 1.6 Branch-Based Development | ADVISORY — `pwsh` is unavailable locally, so the feature branch was not auto-created by the setup script; work must still be done on branch `009-consolidate-sidebar-toolbar` per constitution. |
| 2.1 Code Quality | PASS — fully typed, no `any`; ESLint must pass. |

**Result**: PASS. No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-consolidate-sidebar-toolbar/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (no entities — documents N/A rationale)
├── quickstart.md        # Phase 1 output (manual validation guide)
├── contracts/
│   └── ui-behavior.md   # Phase 1 output (UI behavior contract)
├── checklists/
│   └── requirements.md  # Spec quality checklist (already created)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── admin/
│       └── layout.tsx           # Remove <AppHeader /> usage + import
├── components/
│   ├── AppHeader.tsx            # Removed (theme toggle logic relocated)
│   ├── AppLayout.tsx           # Remove <AppHeader /> usage + import (desktop layout)
│   ├── NotesSidebar.tsx        # Add separator + theme toggle after "Collapse all"
│   └── MainArea.tsx            # Make desktop formatting toolbar fixed/sticky while content scrolls
└── __tests__/
    ├── app-header.test.tsx     # Removed with the component
    ├── notes-sidebar.test.tsx  # Add theme-toggle assertions
    └── main-area.test.tsx      # Add fixed-toolbar assertion
```

**Structure Decision**: Single Next.js web app (existing structure). All changes are confined to existing client components under `src/components` and two layout files, with matching Vitest updates under `src/__tests__`. No new directories or modules are introduced.

## Complexity Tracking

> No constitution violations — section intentionally empty.
