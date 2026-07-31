# Layout Alignment — Favorites, Recent, and Admin Import Jobs

**Date:** 2026-07-31

## Overview

Fix three layout inconsistencies that make the Favorites, Recent, and admin Import Jobs screens misalign with the rest of the app:

1. **Favorites / Recent pages** have no horizontal padding, no max-width container, and no scroll container. Content touches the sidebar edge and clips at the bottom of the window instead of scrolling.
2. **Admin Import Jobs page header** does not match the Dashboard and User Management page header pattern (no avatar circle, no subtitle).

## Root Cause

The AppLayout `<main>` element is `flex-1 flex flex-col overflow-hidden w-full` with no padding. Each page provides its own scroll + padding + max-width shell:

- The Home page (`HomePage.tsx`) wraps content in `flex-1 overflow-auto` + `px-4 sm:px-6 md:px-8 lg:px-10 pt-2 pb-4 sm:pt-3 sm:pb-6 w-full md:max-w-[900px] lg:max-w-[1140px]`.
- Favorites (`src/app/favorites/page.tsx`) and Recent (`src/app/recent/page.tsx`) return a bare `<div>` — no padding, no max-width, no scroll container. Because the parent `<main>` is `overflow-hidden`, content taller than the viewport is clipped with no way to scroll.

The admin routes are unaffected by this because `src/app/admin/layout.tsx` already wraps `<main>` in `overflow-auto px-4 ... py-6 ... md:max-w-[900px] lg:max-w-[1140px]`. The admin Import Jobs page only has a header misalignment.

## Design

### 1. New shared component: `PageContainer` (`src/components/PageContainer.tsx`)

Extracts the Home page's layout shell into one reusable component:

```tsx
"use client"

import { cn } from "@/lib/utils"

export default function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div
        className={cn(
          "px-4 sm:px-6 md:px-8 lg:px-10 pt-2 pb-4 sm:pt-3 sm:pb-6 w-full md:max-w-[900px] lg:max-w-[1140px]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
```

- Outer div provides the scroll container (`flex-1 overflow-auto`).
- Inner div provides responsive horizontal padding, top/bottom padding, and the max-width used by the Home page.
- No `space-y` — pages keep their own vertical spacing so each page's rhythm is preserved.
- Accepts an optional `className` merged with `cn` for page-specific additions.

### 2. Apply the component

| File | Change |
|---|---|
| `src/app/favorites/page.tsx` | Swap the root `<div>` for `<PageContainer>`. Header, hero card, grid, and dialogs stay inside unchanged. Loading/error early-return states are untouched. |
| `src/app/recent/page.tsx` | Same swap. |
| `src/components/HomePage.tsx` | Replace outer `<div className="flex-1 overflow-auto bg-background">` with `<PageContainer>`. Inner div keeps `space-y-6` but drops the now-duplicated padding and max-width classes (`px-4 ... lg:px-10`, `pt-2 pb-4 sm:pt-3 sm:pb-6`, `w-full md:max-w-[900px] lg:max-w-[1140px]`). |

No other pages change. The trash page shares the same bug but is intentionally out of scope.

### 3. Align admin Import Jobs header (`src/app/admin/imports/page.tsx`)

Replace the current header (`<Upload>` icon + title, no avatar, no subtitle, `gap-2`) with the Dashboard / User Management pattern:

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div className="flex items-center gap-3">
    <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
      <Upload className="size-5 text-purple-600 dark:text-purple-500" />
    </div>
    <div>
      <h1 className="text-2xl font-bold">Import Jobs</h1>
      <p className="text-xs text-muted-foreground">Monitor notebook imports and clean up failed jobs</p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">{total} total</span>
    <Select /* existing status filter, unchanged */ />
  </div>
</div>
```

- Left side matches the Dashboard (`admin/page.tsx:304-312`) and User Management (`admin/users/page.tsx:114-128`) headers: avatar circle + title + subtitle.
- Right side keeps the existing "N total" text and status filter select.
- No `mb-6` is added — the page root's existing `space-y-6` already provides the 24px gap between header and table, so spacing stays identical.

## Error Handling

No new error paths. The favorites and recent pages' existing loading/error states (early returns) are unaffected by the wrapper change.

## Testing

- New test: `src/__tests__/page-container.test.tsx` — renders children and applies the container classes (`overflow-auto`, responsive padding, max-width).
- Existing `src/__tests__/recent-page.test.tsx` must keep passing (text/role queries are wrapper-agnostic).
- Run `npm run lint` and `npm test` after the change.

## Out of Scope

- Trash page padding/scroll (same underlying bug, not requested).
- Import/Export drawer styling (hard-coded gray colors vs. theme tokens) — not requested.
- Mobile layouts (favorites/recent on mobile render through `NoteCardGrid` in `AppLayout`, not these pages).
