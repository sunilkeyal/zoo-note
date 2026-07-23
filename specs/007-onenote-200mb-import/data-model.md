# Data Model: Increase OneNote Import Size Limit to 200 MB

This feature introduces no new entities and changes no persisted schema. It adjusts a
single validation constraint applied to an existing input.

## Entities

### OneNote Import File (input, not persisted as a new entity)

| Attribute | Type | Constraint (new) | Enforced at |
|-----------|------|------------------|-------------|
| `filename` | string | Extension must be `.onepkg` or `.one` (unchanged) | presign route, sync route, client |
| `fileSize` / `file.size` | number (bytes) | **≤ 209,715,200 bytes (200 MB = 200 × 1024 × 1024)** | presign route, upload route, sync route, client pre-check |

### Import Job (existing — unchanged)

The MongoDB import-job record (`@/lib/onenote/import-job`) is unchanged: no new fields,
indexes, or state transitions. The one-active-import-per-user rule (`getActiveImportJob`)
still applies.

## Validation Rule Change

| Rule | Before | After |
|------|--------|-------|
| Maximum import file size | 52,428,800 bytes (50 MB) | 209,715,200 bytes (200 MB) |

- **Boundary**: A file of exactly 209,715,200 bytes is accepted; 209,715,201 bytes is rejected.
- **Rejection response**: HTTP 400 with an actionable message naming the 200 MB maximum
  (server routes) or a toast with the equivalent message (client).
- **Definition source**: Fixed in-code constant (spec FR-007); not admin-configurable.

## State Transitions

Unchanged. The existing import-job lifecycle (`uploading → processing → completed/failed`)
and polling/cleanup behavior are not modified.
</content>
