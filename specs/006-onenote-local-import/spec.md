# Feature Specification: OneNote Import — Local Storage Support

**Feature Branch**: `006-onenote-local-import`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "make onenote import work when storage_provider is local"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import OneNote File Without Cloud Storage (Priority: P1)

As a developer or self-hosted user running ZooNote with `STORAGE_PROVIDER=local`,
I want to import a `.onepkg` or `.one` file without configuring Cloudflare R2,
so that I can use the full OneNote import feature in local and self-hosted environments.

**Why this priority**: The entire OneNote import feature is broken when `STORAGE_PROVIDER=local`.
Any user who sets up ZooNote locally or self-hosts without R2 cannot use this feature at all.
This is the core gap the feature closes.

**Independent Test**: Can be fully tested by running ZooNote with `STORAGE_PROVIDER=local`,
uploading a `.onepkg` or `.one` file via the import UI, and verifying notes and images appear
in the notes list — all without setting any R2 or Cloudflare environment variables.

**Acceptance Scenarios**:

1. **Given** `STORAGE_PROVIDER=local`, **When** a user uploads a `.onepkg` file through the import UI, **Then** the import starts successfully (no "R2 required" error)
2. **Given** `STORAGE_PROVIDER=local`, **When** an import job runs, **Then** converted notes and images are created in the user's account
3. **Given** `STORAGE_PROVIDER=local`, **When** an import job runs, **Then** embedded images are accessible after import via the standard image endpoint
4. **Given** `STORAGE_PROVIDER=local` and an import is in progress, **When** the user checks progress, **Then** they see accurate status updates until completion
5. **Given** `STORAGE_PROVIDER=local`, **When** the import finishes, **Then** temporary artefacts are cleaned up and do not persist on disk

---

### User Story 2 - Large File Import on Local Storage (Priority: P2)

As a user on a local/self-hosted deployment,
I want to import OneNote files larger than the current sync-only limit,
so that I can migrate real-world notebooks that contain many pages or images.

**Why this priority**: Even if the import becomes unblocked for local storage, the legacy
sync-only path has a 50 MB body limit and ties up the server for the full duration.
A file larger than this will always fail.

**Independent Test**: Can be tested independently by importing a `.onepkg` file that
exceeds the legacy sync limit and verifying it completes successfully.

**Acceptance Scenarios**:

1. **Given** `STORAGE_PROVIDER=local` and a file up to 50 MB, **When** the user submits the import, **Then** the import succeeds without a timeout or body-size error
2. **Given** `STORAGE_PROVIDER=local`, **When** conversion takes more than a few seconds, **Then** the UI shows progress and the page does not time out

---

### User Story 3 - Clear Error When Deployment Limits Are Hit (Priority: P3)

As a self-hosted user,
I want to see a clear, actionable message when a file exceeds what local storage can handle,
so that I understand the limitation and can take corrective action (split files, configure R2).

**Why this priority**: Even with local support, there may be practical upper limits.
Good error messages reduce support burden and improve the developer experience.

**Independent Test**: Can be tested by submitting a file above the defined local maximum
and verifying the error message is descriptive and suggests a resolution.

**Acceptance Scenarios**:

1. **Given** `STORAGE_PROVIDER=local` and a file exceeding the local size limit, **When** the user attempts the import, **Then** they see a clear message explaining the limit and suggesting options
2. **Given** `STORAGE_PROVIDER=r2`, **When** the user imports any supported file, **Then** behaviour is unchanged (no regression)

---

### Edge Cases

- What happens when the server process is restarted mid-import (temp files lost)?
- How does the system handle a `.onepkg` file that contains zero pages?
- What happens if local disk is full during the conversion stage?
- How does the import behave if the user logs out while an import is in progress?
- What happens when two concurrent imports are triggered for the same user?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The OneNote import flow MUST function end-to-end when `STORAGE_PROVIDER=local`, without requiring any R2 or Cloudflare credentials
- **FR-002**: The system MUST use the local filesystem or in-process memory to store temporary conversion artefacts when `STORAGE_PROVIDER=local`
- **FR-003**: After a successful local import, all temporary artefacts MUST be removed from disk
- **FR-004**: After a failed local import, all temporary artefacts MUST be removed from disk
- **FR-005**: Imported images MUST be stored in GridFS (the existing image store for local deployments) and be accessible via the standard image endpoint
- **FR-006**: The import progress polling endpoint MUST work for local imports, reporting accurate `pending → converting → processing → completed` status transitions
- **FR-007**: The import MUST support `.onepkg` and `.one` file formats on local storage
- **FR-008**: The system MUST enforce a maximum file size of 50 MB for local imports, matching the R2 provider limit
- **FR-009**: When `STORAGE_PROVIDER=r2`, all existing R2-backed import behaviour MUST remain unchanged (no regression)
- **FR-010**: Only one active import per user is allowed at a time, regardless of storage provider

### Key Entities

- **ImportJob**: Tracks the lifecycle of a single import (userId, status, progress, temporary file location, result). Stored in MongoDB.
- **Temporary Artefact**: Files produced during WASM conversion (HTML pages, images). Must be stored and cleaned up per job.
- **Imported Note**: A note created in the user's account from a converted OneNote page.
- **Imported Image**: An image extracted from OneNote content, stored in GridFS.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with `STORAGE_PROVIDER=local` can import a `.onepkg` or `.one` file of up to 50 MB and have notes appear in their account
- **SC-002**: No temporary files remain on disk after an import completes or fails
- **SC-003**: Existing R2-backed import tests continue to pass with no modifications
- **SC-004**: The import UI displays status updates at least every polling interval until completion
- **SC-005**: A descriptive, user-readable error is returned when the file exceeds the local size limit

## Assumptions

- **A-001**: The maximum supported file size for local imports is 50 MB (matching the existing R2 limit); larger files require R2
- **A-002**: Temporary artefacts for local imports are written to the OS temp directory (`os.tmpdir()`), not to `public/uploads/`
- **A-003**: The WASM converter (`@joplin/onenote-converter`) is already bundled and works without network access; no changes needed to the conversion step
- **A-004**: The batch-processing polling approach remains the same; only the storage backend for temp files changes
- **A-005**: GridFS is available and usable in all local deployments (MongoDB is already required)
- **A-006**: The existing presign endpoint is R2-specific and stays R2-only; local imports use a different upload path (direct server-side write)

## Out of Scope

- Streaming or resumable uploads for local storage
- Migrating existing orphaned R2 import jobs to local storage
- Progress tracking via WebSocket (polling is sufficient)
- Support for storage providers other than `local` and `r2`
