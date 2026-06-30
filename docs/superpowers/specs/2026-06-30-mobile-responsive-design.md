# Mobile & Tablet Responsive Design

## Overview

Make zoo-note fully functional across all screen sizes (360px+), maintaining feature parity between desktop and mobile. The existing desktop-first layout is progressively enhanced with responsive breakpoints, a bottom toolbar on mobile, and touch-optimized interactions.

## Approach

**Chosen: Progressive Enhancement (Approach A)**

Keep the existing shadcn sidebar + layout structure. Add responsive support to the editor, toolbar, and secondary pages. The sidebar already works as a Sheet on mobile — no changes needed there.

## Breakpoint Strategy

| Name | Width | Behavior |
|---|---|---|
| `xs` | 360–639px | Phone — bottom toolbar, sidebar as sheet, compact header |
| `sm` | 640–767px | Small tablet — bottom toolbar, wider content padding |
| `md` | 768–1023px | Tablet — top toolbar, sidebar collapsible (icon mode) |
| `lg` | 1024px+ | Desktop — full sidebar, top toolbar, max-width editor centered |

The existing `useIsMobile()` hook (768px breakpoint) stays unchanged.

## Editor Content Area

| Screen | Width | Padding |
|---|---|---|
| < 640px | `100%` | `px-4` |
| 640–767px | `100%` | `px-6` |
| 768–1023px | `90%` (max 900px) | `px-8` |
| 1024px+ | `max-w-[1140px]` (centered) | `px-10` |

The scroll container accounts for bottom toolbar height on mobile.

## Editor Toolbar

**Desktop (`md:` and up)**: No change — current top toolbar.

**Mobile (`< 768px`)**:
- Floating bottom bar, position fixed, with safe-area inset for notched phones
- Contains core formatting: Bold, Italic, Underline, Strikethrough, lists, heading toggle, color, image
- Less common actions (paragraph spacing, font family, font size) in a `+` overflow popover
- Toolbar hides/shrinks when virtual keyboard opens via `visualViewport` API

Implementation: Split toolbar into `EditorToolbarDesktop` and `EditorToolbarMobile` subcomponents, conditionally rendered by viewport width.

## Touch Interactions

- **dnd-kit sidebar drag**: Enable touch activator, 300ms long-press activation, larger collision zone
- **Tap targets**: Minimum 44px on mobile (toolbar buttons, sidebar tree items)
- **Sidebar tree**: Item height `h-10` on mobile (vs `h-8` on desktop)

## Admin & Secondary Pages

- **Tables** (user management, audit): horizontal scroll wrapper on small screens, reduced padding
- **TrashTable**: collapse to card layout on `< 640px`
- **Placeholder pages** (favorites, recent, calendar): reduce padding `p-6` → `p-4` on `< 640px`
- **Login/Signup**: already responsive, no changes

## Files to Modify

| File | Changes |
|---|---|
| `src/components/MainArea.tsx` | Split toolbar, add bottom bar, responsive editor width/padding, keyboard handling |
| `src/components/AppHeader.tsx` | Compact header on mobile, larger touch targets |
| `src/components/NotesSidebar.tsx` | Increased item height on mobile, touch drag activation |
| `src/components/TrashTable.tsx` | Card layout on small screens |
| `src/app/globals.css` | Safe-area inset variables, bottom toolbar styles |
| `src/components/ui/sidebar.tsx` | Minor touch target adjustments if needed |

## Non-Goals

- No layout rewrite (no bottom nav, no sidebar replacement)
- No CSS framework change (Tailwind v4 stays)
- No changes to auth pages (already responsive)
- No changes to the TipTap editor internals — only the toolbar wrapper

## Success Criteria

1. All main pages (home, trash, admin) render correctly at 360px width
2. Bottom toolbar appears on `< 768px`, top toolbar on `>= 768px`
3. All toolbar actions work from the bottom bar
4. Sidebar opens as Sheet on mobile, collapsible on desktop
5. Note content is readable and editable at all breakpoints
6. Touch drag-and-drop works for sidebar notes
7. Keyboard does not obscure the editor or bottom toolbar
