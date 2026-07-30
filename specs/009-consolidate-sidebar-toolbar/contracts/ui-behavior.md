# UI Behavior Contract: Consolidate Sidebar Toolbar

**Feature**: 009-consolidate-sidebar-toolbar
**Date**: 2026-07-30

This feature exposes no programmatic API. Its "contract" is the observable UI behavior that tests and manual validation assert. Each item maps to functional requirements in [spec.md](../spec.md).

## Contract A — Sidebar theme toggle (US1)

| ID | Given | When | Then | Maps to |
|----|-------|------|------|---------|
| A1 | The desktop app is rendered | The sidebar action toolbar is displayed | A theme toggle control is present as the **last** item, immediately after the "Collapse all" control | FR-001, SC-002 |
| A2 | The toggle and "Collapse all" are rendered | The toolbar is inspected | A visual separator/divider appears between "Collapse all" and the theme toggle | FR-001 |
| A3 | Theme is light | The user activates the toggle | `setTheme("dark")` is invoked and the interface switches to dark; the icon reflects dark state | FR-002, SC-001, SC-005 |
| A4 | Theme is dark | The user activates the toggle | `setTheme("light")` is invoked and the interface switches to light; choice persists across reload | FR-002, SC-005 |
| A5 | The toggle is rendered | Navigating by keyboard / using a screen reader | The toggle is focusable, operable via keyboard, and exposes an accessible label (e.g., "Switch to dark mode") | FR-008 |
| A6 | An admin user opens an admin view | The admin layout renders | The same sidebar theme toggle is available (admin reuses the sidebar) | FR-007 |

## Contract B — Top bar removal (US2)

| ID | Given | When | Then | Maps to |
|----|-------|------|------|---------|
| B1 | The theme toggle has been relocated | The desktop app (or admin view) is rendered | No empty top bar (`AppHeader`) appears above the content area | FR-003, SC-001 |
| B2 | The top bar is removed | Any note or the home view is displayed | Content occupies the vertical space previously used by the top bar; no other functionality is lost | FR-004, SC-003 |

## Contract C — Fixed editor formatting toolbar (US3)

| ID | Given | When | Then | Maps to |
|----|-------|------|------|---------|
| C1 | A desktop note long enough to scroll is open | The user scrolls the note content down | The formatting toolbar (Undo/Redo, font controls, Bold, Italic, …) stays fixed and fully visible at the top of the editor area | FR-005, SC-004 |
| C2 | The formatting toolbar is fixed | The user scrolls | The toolbar does not overlap or obscure the note content (opaque background) | FR-006 |
| C3 | A note is open on desktop | The user scrolls the content | The note **title** and **"Last updated"** metadata scroll away with the content (they are not fixed) | Clarification, FR-005 |
| C4 | The mobile layout is active | A note is edited on mobile | Mobile toolbar behavior is unchanged by this feature | Spec scope / Edge cases |

## Non-goals

- No changes to note CRUD, folder management, search, or import/export.
- No changes to theme persistence mechanism (only the control's location).
- No changes to the mobile header or mobile editor toolbar.
