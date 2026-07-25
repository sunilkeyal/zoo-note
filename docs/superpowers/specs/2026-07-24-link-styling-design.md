# Design: Link Styling in Notes

**Date:** 2026-07-24
**Author:** zoo-note team

## Overview

Add link support to the TipTap editor so that links in notes look like clickable links (blue color, underline on hover) and support both auto-detecting pasted URLs and manual link creation.

## Goals

1. Links in notes should be visually distinct (styled as clickable links)
2. URLs pasted into notes should auto-convert to clickable links
3. Users should be able to manually create/edit/remove links via toolbar

## Implementation

### 1. Package Installation

Add `@tiptap/extension-link` to dependencies:

```bash
npm install @tiptap/extension-link
```

### 2. Editor Configuration

Update `src/components/MainArea.tsx` to include the Link extension:

```typescript
import Link from "@tiptap/extension-link"

// In useEditor extensions array:
Link.configure({
  openOnClick: false,  // Don't open links in edit mode
  autolink: true,      // Auto-detect URLs on paste
  linkOnPaste: true,   // Convert pasted URLs to links
})
```

### 3. Toolbar Button

Add a link button (chain icon) to both desktop and mobile toolbars in `MainArea.tsx`:

- **Desktop toolbar:** Add between existing formatting buttons
- **Mobile toolbar:** Add to the mobile toolbar

Button behavior:
- No selection: Show input to enter URL, create link with URL as text
- Text selected: Show input to enter URL, wrap selected text with link
- Click on existing link: Show input with current URL pre-filled, option to edit or remove

### 4. Link Styling

Add CSS rules to `src/app/globals.css`:

```css
.ProseMirror a {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}

.ProseMirror a:hover {
  opacity: 0.8;
}
```

### 5. Auto-detect URLs on Paste

The Link extension with `autolink: true` and `linkOnPaste: true` handles this automatically. Existing paste handlers in `MainArea.tsx` (for images) remain unchanged since they check for files first.

## Files Modified

1. `package.json` - Add `@tiptap/extension-link` dependency
2. `src/components/MainArea.tsx` - Add Link extension and toolbar button
3. `src/app/globals.css` - Add link styling

## Testing

- Paste a URL into a note - should auto-convert to clickable link
- Select text, click link button, enter URL - should create link
- Click on existing link - should show edit/remove options
- Links should be styled (blue, underline on hover)
