# Quickstart & Validation: OneNote Import 200 MB Limit

Validation guide proving the 50 MB → 200 MB increase works end-to-end. See
[spec.md](./spec.md), [data-model.md](./data-model.md), and
[contracts/api-changes.md](./contracts/api-changes.md) for details.

## Prerequisites

- App running locally: `npm run dev`
- A signed-in user account
- Sample OneNote files: one in the 50–200 MB range and one > 200 MB (a real `.onepkg`,
  or mock the reported size for API-level checks)

## Scenario 1 — Large file now accepted (US1 / SC-001)

**Goal**: A file between 50 MB and 200 MB is accepted (previously rejected).

1. Open the import sheet (Import/Export).
2. Select a valid `.onepkg` file of ~120 MB.
3. Start the import.

**Expected**:
- No "file too large" error.
- Import progresses through the async/polling flow; notes and folders appear on completion.

## Scenario 2 — Boundary at exactly 200 MB (Edge case / SC-002)

**Goal**: Verify the inclusive 200 MB boundary.

1. Submit a file of exactly 209,715,200 bytes (200 MB).

**Expected**: Accepted (no size error).

## Scenario 3 — Over-limit rejected with clear message (US2 / SC-003)

**Goal**: Verify files > 200 MB are rejected before processing with an actionable message.

1. Submit a file of ~250 MB (or a request with `fileSize` = 209,715,201).

**Expected**:
- HTTP 400 (server) / toast (client).
- Message names the 200 MB maximum, e.g. `"File too large (max 200MB). ..."`.

## Scenario 4 — UI shows the new limit (US3 / SC-004)

**Goal**: Confirm the displayed maximum reads 200 MB.

1. Open the import sheet.

**Expected**: Guidance text reads "Max 200MB" (no remaining "50MB" references).

## Scenario 5 — Async completion, no timeout (SC-005)

**Goal**: Confirm a 200 MB import completes via polling without a server timeout.

1. Import a large (~200 MB) notebook on an R2-configured deployment.

**Expected**: The import completes across multiple polling cycles; the user sees progress
feedback throughout; no timeout or body-size error.

## Automated checks

Run the import test suites:

```bash
npm test -- onenote-presign onenote-upload
```

**Expected**: Boundary/message tests assert the 200 MB limit and pass. Full suite:
`npm test`. Lint: `npm run lint`.
</content>
