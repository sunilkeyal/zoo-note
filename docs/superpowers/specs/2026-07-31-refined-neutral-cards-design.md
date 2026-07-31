# Refined Neutral — Nav + Detail Card Treatment

**Date:** 2026-07-31
**Branch:** `010-refined-neutral-cards`
**Status:** Approved (design)

## Summary

Enhance the visual treatment of the two floating "cards" in the desktop layout — the
left navigation sidebar and the detail/editor view — so they feel more premium and
clearly separated from the window, while staying fully neutral (grayscale). No layout,
structure, or component-API changes. Mobile is unaffected (it does not use these cards).

The single highest-impact change is introducing a faint tint on the app background so the
white cards visibly "float." Today `--background` is pure white and the cards are also
white/near-white, so only the drop shadow separates them.

## Goals

- Visual polish: deeper, softer, layered shadow; matched, slightly larger corner radius.
- Color/theming: faint neutral tint on the app background (light mode) for clear float.
- Spacing/density: keep the existing 14px gutter; ensure nav and detail read as a pair.

## Non-Goals

- No motion/animation work (hover, transitions, note-switch animation).
- No new brand/accent color; palette stays neutral grayscale.
- No spacing/density overhaul inside the nav item list.
- No changes to mobile layout or components.

## Chosen Direction

"Refined Neutral" with **Medium** float contrast, selected over Warm Paper and Cool Slate
during visual brainstorming.

## Design Details

Both cards use an identical recipe (radius + shadow + border) so the nav and detail view
are visually consistent.

### Light mode
- **App background** (`--background`): faint zinc, `oklch(0.968 0 0)` (≈ zinc-100), so the
  white cards separate clearly from the window.
- **Cards** (`--card`, `--sidebar`): stay white / near-white.
- **Corner radius:** `16px → 18px` on both cards.
- **Shadow:** layered two-part soft shadow (deeper, softer falloff) replacing the current
  single-layer shadow, e.g.
  `0 18px 44px -10px rgba(15,23,42,.16), 0 5px 14px -6px rgba(15,23,42,.09)`.
- **Border:** keep the existing `ring-1 ring-sidebar-border` hairline, tuned so it reads
  as quiet but visible.
- **Active nav item:** solid dark chip (already close to today's treatment).

### Dark mode
- **App background:** stays near-black (`oklch(0.145 0 0)`); already good.
- **Cards:** lift to `zinc-900`-ish (`oklch(0.205 0 0)`, current value).
- **Shadow:** stronger, e.g.
  `0 20px 48px -8px rgba(0,0,0,.65), 0 6px 16px -8px rgba(0,0,0,.5)`.
- **Border:** faint 1px light border (`rgba(255,255,255,.06)`) so card edges read on OLED.

### Gutter
- Unchanged at `14px` (`p-3.5`) around each card.

## Scope of Changes

- `src/components/ui/content-card.tsx` — detail view wrapper: radius + shadow + border.
- `src/components/ui/sidebar.tsx` (floating sidebar container, ~L178) — same radius +
  shadow + border, kept in sync with ContentCard.
- `src/app/globals.css` — `--background` tint (light); shadow tokens if extracted to
  variables for reuse.

The two card containers currently duplicate the same shadow/ring class string. As part of
this work, consider extracting the shared treatment into a single source of truth (a small
shared class or CSS variable set) so the nav and detail card cannot drift apart. This is a
targeted improvement directly serving the "read as a pair" goal, not unrelated refactoring.

## Testing / Verification

The app requires login, so real CSS behavior is verified via a temporary **public**
`src/app/debug-layout/page.tsx` route (added to the middleware matcher exclusion) rendering
the desktop shell with dummy content, then Playwright at width ≥ 768px (the cards/toolbar
are desktop-only) in both light and dark mode. Measure the cards' computed `border-radius`,
`box-shadow`, and background, and the window background tint. Remove the route and revert
the middleware change afterward.

Existing component tests for `ContentCard` and the sidebar assert structure/classes and
should continue to pass, since these are class/token changes only. Update any test that
pins the exact radius/shadow class string.

## Risks

- Low. Purely presentational. The main risk is the light-mode tint being too strong or too
  subtle; mitigated by the "Medium" choice and Playwright verification against the mockup.
