# Colorful Nav Icons — Design Spec

**Date:** 2026-07-07
**Status:** Approved

---

## Overview

Add solid Tailwind color classes to the left sidebar navigation icons so each nav item has its own distinct color. Colors show always (not just on hover/active) with dark mode variants.

---

## Color Palette

| Nav Item | Route | Icon | Light Color | Dark Color |
|----------|-------|------|-------------|------------|
| Home | `/` | `House` | `text-indigo-500` | `dark:text-indigo-400` |
| Favorites | `/favorites` | `Star` | `text-amber-500` | `dark:text-amber-400` |
| Recent | `/recent` | `Clock` | `text-emerald-500` | `dark:text-emerald-400` |
| Calendar | `/calendar` | `CalendarDays` | `text-sky-500` | `dark:text-sky-400` |
| Trash | `/trash` | `Trash2` | `text-rose-500` | `dark:text-rose-400` |

Admin section (admin users only):

| Nav Item | Route | Icon | Light Color | Dark Color |
|----------|-------|------|-------------|------------|
| Dashboard | `/admin` | `LayoutDashboard` | `text-violet-500` | `dark:text-violet-400` |
| Analytics | `/admin/analytics` | `BarChart3` | `text-cyan-500` | `dark:text-cyan-400` |
| Backup & Restore | `/admin/backup` | `Database` | `text-teal-500` | `dark:text-teal-400` |
| User Management | `/admin/users` | `Users` | `text-blue-500` | `dark:text-blue-400` |
| Audit Logs | `/admin/audit` | `ScrollText` | `text-orange-500` | `dark:text-orange-400` |
| System Settings | `/admin/settings` | `Settings` | `text-slate-500` | `dark:text-slate-400` |

---

## Behavior

- Icon colors are visible **always**, not only on hover or active state
- When a nav item is **active** (selected), the active background/highlight from the sidebar component still applies — the icon color persists on top of it
- Favorites: icon color is always amber (unconditional). The existing conditional logic (`favoriteNotes.length > 0`) currently controls both the icon color and the count badge — the icon color becomes unconditional, the badge still shows conditionally.
- Folder icons (dynamically mapped) and note items keep their current styling — no color changes

---

## Implementation

### Changes per nav item

Each icon in the primary nav section gets a `className` prop with its light and dark Tailwind color:

- `<House />` → `<House className="text-indigo-500 dark:text-indigo-400" />`
- `<Star />` → `<Star className="text-amber-500 dark:text-amber-400" />`
- `<Clock />` → `<Clock className="text-emerald-500 dark:text-emerald-400" />`
- `<CalendarDays />` → `<CalendarDays className="text-sky-500 dark:text-sky-400" />`
- `<Trash2 />` → `<Trash2 className="text-rose-500 dark:text-rose-400" />`

### Admin section

The admin items are rendered via a `map` over `adminItems` array. The `adminItems` definition needs an additional `iconColor` field:

```ts
const adminItems = [
  { route: "/admin",           label: "Dashboard",        icon: LayoutDashboard, iconColor: "text-violet-500 dark:text-violet-400" },
  { route: "/admin/analytics", label: "Analytics",        icon: BarChart3,       iconColor: "text-cyan-500 dark:text-cyan-400" },
  // ...
]
```

Then the icon render changes from `<item.icon />` to `<item.icon className={item.iconColor} />`.

---

## Affected Files

| File | Changes |
|------|---------|
| `src/components/NotesSidebar.tsx` | Add `className` with Tailwind color classes to each primary nav icon; add `iconColor` field to `adminItems` array |

No new files, no new dependencies, no CSS changes needed — all colors are existing Tailwind utility classes.

---

## Testing

- Manually verify each nav icon displays its assigned color in light mode
- Toggle dark mode and verify dark variants render correctly
- Verify active state highlighting still works (icon color persists underneath)
- Verify Favorites icon color appears correctly with and without favorite notes
- Verify admin section icons use admin color palette
- Run existing tests via `npx vitest run`
