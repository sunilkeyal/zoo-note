# Feature Specification: Increase OneNote Import Size Limit to 200 MB

**Feature Branch**: `007-onenote-200mb-import`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "increase onenote file size from 50 MB to 200 MB"

## Clarifications

### Session 2026-07-23

- Q: What is the completion-time expectation for a 200 MB import? → A: No strict time SLA — it MUST complete via the existing async/polling flow without server timeout or body-size errors (best-effort, scales with size).
- Q: Should the 200 MB limit be admin-configurable or a fixed constant? → A: Fixed constant, matching how the OneNote import limit works today.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import a large OneNote notebook (Priority: P1)

A user with a OneNote notebook larger than 50 MB (but up to 200 MB) wants to bring
all of their notes into ZooNote. Today the import is rejected because the notebook
exceeds the 50 MB cap. With this change, the user selects their `.onepkg` or `.one`
file, the import is accepted, and their notes appear in their account.

**Why this priority**: This is the core value of the feature — users with larger
notebooks are currently blocked entirely, so raising the limit is what unlocks the
scenario. It is the minimum change that delivers user value.

**Independent Test**: Select a valid `.onepkg` file between 50 MB and 200 MB and
start an import; confirm the file is accepted (no "file too large" error) and the
notes appear after processing completes.

**Acceptance Scenarios**:

1. **Given** a valid `.onepkg` file of 120 MB, **When** the user starts the import, **Then** the file is accepted and the import proceeds without a "file too large" error
2. **Given** a valid `.onepkg` file of exactly 200 MB, **When** the user starts the import, **Then** the file is accepted
3. **Given** a valid `.one` file of 80 MB, **When** the user starts the import, **Then** the file is accepted and the notes appear in the user's account after processing

---

### User Story 2 - Clear rejection above the new limit (Priority: P2)

A user attempts to import a notebook larger than 200 MB. The system rejects the file
early with a clear, actionable message that states the new limit and suggests options,
so the user understands the boundary and what to do next.

**Why this priority**: Enforcing and communicating the new boundary prevents confusing
failures and wasted uploads, but it depends on the limit being raised first.

**Independent Test**: Attempt to import a file larger than 200 MB and confirm the
request is rejected before processing, with a message that names the 200 MB limit.

**Acceptance Scenarios**:

1. **Given** a file of 250 MB, **When** the user starts the import, **Then** the import is rejected with a message stating the maximum is 200 MB
2. **Given** a file just over 200 MB, **When** the user selects it, **Then** the user sees a clear rejection before any lengthy processing begins

---

### User Story 3 - Accurate limit shown in the UI (Priority: P3)

A user reviewing the import screen sees the correct maximum file size (200 MB) so they
know what to expect before selecting a file.

**Why this priority**: Correct guidance improves the experience and reduces failed
attempts, but the feature is still functional without the label change.

**Independent Test**: Open the import screen and confirm any displayed size limit
reads 200 MB rather than 50 MB.

**Acceptance Scenarios**:

1. **Given** the import screen is open, **When** the user reads the file-size guidance, **Then** it states 200 MB as the maximum

---

### Edge Cases

- What happens when a file is exactly 200 MB (the boundary)? It MUST be accepted.
- What happens when a file is 1 byte over 200 MB? It MUST be rejected with the size message.
- How does the system handle a large valid file whose processing takes longer than
  smaller imports? The existing progress/polling experience MUST continue to apply so
  the user is not left without feedback.
- What happens on the local storage path versus the cloud storage path? Both MUST
  enforce the same 200 MB limit consistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept OneNote import files (`.onepkg` and `.one`) up to and including 200 MB.
- **FR-002**: The system MUST reject OneNote import files larger than 200 MB.
- **FR-003**: The system MUST enforce the 200 MB limit consistently across every import entry point (client-side pre-check, cloud/presigned upload path, and local upload path).
- **FR-004**: When a file exceeds 200 MB, the system MUST return a clear, actionable error message that states the 200 MB maximum and suggests next steps (e.g., splitting the notebook).
- **FR-005**: The system MUST display 200 MB as the maximum file size wherever the import size limit is shown to the user.
- **FR-006**: The system MUST preserve existing import behavior (notes/folders creation, progress feedback, error handling) for files at the new larger sizes.
- **FR-007**: The 200 MB limit MUST be a fixed value defined in the code (not an admin-configurable setting), consistent with how the OneNote import limit is defined today.

### Key Entities *(include if feature involves data)*

- **OneNote Import File**: The user-provided `.onepkg` (notebook package) or `.one` (section) file being imported; the relevant attribute for this feature is its size, which must not exceed 200 MB.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can successfully import a valid OneNote file between 50 MB and 200 MB and see their notes appear in their account.
- **SC-002**: 100% of import files at or below 200 MB pass the size check, and 100% of files above 200 MB are rejected before processing.
- **SC-003**: Users who exceed the limit receive an error message that names the 200 MB maximum in every rejection path.
- **SC-004**: The maximum file size shown to users reads 200 MB in all import-related UI, with no remaining references to a 50 MB maximum.
- **SC-005**: A 200 MB import completes through the existing asynchronous/polling flow without a server timeout or body-size error; there is no fixed wall-clock time limit, and the user continues to receive progress feedback until completion.

## Assumptions

- The change is a limit increase only; the import workflow (selection, upload, conversion, note creation, progress feedback) remains otherwise unchanged.
- The maximum supported size is exactly 200 MB (200 × 1024 × 1024 bytes unless an existing decimal convention is already in use in the codebase's size checks).
- Both the cloud (R2/presigned) and local storage import paths are expected to support files up to 200 MB; any platform/runtime constraints (e.g., function execution time, temporary storage) that affect handling very large files will be addressed during planning and are out of scope for this specification.
- No change to which file types are accepted (`.onepkg` and `.one` remain the supported inputs).
- The limit remains a fixed value in code and is not surfaced as an admin-configurable setting.
</content>
</invoke>
