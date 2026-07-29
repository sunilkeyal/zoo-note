# Implementation Plan: Resizable Sidebar Navigation

**Branch**: `008-resizable-sidebar` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-resizable-sidebar/spec.md`

## Summary

Make the left navigation sidebar (NotesSidebar) resizable by replacing its fixed-width container with a split-panel layout using react-resizable-panels v4. Users can drag a handle at the sidebar's right edge to adjust width between 200px (minimum) and 25% of the viewport (maximum). Applies to both the main app layout (`src/components/AppLayout.tsx`) and the admin layout (`src/app/admin/layout.tsx`).

## Technical Context

**Language/Version**: TypeScript (Next.js 16, React 19)

**Primary Dependencies**: react-resizable-panels v4.12.2 (installed via shadcn resizable component at `src/components/ui/resizable.tsx`)

**Storage**: N/A

**Testing**: Vitest (existing project setup)

**Target Platform**: Desktop browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Web application (Next.js)

**Performance Goals**: N/A — no performance concern for a passive drag interaction

**Constraints**:
- Must integrate within existing shadcn `SidebarProvider` wrapper (`min-h-svh flex`)
- Must not break mobile views (separate tab-based navigation)
- Must preserve existing sidebar content (folder tree, note list)
- In react-resizable-panels v4, numeric size values are interpreted as **pixels**; percentage strings (e.g., `"18%"`) must be used for proportional sizing
- `ResizablePanelGroup` requires explicit height from its parent — the existing `SidebarProvider` wrapper provides this via `min-h-svh` + flex stretch

**Scale/Scope**: 2 layout files + 1 component modification (NotesSidebar)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1.1 Data Privacy First | ✅ N/A | No data changes |
| 1.2 Offline-Resilient Architecture | ✅ N/A | No data changes |
| 1.3 Accessibility & Responsiveness | ✅ Pass | Resize handle must be keyboard-accessible (ResizableHandle provides this); must not break mobile |
| 1.4 Testable Code | ✅ Pass | Acceptable with manual testing for drag interaction; component integration test optional |
| 1.5 Consistent UX | ✅ Pass | Uses existing shadcn/ui primitives (resizable), Tailwind CSS, follows existing patterns |
| 1.6 Branch-Based Development | ✅ Pass | Feature branch used |

**GATE: PASS** — No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-resizable-sidebar/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A for this feature)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for this feature)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/
│   │   └── resizable.tsx    # Already exists (shadcn wrapper)
│   ├── AppLayout.tsx        # Main layout — add ResizablePanelGroup + ResizablePanel
│   └── NotesSidebar.tsx     # Sidebar component — add `resizable` prop for conditional styling
└── app/
    └── admin/
        └── layout.tsx       # Admin layout — same changes as AppLayout
```

**Structure Decision**: Standard Next.js app directory structure. Changes are contained within existing layout and component files — no new files needed in source code.

## Complexity Tracking

N/A — No constitutional violations to justify.
