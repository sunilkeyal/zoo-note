# Research: Trash Empty & Restore Buttons

**Date**: 2026-07-17
**Feature**: 003-trash-empty-restore

## Existing Trash System Analysis

### Current Implementation

The trash system uses soft deletes with a 7-day auto-purge mechanism:

1. **Soft Delete Process**: Notes and folders are marked with `deletedAt` timestamp instead of being permanently removed
2. **Auto-Purge**: Items older than 7 days are automatically permanently deleted
3. **Restore Mechanism**: Items can be restored to their original locations via `/api/trash/restore` endpoint
4. **Permanent Delete**: Items can be permanently deleted via `/api/trash` DELETE endpoint

### Existing API Endpoints

- `GET /api/trash` - Fetch all trash items (notes and folders)
- `POST /api/trash/restore` - Restore items to original locations
- `DELETE /api/trash` - Permanently delete items

### Existing UI Components

- `TrashTable.tsx` - Table component for displaying trash items with selection, sorting, pagination
- `EmptyTrashDialog.tsx` - Confirmation dialog for emptying trash
- `NotesSidebar.tsx` - Context menu with "Restore All" and "Empty Trash" options

## Design Decisions

### Decision 1: Button Placement

**Decision**: Add buttons to the trash page header area, above the trash table

**Rationale**: 
- Provides prominent access without requiring context menu navigation
- Follows existing UI patterns (similar to other action buttons in the app)
- Maintains consistency with the existing trash page layout

**Alternatives Considered**:
- Floating action button: Rejected as it may overlap with table content on mobile
- Bottom toolbar: Rejected as it's less discoverable than header placement

### Decision 2: Button Behavior

**Decision**: 
- "Empty Trash" button: Opens existing `EmptyTrashDialog` component
- "Restore All" button: Directly calls `restoreItems` with all trash item IDs

**Rationale**:
- Reuses existing `EmptyTrashDialog` for consistency and confirmation flow
- "Restore All" doesn't require confirmation as it's a non-destructive action
- Both buttons use existing API endpoints and context functions

**Alternatives Considered**:
- Confirmation for "Restore All": Rejected as it's a reversible action
- Separate API endpoints: Rejected as existing endpoints already support bulk operations

### Decision 3: Button State Management

**Decision**: 
- Buttons disabled when trash is empty
- Loading state during bulk operations
- Success/error notifications via existing toast system

**Rationale**:
- Prevents unnecessary API calls when trash is empty
- Provides visual feedback during operations
- Uses existing notification patterns for consistency

**Alternatives Considered**:
- Hidden when empty: Rejected as disabled state provides better UX feedback
- Modal loading overlay: Rejected as it blocks interaction with other UI elements

### Decision 4: Error Handling

**Decision**: 
- Graceful error handling with user-friendly notifications
- Retry mechanism for failed operations
- Partial success handling (some items restored/deleted, others failed)

**Rationale**:
- Aligns with offline-resilient architecture principle
- Provides clear feedback to users
- Handles edge cases like network failures

**Alternatives Considered**:
- Automatic retry: Rejected as it may cause confusion
- Silent failure: Rejected as it violates transparency principle

## Best Practices

### Bulk Operations

1. **Progressive Enhancement**: Start with basic functionality, enhance with loading states and error handling
2. **Idempotent Operations**: Ensure operations can be safely retried without side effects
3. **Atomic Operations**: Process all items in a single API call when possible
4. **Graceful Degradation**: Handle partial failures without losing user trust

### User Experience

1. **Clear Call-to-Action**: Use descriptive button labels
2. **Confirmation for Destructive Actions**: Always confirm permanent deletions
3. **Visual Feedback**: Show loading states and success/error messages
4. **Accessibility**: Support keyboard navigation and screen readers

### Testing Strategy

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test user flows end-to-end
3. **Edge Cases**: Test error scenarios and boundary conditions
4. **Performance**: Test with large numbers of trash items

## Implementation Recommendations

1. **Reuse Existing Components**: Use `EmptyTrashDialog` and existing context functions
2. **Follow Existing Patterns**: Match the UI style of other action buttons in the app
3. **Maintain Consistency**: Use the same notification and error handling patterns
4. **Document Changes**: Update any relevant documentation or comments

## Risks and Mitigations

1. **Risk**: Large number of trash items may cause performance issues
   - **Mitigation**: Implement pagination and batch processing

2. **Risk**: Network failures during bulk operations
   - **Mitigation**: Implement retry logic and graceful error handling

3. **Risk**: User confusion about button behavior
   - **Mitigation**: Clear button labels and confirmation dialogs

## Conclusion

The implementation should leverage the existing trash system infrastructure while adding prominent buttons to the trash page. The design decisions prioritize user experience, consistency with existing patterns, and adherence to project principles.