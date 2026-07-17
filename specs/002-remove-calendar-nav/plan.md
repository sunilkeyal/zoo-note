# Implementation Plan: Remove Calendar Nav Bar

**Branch**: `002-remove-calendar-nav` | **Date**: 2026-07-17 | **Spec**: [spec.md](../spec.md)

**Input**: Feature specification from `/specs/002-remove-calendar-nav/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Remove the calendar navigation item from the sidebar menu and ensure direct calendar URL访问 returns a 404 error page. This is a UI cleanup task that deletes a placeholder feature to improve user experience by eliminating clutter.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, React 19)

**Primary Dependencies**: shadcn/ui, lucide-react, tailwindcss, vitest

**Storage**: N/A (no data changes)

**Testing**: Vitest (with React Testing Library)

**Target Platform**: Web browsers

**Project Type**: web-application

**Performance Goals**: N/A

**Constraints**: Must maintain sidebar layout consistency and accessibility after removal

**Scale/Scope**: Single navigation item removal

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Gates evaluated**:

1. **Data Privacy First**: No changes to data handling; removal of UI element only. ✅ PASS
2. **Offline-Resilient Architecture**: No network or state changes. ✅ PASS
3. **Accessibility & Responsiveness**: Sidebar must remain accessible; keyboard navigation order unaffected (removal only). ✅ PASS
4. **Testable Code**: Should include test for sidebar component to verify calendar item removal. ✅ PASS
5. **Consistent User Experience**: Sidebar layout must remain consistent; spacing must adjust automatically. ✅ PASS
6. **Branch-Based Development**: Feature branch created. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-remove-calendar-nav/
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
├── components/
│   └── NotesSidebar.tsx  # Remove calendar SidebarMenuItem (lines 919-924)
├── app/
│   └── calendar/         # Delete entire directory (optional, for 404 behavior)
└── ... (other existing structure)

tests/
└── components/
    └── NotesSidebar.test.tsx  # Add test for calendar item removal (optional)
```

**Structure Decision**: Single project web application. Modify existing sidebar component and optionally remove calendar page directory.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
