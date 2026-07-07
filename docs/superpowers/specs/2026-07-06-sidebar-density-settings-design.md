# Sidebar Density Settings — Design Spec

**Date:** 2026-07-06
**Status:** Approved (Updated 2026-07-07)

---

## Overview

Add three density modes for the left sidebar — Spacious, Default (medium), and Compact — with a toggle in a Settings panel accessible from the user dropdown menu. Preference is persisted to both localStorage (fast cache) and MongoDB (server-side truth). Theme (dark/light) is also persisted to the same DB preferences subdocument.

---

## Density Modes

Three states that adjust spacing and font size of all sidebar items (nav links, folder headers, note sub-items, footer):

| Property | Spacious | Default (medium) | Compact |
|---|---|---|---|
| Nav item height | 32px (h-8) | 28px | 24px |
| Nav item padding | px-3 py-1.5 | px-[10px] py-[3px] | px-[8px] py-[2px] |
| Nav item font | text-sm (14px) | text-[13px] | text-[12px] |
| Sub-item height | 28px (h-7) | 24px | 20px |
| Sub-item padding | px-2 | px-[8px] py-[2px] | px-[6px] py-[1px] |
| Sub-item font | text-sm (14px) | text-[13px] | text-[12px] |
| Icon size | 16px (size-4) | 14px | 12px |
| Default gap | gap-2 (8px) | gap-[6px] | gap-[4px] |
| Group padding | p-2 | p-1.5 | p-1 |
| Header/footer padding | p-2 | p-1.5 | p-1 |

Icons and chevrons scale proportionally. Badge font size adjusts with the mode.

Density classes are applied via helper functions `navItemClass(density)` and `subItemClass(density)` in `NotesSidebar.tsx`, with `transition-all duration-100` for smooth animation.

---

## Toggle Location — Settings Panel

**Current state:** The Settings dropdown item in the user menu (sidebar footer) is `disabled`.

**New behavior:**

1. Enable the `Settings` menu item
2. Clicking it opens a `SettingsSheet` component — a slide-out panel (same pattern as `AccountSheet`)
3. The sheet has an **Appearance** section with a **Sidebar Density** selector
4. Three selectable buttons: **Spacious** | **Default** | **Compact** — the active one is highlighted
5. Preference persisted to both `localStorage` key `sidebar_density` and MongoDB `users.preferences.sidebarDensity`
6. Theme (dark/light) is also persisted to `users.preferences.theme` via the same API

---

## State & Persistence

- **Priority**: API (server-side truth) > localStorage > `"default"` (medium fallback)
- On load: `SidebarDensityContext` reads localStorage synchronously for instant first render, then fetches from API to reconcile
- A `userChanged` ref prevents the initial API fetch from overriding user's explicit choice during race conditions
- Stored in React context (`SidebarDensityContext`), provided at the root level inside `Providers.tsx` so it survives page navigation
- The Settings panel reads/writes the same context state
- **Server-side persistence** via `GET/PUT /api/user/preferences` — requires auth (401 if not logged in)
- Legacy density values (old `default`→`spacious`, old `compact`→`default`, old `dense`→`compact`) are auto-migrated on read via `OLD_TO_NEW` map
- Theme persistence: `ThemeSyncProvider` fetches saved theme from API on mount; `useThemeSync` wraps `setTheme` to auto-save changes to the API

---

## Affected Files

| File | Changes |
|---|---|
| `src/components/NotesSidebar.tsx` | Enable Settings menu item, read density from context, conditionally apply spacious/default/compact classes |
| `src/components/SettingsSheet.tsx` | New — slide-out panel with Appearance section and 3-button density toggle (Spacious/Default/Compact) |
| `src/contexts/SidebarDensityContext.tsx` | New — context provider with lazy init, API sync, userChanged guard, legacy migration |
| `src/contexts/ThemeSyncContext.tsx` | New — `ThemeSyncProvider` (API fetch + apply) + `useThemeSync` hook (wraps setTheme to save to API) |
| `src/app/api/user/preferences/route.ts` | New — GET/PUT endpoints for sidebarDensity + theme, with legacy density mapping |
| `src/app/providers.tsx` | Wraps `<SidebarDensityProvider>` + `<ThemeSyncProvider>` inside `<ThemeProvider>` |
| `src/hooks/use-sidebar-density.ts` | New — re-exports `useSidebarDensity` and `SidebarDensity` from context |
| `src/components/AppHeader.tsx` | Uses `useThemeSync` instead of `useTheme` from `next-themes` to auto-save theme toggles |

---

## Implementation Notes

- Use the same sheet pattern as `AccountSheet` — a fixed overlay panel with a close button
- The density change takes effect immediately without page reload
- Tailwind v4 `!` suffix syntax (`h-[28px]!`) is the project convention for forcing specificity
- Tailwind arbitrary values (e.g. `h-[28px]`, `text-[13px]`) used for intermediate sizes not covered by Tailwind's default scale
- API calls are fire-and-forget; localStorage is fast cache for instant first render
- Login flow: next-auth `signIn("credentials")` triggers full page redirect, `SidebarDensityProvider` remounts and fetches fresh server-side preferences
- CSS transitions alongside density classes smooth SSR→client size change on hard refresh
- No new external dependencies

---

## Testing

- Manually verify all 3 densities render correctly in the browser
- Verify the Settings panel opens/closes correctly
- Verify preference persists across page refresh
- Verify preference persists across login/logout sessions
- Verify preference syncs to other browsers via database
- Verify legacy values (old `default`, `compact`, `dense`) are migrated correctly
- Run `npx vitest run` — existing tests should continue to pass
