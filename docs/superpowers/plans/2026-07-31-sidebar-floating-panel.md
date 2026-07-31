# Sidebar Floating Panel + Section Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the desktop sidebar into a rounded floating card and add section labels (`Views`, `Notebooks`, `Trash`, `Admin`) for visual hierarchy.

**Architecture:** Two changes. (1) The `Sidebar` primitive in `src/components/ui/sidebar.tsx` gains a `variant="floating"` path for the `collapsible="none"` branch: an outer `p-3.5` wrapper containing a rounded, shadowed, ringed card that holds the sidebar content. (2) `NotesSidebar` passes `variant="floating"` and renders a small `SectionLabel` component above each nav section, hiding the `Notebooks` label when there are no folders/notes.

**Tech Stack:** Next.js 16, React 19, shadcn/ui sidebar (base-ui `useRender`), Tailwind v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-31-sidebar-floating-panel-design.md`

---

### Task 1: Add the floating variant to the `Sidebar` component

**Files:**
- Create: `src/__tests__/sidebar-floating.test.tsx`
- Modify: `src/components/ui/sidebar.tsx:167-180`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/sidebar-floating.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

function renderSidebar(variant: 'sidebar' | 'floating') {
  return render(
    <SidebarProvider>
      <Sidebar collapsible="none" variant={variant}>
        <div data-testid="content">content</div>
      </Sidebar>
    </SidebarProvider>
  )
}

describe('Sidebar floating variant', () => {
  it('wraps children in a rounded floating card when variant is floating', () => {
    renderSidebar('floating')
    const content = screen.getByTestId('content')
    const card = content.parentElement!
    const outer = card.parentElement!
    expect(card).toHaveClass('rounded-2xl', 'bg-sidebar', 'ring-1', 'ring-sidebar-border')
    expect(card).toHaveClass('shadow-[0_10px_28px_rgba(15,23,42,0.10)]')
    expect(card).toHaveClass('dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]')
    expect(outer).toHaveAttribute('data-slot', 'sidebar')
    expect(outer).toHaveClass('p-3.5')
  })

  it('keeps the flat layout when variant is not floating', () => {
    renderSidebar('sidebar')
    const content = screen.getByTestId('content')
    const outer = content.parentElement!
    expect(outer).toHaveAttribute('data-slot', 'sidebar')
    expect(outer).toHaveClass('bg-sidebar')
    expect(outer).not.toHaveClass('p-3.5')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/sidebar-floating.test.tsx`
Expected: FAIL — `expect(card).toHaveClass('rounded-2xl', ...)` fails because the `collapsible="none"` branch renders children directly on the sidebar div with no wrapper card.

- [ ] **Step 3: Implement the floating variant**

In `src/components/ui/sidebar.tsx`, replace the `collapsible === "none"` branch (lines 167-180) with:

```tsx
  if (collapsible === "none") {
    if (variant === "floating") {
      return (
        <div
          data-slot="sidebar"
          className={cn(
            "flex h-full flex-col p-3.5",
            className
          )}
          {...props}
        >
          <div className="flex size-full flex-col overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-[0_10px_28px_rgba(15,23,42,0.10)] ring-1 ring-sidebar-border dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            {children}
          </div>
        </div>
      )
    }

    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/sidebar-floating.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/sidebar-floating.test.tsx src/components/ui/sidebar.tsx
git commit -m "feat(sidebar): add floating variant for collapsible=none"
```

---

### Task 2: Use the floating variant and add section labels in `NotesSidebar`

**Files:**
- Modify: `src/components/NotesSidebar.tsx` (variant prop line 1019; labels around lines 1095-1237)
- Modify: `src/__tests__/notes-sidebar.test.tsx` (append tests in the `describe('NotesSidebar')` block, before line 449's closing of the block — insert after the "shows sidebar header with app name" test at line 487)

- [ ] **Step 1: Write the failing tests**

Append these tests inside the existing `describe('NotesSidebar', ...)` block in `src/__tests__/notes-sidebar.test.tsx` (after the `'shows sidebar header with app name'` test, which ends at line 487):

```tsx
  it('renders the Views section label', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Views')).toBeInTheDocument()
  })

  it('renders the Notebooks section label when folders or notes exist', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Notebooks')).toBeInTheDocument()
  })

  it('hides the Notebooks section label when there are no folders or notes', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext({ notes: [], folders: [] }))
    renderSidebar()
    expect(screen.queryByText('Notebooks')).not.toBeInTheDocument()
  })

  it('renders the Trash section label', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getAllByText('Trash').length).toBeGreaterThanOrEqual(2)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/notes-sidebar.test.tsx`
Expected: FAIL — 4 new tests fail: `Views`/`Notebooks`/`Trash` labels don't exist in the DOM yet.

- [ ] **Step 3: Add the `SectionLabel` component**

In `src/components/NotesSidebar.tsx`, right after the `subItemClass` function (ends at line 377), add:

```tsx
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-3 pb-1 pt-2 text-xs font-semibold text-sidebar-foreground/50">{children}</div>
)
```

- [ ] **Step 4: Pass the floating variant**

In `src/components/NotesSidebar.tsx`, change line 1019 from:

```tsx
      <Sidebar collapsible={resizable ? "none" : "icon"} ref={sidebarRef} className={resizable ? "w-full h-full" : undefined}>
```

to:

```tsx
      <Sidebar collapsible={resizable ? "none" : "icon"} variant="floating" ref={sidebarRef} className={resizable ? "w-full h-full" : undefined}>
```

- [ ] **Step 5: Add the `Views` label**

In `src/components/NotesSidebar.tsx`, inside `<SidebarContent>`, between the first separator and the primary navigation group (currently lines 1096-1098):

```tsx
          <SidebarSeparator className="mb-2 mt-0" />
          <SectionLabel>Views</SectionLabel>

          {/* Primary navigation */}
```

- [ ] **Step 6: Add the conditional `Notebooks` label**

In `src/components/NotesSidebar.tsx`, between the separator after the primary navigation group and the `<DndContext>` (currently lines 1130-1132):

```tsx
          <SidebarSeparator className="my-2" />

          {(folders.length > 0 || notes.length > 0) && (
            <SectionLabel>Notebooks</SectionLabel>
          )}

          <DndContext
```

- [ ] **Step 7: Add the `Trash` label**

In `src/components/NotesSidebar.tsx`, between the conditional separator before the Trash group and the Trash group's opening comment (currently lines 1183-1188):

```tsx
          {(folders.length > 0 || notes.length > 0) && (
            <SidebarSeparator className="my-2" />
          )}

          <SectionLabel>Trash</SectionLabel>

          {/* Trash */}
```

- [ ] **Step 8: Replace the Admin label with `SectionLabel`**

In `src/components/NotesSidebar.tsx`, replace the admin label div (currently lines 1236-1238):

```tsx
              <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Admin
              </div>
```

with:

```tsx
              <SectionLabel>Admin</SectionLabel>
```

(The `SectionLabel` has no `uppercase`, so the text renders as "Admin" instead of "ADMIN".)

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/notes-sidebar.test.tsx`
Expected: PASS — all existing tests plus the 4 new label tests. The existing `getByText('Admin')` test (line 357) still passes because the DOM text is "Admin" regardless of the removed `uppercase` class.

- [ ] **Step 10: Commit**

```bash
git add src/components/NotesSidebar.tsx src/__tests__/notes-sidebar.test.tsx
git commit -m "feat(sidebar): floating variant and section labels in NotesSidebar"
```

---

### Task 3: Full verification

**Files:** none

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors or warnings.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: All tests pass (including `sidebar-floating.test.tsx` and `notes-sidebar.test.tsx`).

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`, open the app at desktop width, and confirm:
1. The sidebar is a rounded floating card with ~14px margins, a hairline ring, and a soft shadow.
2. Labels show: `Views` above Home/Favorites/Recent, `Notebooks` above the folders tree, `Trash` above Trash, `Admin` (not "ADMIN") for admin users.
3. With zero folders and zero notes, the `Notebooks` label disappears.
4. Toggle dark mode (moon icon in the sidebar header) — the floating card adapts with a deeper shadow.
5. Dragging the resize handle between sidebar and content still resizes the sidebar.

- [ ] **Step 4: Commit any fixes**

If any check in Steps 1-3 revealed an issue, fix it and commit; otherwise no commit is needed for this task.
