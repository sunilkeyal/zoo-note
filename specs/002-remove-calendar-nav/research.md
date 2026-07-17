# Research: Remove Calendar Nav Bar

**Date**: 2026-07-17
**Feature**: Remove Calendar Nav Bar
**Branch**: 002-remove-calendar-nav

## Summary

No significant unknowns identified. The feature is a straightforward UI cleanup with clear implementation path.

## Decisions

### 1. Calendar Page Handling

**Decision**: Delete the calendar page directory (`src/app/calendar/`) to ensure 404 behavior.

**Rationale**: Next.js automatically returns 404 for non-existent routes. Deleting the page directory is simpler than modifying it to return 404, and aligns with the assumption that "no need to remove the calendar page entirely" (but removing it entirely is acceptable).

**Alternatives considered**:
- Keep calendar page and modify to return 404: More complex, unnecessary.
- Redirect to home: Rejected per user clarification (user chose 404).

### 2. Sidebar Component Modification

**Decision**: Remove the calendar `SidebarMenuItem` block (lines 919-924) from `src/components/NotesSidebar.tsx`.

**Rationale**: Direct removal of the UI element. The sidebar layout uses flexbox and will automatically adjust spacing.

**Alternatives considered**:
- Hide via CSS: Not necessary; removal is cleaner.
- Conditional rendering based on feature flag: Overkill for permanent removal.

### 3. Testing Approach

**Decision**: Add a unit test to verify calendar navigation item is not present in sidebar.

**Rationale**: Aligns with constitution principle "Testable Code". Simple test ensures future changes don't accidentally reintroduce the calendar item.

**Alternatives considered**:
- No test: Violates constitution principle.
- Integration test: Unit test sufficient for this scope.

## Open Questions

None. All technical decisions resolved.

## Next Steps

Proceed to Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).