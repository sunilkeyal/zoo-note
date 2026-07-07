# Nav Icon Colors — Darker Shades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Darken all sidebar nav icon colors by shifting Tailwind shade weights per-color (rich colors +1, light colors +2).

**Architecture:** Pure Tailwind utility class replacement — no logic changes, no new files, no new dependencies. Six categories of changes across 14 files.

**Tech Stack:** Tailwind CSS v4, React/Next.js, shadcn/ui

---

### Task 1: Update folder icon color map in NotesSidebar.tsx

**Files:**
- Modify: `src/components/NotesSidebar.tsx:212-281`

Replace every color string in the `folderIconColors` object:

- [ ] **Apply Group 1 replacements (rich colors → `-600` / `-500`)**

| Old | New |
|-----|-----|
| `text-blue-500 dark:text-blue-400` | `text-blue-600 dark:text-blue-500` |
| `text-purple-500 dark:text-purple-400` | `text-purple-600 dark:text-purple-500` |
| `text-emerald-500 dark:text-emerald-400` | `text-emerald-600 dark:text-emerald-500` |
| `text-pink-500 dark:text-pink-400` | `text-pink-600 dark:text-pink-500` |
| `text-red-500 dark:text-red-400` | `text-red-600 dark:text-red-500` |
| `text-indigo-500 dark:text-indigo-400` | `text-indigo-600 dark:text-indigo-500` |
| `text-orange-500 dark:text-orange-400` | `text-orange-600 dark:text-orange-500` |
| `text-rose-500 dark:text-rose-400` | `text-rose-600 dark:text-rose-500` |
| `text-teal-500 dark:text-teal-400` | `text-teal-600 dark:text-teal-500` |
| `text-violet-500 dark:text-violet-400` | `text-violet-600 dark:text-violet-500` |

- [ ] **Apply Group 2 replacements (light colors → `-700` / `-600`)**

| Old | New |
|-----|-----|
| `text-amber-500 dark:text-amber-400` | `text-amber-700 dark:text-amber-600` |
| `text-sky-500 dark:text-sky-400` | `text-sky-700 dark:text-sky-600` |
| `text-stone-500 dark:text-stone-400` | `text-stone-700 dark:text-stone-600` |
| `text-cyan-500 dark:text-cyan-400` | `text-cyan-700 dark:text-cyan-600` |
| `text-lime-500 dark:text-lime-400` | `text-lime-700 dark:text-lime-600` |
| `text-yellow-500 dark:text-yellow-400` | `text-yellow-700 dark:text-yellow-600` |
| `text-slate-500 dark:text-slate-400` | `text-slate-700 dark:text-slate-600` |

- [ ] **Update information/info/reference/faq/help/wiki entries** (currently `text-blue-400 dark:text-blue-300` → `text-blue-500 dark:text-blue-400`)

- [ ] **Verify the color map in editor**

---

### Task 2: Update primary nav icons in NotesSidebar.tsx

**Files:**
- Modify: `src/components/NotesSidebar.tsx:880, 886, 897, 903, 972`

- [ ] **Replace each primary nav icon color**

Line 880: `<House className="text-indigo-600 dark:text-indigo-500" />`
Line 886: `<Star className="text-amber-700 dark:text-amber-600" />`
Line 897: `<Clock className="text-emerald-600 dark:text-emerald-500" />`
Line 903: `<CalendarDays className="text-sky-700 dark:text-sky-600" />`
Line 972: `<Trash2 className="text-rose-600 dark:text-rose-500" />`

- [ ] **Verify the rendered sidebar shows darker icon colors**

---

### Task 3: Update admin nav icon colors in NotesSidebar.tsx

**Files:**
- Modify: `src/components/NotesSidebar.tsx:339-346`

- [ ] **Replace each adminItems iconColor string**

| Old | New |
|-----|-----|
| `text-violet-500 dark:text-violet-400` | `text-violet-600 dark:text-violet-500` |
| `text-cyan-500 dark:text-cyan-400` | `text-cyan-700 dark:text-cyan-600` |
| `text-teal-500 dark:text-teal-400` | `text-teal-600 dark:text-teal-500` |
| `text-blue-500 dark:text-blue-400` | `text-blue-600 dark:text-blue-500` |
| `text-orange-500 dark:text-orange-400` | `text-orange-600 dark:text-orange-500` |
| `text-slate-500 dark:text-slate-400` | `text-slate-700 dark:text-slate-600` |

- [ ] **Verify admin section icons render with darker shades**

---

### Task 4: Update page header icons in page files

**Files:**
- Modify: `src/app/favorites/page.tsx:152`
- Modify: `src/app/recent/page.tsx:155`
- Modify: `src/app/calendar/page.tsx:10`
- Modify: `src/app/trash/page.tsx:48`
- Modify: `src/app/admin/page.tsx:8`
- Modify: `src/app/admin/analytics/page.tsx:8`
- Modify: `src/app/admin/backup/page.tsx:8`
- Modify: `src/app/admin/users/page.tsx:101`
- Modify: `src/app/admin/audit/page.tsx:8`
- Modify: `src/app/admin/settings/page.tsx:8`

- [ ] **Apply per-file replacements**

| File | Old | New |
|------|-----|-----|
| favorites/page.tsx | `text-amber-500 dark:text-amber-400` | `text-amber-700 dark:text-amber-600` |
| recent/page.tsx | `text-emerald-500 dark:text-emerald-400` | `text-emerald-600 dark:text-emerald-500` |
| calendar/page.tsx | `text-sky-500 dark:text-sky-400` | `text-sky-700 dark:text-sky-600` |
| trash/page.tsx | `text-rose-500 dark:text-rose-400` | `text-rose-600 dark:text-rose-500` |
| admin/page.tsx | `text-violet-500 dark:text-violet-400` | `text-violet-600 dark:text-violet-500` |
| admin/analytics/page.tsx | `text-cyan-500 dark:text-cyan-400` | `text-cyan-700 dark:text-cyan-600` |
| admin/backup/page.tsx | `text-teal-500 dark:text-teal-400` | `text-teal-600 dark:text-teal-500` |
| admin/users/page.tsx | `text-blue-500 dark:text-blue-400` | `text-blue-600 dark:text-blue-500` |
| admin/audit/page.tsx | `text-orange-500 dark:text-orange-400` | `text-orange-600 dark:text-orange-500` |
| admin/settings/page.tsx | `text-slate-500 dark:text-slate-400` | `text-slate-700 dark:text-slate-600` |

- [ ] **Verify each page header icon renders with its darker shade**

---

### Task 5: Build and verify

- [ ] **Run the build**

```bash
npm run build
```

Expected: Build succeeds, no TypeScript errors.

- [ ] **Run existing tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Visual check in dev mode**

```bash
npm run dev
```
- Navigate to each page and verify icon colors are visibly darker
- Toggle dark mode and verify dark variants render correctly
- Verify active state highlighting still works over darker icons
