# Research: Increase OneNote Import Size Limit to 200 MB

## 1. Where the 50 MB limit is currently enforced

A codebase scan (`50 * 1024 * 1024`, `max 50MB`, `Max 50MB`) identifies every touchpoint:

| # | Location | Current value | What it does |
|---|----------|---------------|--------------|
| 1 | `src/app/api/notes/import/onenote/presign/route.ts` | `MAX_IMPORT_SIZE = 50 * 1024 * 1024` | Rejects R2 presign requests over the limit (400) |
| 2 | `src/app/api/notes/import/onenote/upload/route.ts` | `MAX_IMPORT_SIZE = 50 * 1024 * 1024` | Rejects local uploads over the limit (400) |
| 3 | `src/app/api/notes/import/onenote/route.ts` | `MAX_SIZE = 50 * 1024 * 1024` | Legacy synchronous import path |
| 4 | `src/contexts/ImportContext.tsx` | `MAX_IMPORT_SIZE = 50 * 1024 * 1024` | Client-side pre-check before upload |
| 5 | `src/components/ImportExportSheet.tsx` | copy: "Max 50MB." | User-facing guidance text |

Tests asserting the limit:

| Test | Assertion |
|------|-----------|
| `src/__tests__/onenote-presign.test.ts` | 400 + message matches `/50MB/` when file exceeds limit |
| `src/__tests__/onenote-upload.test.ts` | 400 + message matches `/50MB/` when file exceeds limit |

**Decision**: Update all five source locations and both tests to 200 MB.
**Rationale**: Spec FR-003 requires consistent enforcement across every entry point;
leaving any at 50 MB would create inconsistent rejections and stale UI copy.
**Alternatives considered**: Centralizing the constant into a single shared module.
Rejected for this change — it expands scope beyond the requested increase and the
constant is already colocated with each route's validation; a refactor is out of scope
(spec assumption: limit increase only).

## 2. MB unit convention

**Decision**: Use binary MB — `200 * 1024 * 1024` = 209,715,200 bytes.
**Rationale**: Every existing check uses `50 * 1024 * 1024` (binary). Matching the
convention keeps boundary behavior predictable and consistent with prior tests.
**Alternatives considered**: Decimal (200,000,000). Rejected — inconsistent with the
established pattern and would surprise anyone reasoning from the existing code.

## 3. Platform constraints for a 4× larger file

**Decision**: No architectural change; the existing async upload + batch-processing
polling flow already supports 200 MB.
**Rationale**:
- **R2 (cloud) path**: The browser uploads directly to R2 via a presigned URL, so the
  file never passes through a Vercel function body — the ~4.5 MB serverless body limit
  does not apply. Conversion reads the object from R2 and processes it in batches across
  multiple polling invocations, so the 60 s per-invocation timeout is not exceeded for
  larger inputs (more batches, not longer single invocations). This satisfies spec
  SC-005 (no fixed time SLA; async flow, no timeout).
- **Local path**: The `/upload` route accepts multipart form data. On Vercel this route
  is explicitly rejected (`isR2()` guard is inverted — local upload only runs when not
  R2), and local storage targets self-hosted Node deployments, which have no 4.5 MB body
  limit. A 200 MB upload buffered once via `Buffer.from(await file.arrayBuffer())` is an
  acceptable one-time allocation on a self-hosted server.
**Alternatives considered**: Streaming/chunked upload for local; presigned multipart for
R2. Rejected — not required to meet the spec at 200 MB and would be over-engineering
beyond the requested change.

## 4. Legacy synchronous route (`route.ts`)

**Decision**: Raise its `MAX_SIZE` to 200 MB and correct its misleading error message
(currently reads "max 4MB" even though `MAX_SIZE` was 50 MB).
**Rationale**: FR-003 lists every import entry point; the sync route is one. On Vercel
its practical ceiling is still the ~4.5 MB serverless body limit, but on self-hosted it
can accept larger files, and the current message is factually wrong. Aligning it avoids
inconsistent/incorrect messaging.
**Alternatives considered**: Leaving it at 50 MB. Rejected — violates FR-003 consistency
and preserves an incorrect message.

## 5. Error message wording

**Decision**: Keep the existing message shape, replacing "50MB" with "200MB":
- Server (presign/upload): `"File too large (max 200MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections."`
- Client (ImportContext toast): `"Maximum import size is 200MB. For larger notebooks, configure R2 storage or split the notebook into smaller sections."`
**Rationale**: FR-004 requires an actionable message naming the new maximum; reusing the
established wording keeps UX consistent (Constitution 1.5).
**Alternatives considered**: New message copy. Rejected — unnecessary churn.

## 6. Testing strategy

**Decision**: Update the two existing boundary tests to use a >200 MB `fileSize`/`file.size`
and assert the message matches `/200MB/`. Optionally add an at-limit (exactly 200 MB)
accepted case if the existing tests only cover rejection.
**Rationale**: Constitution 1.4 requires happy + error path coverage; the boundary is the
behavior that changed.
**Alternatives considered**: New dedicated test file. Rejected — the existing files
already own these assertions.
</content>
