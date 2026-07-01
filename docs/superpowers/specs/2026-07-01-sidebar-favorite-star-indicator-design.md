# Sidebar Favorite Star Indicator

## Summary
Show a filled amber star icon before favorited note titles in the sidebar, matching the Notion/Obsidian convention.

## Changes
- **File:** `src/components/NotesSidebar.tsx`
- **Location:** Inside `renderNoteItem()`, within the `Button` component, before the title `<span>`
- **Condition:** Only when `note.isFavorite` is true
- **Icon:** `<Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />`
- **Import:** `Star` from `lucide-react` (already imported)

## Rationale
- Visual scanning: spots important notes at a glance in long folders
- Confirmation feedback: star appears/disappears immediately on toggle
- Consistency: matches home page favorites section and context menu styling
- Industry pattern: same as Notion and Obsidian

## Before/After

**Before:**
```tsx
<Button ...>
  <span className="truncate">{note.title}</span>
</Button>
```

**After:**
```tsx
<Button ...>
  {note.isFavorite && (
    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
  )}
  <span className="truncate">{note.title}</span>
</Button>
```

## No other changes
- No DB changes, no API changes, no new types
- Works in both expanded and collapsed sidebar modes (star renders as part of the button content)
- No testing impact
