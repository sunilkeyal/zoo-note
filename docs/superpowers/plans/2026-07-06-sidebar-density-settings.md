# Sidebar Density Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-mode density toggle (Spacious/Default/Compact) in a new Settings panel that adjusts sidebar item spacing and font size, persisted to both localStorage and MongoDB.

**Architecture:** Density state lives in `SidebarDensityContext` at the root level (survives navigation). A `SettingsSheet` slide-out panel opens from the enabled Settings dropdown item. Preferences sync to `GET/PUT /api/user/preferences` for server-side persistence. Theme (dark/light) is also persisted via `ThemeSyncContext`.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, MongoDB, next-themes, next-auth

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/contexts/SidebarDensityContext.tsx` | Create | Context provider: lazy init, API sync, userChanged guard, legacy migration |
| `src/contexts/ThemeSyncContext.tsx` | Create | Context provider: initial API fetch + apply, useThemeSync hook auto-saves to API |
| `src/app/api/user/preferences/route.ts` | Create | GET/PUT endpoints for sidebarDensity + theme with legacy density migration |
| `src/components/SettingsSheet.tsx` | Create | Slide-out panel with Appearance section and 3-button density toggle |
| `src/hooks/use-sidebar-density.ts` | Create | Re-exports `useSidebarDensity` and `SidebarDensity` from context |
| `src/components/NotesSidebar.tsx` | Modify | Enable Settings menu item, import/use density context, apply conditional classes |
| `src/app/providers.tsx` | Modify | Wrap `SidebarDensityProvider` + `ThemeSyncProvider` inside `ThemeProvider` |
| `src/components/AppHeader.tsx` | Modify | Use `useThemeSync` instead of `useTheme` to auto-save theme toggles |

---

### Task 1: Create the preferences API route

**Files:**
- Create: `src/app/api/user/preferences/route.ts`

- [ ] **Step 1: Create GET and PUT endpoints**

GET reads `users.preferences.sidebarDensity` and `users.preferences.theme` from MongoDB. PUT updates them. Both require auth (401 if not logged in).

GET applies `LEGACY_DENSITY_MAP` for migration of old values (`dense` → `compact`). New densities (`spacious`, `default`, `compact`) pass through as-is.

PUT saves values directly to `preferences.sidebarDensity` and `preferences.theme` subdocument fields via `$set`.

---

### Task 2: Create SidebarDensityContext

**Files:**
- Create: `src/contexts/SidebarDensityContext.tsx`

- [ ] **Step 1: Create the context provider**

The provider:
- Initializes state via `getInitialDensity()` which reads localStorage (with legacy migration)
- Fetches server-side preference from API on mount via `fetchPreferences()`
- Uses a `userChanged` ref to prevent the initial API fetch from overriding explicit user choices
- Exposes `setDensity` which updates state, localStorage, and fires `savePreference(value)` (fire-and-forget API PUT)
- Has a useEffect that re-reads localStorage on density change (for cross-tab sync)

Legacy migration: `OLD_TO_NEW` maps old `dense` → `compact`. New values `spacious`/`default`/`compact` are recognized by `NEW_DENSITIES` Set and returned as-is.

---

### Task 3: Create ThemeSyncContext

**Files:**
- Create: `src/contexts/ThemeSyncContext.tsx`

- [ ] **Step 1: Create ThemeSyncProvider and useThemeSync hook**

`ThemeSyncProvider` fetches saved theme from `GET /api/user/preferences` on mount and applies it via `setTheme` from `next-themes`.

`useThemeSync()` returns `{ theme, setTheme, resolvedTheme }` — the `setTheme` wrapper calls the original `setTheme` then fires `PUT /api/user/preferences` with `{ theme }` to persist the change.

---

### Task 4: Wire providers in Providers.tsx

**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Add SidebarDensityProvider and ThemeSyncProvider**

Wrap children with `<SidebarDensityProvider>` and `<ThemeSyncProvider>` inside `<ThemeProvider>`.

---

### Task 5: Create the density hook re-export

**Files:**
- Create: `src/hooks/use-sidebar-density.ts`

- [ ] **Step 1: Re-export from context**

```typescript
export { useSidebarDensity, type SidebarDensity } from "@/contexts/SidebarDensityContext"
```

---

### Task 6: Create the SettingsSheet component

**Files:**
- Create: `src/components/SettingsSheet.tsx`

- [ ] **Step 1: Create SettingsSheet.tsx**

Follow the same sheet pattern as `AccountSheet.tsx` — fixed overlay panel with backdrop, close button, Escape key handling.

Three buttons: **Spacious** | **Default** | **Compact** with descriptions ("Most spacious", "Medium density", "Most compact").

---

### Task 7: Enable Settings menu item and wire up the sheet

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Add imports, state, and hook calls**

Import `SettingsSheet`, `useSidebarDensity`, `SidebarDensity`. Add `settingsOpen` state and consume `useSidebarDensity()`.

- [ ] **Step 2: Enable the Settings dropdown item**

Replace the disabled Settings `DropdownMenuItem` with one that calls `setSettingsOpen(true)`.

- [ ] **Step 3: Add SettingsSheet component** after `AccountSheet`.

---

### Task 8: Apply density classes to sidebar items

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Add density class helpers before the component**

```typescript
function navItemClass(density: SidebarDensity): string {
  const base = "transition-all duration-100"
  if (density === "default") return `${base} h-[28px]! px-[10px]! py-[3px]! text-[13px]! gap-[6px]!`
  if (density === "compact") return `${base} h-[24px]! px-[8px]! py-[2px]! text-[12px]! gap-[4px]!`
  return base
}

function subItemClass(density: SidebarDensity): string {
  const base = "transition-all duration-100"
  if (density === "default") return `${base} h-[24px]! px-[8px]! py-[2px]! text-[13px]!`
  if (density === "compact") return `${base} h-[20px]! px-[6px]! py-[1px]! text-[12px]!`
  return base
}
```

- [ ] **Step 2: Apply `className={navItemClass(density)}` to all nav item buttons** (Home, Favorites, Recent, Calendar, Trash, Admin items, folder triggers, root note items).

- [ ] **Step 3: Apply `className={subItemClass(density)}` to note sub-items** inside folders.

---

### Task 9: Update AppHeader to use useThemeSync

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Replace `useTheme` from `next-themes` with `useThemeSync`**

This ensures theme toggles are auto-saved to the API.

---

### Task 10: Update test mocks

**Files:**
- Modify: `src/__tests__/app-header.test.tsx` — mock `ThemeSyncContext` instead of `next-themes`
- Modify: `src/__tests__/notes-sidebar.test.tsx` — add mock for `SidebarDensityContext`

---

### Task 11: Test the implementation

- [ ] **Step 1: Start the dev server and test**

```
npm run dev
```

- [ ] **Step 2: Verify**
  1. The Settings item in the user dropdown is no longer disabled
  2. Clicking it opens the Settings sheet panel
  3. Clicking Spacious/Default/Compact changes sidebar item sizes immediately
  4. Refresh the page — preference persists
  5. Log out and back in — preference persists via DB
  6. All 3 modes render correctly (no broken layout, overlapping text)
  7. Legacy values (old `default`, `compact`, `dense`) are migrated correctly

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run
```

All existing tests should pass without modification (1 pre-existing mongodb failure unrelated).

- [ ] **Step 4: Final commit with any fixes**

```bash
git add -A
git commit -m "feat: complete sidebar density with DB persistence and theme sync"
```
