# Quickstart Validation: Keyboard Navigation for Left Sidebar

**Date**: 2026-07-20
**Feature**: 004-keyboard-nav-sidebar

## Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- MongoDB running locally or connection string in `.env.local`

## Setup

```bash
npm run dev
```

Open `http://localhost:3000` and log in.

## Validation Scenarios

### Scenario 1: Basic Arrow Key Navigation

1. Click on any item in the left sidebar (e.g., "Home")
2. Press `ArrowDown` repeatedly
3. **Expected**: Focus moves down through each visible sidebar item (Home → Favorites → Recent → folders → notes → Trash → Admin items)
4. Press `ArrowUp` repeatedly
5. **Expected**: Focus moves back up through the same items
6. Press `ArrowUp` when on the first item
7. **Expected**: Focus stays on the first item (no wrapping)

### Scenario 2: Enter to Activate Navigation Links

1. Click on any sidebar item to focus it
2. Use `ArrowDown` to navigate to "Favorites"
3. Press `Enter`
4. **Expected**: Application navigates to the Favorites page
5. Use `ArrowDown` to navigate to a note item
6. Press `Enter`
7. **Expected**: The note opens in the editor

### Scenario 3: Enter to Expand/Collapse Folders

1. Navigate to a collapsed folder using arrow keys
2. Press `Enter`
3. **Expected**: Folder expands, showing child notes; focus remains on the folder
4. Press `ArrowDown`
5. **Expected**: Focus moves to the first child note inside the folder
6. Navigate back to the folder header and press `Enter`
7. **Expected**: Folder collapses; child notes are no longer focusable

### Scenario 4: Escape to Exit Sidebar

1. Focus any sidebar item
2. Press `Escape`
3. **Expected**: Focus moves out of the sidebar to the main content area
4. Press `ArrowDown`
5. **Expected**: Sidebar navigation does not activate (focus is outside sidebar)

### Scenario 5: Context Menu via Keyboard

1. Navigate to a note item using arrow keys
2. Press `Shift+F10`
3. **Expected**: Context menu opens with options (Rename, Download PDF, Favorite, Trash)
4. Press `Escape`
5. **Expected**: Context menu closes, focus returns to the note item

### Scenario 6: Focus Indicator Visibility

1. Click on a sidebar item
2. Press `ArrowDown`
3. **Expected**: The previously focused item loses its highlight; the new item gains a background highlight + focus ring outline
4. Verify the focus ring is visible in both light and dark themes

### Scenario 7: Density Modes

1. Open Settings → Sidebar Density
2. Switch to "Compact" mode
3. Repeat Scenario 1 (arrow key navigation)
4. **Expected**: Navigation works correctly with compact item sizing
5. Repeat with "Spacious" mode
6. **Expected**: Navigation works correctly with spacious item sizing

### Scenario 8: Collapsed Sidebar (Icon Mode)

1. Click the sidebar toggle button to collapse to icon-only mode
2. Click on an icon in the collapsed sidebar
3. Press `ArrowDown`
4. **Expected**: Focus moves between visible icon items
5. Press `Enter` on a folder icon
6. **Expected**: Folder expands/collapses as normal

### Scenario 9: Existing Shortcuts Not Broken

1. Press `Ctrl+B` (or `Cmd+B` on Mac)
2. **Expected**: Sidebar toggles open/collapsed (existing behavior preserved)
3. Navigate to a note with a rename in progress
4. Press `Enter` in the rename input
5. **Expected**: Rename is confirmed (existing behavior preserved)

## Automated Tests

```bash
npm test -- --run src/__tests__/hooks/use-sidebar-keyboard-nav.test.ts
npm test -- --run tests/integration/sidebar-keyboard-nav.test.tsx
```

Expected: All tests pass with 0 failures.
