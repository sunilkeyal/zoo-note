# Implementation Tasks: Trash Empty & Restore Buttons

**Branch**: `003-trash-empty-restore` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

## Task Overview

Total Tasks: 8
Estimated Time: 2-3 hours
Dependencies: Sequential execution required for core tasks, parallel execution possible for tests

## Task List

### Phase 1: Setup & Preparation

- [X] **T001**: Verify existing trash system components and API endpoints
  - File: `src/app/trash/page.tsx`, `src/components/TrashTable.tsx`, `src/contexts/NoteContext.tsx`
  - Description: Review current implementation to understand integration points
  - Dependencies: None
  - Estimated Time: 15 minutes

### Phase 2: Core Implementation

- [X] **T002**: Add "Empty Trash" button to trash page header
  - File: `src/app/trash/page.tsx`
  - Description: Add prominent button in page header area, wire to existing EmptyTrashDialog
  - Dependencies: T001
  - Estimated Time: 30 minutes

- [X] **T003**: Add "Restore All" button to trash page header
  - File: `src/app/trash/page.tsx`
  - Description: Add prominent button in page header area, wire to existing restoreItems function
  - Dependencies: T001
  - Estimated Time: 30 minutes

- [X] **T004**: Implement button state management
  - File: `src/app/trash/page.tsx`
  - Description: Disable buttons when trash is empty, add loading states during operations
  - Dependencies: T002, T003
  - Estimated Time: 20 minutes

- [X] **T005**: Add success/error notifications
  - File: `src/app/trash/page.tsx`
  - Description: Implement toast notifications for operation success/failure
  - Dependencies: T004
  - Estimated Time: 20 minutes

### Phase 3: Testing

- [X] **T006**: Write unit tests for button functionality
  - File: `src/__tests__/trash-buttons.test.tsx`
  - Description: Test button rendering, click handlers, state changes
  - Dependencies: T005
  - Estimated Time: 45 minutes

- [X] **T007**: Write integration tests for bulk operations
  - File: `tests/integration/trash-bulk-operations.test.tsx`
  - Description: Test complete user flows, API integration, error handling
  - Dependencies: T005
  - Estimated Time: 45 minutes

### Phase 4: Validation

- [X] **T008**: Run linting and type checking
  - Command: `npm run lint && npx tsc --noEmit`
  - Description: Verify code quality and type safety
  - Dependencies: T006, T007
  - Estimated Time: 10 minutes

## Execution Rules

### Sequential Dependencies
- T001 must complete before T002, T003
- T002, T003 must complete before T004
- T004 must complete before T005
- T005 must complete before T006, T007
- T006, T007 must complete before T008

### Parallel Execution
- T002 and T003 can run in parallel (different buttons, same file)
- T006 and T007 can run in parallel (different test files)

### File Coordination
- `src/app/trash/page.tsx`: T002, T003, T004, T005 must run sequentially
- Test files: T006, T007 can run in parallel

## Success Criteria

### Functional Requirements
- [ ] FR-001: Empty Trash button displayed when items exist
- [ ] FR-002: Restore All button displayed when items exist
- [ ] FR-003: Confirmation dialog shown before deletion
- [ ] FR-004: All items permanently deleted on confirmation
- [ ] FR-005: All items restored to original locations
- [ ] FR-006: Buttons disabled when trash empty
- [ ] FR-007: Visual feedback during operations
- [ ] FR-008: Error handling and notifications

### Test Coverage
- [ ] Unit tests for button components
- [ ] Integration tests for user flows
- [ ] Edge case tests for error scenarios
- [ ] Accessibility tests for keyboard navigation

### Quality Gates
- [ ] ESLint passes without errors
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Code follows existing patterns

## Risk Mitigation

### Technical Risks
1. **Risk**: Large number of trash items may cause performance issues
   - **Mitigation**: Implement pagination and batch processing in existing TrashTable

2. **Risk**: Network failures during bulk operations
   - **Mitigation**: Use existing error handling patterns, implement retry logic

3. **Risk**: Button state management complexity
   - **Mitigation**: Leverage existing NoteContext state management

### Process Risks
1. **Risk**: Test failures blocking implementation
   - **Mitigation**: Write tests incrementally, fix issues as they arise

2. **Risk**: Code quality issues
   - **Mitigation**: Run linting and type checking after each phase

## Dependencies

### External Dependencies
- None (using existing project dependencies)

### Internal Dependencies
- Existing trash API endpoints
- Existing EmptyTrashDialog component
- Existing NoteContext functions
- Existing Toast notification system

## Validation Checklist

### Pre-Implementation
- [ ] Review existing trash system components
- [ ] Verify API endpoints work correctly
- [ ] Understand current button patterns in app

### Post-Implementation
- [ ] All buttons render correctly
- [ ] Button states managed properly
- [ ] Operations complete successfully
- [ ] Error handling works
- [ ] Notifications display correctly
- [ ] Tests pass
- [ ] Code quality standards met

## Notes

### Implementation Approach
1. **Reuse Existing Components**: Leverage EmptyTrashDialog and NoteContext functions
2. **Follow Existing Patterns**: Match UI style of other action buttons
3. **Incremental Testing**: Write tests after each feature implementation
4. **Quality First**: Run linting and type checking throughout

### Code Style
- Use TypeScript strict mode
- Follow existing component patterns
- Use Tailwind CSS for styling
- Include ARIA labels for accessibility
- Support keyboard navigation

### Testing Strategy
- Unit tests for individual components
- Integration tests for user flows
- Edge case tests for error scenarios
- Performance tests for large trash volumes