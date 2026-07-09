# Trash Table Pagination & Sorting + User Management Column Sorting — Design Spec

**Date:** 2026-07-08
**Branch:** `feat/trash-table-pagination-sorting`
**Status:** Approved

---

## Overview

Add pagination and column sorting to the Trash table, and column sorting to the User Management table. Trash uses client-side pagination/sorting (all items already loaded in memory). Users uses server-side sorting (API params) to remain consistent with existing server-side pagination.

---

## Section 1: Trash Table — Pagination & Client-side Sorting

### Component: `src/components/TrashTable.tsx`

**New internal state:**
```ts
page: number          // default 1
limit: number         // default 20
sortField: string     // default "deletedAt"
sortDir: "asc" | "desc" // default "desc"
```

**Pagination controls** (rendered below the table, matching UsersTable pattern):
- Left side: "Rows per page" label + `<Select>` with options `10`, `20`, `50`, `100`
- Right side: `"Page {page} of {totalPages} ({total} total)"` + Previous / Next buttons
- Previous disabled when `page <= 1`, Next disabled when `page >= totalPages`

**Sortable column headers:**
- **Name** — sorts by `item.title` alphabetically
- **Type** — sorts by `item.type` alphabetically ("folder" / "note")
- **Deleted At** — sorts by `item.deletedAt` chronologically
- Click toggles asc → desc → asc (first click on a new column = asc)
- Active column shows a direction arrow (↑ for asc, ↓ for desc)
- Non-active columns show no arrow
- Changing sort resets `page` to 1

**Client-side sort + paginate flow:**
```
items (from props)
  → sort by (sortField, sortDir)
  → slice by ((page - 1) * limit, page * limit)
  → render
```

**Edge cases:**
- If `items` changes (re-fetch) and `page` exceeds new total pages, clamp `page` to `Math.max(1, totalPages)`
- Empty state ("Nothing here") shown when `items.length === 0` regardless of pagination
- Bulk action bar (selected count + restore/delete buttons) operates on the full dataset, not just the current page — match existing behavior

### Component: `src/app/trash/page.tsx`

- No changes needed — items are already passed as a flat array to `TrashTable`

---

## Section 2: User Management — Server-side Column Sorting

### API: `src/app/api/admin/users/route.ts`

**Accept new query params in `GET`:**
```
sortField: string   // one of: "displayName", "email", "role", "isActive", "createdAt"
sortDir: string     // "asc" or "desc" (default "desc")
```

**Changes:**
- Replace `sort({ createdAt: -1 })` with dynamic sort based on `sortField` / `sortDir`
- Validation: if `sortField` is provided but not in allowed list, fall back to `createdAt`
- If `sortDir` is not `"asc"` or `"desc"`, default to `"desc"`

### Component: `src/app/admin/users/users-table.tsx`

**New props:**
```ts
sortField: string
sortDir: "asc" | "desc"
onSortChange: (field: string) => void
```

**Changes:**
- Make column headers clickable for: Name, Email, Role, Status, Created
- Actions column remains non-clickable
- Active column shows direction arrow
- Clicking a column header calls `onSortChange(columnField)`
- Keep existing pagination controls (rows-per-page, prev/next) unchanged

### Component: `src/app/admin/users/page.tsx`

**New state:**
```ts
sortField: string        // default "createdAt"
sortDir: "asc" | "desc"  // default "desc"
```

**Changes:**
- Pass `sortField` and `sortDir` as query params to `/api/admin/users` fetch
- Wire `onSortChange` handler:
  - If same field clicked, toggle `sortDir`
  - If different field clicked, set new `sortField` and `sortDir` to `"asc"`
  - Reset `page` to 1 on sort change

---

## Architecture Diagram

```
TrashPage
  └── TrashTable (items array in)
       ├── Client-side sort (title, type, deletedAt)
       └── Client-side pagination (10/20/50/100)

UsersPage
  ├── State: sortField, sortDir, page, limit, filters
  ├── Fetch: /api/admin/users?sortField=x&sortDir=y&page=z&limit=...
  ├── UsersTable (props: users, sortField, sortDir, onSortChange, pagination props)
  │    └── Sortable headers → onSortChange → re-fetch
  └── API: src/app/api/admin/users/route.ts
       └── .sort({ [sortField]: sortDir === "asc" ? 1 : -1 })
```

---

## Files Touched

| File | Change |
|------|--------|
| `src/components/TrashTable.tsx` | Add pagination state, sort state, sortable headers, pagination controls |
| `src/app/api/admin/users/route.ts` | Accept `sortField`/`sortDir`, dynamic MongoDB sort |
| `src/app/admin/users/users-table.tsx` | Accept sort props, make headers clickable with indicator |
| `src/app/admin/users/page.tsx` | Add sort state, pass to API + table |
| `src/__tests__/trash-table.test.tsx` | Update tests for pagination + sorting behavior |
| `src/__tests__/admin-users-api.test.ts` | Update tests for sort params |

No new components. No schema changes. No new context methods.
