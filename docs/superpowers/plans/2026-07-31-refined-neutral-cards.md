# Refined Neutral — Nav + Detail Card Treatment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the desktop floating left-nav and detail cards a more premium, cohesive treatment (layered soft shadow, matched 18px radius, hairline border) and add a faint app-background tint so the cards visibly float — staying fully neutral/grayscale.

**Architecture:** Extract the shared card surface (radius + shadow + ring) into a single CSS component utility `.floating-card-surface` in `globals.css`, then apply it to both card containers so they can't drift apart. Tint `--background` in light mode. Verify real CSS via a temporary public debug route + Playwright.

**Tech Stack:** Next.js (App Router), Tailwind CSS v4 (`@layer`/`@apply`), React, Vitest + Testing Library, Playwright.

## Global Constraints

- Neutral grayscale only — no new brand/accent color.
- Desktop-only cards; do not touch mobile layout/components.
- Gutter stays `p-3.5` (14px) around each card.
- Both card containers must share one source of truth for radius/shadow/ring.
- Design source: `docs/superpowers/specs/2026-07-31-refined-neutral-cards-design.md`.

---

### Task 1: Shared card surface utility + background tint

**Files:**
- Modify: `src/app/globals.css` (`:root` `--background` ~L82; add a `@layer components` block)

**Interfaces:**
- Produces: CSS class `.floating-card-surface` — applies `border-radius:18px`, `ring-1 ring-sidebar-border`, and a layered box-shadow (light + dark). Consumed by Tasks 2 and 3.

- [ ] **Step 1: Change the light-mode app background to a faint zinc tint**

In `src/app/globals.css`, inside `:root`, change:

```css
  --background: oklch(1 0 0);
```

to:

```css
  --background: oklch(0.968 0 0);
```

Leave `.dark { --background: oklch(0.145 0 0); }` unchanged.

- [ ] **Step 2: Add the shared floating-card surface utility**

Append to `src/app/globals.css` (after the `@layer base` block):

```css
@layer components {
  .floating-card-surface {
    border-radius: 18px;
    box-shadow:
      0 18px 44px -10px rgba(15, 23, 42, 0.16),
      0 5px 14px -6px rgba(15, 23, 42, 0.09);
  }

  .dark .floating-card-surface {
    box-shadow:
      0 20px 48px -8px rgba(0, 0, 0, 0.65),
      0 6px 16px -8px rgba(0, 0, 0, 0.5);
  }
}
```

> The hairline border stays as the Tailwind `ring-1 ring-sidebar-border` classes on each
> card (they already resolve to the correct light/dark values), so they remain in the
> component `className` rather than this utility.

- [ ] **Step 3: Sanity-check the build compiles**

Run: `npm run build` (or `npx tsc --noEmit` + `npx next lint` if faster)
Expected: no CSS/compile errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add floating-card-surface utility and tint app background"
```

---

### Task 2: Apply shared surface to the detail card (ContentCard)

**Files:**
- Modify: `src/components/ui/content-card.tsx`
- Test: `src/__tests__/content-card.test.tsx`

**Interfaces:**
- Consumes: `.floating-card-surface` (Task 1).
- Produces: `[data-slot="content-card"]` now carries classes `floating-card-surface`,
  `bg-card`, `text-card-foreground`, `ring-1`, `ring-sidebar-border` (no `rounded-2xl`, no
  inline `shadow-[…]`).

- [ ] **Step 1: Update the failing test to the new contract**

In `src/__tests__/content-card.test.tsx`, replace the second test body with:

```tsx
  it('wraps children in a floating card with a p-3.5 outer gap', () => {
    const { container } = render(<ContentCard><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    const outer = card.parentElement!
    expect(card).toHaveClass('floating-card-surface', 'bg-card', 'text-card-foreground', 'ring-1', 'ring-sidebar-border')
    expect(card).not.toHaveClass('rounded-2xl')
    expect(outer).toHaveClass('p-3.5')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/content-card.test.tsx`
Expected: FAIL — card still has `rounded-2xl` and lacks `floating-card-surface`.

- [ ] **Step 3: Update ContentCard to use the shared surface**

In `src/components/ui/content-card.tsx`, change the inner `div`'s className from:

```tsx
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[0_10px_28px_rgba(15,23,42,0.10)] ring-1 ring-sidebar-border dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]",
          className
        )}
```

to:

```tsx
        className={cn(
          "floating-card-surface flex size-full flex-col overflow-hidden bg-card text-card-foreground ring-1 ring-sidebar-border",
          className
        )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/content-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/content-card.tsx src/__tests__/content-card.test.tsx
git commit -m "feat: apply floating-card-surface to detail card"
```

---

### Task 3: Apply shared surface to the floating sidebar

**Files:**
- Modify: `src/components/ui/sidebar.tsx` (floating `collapsible="none"` branch, ~L178)
- Test: `src/__tests__/sidebar-surface.test.tsx` (create)

**Interfaces:**
- Consumes: `.floating-card-surface` (Task 1).
- Produces: the inner floating container carries `floating-card-surface bg-sidebar
  text-sidebar-foreground ring-1 ring-sidebar-border` (no `rounded-2xl`, no inline
  `shadow-[…]`), matching the detail card exactly.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/sidebar-surface.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar'

describe('floating Sidebar surface', () => {
  it('uses the shared floating-card-surface, not the old rounded-2xl shadow', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none" variant="floating">
          <div>content</div>
        </Sidebar>
      </SidebarProvider>
    )
    const outer = container.querySelector('[data-slot="sidebar"]')!
    const surface = outer.querySelector(':scope > div')!
    expect(surface).toHaveClass('floating-card-surface', 'bg-sidebar', 'ring-1', 'ring-sidebar-border')
    expect(surface).not.toHaveClass('rounded-2xl')
    expect(outer).toHaveClass('p-3.5')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/sidebar-surface.test.tsx`
Expected: FAIL — surface still has `rounded-2xl` and lacks `floating-card-surface`.

- [ ] **Step 3: Update the floating sidebar container**

In `src/components/ui/sidebar.tsx`, in the `collapsible === "none"` + `variant === "floating"` branch, change the inner div from:

```tsx
          <div className="flex size-full flex-col overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-[0_10px_28px_rgba(15,23,42,0.10)] ring-1 ring-sidebar-border dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
```

to:

```tsx
          <div className="floating-card-surface flex size-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground ring-1 ring-sidebar-border">
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/sidebar-surface.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no other test pinned the old classes — verified during planning).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/sidebar.tsx src/__tests__/sidebar-surface.test.tsx
git commit -m "feat: apply floating-card-surface to sidebar, matching detail card"
```

---

### Task 4: Visual verification (light + dark) via temporary debug route

**Files:**
- Create (temporary): `src/app/debug-layout/page.tsx`
- Modify (temporary): `src/middleware.ts` (matcher exclusion)

**Interfaces:**
- Consumes: the shipped changes from Tasks 1–3.
- Produces: nothing permanent — route and middleware edit are reverted at the end.

- [ ] **Step 1: Add a public debug route rendering the desktop shell**

Create `src/app/debug-layout/page.tsx` rendering the exact desktop shell
(`SidebarProvider → ResizablePanelGroup → ResizablePanel → NotesSidebar` on the left and
`SidebarInset → ContentCard → main` with dummy note content on the right). Use static dummy
data; no auth, no data fetching. Reference the desktop branch of
`src/components/AppLayout.tsx` for the exact wrapper structure.

- [ ] **Step 2: Exclude the route from auth middleware**

In `src/middleware.ts`, add `debug-layout` to the matcher negative-lookahead group:

```ts
    matcher: ["/((?!login|debug-layout|api/auth|api/images|api/notes/import|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.webp).*)"],
```

- [ ] **Step 3: Run the dev server and verify with Playwright at ≥768px**

Start dev server, then drive Playwright to `http://localhost:3000/debug-layout` at viewport
width ≥ 768 (cards are desktop-only). For BOTH light and default and `.dark` on `<html>`:
- Assert `document.scrollingElement` does not scroll (no window scrollbar).
- Read computed `border-radius` on `[data-slot="content-card"]` and the sidebar surface:
  expect `18px` on both.
- Read computed `box-shadow` on both: expect a two-layer shadow (non-empty, contains two
  `rgba(...)` layers).
- Read computed `background-color` of the app background (the panel behind the cards) vs the
  cards: light mode background must be a visibly darker zinc than the white cards.
Compare against the approved mockup `final-look.html` in
`.superpowers/brainstorm/*/content/`.

Expected: radius 18px on both cards, layered shadow present, light background visibly tinted
relative to cards, dark mode cards lifted off near-black with visible hairline edge.

- [ ] **Step 4: Remove the debug route and revert middleware**

```bash
git rm src/app/debug-layout/page.tsx
git checkout src/middleware.ts
```

Confirm `git status` shows only the intended Task 1–3 changes remain committed and nothing
debug-related is left.

- [ ] **Step 5: Commit (only if any non-debug fix was needed)**

If Step 3 surfaced a needed tweak (e.g., shadow too strong), apply it to `globals.css`,
re-verify, then:

```bash
git add src/app/globals.css
git commit -m "fix: tune floating-card shadow after visual verification"
```

---

## Self-Review

- **Spec coverage:** background tint (T1), radius 18px (T1 utility + applied T2/T3), layered
  shadow (T1), hairline border retained (T2/T3 `ring-1 ring-sidebar-border`), single source
  of truth (T1 `.floating-card-surface`), gutter unchanged (`p-3.5` asserted in tests),
  light + dark verification (T4). All spec sections covered.
- **Placeholder scan:** none — every code step has literal content; T4 Step 1 references the
  concrete shell in `AppLayout.tsx`.
- **Type consistency:** class name `.floating-card-surface` used identically in T1 (defined),
  T2, T3, and asserted in tests.
