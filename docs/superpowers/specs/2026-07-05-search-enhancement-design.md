# Search Enhancement — Dropdown Results

## Summary
Replace the existing search result display on the home page and sidebar with dropdown-style results. On the home page, search results appear as a dropdown below the input instead of replacing the sections. In the sidebar, search results appear as a dropdown instead of filtering the note list in-place. Favorites and Recent pages keep their current in-place filter behavior.

## Changes

### 1. Shared Component — `src/components/SearchDropdown.tsx`

A reusable dropdown component built on `cmdk` (Command) for keyboard navigation:

```
Props:
  open: boolean
  query: string
  results: Note[]
  onSelect: (noteId: string) => void
  onClose: () => void
  inputRef: RefObject<HTMLInputElement>
  variant: "home" | "sidebar"
  maxItems?: number
```

- Uses `Command` from `@/components/ui/command` for keyboard navigation (arrow keys, Enter)
- Wraps `CommandList` + `CommandItem` in a positioned overlay (absolute below the input)
- Renders a result count header ("N notes found")
- Each item: file icon + title + content preview (truncated)
- Shows "No notes found" when query has no matches
- Positioning: absolute dropdown below the input, full-width on mobile
- Closes on blur/outside click (with delay to allow click registration)
- `variant="home"` vs `"sidebar"` controls styling (size, spacing)

### 2. Home Page — `src/components/HomePage.tsx`

- Remove the `searchQuery.trim()` conditional that replaces sections with a flat results list
- Replace it with `SearchDropdown` rendered below the search input
- Favorites and Recent Notes sections remain visible at all times (both mobile and desktop)
- On result select: navigate to note with `?q=` param, close dropdown
- On outside click: close dropdown
- Search input stays the same (with search icon on the left)
- Width: `max-w-md` (same as current input)

### 3. Sidebar — `src/components/NotesSidebar.tsx`

- Add `Search` icon inside the search input on the left (like home page)
- Remove the `filtered` logic that narrows the visible note list based on search
- Replace in-place filtering with `SearchDropdown` rendered below the search input
- Full note list (folders + notes) remains visible when search is open
- When search is not open, sidebar looks the same as before
- On result select: navigate to note with `?q=` param, close dropdown, close search
- On outside click: close dropdown (no navigation)
- Width: matches the sidebar input width

### 4. Favorites & Recent — No changes

Keep current in-place filter behavior.

### 5. Mobile

Both dropdowns work on mobile:
- Dropdown is full-width relative to the search input
- Touch-friendly tap targets (min 44px height on items)
- Works with virtual keyboard

### No other changes

- No API changes, no DB changes, no new types
- All filtering remains client-side
- Existing `stripHtml` usage stays the same
