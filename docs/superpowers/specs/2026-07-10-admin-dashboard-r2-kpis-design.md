# Admin Dashboard Enhancements + R2 KPIs

**Date:** 2026-07-10
**Status:** Approved
**Approach:** Server-side Cloudflare API wrapper with MongoDB caching (Option A)

## Overview

Enhance the ZooNote admin dashboard with real Cloudflare R2 storage/bandwidth/request KPIs via the CF API, and fill in the three placeholder admin pages (Settings, Audit Logs, Backup & Restore) with real functionality.

## 1. R2 Storage KPIs via Cloudflare API

### New lib: `src/lib/cf-r2.ts`

Wraps the Cloudflare R2 Analytics API. Endpoints used (verify exact paths against CF API docs during implementation):

- `GET /accounts/{account_id}/r2/buckets/{bucket_name}/metrics/summary` — total objects, bytes stored
- `GET /accounts/{account_id}/r2/buckets/{bucket_name}/metrics/requests` — GET/PUT/DELETE counts, egress/ingress bytes
- `GET /accounts/{account_id}/r2/buckets/{bucket_name}/objects` — paginated object listing with sizes

Exposed functions:

- `getR2StorageMetrics()` — total objects, total bytes, largest files
- `getR2RequestMetrics(range)` — request counts by type, bandwidth in/out
- `getR2ObjectList(options)` — paginated object listing with size

### Caching layer

Results cached in a MongoDB `r2_metrics` collection with a `ttl` index (5-min expiry). Each query checks cache first, fetches from CF if stale/missing.

### New API route

`GET /api/admin/r2` — Accepts `?metric=storage|requests|objects&range=7|30|90`. Returns cached or fresh CF data. Admin-only.

### Dashboard integration

Add an "R2 Storage" section to the main admin dashboard below existing charts.

| KPI Card | Value | Source |
|----------|-------|--------|
| Total Objects | Count | CF API storage summary |
| Storage Used | Bytes (formatted) | CF API storage summary |
| Egress (period) | Bytes (formatted) | CF API request metrics |
| Ingress (period) | Bytes (formatted) | CF API request metrics |
| GET Requests | Count (formatted) | CF API request metrics |
| PUT Requests | Count (formatted) | CF API request metrics |

Plus a bar chart showing request volume by type, and a table of largest files.

### Cost estimation

Computed from metrics using R2 pricing:

- Free tier: 10GB storage, 10M Class A (PUT/etc), 10M Class B (GET) requests/month, 1GB egress free
- Overage: $0.015/GB storage, $4.50/M Class A, $0.36/M Class B, $0.00/egress (free)

## 2. Settings Page

### New MongoDB collection: `app_settings`

Key-value pairs with schema:
```
{ key: string, value: string, updatedAt: Date }
```

### Seeded defaults

| Setting Key | Default | Description |
|-------------|---------|-------------|
| `app_name` | "ZooNote" | Application name |
| `note_visibility` | "private" | Default note visibility |
| `max_upload_size_mb` | "10" | Max upload size in MB |
| `session_timeout_hours` | "24" | Session timeout |
| `allow_signup` | "true" | Whether new users can register |
| `storage_provider` | (from env) | Local or R2 |
| `r2_bucket_name` | (from env) | R2 bucket name |
| `r2_account_id` | (from env) | CF account ID (masked) |

### New API routes

- `GET /api/admin/settings` — returns all settings
- `PUT /api/admin/settings` — updates settings (validates types, range-checks numeric values)

### Settings page UI

Grouped into sections: General (app name, visibility), Storage (provider, R2 bucket — read-only from env), Security (session timeout, signup toggle), Uploads (max file size). Edit button with inline editing, save/cancel. Env-controlled settings shown as read-only with a lock icon.

## 3. Audit Logs Page

### New MongoDB collection: `audit_logs`

Schema:
```
{
  _id: ObjectId,
  userId: ObjectId,
  userName: string,
  action: string,        // "user.login", "note.create", "settings.update", "r2.object.delete"
  target: string,        // what was affected
  details: object,       // optional metadata (old/new values)
  ip: string,
  userAgent: string,
  timestamp: Date
}
```

### Audit middleware

`logAuditEvent()` in `src/lib/audit.ts` — inserts into `audit_logs` collection. Called from key API routes:
- Auth: login, logout, signup, password reset
- Notes: create, update, delete, restore
- Users: create, update, delete, role change
- Settings: any update
- Admin: orphaned image cleanup, backup/restore actions

### Retention

TTL index on `timestamp` — configurable, default 90 days. Old logs auto-purge.

### New API route

`GET /api/admin/audit` — Paginated, filterable:
- `?userId=X` — filter by user
- `?action=note.create` — filter by action type
- `?from=ISO&to=ISO` — date range
- `?page=1&limit=20` — pagination

### Audit logs page UI

Filterable table with columns: timestamp, user, action (color-coded badges), target, IP. Expandable rows for `details`. Date range picker (reuses existing dashboard pattern).

## 4. Backup & Restore Page

### New lib: `src/lib/backup.ts`

Functions:
- `createBackup()` — runs `mongodump` to temp dir, compresses to `.gz`, uploads to `backups/` prefix in storage. Records metadata in `backups` collection.
- `listBackups()` — queries `backups` collection
- `deleteBackup(id)` — removes from storage and metadata
- `restoreBackup(id)` — downloads from storage, runs `mongorestore` against the same database configured in `MONGODB_URI`. Drops and replaces collections from the backup.

### New MongoDB collection: `backups`

Schema:
```
{
  _id: ObjectId,
  filename: string,
  size: number,
  storagePath: string,
  status: "completed" | "failed" | "in_progress",
  createdAt: Date,
  notes: string
}
```

### New API routes

- `POST /api/admin/backup` — triggers new backup (async)
- `GET /api/admin/backup` — lists all backups
- `DELETE /api/admin/backup/[id]` — deletes a backup
- `POST /api/admin/backup/[id]/restore` — triggers restore (requires "RESTORE" confirmation)
- `GET /api/admin/backup/[id]/download` — streams backup for download

### Backup page UI

"Create Backup" button with loading spinner. Table: filename, size, status badge, created date, actions (download, restore, delete). Restore dialog with warning and "RESTORE" confirmation input. Auto-refresh list every 30s if backup in_progress.

**Note:** `mongodump`/`mongorestore` must be available on the server. If not installed, page shows setup instruction banner.

## Scope

- All four sections built in one pass
- No per-user R2 attribution (can be added later)
- No real-time WebSocket updates (polling/caching sufficient)
- Existing dashboard charts and KPIs remain unchanged
