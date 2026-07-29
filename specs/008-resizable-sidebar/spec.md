# Feature Specification: Resizable Sidebar Navigation

**Feature Branch**: `008-resizable-sidebar`

**Created**: 2026-07-28

**Status**: Implemented

**Input**: User description: "Make the left navigation bar resizable so users can adjust the sidebar width by dragging its edge"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag to Resize Sidebar in Main App (Priority: P1)

As a user viewing my notes, I want to drag the right edge of the left sidebar to resize it, so I can see more of my note list or more of the editor depending on my current task.

**Why this priority**: This is the primary interaction surface — all note-taking happens in this layout. The ability to adjust sidebar width directly improves daily usability.

**Independent Test**: Can be fully tested by opening the app, finding the resize handle at the sidebar's right edge, dragging it left and right, and observing the sidebar width change in real time.

**Acceptance Scenarios**:

1. **Given** I am on the main notes view, **When** I hover over the right edge of the sidebar, **Then** I see a visible resize handle (cursor changes to col-resize).
2. **Given** I see the resize handle, **When** I click and drag it to the right, **Then** the sidebar becomes wider and the content area becomes narrower proportionally.
3. **Given** I see the resize handle, **When** I click and drag it to the left, **Then** the sidebar becomes narrower and the content area becomes wider proportionally.
4. **Given** I am resizing the sidebar, **When** I release the mouse, **Then** the sidebar stays at the new width.
5. **Given** I am resizing the sidebar, **When** I try to make it smaller than the minimum allowed width, **Then** the sidebar stops at the minimum width and cannot be compressed further.
6. **Given** I am resizing the sidebar, **When** I try to make it larger than the maximum allowed width, **Then** the sidebar stops at the maximum width and cannot be expanded further.

---

### User Story 2 - Drag to Resize Sidebar in Admin View (Priority: P2)

As an admin user managing the system, I want the same sidebar resizing capability in the admin layout, so I can adjust the interface to suit my workflow.

**Why this priority**: Admin users also navigate the sidebar frequently, but they are a smaller user group.

**Independent Test**: Can be fully tested by navigating to the admin panel and repeating the same resize interactions as the main app.

**Acceptance Scenarios**:

1. **Given** I am on the admin panel, **When** I hover over the right edge of the sidebar, **Then** I see a visible resize handle.
2. **Given** I see the resize handle, **When** I drag it, **Then** the sidebar and content area resize proportionally.
3. **Given** I resize the sidebar in the admin view, **When** I navigate to the main app, **Then** both views resize independently (admin resize does not affect main app).

---

### User Story 3 - Sidebar Resets to Default on Page Load (Priority: P3)

As a user, I want the sidebar to start at a reasonable default width each time I load the page, so I always have a balanced layout until I choose to adjust it.

**Why this priority**: A sensible default ensures a good first experience without requiring user action.

**Independent Test**: Can be tested by refreshing the page and measuring the sidebar width — it should match the expected default proportion.

**Acceptance Scenarios**:

1. **Given** I open the app for the first time, **Then** the sidebar is shown at its default width (roughly one-fifth of the viewport).
2. **Given** I have resized the sidebar, **When** I reload the page, **Then** the sidebar returns to its default width (session-only persistence).

---

### Edge Cases

- What happens when the viewport is very narrow (e.g., tablet in portrait)? The sidebar should still be resizable within reasonable bounds, or collapse gracefully if the minimum width exceeds available space.
- What happens when the sidebar contains many items (long folder/note list)? Resizing should work smoothly regardless of sidebar content length.
- What happens during window resize after the sidebar has been manually resized? The sidebar should maintain its proportional width relative to the new viewport size.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to see a visible resize handle at the right edge of the sidebar.
- **FR-002**: Users MUST be able to click and drag the resize handle to change the sidebar width.
- **FR-003**: Users MUST NOT be able to resize the sidebar below a minimum usable width.
- **FR-004**: Users MUST NOT be able to resize the sidebar beyond a maximum reasonable width.
- **FR-005**: The sidebar MUST resize smoothly (in real time) as the user drags the handle.
- **FR-006**: The content area MUST resize proportionally as the sidebar width changes.
- **FR-007**: The sidebar MUST start at a sensible default width on initial page load.

### Key Entities *(include if feature involves data)*

- *(No new data entities — this is a purely presentational change to the existing layout.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can resize the sidebar from its narrowest minimum (200px, approximately 10-14% of viewport width on standard desktop) to its widest maximum (~25% of viewport width) by dragging the handle.
- **SC-002**: The resize handle area is at least 8px wide to be easily clickable and discoverable.
- **SC-003**: After resizing, the sidebar stays at the chosen width until the page is reloaded.
- **SC-004**: The feature works identically on both the main app layout and the admin layout.

## Assumptions

- Users access the app primarily on desktop or large tablets where horizontal space allows sidebar resizing.
- Mobile viewports use a separate tab-based navigation and are out of scope for this feature.
- The existing sidebar content (folder tree, note list) remains unchanged — only the container width is adjustable.
- No user preference storage is required; the width resets on page load.
- The resize handle is visually consistent with the existing interface design.
