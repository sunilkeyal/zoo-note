# Implementation Plan: OneNote Import — Local Storage Support

**Branch**: `006-onenote-local-import` | **Date**: 2026-07-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-onenote-local-import/spec.md`

---

## Summary

Enable the OneNote import feature when `STORAGE_PROVIDER=local` by:

1. Adding a local temp-file raw-storage layer to `storage.ts` (routing import artefacts to `os.tmpdir()` instead of `public/uploads/`)
2. Implementing `deleteByPrefix` for local (currently a no-op — breaks cleanup)
3. Adding a new `POST /api/notes/import/onenote/upload` endpoint for server-side file receipt
4. Modifying the presign route to return `{ localUpload: true }` for local deployments
5. Updating the import UI component to handle the local upload path

---

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20

**Primary Dependencies**: Next.js 16, NextAuth v5, MongoDB (Mongoose-free), `@joplin/onenote-converter` (vendored WASM), `bcryptjs`, `sharp`, `gridfs-stream`

**Storage**:
- Images (permanent): GridFS via MongoDB
- Import temp artefacts (R2): Cloudflare R2 via `@aws-sdk/client-s3`
- Import temp artefacts (local): `os.tmpdir()/zoo-note-imports/` (new)

**Testing**: Vitest

**Target Platform**: Next.js server (self-hosted or Vercel) + local dev

**Performance Goals**: Import of a 50 MB `.onepkg` completes in < 2 minutes; each polling response in < 5 seconds

**Constraints**: No new `npm` dependencies; solution must work in stateless serverless environments (Vercel) where `os.tmpdir()` persists only for the duration of a single function invocation — see note on conversion atomicity below

**Scale/Scope**: Single-instance local dev and small self-hosted deployments; R2 path continues to serve multi-instance / serverless at scale

> **Serverless note**: On Vercel, each API call is a separate function invocation with its own
> temp dir. The `/confirm` route (conversion + upload-to-R2) already handles this correctly for
> R2. For local storage, the new temp dir must persist across the confirm → status → status
> polling sequence. This is only safe on persistent server deployments (local dev, Docker, VPS).
> The feature spec explicitly scopes local support to self-hosted/dev environments, so this is
> acceptable. The code SHOULD log a warning if `STORAGE_PROVIDER=local` and `VERCEL` is set.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1.1 Data Privacy First | ✅ Pass | Temp files go to `os.tmpdir()`, not `public/`. Deleted after import. |
| 1.2 Offline-Resilient | ✅ Pass | Same polling model; no new network dependency |
| 1.3 Accessibility | ✅ Pass | No UI changes beyond conditional upload logic |
| 1.4 Testable Code | ✅ Pass | New endpoint + storage functions are unit-testable; spec requires tests |
| 1.5 Consistent UX | ✅ Pass | Progress UI unchanged; only upload transport differs |
| 1.6 Branch-Based Dev | ✅ Pass | Work is on `006-onenote-local-import` |
| 2.1 Code Quality | ✅ Pass | TypeScript strict; no `any` in new code |
| 2.2 Dependency Mgmt | ✅ Pass | No new dependencies; uses `node:fs/promises` and `node:os` already imported |

**No violations. Proceeding to Phase 1.**

---

## Project Structure

### Documentation (this feature)

```text
specs/006-onenote-local-import/
├── plan.md              ← this file
├── research.md          ✅ complete
├── data-model.md        ✅ complete
├── quickstart.md        ✅ complete
├── contracts/
│   └── api.md           ✅ complete
└── tasks.md             (Phase 2 — /speckit.tasks)
```

### Source Code Changes

```text
src/lib/storage.ts
  └── add localSaveRaw(), localReadRaw(), localDeleteByPrefix()
      update storageSaveRaw(), storageReadRaw(), deleteByPrefix() dispatch

src/app/api/notes/import/onenote/
  ├── presign/route.ts           ← add local branch (return localUpload: true)
  └── upload/route.ts            ← NEW: server-side file receipt for local

src/components/ (or wherever the OneNote import UI lives)
  └── [import component]         ← handle localUpload flag from presign response

src/__tests__/
  ├── cf-r2-api.test.ts          ← no change (R2 regression guard)
  ├── onenote-import.test.ts     ← no change
  └── [new] local-import.test.ts ← unit tests for new storage functions + upload route
```

---

## Phase 0: Research ✅

See [research.md](research.md) for full findings. Summary:

**Decision**: Route raw import artefacts (local provider) to `{os.tmpdir()}/zoo-note-imports/{key}`.
This is the correct location for temporary server-side data: not publicly served, cleaned up on
OS reboot, and isolated per job via the key structure.

**Key finding**: `storageSaveRaw`/`storageReadRaw` already have local branches — they just
delegate to `localSave`/`localRead` which target `public/uploads/`. Three-line change per function.

---

## Phase 1: Design ✅

See [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md).

### Re-evaluated Constitution Check (post-design)

All checks still pass. The `localDeleteByPrefix` implementation uses `fs.rm(path, { recursive: true, force: true })` — the same primitive already used by `convertAndUploadToR2`'s cleanup.

---

## Implementation Sequence (for tasks.md)

The following implementation order avoids regressions at each step:

1. **`storage.ts`** — add `localSaveRaw`, `localReadRaw`, `localDeleteByPrefix`; update dispatch in `storageSaveRaw`, `storageReadRaw`, `deleteByPrefix`
2. **`/upload` route** — new endpoint for local file upload; unit tests
3. **`/presign` route** — add `localUpload: true` branch; existing tests must still pass
4. **UI import component** — branch on `localUpload` flag
5. **Integration test** — full local import cycle end-to-end
6. **Serverless warning** — log warning when `STORAGE_PROVIDER=local && VERCEL`
