# Sidebar Floating Panel + Section Labels + Content Floating Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the desktop sidebar into a rounded floating card, add section labels (`Views`, `Notebooks`, `Trash`, `Admin`), and wrap the right-side content area in a matching floating card so the layout reads as two balanced cards on the app background.

**Architecture:** Three parts. (1) The `Sidebar` primitive in `src/components/ui/sidebar.tsx` gains a `variant="floating"` path for `collapsible="none"` (DONE). (2) `NotesSidebar` passes `variant="floating"` and renders a `SectionLabel` above each nav section (DONE). (3) A new shared `ContentCard` component wraps the `<main>` content in both `AppLayout` and `admin/layout.tsx`, with explicit `bg-background` removed from inner roots so the card surface is uniform in dark mode.

**Tech Stack:** Next.js 16, React 19, shadcn/ui (base-ui `useRender`), Tailwind v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-31-sidebar-floating-panel-design.md`

---

## Part 1 — Sidebar floating variant + section labels (DONE)

### Task 1: Add the floating variant to the `Sidebar` component

**Status: DONE** — committed as `064f512` (`feat(sidebar): add floating variant for collapsible=none`). Steps below tracked for reference.

- [x] **Step 1: Write the failing test** — `src/__tests__/sidebar-floating.test.tsx`
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement the floating variant** — `src/components/ui/sidebar.tsx` `collapsible === "none"` branch
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit**

### Task 2: Use the floating variant and add section labels in `NotesSidebar`

**Status: DONE** — committed as `a26fb13` (`feat(sidebar): floating variant and section labels in NotesSidebar`). Steps below tracked for reference.

- [x] **Step 1: Write the failing tests** — `src/__tests__/notes-sidebar.test.tsx`
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Add the `SectionLabel` component** — `src/components/NotesSidebar.tsx`
- [x] **Step 4: Pass the floating variant**
- [x] **Step 5: Add the `Views` label**
- [x] **Step 6: Add the conditional `Notebooks` label**
- [x] **Step 7: Add the `Trash` label**
- [x] **Step 8: Replace the Admin label with `SectionLabel`**
- [x] **Step 9: Run tests to verify they pass**
- [x] **Step 10: Commit**

---

## Part 2 — Content floating card

### Task 3: Create the `ContentCard` component

**Files:**
- Create: `src/components/ui/content-card.tsx`
- Test: `src/__tests__/content-card.test.tsx`

**Status: DONE**

- [x] **Step 1: Write the failing test**

Create `src/__tests__/content-card.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ContentCard from '@/components/ui/content-card'

describe('ContentCard', () => {
  it('renders its children inside the card', () => {
    render(<ContentCard><p>Hello</p></ContentCard>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('wraps children in a rounded floating card with a p-3.5 outer gap', () => {
    const { container } = render(<ContentCard><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    const outer = card.parentElement!
    expect(card).toHaveClass('rounded-2xl', 'bg-card', 'text-card-foreground', 'ring-1', 'ring-sidebar-border')
    expect(card).toHaveClass('shadow-[0_10px_28px_rgba(15,23,42,0.10)]')
    expect(card).toHaveClass('dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]')
    expect(outer).toHaveClass('p-3.5')
  })

  it('merges an extra className onto the card', () => {
    const { container } = render(<ContentCard className="custom-class"><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    expect(card.className).toContain('custom-class')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/content-card.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/content-card` (module does not exist yet).

- [x] **Step 3: Write the minimal implementation**

Create `src/components/ui/content-card.tsx`:

```tsx
import { cn } from "@/lib/utils"

export default function ContentCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex h-full flex-col p-3.5">
      <div
        data-slot="content-card"
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[0_10px_28px_rgba(15,23,42,0.10)] ring-1 ring-sidebar-border dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/content-card.test.tsx`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/components/ui/content-card.tsx src/__tests__/content-card.test.tsx
git commit -m "feat(sidebar): add ContentCard floating panel component"
```

---

### Task 4: Apply `ContentCard` in the desktop layouts

**Files:**
- Modify: `src/components/AppLayout.tsx:265-271`
- Modify: `src/app/admin/layout.tsx:60-64`
- Modify: `src/__tests__/app-layout.test.tsx:59-63`

**Status: DONE**

- [x] **Step 1: Write the failing test**

In `src/__tests__/app-layout.test.tsx`, extend the existing desktop test (lines 59-63) to assert the content is wrapped in the floating card:

```tsx
  it('shows sidebar on desktop', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { container } = render(<AppLayout><div>Content</div></AppLayout>)
    expect(screen.getByText('Content')).toBeInTheDocument()
    const card = container.querySelector('[data-slot="content-card"]')
    expect(card).not.toBeNull()
    expect(card).toHaveClass('rounded-2xl', 'bg-card', 'ring-sidebar-border')
  })
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/app-layout.test.tsx`
Expected: FAIL — `content-card` selector returns null because `AppLayout` does not render `ContentCard` yet.

- [x] **Step 3: Apply in `AppLayout.tsx`**

Add the import at the top of `src/components/AppLayout.tsx` (with the other component imports, near line 21):

```tsx
import ContentCard from "@/components/ui/content-card"
```

Replace the desktop content panel (lines 265-271):

```tsx
          <ResizablePanel id="content" className="h-full">
            <SidebarInset className="h-full overflow-hidden">
              <ContentCard>
                <main className="flex-1 flex flex-col overflow-hidden w-full">
                  {children}
                </main>
              </ContentCard>
            </SidebarInset>
          </ResizablePanel>
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/app-layout.test.tsx`
Expected: PASS (5 tests).

- [x] **Step 5: Apply in `admin/layout.tsx`**

Add the import at the top of `src/app/admin/layout.tsx` (with the other component imports, near line 8):

```tsx
import ContentCard from "@/components/ui/content-card"
```

Replace the content panel (lines 60-64):

```tsx
        <ResizablePanel id="content" className="h-full">
          <SidebarInset className="overflow-hidden">
            <ContentCard>
              <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">{children}</main>
            </ContentCard>
          </SidebarInset>
        </ResizablePanel>
```

- [x] **Step 6: Run the app-layout tests again**

Run: `npx vitest run src/__tests__/app-layout.test.tsx src/__tests__/content-card.test.tsx`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/components/AppLayout.tsx src/app/admin/layout.tsx src/__tests__/app-layout.test.tsx
git commit -m "feat(sidebar): wrap desktop content in ContentCard floating panel"
```

---

### Task 5: Dark-mode seam fixes

**Files:**
- Modify: `src/components/PageContainer.tsx:13`
- Modify: `src/components/MainArea.tsx:164`
- Modify: `src/components/MainArea.tsx:1034`
- Modify: `src/components/HomePage.tsx:150,158`

**Status: DONE**

- [x] **Step 1: Remove `bg-background` from `PageContainer`**

In `src/components/PageContainer.tsx`, line 13, change:

```tsx
    <div className="flex-1 overflow-auto bg-background">
```

to:

```tsx
    <div className="flex-1 overflow-auto">
```

- [x] **Step 2: Remove `bg-background` from `MainArea`**

In `src/components/MainArea.tsx`, line 164, change:

```tsx
    <div className="hidden md:block px-4 sm:px-6 md:px-8 lg:px-10 pt-4 pb-4 w-full bg-background">
```

to:

```tsx
    <div className="hidden md:block px-4 sm:px-6 md:px-8 lg:px-10 pt-4 pb-4 w-full">
```

In `src/components/MainArea.tsx`, line 1034, change:

```tsx
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
```

to:

```tsx
    <div className="flex-1 flex flex-col overflow-hidden">
```

- [ ] **Step 3: Remove `bg-background` from `HomePage` empty states**

In `src/components/HomePage.tsx`, lines 150 and 158, change both:

```tsx
      <div className="flex-1 flex items-center justify-center bg-background">
```

to:

```tsx
      <div className="flex-1 flex items-center justify-center">
```

(There are exactly two occurrences — the loading state and the error state.)

- [x] **Step 3: Remove `bg-background` from `HomePage` empty states** (marked above)

- [x] **Step 4: Run the affected tests**

Run: `npx vitest run src/__tests__/page-container.test.tsx src/__tests__/main-area.test.tsx`
Expected: PASS — no test asserts `bg-background`.

- [x] **Step 5: Commit**

```bash
git add src/components/PageContainer.tsx src/components/MainArea.tsx src/components/HomePage.tsx
git commit -m "fix(sidebar): drop explicit bg-background from inner content roots"
```

---

### Task 6: Full verification

**Files:** none

- [x] **Step 1: Lint the changed files**

Run: `npx eslint src/components/ui/content-card.tsx src/components/AppLayout.tsx src/app/admin/layout.tsx src/components/PageContainer.tsx src/components/MainArea.tsx src/components/HomePage.tsx src/__tests__/content-card.test.tsx src/__tests__/app-layout.test.tsx`
Expected: No errors (the pre-existing `img`-element warning in `NotesSidebar.tsx:1026` is unrelated and out of scope).

Actual: The 8 changed files produce only pre-existing lint issues in code untouched by this branch (`AppLayout.tsx:120` setState-in-effect, `AppLayout.tsx:305` `<img>`, and several `MainArea.tsx` hook/`<img>`/memoization findings). Confirmed present on base commit `e456f70`; none introduced by this feature.

- [x] **Step 2: Run the full test suite**

Run: `npm test`
Expected: All tests pass except the pre-existing `admin-stats-api.test.ts` timeouts (5 failures — Mongo connection issues, unrelated to this feature; the file is untouched by this branch).

Actual: 71 test files, 651 tests, all passing.

- [ ] **Step 3: Manual visual check** (requires running `npm run dev` — pending user)

Run: `npm run dev`, open the app at desktop width, and confirm:
1. The sidebar is a rounded floating card with ~14px margins, a hairline ring, and a soft shadow (already verified).
2. The right-side content (Home, Recent, Favorites, Trash, note editor, admin pages) is now a matching rounded floating card with the same 14px gap showing the app background.
3. Resize handle between sidebar and content still resizes the sidebar; the content card fills the remaining panel.
4. Toggle dark mode — the content card is elevated (`bg-card`) over the darker app background, with no darker panel seams inside the card on any page.
5. Mobile widths are unchanged (bottom tab bar layout still full-bleed).
6. With zero folders and zero notes, the `Notebooks` label disappears and the `Trash` label still shows.

- [ ] **Step 4: Commit any fixes**

If any check in Steps 1-3 revealed an issue, fix it and commit; otherwise no commit is needed for this task.
