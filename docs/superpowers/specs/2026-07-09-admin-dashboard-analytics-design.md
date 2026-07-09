# Admin Dashboard Analytics Design

**Date:** 2026-07-09  
**Branch:** `feat/admin-dashboard-analytics`  
**Status:** Approved

---

## Overview

Replace the placeholder admin dashboard with a fully data-driven, single-scroll analytics page. All content currently split between the Dashboard and Analytics nav items is consolidated into one page. The Analytics nav item is removed from the sidebar and the `/admin/analytics` page is deleted.

---

## Goals

- Surface actionable system metrics at a glance without navigating away
- Provide time-series charts with a 7d / 30d / 90d range toggle
- Show per-user activity breakdown in a sortable table below the fold
- Keep the left sidebar clean — one dashboard entry, no separate analytics link

---

## Layout (Option A — Single Scroll)

All sections flow vertically in one page, no internal tabs:

```
┌─ Page Header ──────────────────────────────────────────┐
│  Dashboard title  │  [7d] [30d] [90d]  │  [↻ Refresh]  │
└────────────────────────────────────────────────────────┘

┌─ KPI Cards (6, responsive grid 2→3→6 cols) ───────────┐
│  Total Users  │  Active Today  │  New This Week        │
│  Total Notes  │  Storage Used  │  Trash Items          │
└────────────────────────────────────────────────────────┘

┌─ Charts (responsive grid) ────────────────────────────┐
│  Bar: Notes Created/Day  │  Bar: Active Users/Day      │
│  Line: Note Trend (full width, N-day window)           │
└────────────────────────────────────────────────────────┘

┌─ Recent Activity Feed ─────────────────────────────────┐
│  Last 10 actions: user · action · target · timestamp   │
└────────────────────────────────────────────────────────┘

┌─ Top Users Table ──────────────────────────────────────┐
│  User │ Notes │ Folders │ Storage │ Last Seen │ Status  │
│  Top 10 · "View all →" links to User Management        │
└────────────────────────────────────────────────────────┘
```

---

## Components

All UI is built with existing shadcn/ui components plus the Chart component (to be installed):

| Component | Usage |
|---|---|
| `Card` | KPI cards and chart containers |
| `Chart` (new, install) | Bar and line charts via Recharts |
| `ToggleGroup` / `ToggleGroupItem` | 7d / 30d / 90d time range selector |
| `Table` | User breakdown section |
| `Badge` | Active / Inactive status in user table |
| `Button` | Refresh button, "View all →" link |
| `Skeleton` | Loading placeholders during data fetch |

---

## API

### Endpoint

```
GET /api/admin/stats?range=7|30|90
```

- Admin-only (returns 401 if unauthenticated, 403 if non-admin)
- Default range: 7 days
- All MongoDB queries run in parallel via `Promise.all`
- Per-bucket null fallback: if one query fails, that bucket returns `null`; the rest of the response is unaffected

### Response Shape

```ts
{
  kpis: {
    totalUsers: number;
    activeToday: number;
    newThisWeek: number;
    totalNotes: number;
    storageUsedBytes: number;
    trashItemCount: number;
  } | null;

  charts: {
    notesPerDay: { date: string; count: number }[];       // last N days
    activeUsersPerDay: { date: string; count: number }[]; // last N days
    storageTrend: { date: string; bytes: number }[];      // last N days
  } | null;

  users: {
    id: string;
    displayName: string;
    email: string;
    noteCount: number;
    folderCount: number;
    storageBytes: number;
    lastSeenAt: string | null;
    isActive: boolean;
  }[] | null;

  activity: {
    userId: string;
    userName: string;
    action: "created note" | "created folder";  // derived from notes/folders collections
    target: string;   // note title or folder name
    createdAt: string;
  }[] | null;  // note: no audit log collection exists; this is derived from notes+folders
}
```

### MongoDB Queries (parallel)

| Query | Collection(s) | Method |
|---|---|---|
| User KPIs (total, new in last 7d) | `users` | `countDocuments` |
| Active today (distinct users with note activity) | `notes` | `aggregate` distinct `userId` where `updatedAt >= today` |
| Note / folder KPIs | `notes`, `folders` | `countDocuments` |
| Trash count | `notes`, `folders` | `countDocuments` with `isDeleted: true` |
| Storage total | `fs.files` (GridFS) | `aggregate` sum of `length` |
| Notes per day | `notes` | `aggregate` group by `createdAt` date |
| Active users per day | `notes` | `aggregate` distinct `userId` grouped by `updatedAt` date (proxy for user activity; no `lastLoginAt` field exists) |
| Storage trend | `fs.files` | `aggregate` cumulative sum by upload date |
| Top users | `users` + `notes` + `folders` | `aggregate` with `$lookup` |
| Activity feed | `notes`, `folders` | Last 10 creates (`isDeleted: false`) ordered by `createdAt` desc, joined with user displayName via `$lookup` on `users` |

---

## Data Fetching (Client)

- Fetch on component mount
- Re-fetch on every navigation to the dashboard page (route-level focus via `useEffect` with pathname dependency)
- Re-fetch when the time-range toggle changes
- Manual re-fetch via the Refresh button in the page header
- Single loading state: `isLoading` boolean — KPI cards show `Skeleton`, charts show a spinner overlay

---

## Error Handling

- API-level failure: show inline error banner at top of page with "Try again" button (triggers same fetch)
- Per-bucket null: each section handles its own null gracefully
  - KPI cards: show `—` for unavailable values
  - Charts: show "No data available" inside the chart container
  - User table: show "No data available" row
  - Activity feed: show "No recent activity"
- Empty state (new app, no data): charts render with zero-value bars, user table shows "No users yet"

---

## Sidebar Changes

Remove the `analytics` entry from `adminItems` in `NotesSidebar.tsx`:

```ts
// Before
{ route: "/admin/analytics", label: "Analytics", icon: BarChart3, ... }

// After — this line is deleted
```

Delete the file `src/app/admin/analytics/page.tsx` and its directory.

---

## Testing

- Unit tests for `GET /api/admin/stats`:
  - Returns 401 when unauthenticated
  - Returns 403 when authenticated as non-admin
  - Returns correct response shape for `range=7`
  - Returns correct response shape for `range=30`
  - Returns correct response shape for `range=90`
  - Invalid range param falls back to 7-day default
- No UI component tests (display-only consumer; correctness is covered by API tests)
- Existing admin user API tests remain unchanged

---

## Files Changed

| File | Change |
|---|---|
| `src/app/admin/page.tsx` | Rewrite — full analytics dashboard |
| `src/app/admin/analytics/page.tsx` | **Delete** |
| `src/app/api/admin/stats/route.ts` | **New** — stats API endpoint |
| `src/components/NotesSidebar.tsx` | Remove Analytics nav item |
| `src/components/ui/chart.tsx` | **New** — install shadcn chart component |
| `src/app/dashboard_visual/page.tsx` | **Delete** — brainstorming artefact |
| `src/__tests__/admin-stats-api.test.ts` | **New** — API route tests |

---

## Out of Scope

- Real-time / auto-polling (not requested)
- Filtering or sorting the user breakdown table on the dashboard (full management is in User Management)
- Storage quota enforcement
- Exporting dashboard data
