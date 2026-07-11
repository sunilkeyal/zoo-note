# Admin Dashboard Enhancements + R2 KPIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cloudflare R2 storage/request KPIs to the admin dashboard via S3 API (with GraphQL fallback), reorganize the dashboard into collapsible sections, and fill in the Settings page with real functionality. Backup and Audit pages use "Coming Soon" placeholders.

**Architecture:** Server-side Cloudflare R2 metrics via S3 API (`@aws-sdk/client-s3`) for storage enumeration and CF GraphQL Analytics API for request metrics. MongoDB TTL-based caching. Dashboard uses collapsible sections (Option B layout). Settings use a MongoDB collection with CRUD API routes.

**Tech Stack:** Next.js 16 App Router, TypeScript 6, shadcn/ui (base-nova), Recharts, MongoDB (native driver v6), Vitest, `@aws-sdk/client-s3`, Cloudflare GraphQL Analytics API

---

## File Structure

```
src/lib/cf-r2.ts              — NEW: Cloudflare R2 API wrapper (S3 + GraphQL) + MongoDB caching
src/lib/settings.ts           — NEW: Settings CRUD operations

src/app/api/admin/r2/route.ts           — NEW: R2 metrics API
src/app/api/admin/settings/route.ts     — NEW: Settings CRUD API

src/app/admin/page.tsx        — MODIFY: Reorganized into collapsible sections with R2 KPIs
src/app/admin/settings/page.tsx  — MODIFY: Replace placeholder with real settings
src/app/admin/audit/page.tsx     — MODIFY: "Coming Soon" placeholder
src/app/admin/backup/page.tsx    — MODIFY: "Coming Soon" placeholder

src/components/ui/collapsible.tsx  — NEW: shadcn/ui Collapsible component

src/__tests__/cf-r2-api.test.ts          — NEW
src/__tests__/admin-r2-api.test.ts       — NEW
src/__tests__/admin-settings-api.test.ts — NEW
```

---

### Task 1: Cloudflare R2 API wrapper with MongoDB caching

**Files:**
- Create: `src/lib/cf-r2.ts`
- Create: `src/__tests__/cf-r2-api.test.ts`

- [ ] **Step 1: Write the failing test for R2 metrics functions**

Tests cover S3-based storage enumeration (with GraphQL fallback), GraphQL-based request metrics, cost estimation, and MongoDB caching.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/cf-r2-api.test.ts`
Expected: FAIL — module `@/lib/cf-r2` not found

- [ ] **Step 3: Implement `src/lib/cf-r2.ts`**

Key implementation details:
- **Storage (`getR2StorageMetrics`):** Uses S3 API (`ListBucketsCommand` + `ListObjectsV2Command`) to enumerate all buckets and sum object counts/sizes. Falls back to CF GraphQL `r2StorageAdaptiveGroups` if S3 `ListBuckets` is denied (account-level permission issue). Returns `R2BucketInfo[]` with `isPrimary` flag for the application bucket.
- **Requests (`getR2RequestMetrics`):** Uses CF GraphQL `r2OperationsAdaptiveGroups` with PascalCase action types (`PutObject`, `GetObject`, `DeleteObject`, etc.). Classifies operations into GET/PUT/DELETE buckets. Bandwidth (egress/ingress) not available via GraphQL — returns zeros.
- **Object listing (`getR2ObjectList`):** Uses S3 API (`ListObjectsV2Command`) for reliable pagination.
- **Cost estimation (`estimateR2Cost`):** Calculates monthly cost from storage, Class A, and Class B request metrics against R2 free tier (10GB storage, 10M requests each, 1GB egress).
- **Caching:** MongoDB `r2_metrics` collection with 5-min TTL (manual check, not TTL index). Cache bypassed by explicit refresh from dashboard.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/cf-r2-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cf-r2.ts src/__tests__/cf-r2-api.test.ts
git commit -m "feat: add Cloudflare R2 API wrapper using S3 API with GraphQL fallback"
```

---

### Task 2: R2 metrics API route

**Files:**
- Create: `src/app/api/admin/r2/route.ts`
- Create: `src/__tests__/admin-r2-api.test.ts`

- [ ] **Step 1: Write the failing test**

Tests cover auth guards (401/403), storage/request/cost/objects metrics, and invalid metric fallback.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-r2-api.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/app/api/admin/r2/route.ts`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-r2-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/r2/route.ts src/__tests__/admin-r2-api.test.ts
git commit -m "feat: add R2 metrics API route with storage, requests, cost, and objects endpoints"
```

---

### Task 3: Install Collapsible component and reorganize dashboard

**Files:**
- Create: `src/components/ui/collapsible.tsx` (via `npx shadcn@latest add collapsible`)
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Install the Collapsible component**

Run: `npx shadcn@latest add collapsible`

- [ ] **Step 2: Reorganize dashboard into Option B layout**

Replace the current dashboard layout with a collapsible section design:

1. **Summary KPIs** (always visible): Total Users, Total Notes, MongoDB Storage, R2 Cost — top-level overview cards
2. **Application Metrics** (collapsible, default open): Orphaned image cleanup, App KPIs (Active Today, New This Week, etc.), Notes/Active Users charts, Top Users table
3. **Infrastructure** (collapsible, default open): R2 error banner, MongoDB vs R2 storage side-by-side cards, R2 operations KPIs (Total Objects, Buckets, Egress, Ingress, GET/PUT Requests), cost estimate, largest files table
4. **Activity** (collapsible, default open): Storage growth line chart, recent activity feed

Key changes:
- Add `R2BucketInfo`, `R2StorageData`, `R2RequestData`, `R2CostData`, `R2ObjectData` types
- Add R2 state variables and fetch logic (`fetchR2Metrics`) with error handling
- Refresh button also refreshes R2 metrics (not just MongoDB stats)
- R2 error banner shows actual error message + setup instructions
- Bucket breakdown: primary bucket highlighted with violet label, other buckets listed separately
- Progress bars show free tier usage (10GB for R2, 512MB for MongoDB)

- [ ] **Step 3: Verify the app builds**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/collapsible.tsx src/app/admin/page.tsx
git commit -m "feat: reorganize admin dashboard into collapsible sections with R2 KPIs"
```

---

### Task 4: Settings lib

**Files:**
- Create: `src/lib/settings.ts`
- Create: `src/__tests__/admin-settings-api.test.ts`

- [ ] **Step 1: Write the failing test**

Tests cover auth guards, settings retrieval with env overrides, update validation, and rejection of invalid values.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-settings-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/settings.ts`**

Key-value settings stored in `app_settings` MongoDB collection. Editable keys: `app_name`, `note_visibility`, `max_upload_size_mb`, `session_timeout_hours`, `allow_signup`. Read-only from env: `storage_provider`, `r2_bucket_name`, `r2_account_id`. Includes validation for numeric ranges and boolean values.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-settings-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts src/__tests__/admin-settings-api.test.ts
git commit -m "feat: add settings CRUD lib with validation and env overrides"
```

---

### Task 5: Settings API routes

**Files:**
- Create: `src/app/api/admin/settings/route.ts`

- [ ] **Step 1: Implement the settings API route**

GET returns all settings merged with defaults and env overrides. PUT validates and updates editable settings. Admin-only, auth-guarded.

- [ ] **Step 2: Run tests to verify they pass (re-run existing tests)**

Run: `npx vitest run src/__tests__/admin-settings-api.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/settings/route.ts
git commit -m "feat: add settings API routes (GET/PUT)"
```

---

### Task 6: Settings page UI

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Replace the placeholder settings page**

Grouped into sections: General (app name, visibility), Security (session timeout, signup toggle), Uploads (max file size). Env-controlled settings shown as read-only with lock icon. Inline editing with save/cancel.

- [ ] **Step 2: Verify the app builds**

Run: `npx next build` or `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat: replace settings placeholder with functional settings page"
```

---

### Task 7: Replace Audit and Backup pages with "Coming Soon" placeholders

**Files:**
- Modify: `src/app/admin/audit/page.tsx`
- Modify: `src/app/admin/backup/page.tsx`
- Delete: `src/lib/audit.ts`, `src/lib/backup.ts` (if they exist)
- Delete: `src/app/api/admin/audit/route.ts`, `src/app/api/admin/backup/route.ts`, `src/app/api/admin/backup/[id]/route.ts` (if they exist)
- Delete: `src/__tests__/admin-audit-api.test.ts`, `src/__tests__/admin-backup-api.test.ts` (if they exist)

- [ ] **Step 1: Replace audit page with "Coming Soon" placeholder**

Match the pattern used by Calendar page: icon + heading + dashed-border card with "Coming soon" text.

- [ ] **Step 2: Replace backup page with "Coming Soon" placeholder**

Same pattern. `mongodump`/`mongorestore` won't work on Vercel, so full backup functionality deferred.

- [ ] **Step 3: Delete unused backup/audit code**

Remove `src/lib/audit.ts`, `src/lib/backup.ts`, all backup/audit API routes, and their tests. These were created during initial implementation but are not used since the pages are placeholders.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (445 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: replace audit/backup with coming-soon placeholders, remove unused code"
```

---

### Task 8: Full test suite and final verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (445 tests)

- [ ] **Step 2: Run type checking**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linting**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 4: Verify the build succeeds**

Run: `npx next build`
Expected: Build completes successfully
