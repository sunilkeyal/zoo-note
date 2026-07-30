# Feature Specification: Consolidate Sidebar Toolbar

**Feature Branch**: `009-consolidate-sidebar-toolbar`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "implement feature to move dar button next to collapse all button, remove the top empty bar, make the toolbar fixed and alway visible"

## Clarifications

### Session 2026-07-30

- Q: When the editor formatting toolbar stays fixed while scrolling a long note, which elements should remain fixed/always-visible? → A: Only the formatting toolbar stays fixed; the note title and "Last updated" metadata scroll away with the content.
- Q: How should the theme toggle be visually presented within the sidebar toolbar relative to the content/navigation actions? → A: Add a small visual separator/divider between "Collapse all" and the theme toggle to set it apart as a distinct control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle theme from the sidebar toolbar (Priority: P1)

A user working in the notes app wants to switch between light and dark appearance. Instead of reaching for a separate control in a top bar, they find the theme toggle grouped with the other sidebar actions, positioned immediately after the "Collapse all" action.

**Why this priority**: The theme toggle is the only meaningful control that currently lives in the top bar. Relocating it into the sidebar toolbar is the prerequisite that makes removing the top bar possible, so it delivers the core value of the feature.

**Independent Test**: Can be fully tested by opening the app, locating the theme toggle as the last item in the sidebar action toolbar (directly after "Collapse all"), clicking it, and confirming the interface switches between light and dark mode and the choice persists.

**Acceptance Scenarios**:

1. **Given** the app is open in light mode, **When** the user clicks the theme toggle in the sidebar toolbar, **Then** the interface switches to dark mode and the toggle reflects the new state.
2. **Given** the app is open in dark mode, **When** the user clicks the theme toggle in the sidebar toolbar, **Then** the interface switches to light mode and the choice persists across page reloads.
3. **Given** the sidebar toolbar is displayed, **When** the user inspects the toolbar, **Then** the theme toggle appears as the last action, immediately to the right of the "Collapse all" action.

---

### User Story 2 - Reclaim vertical space by removing the empty top bar (Priority: P2)

A user opening a note wants as much vertical space as possible for reading and editing. With the theme toggle relocated, the previously near-empty top bar is removed so content starts at the top of the workspace.

**Why this priority**: Removing the top bar is a visible improvement that depends on User Story 1 being completed first. It delivers a cleaner, more spacious layout.

**Independent Test**: Can be tested by opening the app after the theme toggle has moved, confirming the top bar is gone and note content begins at the top edge of the content area with no empty band above it.

**Acceptance Scenarios**:

1. **Given** the theme toggle has been relocated to the sidebar toolbar, **When** the user views any note or the app home, **Then** no empty top bar is shown above the content area.
2. **Given** the top bar is removed, **When** the user views a note, **Then** the content area occupies the vertical space previously taken by the top bar.

---

### User Story 3 - Keep the editor formatting toolbar always visible while scrolling (Priority: P3)

A user editing a long note scrolls down through the content. They want the editor formatting toolbar (Undo/Redo, font controls, Bold, Italic, and the other formatting buttons) to stay visible at all times so they can apply formatting without scrolling back to the top of the note.

**Why this priority**: Keeping the formatting toolbar fixed improves the editing experience for long notes, but the app remains usable without it, so it is the lowest priority of the three.

**Independent Test**: Can be tested by opening a note long enough to require scrolling, scrolling down through the content, and confirming the editor formatting toolbar remains fixed and fully visible at the top of the editor area.

**Acceptance Scenarios**:

1. **Given** a note long enough to scroll, **When** the user scrolls the note content downward, **Then** the editor formatting toolbar remains fixed and visible at the top of the editor area.
2. **Given** the user has scrolled to the middle or bottom of a long note, **When** they want to apply formatting such as bold, **Then** the formatting toolbar button is still visible without scrolling back up.
3. **Given** the editor formatting toolbar is fixed, **When** the user scrolls, **Then** the toolbar does not overlap or hide the note content being edited.

---

### Edge Cases

- What happens on the mobile layout, which uses a different header and its own mobile editor toolbar? The desktop top bar removal and theme toggle relocation apply only to the desktop layout; the mobile experience is unchanged.
- How does the fixed editor formatting toolbar behave for very short notes that do not scroll? The toolbar simply stays at the top of the editor area with no adverse effect.
- What happens to the theme toggle in areas that reused the same top bar (e.g., admin views)? Those areas must retain a working theme toggle so users are not left without a way to switch appearance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The theme (light/dark) toggle MUST be presented within the sidebar action toolbar, positioned as the last action immediately after the "Collapse all" action, with a visual separator/divider between "Collapse all" and the theme toggle to set it apart as a distinct control.
- **FR-002**: The theme toggle MUST retain its existing behavior: switching between light and dark appearance, reflecting the current mode, and persisting the user's choice across sessions.
- **FR-003**: The empty top bar above the content area MUST be removed from the desktop layout once the theme toggle is relocated.
- **FR-004**: Removing the top bar MUST NOT remove or hide any other functionality; content MUST occupy the reclaimed vertical space.
- **FR-005**: The editor formatting toolbar (Undo/Redo, font controls, Bold, Italic, and the other formatting buttons) MUST remain fixed and fully visible while the note content is scrolled. The note title and "Last updated" metadata are NOT fixed and MUST scroll away with the content.
- **FR-006**: The fixed editor formatting toolbar MUST NOT overlap or obscure the note content being edited.
- **FR-007**: Users MUST continue to have access to a working theme toggle in any other view that previously relied on the removed top bar (e.g., admin views).
- **FR-008**: The relocated theme toggle MUST be reachable and operable via keyboard and expose an accessible label consistent with the other toolbar actions.

### Key Entities

Not applicable — this feature changes UI layout and control placement only; it introduces no new data entities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users can locate and use the theme toggle from the sidebar toolbar without any separate top bar present.
- **SC-002**: The theme toggle appears as the final item directly after "Collapse all" in the sidebar toolbar in 100% of desktop sessions.
- **SC-003**: After the change, the content area gains the full vertical height previously occupied by the top bar (no empty band remains above content).
- **SC-004**: The editor formatting toolbar stays visible during 100% of note-content scroll interactions, regardless of note length.
- **SC-005**: Switching appearance via the relocated toggle completes instantly from the user's perspective and the choice persists across page reloads.

## Assumptions

- The "dar button" in the request refers to the existing dark/light theme (appearance) toggle currently shown in the top bar.
- The scope targets the desktop layout; the mobile layout uses its own header and is unchanged by this feature.
- The existing theme persistence and synchronization behavior is reused as-is; only the control's placement changes.
- The editor formatting toolbar is treated as the fixed, always-visible region at the top of the editor area, and the note content below it is the scrollable region.
- Other views that reused the same top bar component (such as admin views) will keep an equivalent, working theme toggle rather than losing the capability.
