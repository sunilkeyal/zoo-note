# Quickstart Validation Guide: Trash Empty & Restore Buttons

**Date**: 2026-07-17
**Feature**: 003-trash-empty-restore

## Overview

This guide provides runnable validation scenarios to verify the trash empty and restore functionality works end-to-end.

## Prerequisites

1. **Development Environment**:
   - Node.js 18+ installed
   - MongoDB running locally or accessible
   - Git repository cloned

2. **Setup Commands**:
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env.local
   
   # Start development server
   npm run dev
   ```

3. **Test Data**:
   - User account with existing notes/folders
   - Some items moved to trash (soft deleted)

## Validation Scenarios

### Scenario 1: Empty Trash Button Visibility

**Objective**: Verify "Empty Trash" button appears when trash has items

**Steps**:
1. Navigate to trash page (`/trash`)
2. Verify trash contains at least one item
3. Check for "Empty Trash" button in page header

**Expected Outcome**:
- "Empty Trash" button visible and enabled
- Button styled consistently with other action buttons

**Test Command**:
```bash
npm test -- --grep "Empty Trash button visibility"
```

### Scenario 2: Empty Trash Confirmation Dialog

**Objective**: Verify confirmation dialog appears before permanent deletion

**Steps**:
1. Navigate to trash page with items
2. Click "Empty Trash" button
3. Verify dialog appears with item counts
4. Click "Cancel" button

**Expected Outcome**:
- Dialog shows correct note/folder counts
- Dialog has "Cancel" and "Empty Trash" buttons
- Clicking "Cancel" closes dialog without deleting items

**Test Command**:
```bash
npm test -- --grep "Empty Trash confirmation dialog"
```

### Scenario 3: Empty Trash Operation

**Objective**: Verify trash items are permanently deleted

**Steps**:
1. Navigate to trash page with items
2. Click "Empty Trash" button
3. Confirm deletion in dialog
4. Wait for operation to complete

**Expected Outcome**:
- All trash items permanently deleted
- Trash page shows empty state
- Success notification displayed
- Notes/folders no longer accessible

**Test Command**:
```bash
npm test -- --grep "Empty trash operation"
```

### Scenario 4: Restore All Button Visibility

**Objective**: Verify "Restore All" button appears when trash has items

**Steps**:
1. Navigate to trash page (`/trash`)
2. Verify trash contains at least one item
3. Check for "Restore All" button in page header

**Expected Outcome**:
- "Restore All" button visible and enabled
- Button styled consistently with other action buttons

**Test Command**:
```bash
npm test -- --grep "Restore All button visibility"
```

### Scenario 5: Restore All Operation

**Objective**: Verify all trash items are restored to original locations

**Steps**:
1. Navigate to trash page with items
2. Click "Restore All" button
3. Wait for operation to complete

**Expected Outcome**:
- All trash items restored to original locations
- Trash page shows empty state
- Success notification displayed
- Notes/folders accessible in original locations

**Test Command**:
```bash
npm test -- --grep "Restore all operation"
```

### Scenario 6: Button State When Trash Empty

**Objective**: Verify buttons are disabled when trash is empty

**Steps**:
1. Navigate to trash page with no items
2. Check button states

**Expected Outcome**:
- "Empty Trash" button disabled or not visible
- "Restore All" button disabled or not visible

**Test Command**:
```bash
npm test -- --grep "Button state when trash empty"
```

### Scenario 7: Error Handling - Network Failure

**Objective**: Verify graceful handling of network failures

**Steps**:
1. Navigate to trash page with items
2. Disable network connection
3. Click "Empty Trash" or "Restore All" button
4. Re-enable network connection

**Expected Outcome**:
- Error notification displayed
- Retry option available
- No data loss or corruption

**Test Command**:
```bash
npm test -- --grep "Error handling network failure"
```

### Scenario 8: Partial Failure Handling

**Objective**: Verify handling of partial operation failures

**Steps**:
1. Create test scenario where some operations fail
2. Trigger bulk operation
3. Verify partial success handling

**Expected Outcome**:
- Notification shows successful/failed counts
- Successful operations reflected in UI
- Failed items remain in trash

**Test Command**:
```bash
npm test -- --grep "Partial failure handling"
```

## Manual Testing Checklist

### UI/UX Testing

- [ ] Buttons appear in correct location
- [ ] Buttons have correct styling
- [ ] Buttons respond to hover/click states
- [ ] Loading states display correctly
- [ ] Success notifications appear
- [ ] Error notifications appear
- [ ] Dialog opens/closes correctly
- [ ] Keyboard navigation works
- [ ] Screen reader labels present

### Functional Testing

- [ ] Empty trash deletes all items
- [ ] Restore all restores all items
- [ ] Buttons disabled when trash empty
- [ ] Operations complete within 30 seconds
- [ ] Error handling works correctly
- [ ] Partial failures handled gracefully

### Integration Testing

- [ ] API calls made correctly
- [ ] State updates reflect in UI
- [ ] Notifications display correctly
- [ ] Existing functionality unaffected
- [ ] Mobile responsive design works

## Performance Testing

### Load Testing

**Objective**: Verify performance with large trash volumes

**Test Data**: 100+ items in trash

**Steps**:
1. Add 100+ items to trash
2. Perform empty/restore operations
3. Measure completion time

**Expected Outcome**:
- Operations complete within 30 seconds
- UI remains responsive
- No memory leaks

**Test Command**:
```bash
npm test -- --grep "Performance with large trash volumes"
```

## Accessibility Testing

### Keyboard Navigation

**Objective**: Verify all interactive elements are keyboard accessible

**Steps**:
1. Navigate using Tab key
2. Activate buttons using Enter/Space
3. Navigate dialog using arrow keys

**Expected Outcome**:
- All buttons focusable
- Focus indicators visible
- Dialog navigable via keyboard

### Screen Reader Testing

**Objective**: Verify screen reader compatibility

**Steps**:
1. Enable screen reader
2. Navigate to trash page
3. Interact with buttons and dialogs

**Expected Outcome**:
- Buttons announced correctly
- Dialog content accessible
- State changes announced

## Troubleshooting

### Common Issues

1. **Buttons not appearing**:
   - Check trash page loads correctly
   - Verify trash contains items
   - Check browser console for errors

2. **Operations failing**:
   - Verify API endpoints accessible
   - Check authentication status
   - Review network requests

3. **Notifications not showing**:
   - Verify toast system working
   - Check notification permissions
   - Review console for errors

### Debug Commands

```bash
# Check API health
curl http://localhost:3000/api/trash

# Run specific test
npm test -- --grep "test name"

# Check TypeScript types
npx tsc --noEmit

# Run linter
npm run lint
```

## Success Criteria

### Functional Requirements Met

- [ ] FR-001: Empty Trash button displayed when items exist
- [ ] FR-002: Restore All button displayed when items exist
- [ ] FR-003: Confirmation dialog shown before deletion
- [ ] FR-004: All items permanently deleted on confirmation
- [ ] FR-005: All items restored to original locations
- [ ] FR-006: Buttons disabled when trash empty
- [ ] FR-007: Visual feedback during operations
- [ ] FR-008: Error handling and notifications

### Success Criteria Achieved

- [ ] SC-001: Users can empty trash with single click + confirmation
- [ ] SC-002: Users can restore all with single click
- [ ] SC-003: Tasks complete in under 30 seconds
- [ ] SC-004: 100% of items correctly restored/deleted
- [ ] SC-005: Error rate <1%

## Next Steps

After completing validation scenarios:

1. Run full test suite: `npm test`
2. Perform code review
3. Update documentation
4. Create pull request
5. Deploy to staging environment
6. Conduct user acceptance testing