# Quickstart Validation Guide: OneNote Import — Local Storage Support

**Branch**: `006-onenote-local-import` | **Date**: 2026-07-22

---

## Prerequisites

- ZooNote running locally with MongoDB (`npm run dev`)
- `STORAGE_PROVIDER` absent or set to `local` in `.env.local`
- A `.onepkg` or `.one` file available for testing (any real OneNote export, or a synthetic test file)
- Logged in as any user

---

## Setup

```bash
# Confirm local storage mode
grep STORAGE_PROVIDER .env.local
# Should print nothing, or: STORAGE_PROVIDER=local

# Ensure no CLOUDFLARE / R2 vars are set (or they are irrelevant)
```

---

## Scenario 1 — Happy Path: Import `.onepkg` Without R2

**Goal**: Verify end-to-end import succeeds with zero R2 configuration.

1. Open the app in a browser and navigate to the import screen.
2. Select a `.onepkg` file (≤ 50 MB).
3. Submit the import.
4. Observe the progress indicator — it should move through:
   - `pending` → `uploading` → `converting` → `processing` → `completed`
5. Navigate to the notes list.

**Expected outcome**:
- Notes from the OneNote file appear in the notes list
- Each note has a title matching the OneNote page title
- Images embedded in the notebook are visible inside each note
- The import result shows non-zero `notesImported` count

**Verify cleanup**:
```bash
ls /tmp/zoo-note-imports/imports/
# Should be empty (or directory absent) after completion
```

---

## Scenario 2 — Large File (up to 50 MB)

**Goal**: Verify file sizes up to 50 MB are accepted.

1. Use a `.onepkg` file between 25–50 MB.
2. Submit the import.
3. Observe progress through all stages.

**Expected outcome**: Import completes successfully. Same assertions as Scenario 1.

---

## Scenario 3 — File Too Large

**Goal**: Verify the 50 MB limit is enforced locally.

1. Prepare a file > 50 MB (or mock a large `fileSize` value).
2. Submit the import.

**Expected outcome**:
- Error message: `"File too large (max 50MB)."`
- No job created in MongoDB

---

## Scenario 4 — R2 Path Regression

**Goal**: Verify existing R2 behaviour is unchanged.

```bash
# In .env.local, temporarily set:
STORAGE_PROVIDER=r2
CLOUDFLARE_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

1. Restart the dev server.
2. Import a `.onepkg` file.

**Expected outcome**: Presigned URL is returned and the client uploads directly to R2 (existing flow).
Progress and completion work as before.

---

## Scenario 5 — Unit Tests

```bash
npm test -- --run src/__tests__/onenote-import.test.ts
npm test -- --run src/__tests__/api-upload.test.ts
# All tests should pass, including new tests for local storage path
```

---

## References

- API contracts: [contracts/api.md](contracts/api.md)
- Data model: [data-model.md](data-model.md)
- Research: [research.md](research.md)
