# Colorful Nav Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add solid Tailwind color classes to each left sidebar navigation icon with dark mode variants.

**Architecture:** Single-file change to `NotesSidebar.tsx`. Each lucide icon in the primary nav section gets a `className` with its light/dark Tailwind color. The `adminItems` array gets an `iconColor` field used in the render loop. No new files, dependencies, or CSS.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, lucide-react

---

### Task 1: Add colors to primary nav icons

**Files:**
- Modify: `src/components/NotesSidebar.tsx:797-825`

- [ ] **Step 1: Add Tailwind color classes to each primary nav icon**

Replace each bare `<Icon />` with `<Icon className="..." />`:

```tsx
{/* Home */}
<House className="text-indigo-500 dark:text-indigo-400" />

{/* Favorites */}
<Star className="text-amber-500 dark:text-amber-400" />

{/* Recent */}
<Clock className="text-emerald-500 dark:text-emerald-400" />

{/* Calendar */}
<CalendarDays className="text-sky-500 dark:text-sky-400" />
```

The Favorites icon previously had conditional coloring (`favoriteNotes.length > 0 ? "text-amber-500" : ""`). This condition is removed — the icon is always amber. The count badge below it remains conditional (line 807-810).

- [ ] **Step 2: Add color to Trash icon**

At line 891, change:
```tsx
<Trash2 />
```
to:
```tsx
<Trash2 className="text-rose-500 dark:text-rose-400" />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add solid colors to primary nav icons"
```

---

### Task 2: Add colors to admin nav icons

**Files:**
- Modify: `src/components/NotesSidebar.tsx:259-266`
- Modify: `src/components/NotesSidebar.tsx:912`

- [ ] **Step 1: Add iconColor field to adminItems array**

Add `iconColor` to each entry in the `adminItems` array:

```tsx
const adminItems = [
  { route: "/admin",           label: "Dashboard",        icon: LayoutDashboard, iconColor: "text-violet-500 dark:text-violet-400" },
  { route: "/admin/analytics", label: "Analytics",        icon: BarChart3,       iconColor: "text-cyan-500 dark:text-cyan-400" },
  { route: "/admin/backup",    label: "Backup & Restore", icon: Database,        iconColor: "text-teal-500 dark:text-teal-400" },
  { route: "/admin/users",     label: "User Management",  icon: Users,           iconColor: "text-blue-500 dark:text-blue-400" },
  { route: "/admin/audit",     label: "Audit Logs",       icon: ScrollText,      iconColor: "text-orange-500 dark:text-orange-400" },
  { route: "/admin/settings",  label: "System Settings",  icon: Settings,        iconColor: "text-slate-500 dark:text-slate-400" },
]
```

- [ ] **Step 2: Pass iconColor to icon render**

At line 912, change:
```tsx
<item.icon />
```
to:
```tsx
<item.icon className={item.iconColor} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add solid colors to admin nav icons"
```
