# Admin Dashboard Enhancements + R2 KPIs

**Date:** 2026-07-10
**Status:** Approved
**Approach:** Server-side S3 API (primary) + CF GraphQL Analytics API (fallback) with MongoDB caching

## Overview

Enhance the ZooNote admin dashboard with real Cloudflare R2 storage/request KPIs, reorganize the dashboard into collapsible sections, and fill in the Settings page with real functionality. Backup and Audit pages use "Coming Soon" placeholders.

## 1. R2 Storage & Request KPIs

### New lib: `src/lib/cf-r2.ts`

Wraps Cloudflare R2 using two APIs:

**Storage (S3 API — primary):**
- `ListBucketsCommand` — enumerates all R2 buckets
- `ListObjectsV2Command` — lists objects per bucket, sums sizes

If S3 `ListBuckets` is denied (requires account-level `s3:ListBucket` permission), falls back to:
- CF GraphQL `r2StorageAdaptiveGroups` — enumerates bucket names

**Requests (CF GraphQL Analytics API):**
- `r2OperationsAdaptiveGroups` — request counts by `actionType`

Action types are PascalCase: `PutObject`, `GetObject`, `DeleteObject`, `ListObjects`, `HeadBucket`, `PutBucket`, `ListMultipartUploads`, `DeleteMultipleObjects`, etc.

Classified as:
- **Class A** (PUT/etc): `PutObject`, `ListObjects`, `PutBucket`, `ListMultipartUploads`, `DeleteMultipleObjects`
- **Class B** (GET/etc): `GetObject`, `HeadObject`, `HeadBucket`, `CopyObject`, `SelectObject`
- **DELETE**: `DeleteObject`

**Object listing (S3 API):**
- `ListObjectsV2Command` — paginated object listing with cursor support

Exposed interfaces:

```typescript
interface R2BucketInfo {
  name: string
  objectCount: number
  payloadSize: number
  isPrimary: boolean
}

interface R2StorageMetrics {
  totalObjects: number
  totalBytes: number
  buckets: R2BucketInfo[]
}

interface R2RequestMetrics {
  requests: { get: number; put: number; delete: number }
  bandwidth: { egress: number; ingress: number } // egress/ingress: not available via GraphQL, always 0
}

interface R2ObjectEntry {
  key: string
  size: number
  lastModified: string
}
```

### Caching layer

Results cached in a MongoDB `r2_metrics` collection with manual 5-min TTL (check `updatedAt` age). Each query checks cache first, fetches from APIs if stale/missing. Cache is bypassed by explicit refresh from the dashboard.

### New API route

`GET /api/admin/r2` — Accepts `?metric=storage|requests|cost|objects&range=7|30|90`. Returns cached or fresh data. Admin-only.

### Dashboard integration

Dashboard reorganized into **Option B (collapsible) layout**:

| Section | Contents | Default |
|---------|----------|---------|
| **Summary KPIs** (always visible) | Total Users, Total Notes, MongoDB Storage, R2 Cost | — |
| **Application Metrics** | Cleanup button, App KPIs (Active Today, New This Week, Folders, Trash, Users, Notes), Notes/Active Users charts, Top Users table | Open |
| **Infrastructure** | R2 error banner, MongoDB vs R2 storage cards (with bucket breakdown), R2 operations KPIs, cost estimate, largest files table | Open |
| **Activity** | Storage growth chart, recent activity feed | Open |

Storage cards show:
- **MongoDB**: total bytes / 512 MB with progress bar, primary/system database breakdown
- **R2**: total bytes / 10 GB with progress bar, primary bucket (violet label) vs other buckets

R2 Operations KPIs: Total Objects, Total Buckets, Egress, Ingress, GET Requests, PUT Requests.

### Cost estimation

Computed from metrics using R2 pricing:

- Free tier: 10GB storage, 10M Class A (PUT/etc), 10M Class B (GET) requests/month, 1GB egress free
- Overage: $0.015/GB storage, $4.50/M Class A, $0.36/M Class B, $0.00/egress (free)
- Egress is free on R2 — not charged even beyond free tier

## 2. Settings Page

### New MongoDB collection: `app_settings`

Key-value pairs with schema:
```
{ key: string, value: string, updatedAt: Date }
```

### Seeded defaults

| Setting Key | Default | Description | Editable |
|-------------|---------|-------------|----------|
| `app_name` | "ZooNote" | Application name | Yes |
| `note_visibility` | "private" | Default note visibility | Yes |
| `max_upload_size_mb` | "10" | Max upload size in MB | Yes |
| `session_timeout_hours` | "24" | Session timeout | Yes |
| `allow_signup` | "true" | Whether new users can register | Yes |
| `storage_provider` | (from env) | Local or R2 | No (read-only) |
| `r2_bucket_name` | (from env) | R2 bucket name | No (read-only) |
| `r2_account_id` | (from env) | CF account ID | No (read-only) |

### New API routes

- `GET /api/admin/settings` — returns all settings (DB + env overrides + defaults)
- `PUT /api/admin/settings` — updates settings (validates types, range-checks numeric values)

### Settings page UI

Grouped into sections: General (app name, visibility), Security (session timeout, signup toggle), Uploads (max file size). Inline editing with save/cancel. Env-controlled settings shown as read-only with a lock icon.

## 3. Audit Logs Page

**Status: "Coming Soon" placeholder.**

Full audit logging deferred — requires instrumentation across all API routes (auth, notes, users, settings, admin actions). Planned features: filterable table with action color-coding, expandable details rows, date range filtering, configurable retention.

## 4. Backup & Restore Page

**Status: "Coming Soon" placeholder.**

Full backup/restore deferred — `mongodump`/`mongorestore` CLI tools not available on Vercel serverless. Would require either:
- Self-hosted MongoDB with CLI access, or
- MongoDB Atlas API-based backup (paid tier)

Planned features: create/list/delete/restore backups with confirmation dialog, auto-refresh for in-progress backups.

## Scope

- R2 metrics via S3 API (primary) + CF GraphQL Analytics (fallback)
- Dashboard reorganized into collapsible sections (Option B)
- Settings page with CRUD and validation
- Audit and Backup pages as "Coming Soon" placeholders
- No per-user R2 attribution (can be added later)
- No real-time WebSocket updates (polling/caching sufficient)
- Existing dashboard charts and KPIs preserved within collapsible sections
