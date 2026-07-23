# Implementation Plan: Increase OneNote Import Size Limit to 200 MB

**Branch**: `007-onenote-200mb-import` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-onenote-200mb-import/spec.md`

## Summary

Raise the OneNote import maximum file size from 50 MB to 200 MB. The limit is a fixed
constant duplicated across five locations (three API routes, the client import context,
and the import UI copy) plus two test assertions. The existing asynchronous upload +
batch-processing/polling architecture already handles arbitrarily large notebooks
without a fixed time SLA, so no architectural change is required — this is a
constant-and-copy change with corresponding test updates.

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js App Router, React 18

**Primary Dependencies**: Next.js API routes, MongoDB (`connectToDatabase`), R2/local storage abstraction (`@/lib/storage`), NextAuth (`@/lib/auth`), OneNote import job library (`@/lib/onenote/*`), sonner (toasts)

**Storage**: R2 (cloud, via presigned direct upload) or local filesystem/`os.tmpdir()` (self-hosted); MongoDB for import-job records. No schema change.

**Testing**: Vitest (`npm test`), existing suites `src/__tests__/onenote-presign.test.ts`, `src/__tests__/onenote-upload.test.ts`

**Target Platform**: Web app; Vercel (R2 path) and self-hosted Node (local path)

**Project Type**: Web application (Next.js single project, `src/`)

**Performance Goals**: A 200 MB import completes via the existing async/polling flow without server timeout or body-size error; no fixed wall-clock SLA (per spec SC-005)

**Constraints**: Vercel serverless body limit (~4.5 MB) applies only to the legacy synchronous route and the local `/upload` route; the R2 path uploads directly to R2 via presigned URL and bypasses it. The 200 MB local path is only exercised on self-hosted deployments (no serverless body limit). Value convention is binary MB: `200 * 1024 * 1024` = 209,715,200 bytes, matching the existing `50 * 1024 * 1024` pattern.

**Scale/Scope**: 5 source edits + 2 test edits; single-user-per-import (existing one-active-import constraint unchanged)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| 1.1 Data Privacy First | No change to auth/ownership checks; no new logging of user data. PASS |
| 1.2 Offline-Resilient Architecture | No change to failure handling; existing polling/cleanup preserved. PASS |
| 1.3 Accessibility & Responsiveness | UI copy change only (max size text); no interactive control changes. PASS |
| 1.4 Testable Code | Existing import tests updated to assert the 200 MB boundary and message. PASS |
| 1.5 Consistent User Experience | Reuses existing toast/sheet patterns. PASS |
| 1.6 Branch-Based Development | Work on `007-onenote-200mb-import` branch. PASS |
| 2.1 Code Quality | Fully typed; `npm run lint` must pass; no `any`. PASS |
| 2.3 API Design | Validation still performed before processing; 400 status preserved. PASS |
| 2.4 Database & Storage | No schema/index change; large binary still via R2/local storage, not DB. PASS |

**Result**: PASS — no violations, no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/007-onenote-200mb-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-changes.md
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── spec.md
```

### Source Code (repository root)

```text
src/
├── app/api/notes/import/onenote/
│   ├── presign/route.ts        # MAX_IMPORT_SIZE + error message → 200 MB
│   ├── upload/route.ts         # MAX_IMPORT_SIZE + error message → 200 MB
│   └── route.ts                # Legacy sync MAX_SIZE + (fix misleading) error message → 200 MB
├── contexts/
│   └── ImportContext.tsx       # Client-side MAX_IMPORT_SIZE + toast description → 200 MB
├── components/
│   └── ImportExportSheet.tsx   # "Max 50MB" UI copy → "Max 200MB"
└── __tests__/
    ├── onenote-presign.test.ts # Boundary/message assertions → 200 MB
    └── onenote-upload.test.ts  # Boundary/message assertions → 200 MB
```

**Structure Decision**: Existing Next.js single-project layout under `src/`. No new
files in source; edits are confined to the five OneNote import touchpoints and their
two test files. The limit remains a fixed in-code constant (spec FR-007), so no
config/model surface is added.

## Complexity Tracking

No constitution violations. Table intentionally omitted.
</content>
