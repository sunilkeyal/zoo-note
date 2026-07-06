# Sidebar Density Settings — Design Spec

**Date:** 2026-07-06
**Status:** Approved

---

## Overview

Add three density modes for the left sidebar — Default (current), Compact, and Dense — with a toggle in a new Settings panel accessible from the user dropdown menu.

---

## Density Modes

Three states that adjust spacing and font size of all sidebar items (nav links, folder headers, note sub-items, footer):

| Property | Default | Compact | Dense |
|---|---|---|---|
| Nav item height | 32px (h-8) | 28px | 24px |
| Nav item padding | px-3 py-1.5 | px-2.5 py-1 | px-2 py-0.5 |
| Nav item font | text-sm (14px) | 13px | text-xs (12px) |
| Sub-item height | 28px (h-7) | 24px | 20px |
| Sub-item padding | px-2 | px-2 py-0.5 | px-1.5 py-0.5 |
| Sub-item font | text-sm (14px) | 13px | text-xs (12px) |
| Icon size | 16px (size-4) | 14px | 12px |
| Default gap | gap-2 (8px) | gap-1.5 (6px) | gap-1 (4px) |
| Group padding | p-2 | p-1.5 | p-1 |
| Header/footer padding | p-2 | p-1.5 | p-1 |

Icons and chevrons scale proportionally. Badge font size adjusts with the mode.

---

## Toggle Location — Settings Panel

**Current state:** The Settings dropdown item in the user menu (sidebar footer) is `disabled`.

**New behavior:**

1. Enable the `Settings` menu item
2. Clicking it opens a `SettingsSheet` component — a slide-out panel (same pattern as `AccountSheet`)
3. The sheet has an **Appearance** section with a **Sidebar Density** selector
4. Three selectable buttons: **Default** | **Compact** | **Dense** — the active one is highlighted
5. Preference persisted to `localStorage` key `sidebar_density`

---

## State & Persistence

- On load: read `localStorage.getItem('sidebar_density')`, fall back to `"default"`
- Stored in React state, passed down via context or prop to `NotesSidebar`
- The Settings panel reads/writes the same localStorage key
- No server-side persistence — purely a client preference
- Changing the density re-renders the sidebar with different Tailwind classes

---

## Affected Files

| File | Changes |
|---|---|
| `src/components/NotesSidebar.tsx` | Enable Settings menu item, read density from context/localStorage, conditionally apply compact/dense classes |
| `src/components/SettingsSheet.tsx` | New — slide-out panel with Appearance section and density toggle |
| `src/components/ui/sidebar.tsx` | Optionally add density CSS classes/utilities if needed |
| `src/contexts/NoteContext.tsx` | Optionally store and expose density state |

---

## Implementation Notes

- Use the same sheet pattern as `AccountSheet` — a fixed overlay panel with a close button
- The density change takes effect immediately without page reload
- Tailwind arbitrary values (e.g. `h-[28px]`, `text-[13px]`) can be used for intermediate sizes not covered by Tailwind's default scale
- No new external dependencies

---

## Testing

- Manually verify all 3 densities render correctly in the browser
- Verify the Settings panel opens/closes correctly
- Verify preference persists across page refresh
- Verify preference is isolated per browser (no server sync needed)
- Run `npx vitest run` — existing tests should continue to pass
