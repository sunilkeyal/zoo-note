# Content Floating Card + Floating Sidebar Symmetry

**Date:** 2026-07-31

## Overview

Wrap the right-side main content area in the same rounded "floating card" treatment as the sidebar, so the desktop layout reads as two balanced floating cards on the app background. Applies to both the notes app (`AppLayout`) and the admin dashboard (`admin/layout.tsx`).

## Design Decisions (validated with the user)

- **Shape:** Match the sidebar exactly — 16px radius (`rounded-2xl`), 14px margins (`p-3.5`), soft shadow, hairline ring. This was chosen from three browser mockup options (A: match sidebar, B: tighter, C: airier) — the user picked A.
- **Scope:** Both the main notes app and the admin dashboard get the card, so the layout is consistent everywhere the floating sidebar appears. Mobile layouts are unchanged.
- **Card background:** `bg-card` (elevated in dark mode, matching how the sidebar's `bg-sidebar` reads over the app background). Light mode stays near-white.
- **Inner backgrounds:** Components inside the card that force `bg-background` get it removed so the card surface is one uniform color (no darker panel inside the card in dark mode).

## Implementation

### 1. New shared component: `src/components/ui/content-card.tsx`

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

- The outer `p-3.5` wrapper creates the 14px gap that shows the app background (`bg-background`).
- `data-slot="content-card"` gives tests a stable hook.

### 2. `src/components/AppLayout.tsx` — desktop branch (lines 265-271)

Wrap the existing `<main>` in `<ContentCard>`:

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

### 3. `src/app/admin/layout.tsx` — content panel (lines 60-64)

Wrap the existing `<main>` in `<ContentCard>`:

```tsx
<ResizablePanel id="content" className="h-full">
  <SidebarInset className="overflow-hidden">
    <ContentCard>
      <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">{children}</main>
    </ContentCard>
  </SidebarInset>
</ResizablePanel>
```

### 4. Dark-mode seam fixes

Remove the explicit `bg-background` from the outer root of each of these so the card's `bg-card` shows through (in dark mode these would otherwise render a darker panel inside the card):

- `src/components/PageContainer.tsx:13` — `flex-1 overflow-auto bg-background` → `flex-1 overflow-auto`
- `src/components/MainArea.tsx:1034` — `flex-1 flex flex-col overflow-hidden bg-background` → `flex-1 flex flex-col overflow-hidden`
- `src/components/MainArea.tsx:164` — desktop toolbar bar `hidden md:block px-4 ... bg-background` → drop `bg-background`

Mobile is unaffected: `MainArea`'s transparent root falls back to the mobile `AppLayout` container which already sets `bg-background` (line 282), and the desktop toolbar bar is `hidden md:block` (never rendered on mobile).

## Testing

- Create `src/__tests__/content-card.test.tsx`:
  - Renders children inside the card (`getByText`).
  - The card has `rounded-2xl`, `bg-card`, `ring-sidebar-border`, and the light + dark shadow classes (query the `data-slot="content-card"` element and assert classes).
  - The outer wrapper has `p-3.5`.
- Extend `src/__tests__/app-layout.test.tsx` desktop test (`shows sidebar on desktop`) to also assert the content is wrapped in the floating card — e.g. `container.querySelector('[data-slot="content-card"]')` exists.
- Existing tests keep passing:
  - `page-container.test.tsx` does not assert `bg-background`.
  - `main-area.test.tsx` does not assert `bg-background`.
  - `sidebar-floating.test.tsx` and `notes-sidebar.test.tsx` are unaffected.
- Run `npx vitest run` on the affected test files, then `npm run lint` (only pre-existing lint errors in unrelated files are expected) and the full suite.

## Out of Scope

- Mobile sidebar/content styling.
- Changes to the sidebar floating card itself.
- The collapsed icon sidebar state.
- Theme token changes — the design uses existing `--card`, `--background`, and `--sidebar-border` values.
- Admin content max-width / padding — kept as-is inside the card.
