# Quickstart & Validation: Consolidate Sidebar Toolbar

**Feature**: 009-consolidate-sidebar-toolbar
**Date**: 2026-07-30

This guide validates the feature end-to-end. See [contracts/ui-behavior.md](./contracts/ui-behavior.md) for the full behavior contract and [spec.md](./spec.md) for requirements.

## Prerequisites

- Node.js and dependencies installed (`npm install`)
- Ability to run the dev server and the test suite
- A desktop-width browser window (mobile layout is out of scope)
- At least one note with enough content to require vertical scrolling

## Automated checks

```bash
npm run lint      # ESLint must pass (Constitution 2.1)
npm test          # Vitest — includes updated notes-sidebar and main-area tests
```

Expected: lint passes; the `notes-sidebar` tests assert the theme toggle after "Collapse all"; the `main-area` test asserts the sticky toolbar; no stale `app-header` test remains.

## Manual validation (desktop)

Run the app:

```bash
npm run dev
```

1. **Theme toggle placement (US1 / Contract A1–A2)**: Open the app. In the left sidebar action toolbar, confirm the theme toggle is the **last** control, immediately right of "Collapse all", with a visible divider between them.
2. **Theme toggle behavior (A3–A5)**: Click the toggle — the UI switches light↔dark and the icon updates. Reload the page — the chosen theme persists. Tab to the toggle and activate it with the keyboard; confirm it works and has a tooltip/accessible label.
3. **Top bar removed (US2 / Contract B1–B2)**: Confirm there is no empty bar above the content area; note/home content starts at the top of the content region.
4. **Fixed editor toolbar (US3 / Contract C1–C3)**: Open a long note. Scroll the note content down and confirm the formatting toolbar (Undo/Redo, font, Bold, Italic, …) stays fixed and fully visible, does not overlap content, while the note title and "Last updated" metadata scroll away.
5. **Admin view (Contract A6 / B1)**: As an admin, open an admin view. Confirm the sidebar theme toggle is present and no empty top bar appears.

## Regression checks

- **Mobile unaffected (Contract C4)**: In a mobile-width viewport, confirm the mobile header and mobile editor toolbar behave as before.
- Confirm existing sidebar actions (New note, New folder, Search, Expand all, Collapse all) still work.

## Success criteria mapping

| Step | Requirements | Success Criteria |
|------|--------------|------------------|
| 1 | FR-001 | SC-002 |
| 2 | FR-002, FR-008 | SC-001, SC-005 |
| 3 | FR-003, FR-004 | SC-001, SC-003 |
| 4 | FR-005, FR-006 | SC-004 |
| 5 | FR-007 | SC-001 |
