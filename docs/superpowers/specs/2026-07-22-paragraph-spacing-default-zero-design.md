# Paragraph Spacing Default: 0px

**Date:** 2026-07-22
**Status:** Approved

## Summary

Change the default paragraph spacing in the editor from 10px bottom margin to 0px. Update the toolbar UI to reflect the new default and remove the now-redundant "None" preset.

## Motivation

New notes (and existing notes without explicit spacing set) currently render paragraphs with a 10px bottom margin inherited from the global CSS rule. The desired default is no spacing between paragraphs (0px), giving a denser, more note-like feel out of the box.

## Design

### 1. CSS Default (`src/app/globals.css`)

Change line 141 from:
```css
.ProseMirror p { margin: 0 0 10px 0; }
```
to:
```css
.ProseMirror p { margin: 0; }
```

This is the authoritative change. The `ParagraphSpacing` extension stores a `paragraphSpacing` attribute as an inline style only when the user explicitly selects a preset. When no inline style is present, the CSS rule governs — so changing it here is sufficient.

### 2. Toolbar Presets (`src/components/MainArea.tsx`)

Update `SPACING_PRESETS`:

| Before | After |
|--------|-------|
| `{ label: "Default", value: null }` | `{ label: "Default (0px)", value: null }` |
| `{ label: "None", value: "0px" }` | *(removed)* |
| `{ label: "Tight", value: "4px" }` | unchanged |
| `{ label: "Compact", value: "8px" }` | unchanged |
| `{ label: "Normal", value: "10px" }` | unchanged |
| `{ label: "Relaxed", value: "24px" }` | unchanged |
| `{ label: "Loose", value: "32px" }` | unchanged |

"None" (which was `"0px"` as an explicit inline style) is removed because "Default (0px)" now produces the same visual result via CSS, without writing an inline style to the document.

### 3. Scope and Affected Notes

- **New notes:** Paragraphs get 0px spacing by default.
- **Existing notes without explicit spacing:** Also visually change to 0px on next load (a side effect of the CSS change — accepted by the user).
- **Existing notes with explicit spacing (Tight, Normal, etc.):** Unchanged; their inline `margin` styles take precedence over the CSS rule.

## Files Changed

| File | Change |
|------|--------|
| `src/app/globals.css` | Line 141: `margin: 0 0 10px 0` → `margin: 0` |
| `src/components/MainArea.tsx` | Rename "Default" → "Default (0px)", remove "None" preset |

## Out of Scope

- The `ParagraphSpacing` extension itself requires no changes.
- No database migration needed; existing inline styles continue to work.
- No test changes needed (tests mock the spacing commands and do not assert preset labels).
