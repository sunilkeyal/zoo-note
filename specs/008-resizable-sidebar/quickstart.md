# Quickstart: Resizable Sidebar Navigation

## Prerequisites

- Node.js 18+
- npm dependencies installed (`npm install`)
- Dev server running (`npm run dev`)

## Validation Scenarios

### Scenario 1: Main App Layout

1. Open the app at `/` in a desktop browser
2. Observe the left sidebar with a vertical divider handle at its right edge
3. Hover over the handle — cursor should change to `col-resize`
4. Click and drag the handle right — sidebar widens, content area shrinks
5. Click and drag the handle left — sidebar narrows, content area expands
6. Drag past minimum — sidebar stops at 200px minimum width
7. Drag past maximum — sidebar stops at ~25% viewport width
8. Release the mouse — sidebar stays at the new width
9. Refresh the page — sidebar returns to default ~18% width

### Scenario 2: Admin Layout

1. Navigate to `/admin`
2. Repeat the same resize interactions — behavior should match the main app
3. Resizing in admin should not affect main app sidebar width and vice versa

### Scenario 3: TypeScript Compilation

```bash
npx tsc --noEmit
# Expected: zero new errors
```

### Scenario 4: Build

```bash
npm run build
# Expected: build succeeds
```

## Expected Outcomes

- Sidebar is resizable via drag handle in both layouts
- Handle is visible on hover, cursor changes appropriately
- Min/max constraints prevent unreasonable sizes
- Layout remains responsive during and after resize
- No TypeScript or build errors introduced
- Mobile views unaffected
