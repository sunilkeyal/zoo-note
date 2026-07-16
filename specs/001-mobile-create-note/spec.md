# Feature Specification: Mobile Create Note Enhancement

**Feature Branch**: `feat/mobile-create-note`

**Created**: 2026-07-15

**Status**: Draft v2

**Input**: User description: "on mobile UI, enhance create new note feature"

## Clarifications

### Session 2026-07-15 (v1 - superseded)

- Q: Which file format should the export produce? → A: Reuse the exact same toolbar as the desktop edit view (full feature parity)
- Q: Should the new-note toolbar be a full replica or simplified? → A: Match desktop — create note immediately on "+", then autosave
- Q: Should the mobile new-note creation follow desktop's immediate-creation pattern? → A: Context-aware folder handling: picker in home view, direct in folder view, add "+" to folder view
- Q: Should empty notes be auto-cleaned up? → A: Auto-delete empty notes when user navigates away without typing
- Q: With immediate creation, what should the back button do? → A: No confirmation — just navigate back (note persists, user can delete later)

### Session 2026-07-15 (v2 - current)

- Q: What happens when user taps "+" on home tab? → A: Folder picker appears. Cancel = no note, back to home. Select folder/root = create empty note immediately (like desktop) with pre-populated title "Untitled Note", navigate to note detail view for editing.
- Q: What happens when user taps "+" on folder tab? → A: Empty note created immediately in that folder (like desktop) with pre-populated title "Untitled Note", navigate to note detail view for editing. No folder picker needed.
- Q: Should empty notes be auto-deleted? → A: No. Notes are kept even if empty. No automatic deletion.
- Q: What does back button do after note creation? → A: From home tab creation → back to home. From folder tab creation → back to that folder. The note persists regardless.
- Q: How should this match desktop behavior? → A: Exactly like desktop. Desktop calls createNote() then setActiveNoteId(). Mobile should do the same — create note immediately, show editor. No deferred creation, no cleanup logic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Note from Home Tab (Priority: P1)

As a mobile user, I want to tap "+" on the home tab, select a folder (or root), and immediately start writing my note in the editor so that I can capture my thoughts quickly.

**Why this priority**: This is the core change — matching desktop behavior where note creation is immediate and editing starts right away.

**Independent Test**: Tap "+" FAB on home tab, select a folder in picker, verify note is created with pre-populated title, confirm editor loads with full toolbar.

**Acceptance Scenarios**:

1. **Given** the user is on the Home/All Notes view, **When** they tap the "+" FAB, **Then** a folder picker modal appears (no note created yet).
2. **Given** the folder picker is open, **When** the user taps Cancel, **Then** the picker closes, no note is created, and the user remains on the home view.
3. **Given** the folder picker is open, **When** the user selects a folder or "No folder (root)" and taps Confirm, **Then** an empty note is created immediately on the server with title "Untitled Note" and the selected folder, and the editor loads.
4. **Given** a note is created, **When** the editor loads, **Then** the title input shows "Untitled Note" and is auto-focused, and the full formatting toolbar is displayed.
5. **Given** the user is editing a newly created note, **When** they tap the back button, **Then** they return to the home view and the note persists (even if empty).

---

### User Story 2 - Formatting Toolbar (Priority: P2)

As a mobile user, I want the same formatting toolbar available in the edit view so that I can structure and style my note during creation.

**Why this priority**: Reusing the existing toolbar ensures feature parity and reduces implementation effort.

**Independent Test**: Tap toolbar buttons and verify formatting is applied.

**Acceptance Scenarios**:

1. **Given** the user is in the new-note editor, **When** they select text and tap bold, **Then** the text becomes bold.
2. **Given** the user taps the heading button, **When** they type, **Then** the text appears as a heading.
3. **Given** the user taps the image button, **When** they select an image, **Then** the image is uploaded and inserted.
4. **Given** the keyboard opens, **When** the toolbar would overlap, **Then** the toolbar hides.

---

### User Story 3 - Create Note from Folder View (Priority: P3)

As a mobile user, I want the "+" button in a folder view to create a note directly in that folder so that notes are organized without extra steps.

**Why this priority**: This ensures the "+" button works consistently in both Home and folder views.

**Independent Test**: Tap "+" in folder view, verify note is created in that folder, confirm editor loads.

**Acceptance Scenarios**:

1. **Given** the user is viewing notes inside a specific folder, **When** they tap the "+" FAB, **Then** an empty note is created immediately in that folder with title "Untitled Note" and the editor loads.
2. **Given** a note is created from folder view, **When** the user taps the back button, **Then** they return to that same folder view.
3. **Given** the user is editing a note created from folder view, **When** they navigate back, **Then** the note persists (even if empty).

---

### Edge Cases

- What happens if the user taps "+" rapidly multiple times? → Debounce: ignore taps while creation is in progress.
- How does the system handle notes with very long content on mobile? → Existing autosave handles this.
- What happens if the user switches apps mid-edit and returns? → Existing behavior persists.
- How does the system handle folder selection when no folders exist? → Folder picker shows "No folders available" message.
- What happens if the save operation fails (network error)? → Existing retry/error handling applies.
- What happens if the folder picker modal is dismissed immediately? → Cancel = no note created, stay on current view.
- **Navigation Context**: When navigating from home/folder view to the editor and back, the user must return to the correct view. The system must preserve the previous screen context across route changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a note immediately on the server when the user confirms folder selection (home tab) or taps "+" (folder view)
- **FR-002**: System MUST display the full formatting toolbar (matching desktop edit view) in the new-note editor
- **FR-003**: System MUST autosave all changes (title 600ms, content 1000ms debounce) after note creation
- **FR-004**: System MUST show a folder picker modal when "+" is tapped from the Home/All Notes view — no note created until user confirms
- **FR-005**: System MUST create the note directly in the current folder when "+" is tapped from a folder view
- **FR-006**: System MUST NOT auto-delete empty notes — notes persist regardless of content
- **FR-007**: System MUST hide the mobile tab bar during editing to maximize editor space
- **FR-008**: System MUST hide the toolbar when the on-screen keyboard opens to avoid overlap
- **FR-009**: System MUST auto-focus the title input when the editor loads
- **FR-010**: System MUST meet minimum touch target size of 44x44 pixels for all interactive elements
- **FR-011**: System MUST display a "+" button in both the Home/All Notes view and folder views
- **FR-012**: System MUST navigate back without confirmation (note persists, user can delete later)
- **FR-013**: System MUST preserve navigation context so back button returns to the correct screen (home or folder)

### Key Entities

- **Note**: Contains title, rich text body (HTML/formatting), folder association, and metadata. Created immediately on the server when user confirms folder selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a note and start typing in a single flow (no separate "create" screen)
- **SC-002**: Users have access to the full formatting toolbar during creation (same as edit view)
- **SC-003**: Folder selection is context-aware — picker in Home view, direct in folder view
- **SC-004**: Empty notes are NOT auto-deleted — they persist until manually deleted
- **SC-005**: All touch targets meet the 44x44 pixel minimum for accessibility compliance
- **SC-006**: Toolbar does not overlap the on-screen keyboard during editing
- **SC-007**: Back button returns to the correct screen (home or folder) after note creation

## Assumptions

- The existing TipTap editor infrastructure can be reused directly in the new-note flow
- The existing mobile toolbar component can be reused without modification
- The existing autosave mechanism (debounced API calls) works for newly created notes
- The folder picker can be implemented as a modal overlay
- Users expect consistent behavior between desktop and mobile note creation
- The "+" button can be added to the folder view without disrupting the existing layout
- The NoteProvider context (shared across layout trees) persists `notes` and `folders` state across route changes
