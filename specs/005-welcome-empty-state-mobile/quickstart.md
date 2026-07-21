# Quickstart Validation Guide: Welcome Empty State Mobile

**Date**: 2026-07-21
**Feature**: Welcome Empty State Mobile

## Prerequisites

- Node.js 18+ installed
- MongoDB running locally or accessible via `MONGODB_URI`
- `.env.local` configured with `MONGODB_URI` and `NEXTAUTH_SECRET`

## Setup

```bash
npm install
npm run dev
```

## Validation Scenarios

### Scenario 1: Empty State Welcome Message

**Steps**:
1. Open browser dev tools, set viewport to mobile width (< 768px)
2. Navigate to the home page with no notes in the database
3. Verify the welcome message and icon are displayed

**Expected outcome**: A centered welcome section with:
- An icon (BookOpen from lucide-react)
- "Welcome to ZooNote" heading
- Subtitle text explaining the app and guiding to create a note
- The "+" button is visible and functional

**Pass criteria**: Welcome state renders correctly on mobile viewport with icon and message visible

### Scenario 2: Welcome State Disappears After Creating Note

**Steps**:
1. From the empty state, tap the "+" button
2. Create a new note
3. Return to the home page

**Expected outcome**: The welcome state is replaced by the note card grid showing the newly created note

**Pass criteria**: No welcome state visible when notes exist

### Scenario 3: Welcome State Returns After Deleting All Notes

**Steps**:
1. With notes present, select and delete all notes
2. Navigate back to home page

**Expected outcome**: The welcome state reappears

**Pass criteria**: Welcome state renders correctly after all notes are deleted

### Scenario 4: Mobile Font Size Increase

**Steps**:
1. Open browser dev tools, set viewport to mobile width (< 768px)
2. Navigate to the home page with notes present
3. Compare text sizes to the previous version (or inspect computed font sizes)

**Expected outcome**: Text is noticeably larger (~15% increase) compared to the previous mobile view

**Pass criteria**: All text elements on the mobile home page use larger font sizes

### Scenario 5: Desktop View Unchanged

**Steps**:
1. Set viewport to desktop width (>= 768px)
2. Navigate to the home page

**Expected outcome**: Desktop layout remains unchanged - the welcome state and font changes only apply to mobile

**Pass criteria**: No visual changes on desktop viewport

## Key Files to Modify

| File | Change |
|------|--------|
| `src/components/NoteCardGrid.tsx` | Replace empty state with welcome card |
| `src/components/AppLayout.tsx` | Possibly adjust mobile home layout |
| `src/app/globals.css` | Add mobile font size adjustments if needed |

## Testing

```bash
npm run test
```

All existing tests should continue to pass. The empty state change is visual and does not affect test logic.
