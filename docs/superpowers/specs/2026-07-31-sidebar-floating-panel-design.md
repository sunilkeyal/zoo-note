# Sidebar Floating Panel + Section Labels

**Date:** 2026-07-31

## Overview

Make the left nav bar more beautiful by converting the desktop sidebar from a flat, edge-to-edge panel into a rounded "floating card" with soft shadow, and add section labels to give the nav visual hierarchy.

## Design Decisions (from visual brainstorm)

Validated with the user via browser mockups:

- **Shape:** Floating panel, "balanced" intensity — 16px radius (`rounded-2xl`), 14px margins (`p-3.5`), soft shadow, hairline ring.
- **Light mode:** white/near-white card (`--sidebar`) floating on the app background, defined by shadow + ring.
- **Dark mode:** inherits existing `--sidebar` tokens (elevated card over deeper background) — the app already has a dark toggle, no separate design.
- **Section labels:** `Views` (Home/Favorites/Recent), `Notebooks` (folders + unfiled notes tree), `Trash` (trash section), `Admin` (was rendered "ADMIN" via `uppercase`).
- **Conditional labels:** the `Notebooks` label only renders when there are folders or notes. `Views`, `Trash`, and `Admin` always render.

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

### 3. Layout impact

No changes needed in `AppLayout.tsx` or `admin/layout.tsx`:

- The 14px padding lives inside the sidebar panel, so the resizable panel and `PanelResizeHandle` keep working; the gap around the card shows the normal app background (`bg-background`).

## Testing

- Add tests to `src/__tests__/notes-sidebar.test.tsx`:
  - "Views" and "Notebooks" labels render with folders/notes present.
  - "Notebooks" label does not render when `folders` and `notes` are empty (the empty-state context used by the existing Account-menu describe block).
  - "Trash" label renders.
- Existing tests keep passing — the Admin label test uses `getByText('Admin')`, which matches the DOM text "Admin" regardless of the removed `uppercase` class.
- Run `npm run lint` and `npm test` after the change.

## Out of Scope

- Changing the active-item pill to a violet tint (was shown in mockups but not requested).
- Any change to the collapsed icon state.
- Mobile sidebar/drawer styling.
- Theme token changes — the design uses existing `--sidebar` values.
