# Quickstart Validation Guide: Mobile Create Note Enhancement

**Date**: 2026-07-15
**Feature**: Mobile Create Note Enhancement

## Prerequisites

- Node.js 18+ installed
- MongoDB running locally or connection string configured
- Cloudflare R2 credentials configured (for image uploads)
- Browser with mobile emulation (Chrome DevTools or similar)

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

Enable mobile emulation in browser DevTools (toggle device toolbar, select iPhone or similar).

## Validation Scenarios

### Scenario 1: Create Note from Home View (with Folder Picker)

1. Navigate to home page (`/`)
2. Tap the "+" FAB button
3. **Expected**: Note is created on server, folder picker modal appears
4. Select a folder and tap "Confirm"
5. **Expected**: Editor loads with note assigned to selected folder
6. Type a title and body content
7. Navigate back
8. **Expected**: Note appears in the selected folder

### Scenario 2: Create Note from Folder View (No Picker)

1. Navigate to a folder (tap a folder card on mobile)
2. Tap the "+" FAB button
3. **Expected**: Note is created directly in that folder, editor loads
4. Type a title and body content
5. Navigate back
6. **Expected**: Note appears in the current folder

### Scenario 3: Formatting Toolbar Works

1. Create a new note (via either scenario above)
2. Tap the "B" (Bold) button, type text
3. **Expected**: Text is bold
4. Tap the "H" (Heading) button, select "Heading 1", type text
5. **Expected**: Text appears as a heading
6. Tap the image button, select an image
7. **Expected**: Image is uploaded and inserted

### Scenario 4: Empty Note Cleanup

1. Create a new note (tap "+")
2. Do NOT type anything
3. Navigate back immediately
4. **Expected**: Note is deleted (not visible in note list)
5. Create another note
6. Type a title "Test Note"
7. Navigate back
8. **Expected**: Note persists with title "Test Note"

### Scenario 5: Keyboard and Toolbar Handling

1. Create a new note
2. Tap into the editor body
3. **Expected**: Keyboard opens, toolbar hides
4. Dismiss keyboard
5. **Expected**: Toolbar reappears

### Scenario 6: Tab Bar Hidden During Editing

1. Create a new note
2. **Expected**: Mobile tab bar is NOT visible while editing
3. Navigate back to home
4. **Expected**: Tab bar reappears

## Test Commands

```bash
# Run all tests
npm test

# Run specific test files
npx vitest run src/__tests__/components/FolderPickerModal.test.tsx
npx vitest run src/__tests__/components/AppLayout.test.tsx

# Run lint
npm run lint
```

## Expected Outcomes

- All 6 scenarios pass
- No console errors in browser
- All tests pass
- ESLint reports no errors
