# Sidebar Favorite Star Indicator Implementation Plan

> **For agentic workers:** Single-task implementation. One file change.

**Goal:** Show a filled amber star before favorited note titles in the sidebar.

**Architecture:** One-line JSX change in `renderNoteItem()` in `NotesSidebar.tsx`.

**Tech Stack:** React, Tailwind, lucide-react

---

### Task 1: Add star icon to favorited sidebar note items

**Files:**
- Modify: `src/components/NotesSidebar.tsx:555-556`

- [ ] **Step 1: Add star icon before note title**

In `renderNoteItem()`, inside the `Button` component, add a conditional `Star` icon before the title `<span>`:

```tsx
>
  {note.isFavorite && (
    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
  )}
  <span className="truncate">{note.title}</span>
</Button>
```

The `Star` import from `lucide-react` already exists in the file.

- [ ] **Step 2: Clean up dummy visual page**

Delete `src/app/dummy-visual/page.tsx` (throwaway page).

- [ ] **Step 3: Verify the change**

Run `npm run build` or `npm run dev` and confirm starred notes show the amber star in the sidebar.
