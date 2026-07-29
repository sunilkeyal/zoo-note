# Sidebar Width Persistence Design

## Problem

1. Moving the browser window to a different monitor changes the sidebar's physical width because `react-resizable-panels` uses percentage-based sizing.
2. The sidebar width is not persisted across sessions (logout/login).

## Solution

Persist the sidebar pixel width as a user preference in MongoDB (synced to localStorage for fast local access), and use a controlled `size` prop on the sidebar panel that recalculates the percentage dynamically based on the current container width.

## Changes

### 1. API — `/api/user/preferences`

- Add `sidebarWidth` to `VALID_PREF_KEYS`
- Validate it's a number between 200–600 on write
- Return it in GET response
- Write it in PUT handler

### 2. New hook — `src/hooks/use-sidebar-width.ts`

Pattern matches `use-sidebar-density.ts`:
- Load pixel width from localStorage on mount (fallback: 260px)
- Fetch from MongoDB API to sync across sessions
- Save to both localStorage + API on change
- Debounce API saves (300ms) to avoid flooding on drag

### 3. `src/components/AppLayout.tsx`

- Use `useSidebarWidth` hook instead of bare localStorage
- Add `ResizeObserver` on the `ResizablePanelGroup` container to track pixel width
- Use controlled `size` prop on the sidebar `ResizablePanel`: `size = (savedWidthPx / containerWidth) * 100`
- Change `maxSize` from `"25%"` to `{500}` (pixels)
- On user drag via `onResize`, save the new pixel width

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/user/preferences/route.ts` | Add `sidebarWidth` key, validation, read/write |
| `src/hooks/use-sidebar-width.ts` | New hook (localStorage + API sync) |
| `src/components/AppLayout.tsx` | Use hook, ResizeObserver, controlled `size`, `onResize` |

## Behavior

- Resizing the sidebar → pixel width saved to localStorage + MongoDB
- Moving window to different monitor → sidebar maintains same pixel width
- Logout/login → sidebar width restored from MongoDB (via API sync)
- Different device → sidebar width restored per-device default, then synced from MongoDB
