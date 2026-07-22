# Tasks: OneNote Import — Local Storage Support

**Input**: Design documents from `specs/006-onenote-local-import/`

**Prerequisites**: [plan.md](plan.md) ✅ | [spec.md](spec.md) ✅ | [research.md](research.md) ✅ | [data-model.md](data-model.md) ✅ | [contracts/api.md](contracts/api.md) ✅

---

## Phase 1: Setup

**Purpose**: No new project scaffolding needed — all changes are additions to the existing Next.js app.

> **Prerequisite check (not a code task)**: Confirm `STORAGE_PROVIDER=local` is set (or absent) in `.env.local` and that `npm run dev` starts cleanly before beginning Phase 2.

---

## Phase 2: Foundational — Storage Layer (Blocking Prerequisite for All Stories)

**Purpose**: Extend `storage.ts` so raw import artefacts for local deployments are stored in `os.tmpdir()` (not `public/uploads/`), and add a working `deleteByPrefix` for local. Every user story depends on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `BASE_LOCAL_IMPORT_DIR` constant (`{os.tmpdir()}/zoo-note-imports`) and import `os` and `fs/promises` (already imported as `fs`; add `os` only) in `src/lib/storage.ts`
- [X] T003 [P] Add `localSaveRaw(key: string, data: Buffer): Promise<void>` to `src/lib/storage.ts` — writes to `{BASE_LOCAL_IMPORT_DIR}/{key}`, creating parent directories with `fs.mkdir({ recursive: true })`
- [X] T004 [P] Add `localReadRaw(key: string): Promise<Buffer | null>` to `src/lib/storage.ts` — reads from `{BASE_LOCAL_IMPORT_DIR}/{key}`, returns `null` on ENOENT
- [X] T005 [P] Add `localDeleteByPrefix(prefix: string): Promise<void>` to `src/lib/storage.ts` — calls `fs.rm({BASE_LOCAL_IMPORT_DIR}/{prefix}, { recursive: true, force: true })`
- [X] T006 Update `storageSaveRaw` in `src/lib/storage.ts` — replace `localSave(key, data)` branch with `localSaveRaw(key, data)` so artefacts go to temp dir, not `public/uploads/`
- [X] T007 Update `storageReadRaw` in `src/lib/storage.ts` — replace `localRead(key)` branch with `localReadRaw(key)`
- [X] T008 Update `deleteByPrefix` in `src/lib/storage.ts` — add `else { await localDeleteByPrefix(prefix) }` branch (currently a no-op for local)
- [X] T009 Write unit tests for `localSaveRaw`, `localReadRaw`, `localDeleteByPrefix` in `src/__tests__/storage-local-raw.test.ts` — verify: round-trip write/read, prefix deletion on success, and prefix deletion on simulated job failure (call `localDeleteByPrefix` directly after marking a job failed to confirm FR-004)

**Checkpoint**: Storage layer extended. `storageSaveRaw`/`storageReadRaw`/`deleteByPrefix` now work for both providers. Existing R2 tests must still pass.

---

## Phase 3: User Story 1 — Import OneNote File Without Cloud Storage (Priority: P1) 🎯 MVP

**Goal**: A user with `STORAGE_PROVIDER=local` can run the full OneNote import flow without any R2 credentials.

**Independent Test**: Set `STORAGE_PROVIDER=local`, import a `.onepkg` file via the UI, verify notes and images appear and no error is shown. Also verifiable by running `npm test` for the new upload route tests.

### Implementation for User Story 1

- [X] T010 Create `src/app/api/notes/import/onenote/upload/route.ts` — `POST` handler that:
  - Requires authenticated session (401 if not)
  - Returns 400 if `STORAGE_PROVIDER !== 'local'`
  - Reads `jobId` from query params; returns 400 if absent
  - Fetches the job via `getImportJob(db, jobId, userId)`; returns 404 if not found
  - Returns 409 if `job.status !== 'uploading'`
  - Reads `file` from `FormData`; returns 400 if absent
  - Enforces 50 MB limit; returns 400 with clear error if exceeded
  - Calls `storageSaveRaw(job.r2Key, buffer, 'application/octet-stream')`
  - Returns `{ success: true }`

- [X] T011 Modify `src/app/api/notes/import/onenote/presign/route.ts` — add a branch at the top of the `POST` handler: if `!isR2()`, create the job (reuse existing logic), update status to `uploading`, and return `{ success: true, jobId, localUpload: true }` without calling `getPresignedUploadUrl`

- [X] T012 Modify `src/contexts/ImportContext.tsx` — in `startImport`, after receiving the presign response, branch on `presignData.localUpload`:
  - **R2 path** (unchanged): XHR PUT to `uploadUrl`
  - **Local path** (new): POST file via `FormData` to `/api/notes/import/onenote/upload?jobId={jobId}` using `fetch`; update toast to "Uploading..." (no progress %, since fetch doesn't expose upload progress)
  - **SC-004 verification**: confirm that for the local path the polling toasts advance through `converting → processing → completed` stages (same polling interval as R2 path — no code change expected, just verify during manual test)

- [X] T013 [P] Write unit tests for `POST /api/notes/import/onenote/upload` in `src/__tests__/onenote-upload.test.ts` — cover: success, missing `jobId`, wrong status, file too large, wrong storage provider, unauthenticated

- [X] T014 [P] Write unit tests for the modified `POST /api/notes/import/onenote/presign` in `src/__tests__/onenote-presign.test.ts` — add cases: local provider returns `{ success: true, jobId, localUpload: true }` (no `uploadUrl`)

**Checkpoint**: At this point, a user with `STORAGE_PROVIDER=local` can run presign → upload → confirm → status cycle. User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 — Large File Import on Local Storage (Priority: P2)

**Goal**: Imports up to 50 MB succeed on local storage using the batch-processing polling flow (no server timeout, no body-size limit exceeded for files larger than the legacy sync limit).

**Independent Test**: Import a `.onepkg` file between 25–50 MB with `STORAGE_PROVIDER=local`; confirm it completes across multiple polling cycles without a timeout.

> **Note**: This story is largely delivered by US1 — the batch-processing flow (confirm → poll status) is already designed to handle large files. The specific tasks here address the last gap: ensuring the upload endpoint itself enforces the limit and that the confirm-route read is reliable.

### Implementation for User Story 2

- [X] T015 [P] [US2] Add a Vercel-environment warning in `src/app/api/notes/import/onenote/presign/route.ts` — if `!isR2() && process.env.VERCEL`, log `console.warn("[onenote-import] STORAGE_PROVIDER=local on Vercel: temp files may not persist across function invocations.")` before processing

- [X] T016 [P] [US2] Verify `src/app/api/notes/import/onenote/confirm/route.ts` — confirm `storageReadRaw(job.r2Key)` works for local after the Phase 2 storage changes (no code change expected; add a comment documenting local compatibility)

- [X] T017 [P] [US2] Verify `src/lib/onenote/import.ts` → `processPagesBatch` — confirm `storageReadRaw(htmlKey)` works for local (no code change expected; add a comment documenting local compatibility)

**Checkpoint**: Files up to 50 MB import successfully on local storage. Polling flow completes without timeout.

---

## Phase 5: User Story 3 — Clear Error When Deployment Limits Are Hit (Priority: P3)

**Goal**: Users who exceed the 50 MB local limit or try to use local storage on Vercel see a clear, actionable error message.

**Independent Test**: Submit a file > 50 MB with `STORAGE_PROVIDER=local`; confirm the error message names the limit and suggests options.

### Implementation for User Story 3

- [X] T018 [P] [US3] Improve the "File too large" error message in `src/app/api/notes/import/onenote/upload/route.ts` to read: `"File too large (max 50MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections."`

- [X] T019 [P] [US3] Improve the "File too large" error message in `src/app/api/notes/import/onenote/presign/route.ts` — update the local branch message created in T011 (from generic to the same actionable text as T018) (depends on T011)

- [X] T020 [P] [US3] Update `src/contexts/ImportContext.tsx` client-side size check — improve the `toast.error("File too large")` description to match: `"Maximum import size is 50MB. For larger notebooks, configure R2 storage or split the notebook into smaller sections."`

**Checkpoint**: All three user stories complete. Users get actionable errors at the right layer.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 Run full test suite `npm test` — all existing tests must pass; new tests added in T009, T013, T014 must pass
- [X] T022 [P] Verify R2 regression: temporarily set `STORAGE_PROVIDER=r2` in `.env.local` and confirm the presign route still returns `uploadUrl` (not `localUpload`)
- [X] T023 [P] Verify cleanup: after a successful local import, confirm `{os.tmpdir()}/zoo-note-imports/imports/{jobId}/` is absent

---

## Dependencies

```
T002 → T003, T004, T005 (parallel)
              └── T006, T007, T008 (parallel, depend on T003–T005)
                    └── T009 (tests)
                          └── T010 (upload route)
                          └── T011 (presign route modification)
                          └── T012 (UI context change)
                                └── T013 (upload route tests, parallel with T012)
                                └── T014 (presign tests, parallel with T012)
                                      └── T015–T017 (US2 verification, parallel)
                                            └── T018–T020 (US3 error messages, parallel)
                                                  └── T021–T023 (polish, parallel)
```

---

## Parallel Execution Opportunities

| Parallel Group | Tasks |
|----------------|-------|
| Storage internals | T003, T004, T005 |
| Storage dispatch updates | T006, T007, T008 |
| Upload route + presign update | T010, T011 (after T006–T008) |
| Tests for new routes | T013, T014 (can begin while T012 is in progress) |
| US2 verification | T015, T016, T017 |
| US3 error messages | T018, T019, T020 |
| Final polish | T021, T022, T023 |

---

## Implementation Strategy

**MVP = Phase 2 + Phase 3 (T002–T014)**

Phase 2 (storage layer) is the single critical dependency. Once the three storage functions are wired in and dispatching correctly, every other piece of the pipeline already works because:
- `convertAndUploadToR2` uses `storageSaveRaw` internally ✅
- `processPagesBatch` uses `storageReadRaw` internally ✅
- `cleanupImportData` uses `deleteByPrefix` internally ✅

The net change to implement the MVP is approximately:
- ~40 lines in `storage.ts`
- ~40 lines in a new `upload/route.ts`
- ~15 lines in `presign/route.ts`
- ~25 lines in `ImportContext.tsx`
