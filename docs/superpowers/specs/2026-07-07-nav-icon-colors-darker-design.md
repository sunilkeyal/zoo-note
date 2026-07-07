# Nav Icon Colors — Darker Shades Design

**Date:** 2026-07-07
**Status:** Approved

---

## Overview

Darken all sidebar nav icon colors by shifting Tailwind shade weights on a per-color basis, since some colors are inherently lighter than others at the same weight.

---

## Color Mapping

### Group 1: Rich colors → bump +1 (`-600` light / `-500` dark)
These colors already have good perceived weight at `-500`:

`indigo`, `violet`, `purple`, `blue`, `red`, `rose`, `orange`, `emerald`, `teal`, `pink`

### Group 2: Light colors → bump +2 (`-700` light / `-600` dark)
These colors still look washed out at `-600`:

`sky`, `cyan`, `amber`, `yellow`, `lime`, `stone`, `slate`

This balances perceived darkness — `sky-700` ≈ `blue-500`, `amber-700` ≈ `orange-500`, etc.

---

## Affected Color Locations

| Location | File | Lines |
|----------|------|-------|
| Primary nav icons | `src/components/NotesSidebar.tsx` | 880–903, 972 |
| Admin nav `iconColor` field | `src/components/NotesSidebar.tsx` | 339–346 |
| Folder icon color map | `src/components/NotesSidebar.tsx` | 212–281 |
| Page header icons | `src/app/favorites/page.tsx`, `src/app/recent/page.tsx`, `src/app/calendar/page.tsx`, `src/app/trash/page.tsx` | Various |
| Admin page header icons | `src/app/admin/page.tsx`, `src/app/admin/analytics/page.tsx`, `src/app/admin/backup/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/audit/page.tsx`, `src/app/admin/settings/page.tsx` | Various |

---

## Testing

- Verify each nav icon renders at its new darker shade in light mode
- Toggle dark mode and verify dark variants render correctly
- Verify active/hover state highlighting still works
- Run `npx vitest run`
