# Sidebar Floating Panel + Section Labels + Content Floating Card

**Date:** 2026-07-31

## Overview

Make the app feel more polished by converting the desktop sidebar from a flat, edge-to-edge panel into a rounded "floating card" with soft shadow, add section labels to give the nav visual hierarchy, and wrap the right-side main content area in the same floating-card treatment so the layout reads as two balanced cards on the app background.

## Design Decisions (from visual brainstorm)

Validated with the user via browser mockups:

- **Shape:** Floating panel, "balanced" intensity — 16px radius (`rounded-2xl`), 14px margins (`p-3.5`), soft shadow, hairline ring.
- **Light mode:** white/near-white card (`--sidebar`) floating on the app background, defined by shadow + ring.
- **Dark mode:** inherits existing `--sidebar` tokens (elevated card over deeper background) — the app already has a dark toggle, no separate design.
- **Section labels:** `Views` (Home/Favorites/Recent), `Notebooks` (folders + unfiled notes tree), `Trash` (trash section), `Admin` (was rendered "ADMIN" via `uppercase`).
- **Conditional labels:** the `Notebooks` label only renders when there are folders or notes. `Views`, `Trash`, and `Admin` always render.
- **Content card:** the right-side content area gets the same floating-card treatment (14px margins, 16px radius, same shadow + ring) in both the notes app and the admin dashboard; card background is `bg-card`. Chosen from three browser mockups (match sidebar / tighter / airier).

## Implementation

### 1. `src/components/ui/sidebar.tsx` — floating variant for `collapsible="none"`

Extend the `Sidebar` component's `collapsible === "none"` branch to honor `variant="floating"`:

```tsx
if (collapsible === "none") {
  if (variant === "floating") {
    return (
      <div
        data-slot="sidebar"
        className={cn("flex h-full flex-col p-3.5", className)}
        {...props}
      >
        <div className="flex size-full flex-col overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-[0_10px_28px_rgba(15,23,42,0.10)] ring-1 ring-sidebar-border dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {children}
        </div>
      </div>
    )
  }
  // existing non-floating return unchanged
}
```

- `{...props}` stays on the outer div so the `ref` (keyboard nav) keeps working.
- Dark-mode shadow is handled with a `dark:` variant; the card color and ring use the existing `--sidebar` / `--sidebar-border` tokens.
- Mobile is unaffected: `NotesSidebar` is only rendered in the desktop branches of `AppLayout` and `admin/layout.tsx`, and the floating branch only changes the `collapsible="none"` path.

### 2. `src/components/NotesSidebar.tsx` — pass variant + add labels

- Pass `variant="floating"` to the `<Sidebar>` element (both the resizable and icon-collapsible cases render the same component, so pass it unconditionally).
- Add a small shared label component inside the file (matching the existing Admin label style, minus `uppercase`):

```tsx
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-3 pb-1 pt-2 text-xs font-semibold text-sidebar-foreground/50">{children}</div>
)
```

- Place `SectionLabel`:
  1. **"Views"** — above the Home/Favorites/Recent group, after the first separator.
  2. **"Notebooks"** — above the `<DndContext>` tree, only when `folders.length > 0 || notes.length > 0` (same condition as the existing separator).
  3. **"Trash"** — above the Trash group, below the tree separator.
  4. **Admin** — replace the current `px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider` div with `SectionLabel` (text becomes "Admin" instead of "ADMIN").

### 3. Content floating card — shared component

New component `src/components/ui/content-card.tsx`:

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

- Same 14px gap (`p-3.5`), 16px radius, shadow, and ring as the sidebar. Validated with the user via browser mockups — option "match the sidebar exactly" was chosen.
- Card background uses `bg-card` (elevated in dark mode, matching how the sidebar's `bg-sidebar` reads over the app background).
- `data-slot="content-card"` gives tests a stable hook.

### 4. Content card — layout application

Wrap the existing `<main>` in `<ContentCard>` in both desktop layouts:

- `src/components/AppLayout.tsx` (lines 265-271):

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

- `src/app/admin/layout.tsx` (lines 60-64):

```tsx
<ResizablePanel id="content" className="h-full">
  <SidebarInset className="overflow-hidden">
    <ContentCard>
      <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">{children}</main>
    </ContentCard>
  </SidebarInset>
</ResizablePanel>
```

### 5. Content card — dark-mode seam fixes

Remove the explicit `bg-background` from the outer root of each of these so the card's `bg-card` shows through (in dark mode these would otherwise render a darker panel inside the card):

- `src/components/PageContainer.tsx:13` — `flex-1 overflow-auto bg-background` → `flex-1 overflow-auto`
- `src/components/MainArea.tsx:1034` — `flex-1 flex flex-col overflow-hidden bg-background` → `flex-1 flex flex-col overflow-hidden`
- `src/components/MainArea.tsx:164` — desktop toolbar bar `hidden md:block px-4 ... bg-background` → drop `bg-background`
- `src/components/HomePage.tsx:150,158` — the loading and error empty states `flex-1 flex items-center justify-center bg-background` → drop `bg-background`

Mobile is unaffected: `MainArea`'s transparent root falls back to the mobile `AppLayout` container which already sets `bg-background` (line 282), and the desktop toolbar bar is `hidden md:block` (never rendered on mobile).

### 6. Page alignment follow-ups

After the initial rollout, two alignment issues surfaced once every page rendered inside the content card:

- **Trash page wrapper.** `src/app/trash/page.tsx` rendered its content in a bare `<div>`, so it lacked the horizontal padding and max-width that `favorites` and `recent` get from `PageContainer`. Wrap the page body in `<PageContainer>` (import from `@/components/PageContainer`) so all list pages share the same gutters and `md:max-w-[900px] lg:max-w-[1140px]` constraint.
- **Top padding parity with admin.** `PageContainer` used `pt-2 sm:pt-3` (8–12px), noticeably tighter than the admin layout's `<main>` `py-6` (24px). Bump `PageContainer` to `pt-6 pb-4 sm:pb-6` so Trash, Favorites, Recent, and Home headers line up vertically with the admin dashboard, import jobs, and user management headers.

## Testing

- Add tests to `src/__tests__/notes-sidebar.test.tsx`:
  - "Views" and "Notebooks" labels render with folders/notes present.
  - "Notebooks" label does not render when `folders` and `notes` are empty (the empty-state context used by the existing Account-menu describe block).
  - "Trash" label renders.
- Create `src/__tests__/content-card.test.tsx`:
  - Renders children inside the card (`getByText`).
  - The card has `rounded-2xl`, `bg-card`, `ring-sidebar-border`, and the light + dark shadow classes (query the `data-slot="content-card"` element and assert classes).
  - The outer wrapper has `p-3.5`.
- Extend `src/__tests__/app-layout.test.tsx` desktop test (`shows sidebar on desktop`) to also assert the content is wrapped in the floating card — e.g. `container.querySelector('[data-slot="content-card"]')` exists.
- Existing tests keep passing:
  - The Admin label test uses `getByText('Admin')`, which matches the DOM text "Admin" regardless of the removed `uppercase` class.
  - `page-container.test.tsx` does not assert `bg-background`.
  - `main-area.test.tsx` does not assert `bg-background`.
- Run `npm run lint` and `npm test` after the change (only pre-existing lint errors in unrelated files are expected).

## Out of Scope

- Changing the active-item pill to a violet tint (was shown in mockups but not requested).
- Any change to the collapsed icon state.
- Mobile sidebar/drawer/content styling.
- Theme token changes — the design uses existing `--sidebar`, `--card`, and `--background` values.
- Admin content max-width / padding — kept as-is inside the card.
