# Feature Specification: Keyboard Navigation for Left Sidebar

**Feature Branch**: `004-keyboard-nav-sidebar`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "implement keyboard on left navigation bar. I should be able to navigate up / down on left navigation bar using keyboard"

## User Scenarios & Testing

### User Story 1 - Navigate Sidebar Items with Arrow Keys (Priority: P1)

As a user, I want to press the Up and Down arrow keys to move focus through the items in the left navigation sidebar, so that I can quickly navigate without using the mouse.

**Why this priority**: This is the core functionality requested — basic up/down navigation is the foundation of keyboard accessibility in the sidebar.

**Independent Test**: Can be fully tested by focusing the sidebar and pressing Up/Down arrows to move between visible items. Delivers immediate value for keyboard-only users.

**Acceptance Scenarios**:

1. **Given** the sidebar is visible and any item is focused, **When** the user presses the Down arrow key, **Then** the next visible item in the sidebar becomes focused/highlighted.
2. **Given** the sidebar is visible and any item is focused, **When** the user presses the Up arrow key, **Then** the previous visible item in the sidebar becomes focused/highlighted.
3. **Given** the user is focused on the first visible item in the sidebar, **When** the user presses the Up arrow key, **Then** focus remains on the first item (does not wrap).
4. **Given** the user is focused on the last visible item in the sidebar, **When** the user presses the Down arrow key, **Then** focus remains on the last item (does not wrap).

---

### User Story 2 - Activate Sidebar Items with Enter (Priority: P2)

As a user, I want to press Enter to activate the currently focused sidebar item, so that I can navigate to a page or trigger an action without the mouse.

**Why this priority**: Activating items is essential for keyboard navigation to be useful — without it, users can move focus but cannot take action.

**Independent Test**: Can be tested by using arrow keys to focus an item and pressing Enter to navigate. Delivers complete keyboard navigation for basic use.

**Acceptance Scenarios**:

1. **Given** a sidebar navigation link (e.g., Home, Favorites, Recent, Trash) is focused, **When** the user presses Enter, **Then** the application navigates to the corresponding page.
2. **Given** a note item in the sidebar is focused, **When** the user presses Enter, **Then** the note opens in the editor.
3. **Given** a folder item in the sidebar is focused, **When** the user presses Enter, **Then** the folder expands or collapses and focus remains on the folder item.
4. **Given** a toolbar button (New Note, New Folder, Search) is focused, **When** the user presses Enter, **Then** the button's action is triggered.

---

### User Story 3 - Escape Returns Focus from Sidebar (Priority: P3)

As a user, I want to press Escape to move focus out of the sidebar and back to the main content area, so that I can resume editing without reaching for the mouse.

**Why this priority**: Improves usability but is not essential for core navigation.

**Independent Test**: Can be tested by pressing Escape while an item in the sidebar is focused, verifying focus moves to the main content area.

**Acceptance Scenarios**:

1. **Given** a sidebar item is focused, **When** the user presses Escape, **Then** focus moves out of the sidebar to the main content area or editor.
2. **Given** focus is already outside the sidebar, **When** the user presses Escape, **Then** nothing happens related to the sidebar.

---

### Edge Cases

- What happens when the sidebar is collapsed (icon-only mode)? Keyboard navigation should operate on the visible icon items.
- What happens when sidebar sections (Folders, Admin) are collapsed? Collapsed sections should be skipped during navigation.
- What happens when there are no notes in the sidebar? Focus should still be able to navigate between static items (Home, Favorites, Recent, Trash, etc.).
- How does keyboard navigation interact with the search input? When focus is on the search input, arrow keys should operate within the search dropdown, not the sidebar navigation.
- What happens if the user presses Tab? Tab should follow normal browser focus flow (move to next focusable element outside sidebar), not navigate the sidebar list.
- How does keyboard navigation interact with context menus? Shift+F10 or Apps key should open the context menu for the focused note or folder item.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to move focus through visible sidebar items using the Up and Down arrow keys.
- **FR-002**: System MUST visually indicate the currently focused sidebar item with a background highlight (matching the existing hover style). Outline and box-shadow are intentionally suppressed to avoid double indicators with the existing `focus-visible:ring-2` on `SidebarMenuButton`.
- **FR-003**: System MUST allow users to activate (navigate/expand/collapse) the focused item by pressing Enter.
- **FR-004**: System MUST allow users to press Escape to move focus out of the sidebar.
- **FR-005**: System MUST skip collapsed or hidden items when navigating with arrow keys.
- **FR-006**: System MUST NOT wrap focus from the last item to the first or vice versa.
- **FR-007**: System MUST handle keyboard navigation independently for each sidebar section (navigation links, folder tree, admin links, footer menu).
- **FR-008**: System MUST NOT interfere with keyboard shortcuts already in use (e.g., Ctrl/Cmd+B to toggle sidebar, typing in the search input).
- **FR-009**: System MUST be accessible to screen readers using appropriate ARIA roles and attributes.
- **FR-010**: System MUST allow users to open context menus on focused sidebar items using Shift+F10 or the Apps key.

### Key Entities

- **Sidebar Item**: Any focusable element in the left navigation (navigation links, folder entries, note entries, toolbar buttons, admin links, footer actions).
- **Focus Indicator**: Visual highlight showing which sidebar item is currently selected via keyboard navigation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can navigate from the top to the bottom of the sidebar using only the Up and Down arrow keys.
- **SC-002**: Users can activate any sidebar item (navigate to page, open note, expand folder) using only Enter.
- **SC-003**: Keyboard navigation works correctly with collapsible sections (folders, admin) — collapsed items are skipped.
- **SC-004**: No existing keyboard shortcuts or accessibility features are broken by this change.
- **SC-005**: The feature works across all sidebar density modes (spacious, default, compact).

## Clarifications

### Session 2026-07-20

- Q: How should keyboard navigation in the sidebar be initiated? → A: Arrow keys work once any sidebar item has focus (standard roving tabindex — user Tabs or clicks in)
- Q: What style of focus indicator should be used? → A: Background highlight (matching hover) + visible focus ring outline for keyboard users
- Q: When a folder is expanded via Enter, where should focus go? → A: Focus stays on the folder item; user presses Down to enter children
- Q: Should keyboard users be able to open context menus? → A: Yes — Shift+F10 or Apps key opens the context menu for the focused item

## Assumptions

- The sidebar already renders all navigation items as interactive elements; this feature adds keyboard focus management on top of the existing UI.
- Focus management will use a "roving tabindex" or similar pattern common in navigation menus.
- The sidebar is already visible (not collapsed to icon-only) when keyboard navigation is used; collapsed sidebar behavior is a secondary concern.
- Existing keyboard shortcuts (Ctrl/Cmd+B, Enter in rename inputs) will continue to work as before.
- The search input within the sidebar will handle its own keyboard events and not be affected by sidebar arrow key navigation.
