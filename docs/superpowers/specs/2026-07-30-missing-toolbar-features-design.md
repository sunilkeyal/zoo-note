# Design: Add 5 Missing Editor Toolbar Features

**Date:** 2026-07-30
**Status:** Approved

## Summary

The TipTap editor already enables five StarterKit capabilities that have no toolbar
button (they only work via keyboard/Markdown shortcuts). This adds visible buttons for
them to both the desktop and mobile toolbars:

1. **Blockquote** (`toggleBlockquote`)
2. **Inline code** (`toggleCode`)
3. **Code block** (`toggleCodeBlock`)
4. **Horizontal rule** (`setHorizontalRule`)
5. **Undo / Redo** (`undo` / `redo`, history is already enabled via StarterKit)

No new TipTap extensions are required — all five commands are provided by the existing
`StarterKit` configuration in `src/components/MainArea.tsx`.

## Architecture

Changes span three files:

- `src/components/MainArea.tsx` — the `DesktopToolbar` and `MobileToolbar` components,
  plus icon imports from `lucide-react` (already a dependency).
- `src/app/globals.css` — new ProseMirror styles for blockquote, inline code, code
  block, and horizontal rule (see "Editor CSS" below).
- `src/__tests__/main-area.test.tsx` — extended toolbar tests.

### Icons (lucide-react)

| Feature | Icon |
|---|---|
| Blockquote | `Quote` |
| Inline code | `Code` |
| Code block | `SquareCode` |
| Horizontal rule | `Minus` |
| Undo | `Undo2` |
| Redo | `Redo2` |

## Desktop Toolbar Layout

The toolbar is reorganized into conventional groups separated by vertical dividers.
New items are shown in **bold**.

| Group | Buttons |
|---|---|
| **History** | **Undo**, **Redo** |
| **Inline** | Bold, Italic, Underline, Strikethrough, **Inline code**, Link |
| **Blocks** | **Blockquote**, **Code block**, Bullet list, Ordered list, Todo list |
| **Insert** | Table, **Horizontal rule**, Image |
| **Color** | Text color, Highlight, Paragraph spacing |
| **Styles** | Headings, Font family, Font size |

Notable moves:

- **Undo/Redo** go far-left, per word-processor convention.
- **Image** moves from the far right into the new **Insert** group next to Table and the
  horizontal rule (more logical grouping). The hidden `<input type="file">` and its
  `fileInputRef` wiring move with it.

## Mobile Toolbar Layout

The mobile toolbar is a horizontally-scrollable bottom bar with 44px touch targets plus a
"+" overflow popover.

- **Undo, Redo** pinned at the far left (before Bold) as quick actions.
- **Inline code** added to the inline group (after Link).
- **Blockquote, Code block** added near the list buttons.
- **Horizontal rule** placed inside the existing "+" overflow popover (low-frequency
  insert action; keeps the scroll bar shorter). It gets its own labeled section in the
  popover.

## Behavior

- **Toggles with active state:** Inline code, Blockquote, Code block use the same
  `editor.isActive(...)` highlighting pattern as Bold (desktop `Toggle` `pressed`,
  mobile `bg-accent` class).
- **Undo/Redo:** Rendered as plain buttons. They are visually **disabled**
  (`opacity-50 pointer-events-none` / `disabled` attribute) when
  `editor.can().undo()` / `editor.can().redo()` returns false. Commands:
  `editor.chain().focus().undo().run()` and `.redo().run()`.
- **Horizontal rule:** One-shot insert via `editor.chain().focus().setHorizontalRule().run()`;
  no active state.
- Toolbar re-render on selection change is already handled by the existing
  `useToolbarReRender(editor)` hook in both toolbars, so active/disabled states update
  correctly.

## Editor CSS

Tailwind's preflight resets browser defaults, and the current `globals.css` has **no**
styling for blockquote, inline code, code block, or `<hr>` inside `.ProseMirror`. Without
styles these elements render nearly invisibly. New rules are added to `globals.css`
(alongside the existing `.ProseMirror` element rules, ~line 154-166), theme-aware via
existing CSS variables (`--border`, `--muted`, `--muted-foreground`):

- **Blockquote:** left border (3px, `--border`), left padding, muted foreground, vertical
  margin.
- **Inline code:** `--muted` background, small padding, rounded corners, monospace font,
  slightly reduced font size.
- **Code block (`pre`):** `--muted` background, padding, rounded corners, monospace,
  horizontal scroll on overflow; reset the inner `code` background so it doesn't
  double-style.
- **Horizontal rule (`hr`):** 1px `--border` top border, vertical margin, no default
  browser styling.

## Testing

Extend `src/__tests__/main-area.test.tsx`:

- Assert the new desktop buttons render (via tooltip labels / accessible names).
- Assert clicking each new button invokes the corresponding editor command on the mocked
  editor chain (`toggleBlockquote`, `toggleCode`, `toggleCodeBlock`,
  `setHorizontalRule`, `undo`, `redo`).
- Follow the existing mock/assertion style already used for the current toolbar tests.

## Out of Scope

- No new keyboard shortcuts (StarterKit defaults already exist).
- No changes to OneNote import, export, or PDF rendering.
