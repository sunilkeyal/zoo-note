# shadcn Drawer for Desktop Panels

**Date:** 2026-07-30  
**Scope:** Desktop only — Settings, Account, Import/Export panels

## Overview

Replace the three custom-built right-side sheet overlays (`SettingsSheet`, `AccountSheet`, `ImportExportSheet`) with the shadcn `Drawer` component (Base UI). The panels remain right-side, 320px wide, and always dismissible. No prop interface changes; no mobile impact.

## Architecture

Each sheet file is updated independently. `NotesSidebar.tsx` and all mobile components are untouched. The shadcn `drawer` primitive is added once via `pnpm dlx shadcn@latest add drawer`.

## What Changes Per Sheet File

### Removed from each file

- `useEffect` Escape key handler — Drawer handles this natively
- `if (!open) return null` mount guard — Drawer manages this
- Manual overlay div: `<div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />`
- Manual panel div: `<div className="fixed top-0 right-0 h-full w-80 ..." role="dialog">`

### Added to each file

```tsx
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
```

Drawer shell:
```tsx
<Drawer
  open={open}
  onOpenChange={(isOpen) => !isOpen && onClose()}
  swipeDirection="right"
>
  <DrawerContent className="w-80">
    <DrawerHeader>
      <DrawerTitle>{title}</DrawerTitle>
      <DrawerClose render={<button aria-label="Close" className="..." />}>
        <X size={15} />
      </DrawerClose>
    </DrawerHeader>
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* existing content unchanged */}
    </div>
  </DrawerContent>
</Drawer>
```

### Prop interfaces — unchanged

| Prop | Type | Notes |
|------|------|-------|
| `open` | `boolean` | Controls drawer visibility |
| `onClose` | `() => void` | Called when drawer closes for any reason |

`SettingsSheet` also keeps `density` / `onDensityChange`; `ImportExportSheet` keeps no additional props.

## Dismissal Behavior

Always dismissible — swipe, click-outside, and Escape all close the drawer. Import/Export operations continue running after dismissal (existing behavior preserved).

## Global CSS

One line added to `src/app/globals.css`, required for iOS Safari overlay positioning:

```css
body {
  position: relative;
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/SettingsSheet.tsx` | Replace custom overlay+panel with `<Drawer>` |
| `src/components/AccountSheet.tsx` | Replace custom overlay+panel with `<Drawer>` |
| `src/components/ImportExportSheet.tsx` | Replace custom overlay+panel with `<Drawer>` |
| `src/app/globals.css` | Add `body { position: relative; }` |
| `components.json` | Updated by shadcn CLI when drawer is added |
| `src/components/ui/drawer.tsx` | New file — shadcn drawer primitive |

## Files Not Changed

- `src/components/NotesSidebar.tsx` — trigger logic unchanged
- `src/components/MobileSettings.tsx` — mobile, out of scope
- `src/components/MobileAccount.tsx` — mobile, out of scope
- `src/components/MobileImportExport.tsx` — mobile, out of scope
- All dialog components — different use case

## Tests

The three existing sheet tests (`src/__tests__/account-sheet.test.tsx` and its counterparts for settings and import/export) must be updated:

- Selectors targeting the custom `fixed top-0 right-0` className are removed
- `role="dialog"` queries still work — shadcn Drawer provides this role natively
- Any test that renders the component in a closed state and asserts it returns `null` must be updated; shadcn Drawer renders a portal even when closed

## Out of Scope

- Mobile drawer or responsive Dialog+Drawer pattern
- Renaming files from `*Sheet` to `*Drawer`
- Snap points, swipe handle, or nested drawer features
