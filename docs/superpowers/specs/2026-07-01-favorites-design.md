# Favorites — Design Spec

**Date:** 2026-07-01  
**Branch:** feature/favorite-notes  
**Status:** Approved

---

## Overview

Add a favorites system that lets users mark notes as favorites via a right-click context menu toggle or a clickable star icon on note cards. Favorited notes appear in a dedicated Favorites section on the home tab (top 5, sorted by when favorited) and on a full `/favorites` page (like the Recent page). The sidebar shows a Favorites nav item with a count badge.

---

## Data Model

### Note type (`src/types/index.ts`)

Add two optional fields:

```typescript
export interface Note {
  // ... existing fields
  isFavorite?: boolean;      // true when favorited
  favoritedAt?: string;      // ISO date string, set when favorited
}
```

### MongoDB

No new collection needed. Add fields to the `notes` collection. New compound index for efficient queries:

```javascript
db.notes.createIndex({ userId: 1, isFavorite: 1, favoritedAt: -1 })
```

---

## API

### `PATCH /api/notes/[id]/favorite`

- No request body required
- Toggles `isFavorite` between `true`/`false`
- Sets `favoritedAt: new Date()` when favoriting
- Sets `favoritedAt: null` when unfavoriting
- Updates `updatedAt` timestamp
- Returns the updated note document
- Authorization: scoped to the authenticated user's notes

---

## State Management (`src/contexts/NoteContext.tsx`)

### New method: `toggleFavorite(noteId: string)`

- Optimistic update: toggles `isFavorite` and sets `favoritedAt` locally first
- Calls `PATCH /api/notes/[id]/favorite`
- Reverts on failure

### New derived array: `favoriteNotes`

- Filtered from `notes` where `isFavorite === true`
- Sorted by `favoritedAt` descending
- Used by home tab and favorites page

---

## UI Components

### Sidebar (`src/components/NotesSidebar.tsx`)

- Favorites nav item shows a filled star icon
- Count badge next to label showing `favoriteNotes.length`
- Active state when on `/favorites`
- Links to `/favorites`

### Note cards (star icon)

- Star (★) icon displayed on every note card across the app
- Filled yellow (`#eab308`) when `isFavorite === true`
- Outline (gray) when `isFavorite === false` or undefined
- Clicking the star toggles favorite state (calls `toggleFavorite`)
- Hover state: yellow tint

### Context menu

- Every note context menu (sidebar, home, recent, favorites pages) includes a toggle option:
  - "Add to Favorite" — when note is not favorited (yellow star icon)
  - "Remove from Favorite" — when note is favorited (red text, filled star icon)
- Position: between "Download PDF" and the separator before "Move to trash"

### Home tab (`src/components/HomePage.tsx`)

- Replace the current placeholder "Favorites" section
- Shows top 5 notes from `favoriteNotes` (sorted by `favoritedAt` desc)
- Section heading: star icon + "Favorites" + "View all →" link to `/favorites`
- Same card layout as the Recent Notes section
- Empty state: no favorites message

### Favorites page (`/favorites`)

- Replace the placeholder "Coming soon" stub at `src/app/favorites/page.tsx`
- Full grid view matching the Recent page layout but showing only favorited notes
- Sorted by `favoritedAt` descending
- Hero card for the most recently favorited note (same treatment as Recent page hero)
- Filter input to search by title
- Empty state: "No favorites yet. Right-click any note and select 'Add to Favorite'."

---

## Files to Modify

| File | Change |
|---|---|
| `src/types/index.ts` | Add `isFavorite`, `favoritedAt` to `Note` |
| `src/lib/mongodb.ts` | Add compound index for favorites |
| `src/app/api/notes/[id]/favorite/route.ts` | New file — toggle favorite endpoint |
| `src/contexts/NoteContext.tsx` | Add `toggleFavorite`, `favoriteNotes` |
| `src/components/NotesSidebar.tsx` | Add Favorites nav item with count badge |
| `src/components/HomePage.tsx` | Replace placeholder favorites section |
| `src/app/favorites/page.tsx` | Replace placeholder with full favorites page |
| `src/app/favorites/layout.tsx` | Layout matches Recent page pattern (identical) ✅ |
| `src/components/ui/context-menu.tsx` | No changes needed (already generic) |

### Context menu locations to update

| File | Add toggle favorite item |
|---|---|
| `src/components/NotesSidebar.tsx` | Sidebar note items (~line 546-569) |
| `src/app/recent/page.tsx` | Recent page note cards (~line 197-253) |
| `src/app/favorites/page.tsx` | Favorites page note cards (new) |

---

## Error Handling

- API returns 401 if unauthenticated, 404 if note not found or not owned by user
- Optimistic update reverts on API failure (network error, server error)
- Star icon remains responsive during update (disabled state while syncing not required)

### Bugfix — PUT note response missing favorite fields

When editing a favorited note's content/title in the detail editor, `updateNote` replaces the note in state with the `PUT /api/notes/[id]` response, which was missing `isFavorite` and `favoritedAt`. Fixed by adding those fields to the response object in `src/app/api/notes/[id]/route.ts`.

---

## Testing

- Unit tests for `toggleFavorite` in NoteContext
- API route test for `PATCH /api/notes/[id]/favorite`
- Verify home tab shows max 5 favorites sorted by `favoritedAt`
- Verify favorites page shows all favorites in correct order
- Verify context menu shows correct toggle text based on state
- Verify star icon click toggles state
