# Phase 0 Research: Consolidate Sidebar Toolbar

**Feature**: 009-consolidate-sidebar-toolbar
**Date**: 2026-07-30

This feature has no open `NEEDS CLARIFICATION` items (both clarifications were resolved in the spec). Research here documents the current implementation facts and the chosen technical approach for each of the three user stories.

## Decision 1 — Relocate the theme toggle into the sidebar toolbar (US1)

**Current state**:
- The theme toggle lives in `src/components/AppHeader.tsx`. It uses `useThemeSync()` from `src/contexts/ThemeSyncContext` and renders a `Button` (ghost) with `Moon`/`Sun` lucide icons inside a `Tooltip`.
- The sidebar action toolbar is in `src/components/NotesSidebar.tsx` (around line 1021), a `<div role="toolbar" aria-label="Sidebar actions">` containing New note, New folder, Search, Expand all, and Collapse all as `Button variant="ghost" size="icon"` inside `Tooltip`s, all wrapped in a `TooltipProvider`.

**Decision**: Add the theme toggle as the final control in the sidebar toolbar, immediately after "Collapse all", preceded by a small vertical divider. Reuse `useThemeSync()` and the same `Moon`/`Sun` + `Button`/`Tooltip` pattern already used by `AppHeader`, matching the sizing (`size="icon"`) of the adjacent toolbar buttons.

**Rationale**: Reusing `useThemeSync()` preserves existing persistence/sync behavior (FR-002) with zero data changes. Matching the neighboring buttons keeps the toolbar visually consistent (Constitution 1.5). A divider satisfies the clarified grouping decision.

**Alternatives considered**:
- Extracting a shared `ThemeToggle` component. Rejected as over-engineering for a single reuse site; the toggle is a few lines inline. (May be revisited if a third consumer appears.)
- Placing the toggle before the action buttons. Rejected — spec requires it immediately after "Collapse all".

## Decision 2 — Remove the empty top bar (US2)

**Current state**:
- `AppHeader` is rendered inside `SidebarInset` in two places: `src/components/AppLayout.tsx` (desktop branch, above `<main>`) and `src/app/admin/layout.tsx` (above `<main>`). The mobile branch of `AppLayout` does not use `AppHeader`.
- Both layouts already render `NotesSidebar`, so the relocated toggle is automatically available in the admin view too.

**Decision**: Remove the `<AppHeader />` element and its import from both `AppLayout.tsx` and `admin/layout.tsx`, then delete `src/components/AppHeader.tsx` and its test `src/__tests__/app-header.test.tsx`. Content below (`<main>`) naturally moves up to occupy the reclaimed space.

**Rationale**: Once the only meaningful control (theme toggle) is relocated, the header is empty. Because admin reuses `NotesSidebar`, FR-007 (admin keeps a working toggle) is satisfied without any admin-specific work. Deleting the unused component avoids dead code (Constitution 2.1).

**Alternatives considered**:
- Keeping `AppHeader.tsx` file but rendering nothing. Rejected as dead code.
- Keeping the top bar only in admin. Rejected — admin's toggle is covered by the sidebar, so the bar would be empty there too.

## Decision 3 — Make the desktop editor formatting toolbar fixed (US3)

**Current state**:
- In `src/components/MainArea.tsx`, the component root is `div.flex-1.flex.flex-col.overflow-hidden`. Its children are `DesktopToolbar`, `MobileToolbar`, a title/metadata block, and a scroll region `div[ref=editorContainerRef].flex-1.overflow-auto`.
- `MainArea` is rendered inside `<main className="flex-1 overflow-auto …">` in both the desktop `AppLayout` and `admin/layout`, and inside a `flex flex-col min-h-0` wrapper in the mobile branch.
- Root cause of the toolbar scrolling away: `<main>` is not a flex container, so `MainArea`'s `flex-1` collapses to content height; the inner `editorContainerRef` `flex-1 overflow-auto` therefore does not constrain height, and the whole `MainArea` (including `DesktopToolbar`) grows and scrolls within the outer `<main overflow-auto>`.

**Decision**: Make the desktop toolbar stick to the top of the scroll viewport by adding `sticky top-0 z-*` (with an opaque `bg-background` and appropriate `z-index`) to the `DesktopToolbar` wrapper so it remains visible while note content scrolls. Only the formatting toolbar becomes sticky; the title and "Last updated" metadata remain non-sticky and scroll away (per clarification). Scope the sticky behavior to the desktop toolbar (`hidden md:block`) so the mobile toolbar is unaffected.

**Rationale**: A CSS `position: sticky` (Tailwind `sticky top-0`) is the minimal, localized change that works within the existing outer `<main overflow-auto>` scroll container without restructuring the layout height chain or touching the home page and other `<main>` children. It uses Tailwind only (Constitution 1.5) and requires no new state or JS. An opaque background prevents scrolled content from showing through the sticky bar (FR-006).

**Alternatives considered**:
- Restructuring the height chain (make `<main>` a flex column and rely on `MainArea`'s inner `overflow-auto`). Rejected as more invasive — it affects every page rendered in `<main>` (home, admin, not-found) and risks regressions in unrelated views.
- Making the toolbar `fixed`. Rejected — `fixed` positions relative to the viewport and would need manual width/offset math against the resizable sidebar; `sticky` respects the normal flow and container width automatically.

## Cross-cutting: Accessibility & Testing

**Decision**: Preserve the toggle's tooltip and add/keep an ARIA label ("Switch to dark/light mode") so it remains keyboard-operable and screen-reader friendly (Constitution 1.3, FR-008). Update `notes-sidebar.test.tsx` to assert the toggle renders after "Collapse all" and invokes `setTheme`; remove `app-header.test.tsx`; add a `main-area.test.tsx` assertion that the desktop toolbar wrapper carries the sticky positioning class.

**Rationale**: Keeps critical UI behavior covered (Constitution 1.4) and prevents a stale test for a deleted component.
