# ZooNoteBar to ZooNote Rebrand Design

## Overview

Rebrand the application from ZooNoteBar to ZooNote. The logo asset `public/ZooNote.png` already exists. All text and image references to "ZooNoteBar" will be updated to "ZooNote".

## Scope

All user-facing and code-level references to "ZooNoteBar" will be changed, including:

- Page title, meta description, and favicon in `src/app/layout.tsx`
- Logo image source and alt text in `src/components/NotesSidebar.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- Application display name in `src/app/admin/settings/page.tsx`
- Sidebar header text in `src/components/NotesSidebar.tsx`
- Email subject lines and body copy in `src/lib/email.ts`
- Test expectations in `src/__tests__/email.test.ts` and `src/__tests__/notes-sidebar.test.tsx`

## Asset Changes

- `public/ZooNote.png` — keep (already in place)
- `public/ZooNoteBar.png` — delete

## Files to Modify

| File | Change |
|---|---|
| `src/app/layout.tsx` | `ZooNoteBar` → `ZooNote` for title, description, icon path |
| `src/components/NotesSidebar.tsx` | `/ZooNoteBar.png` → `/ZooNote.png`, `alt="ZooNoteBar"` → `alt="ZooNote"`, text "ZooNoteBar" → "ZooNote" |
| `src/app/login/page.tsx` | `/ZooNoteBar.png` → `/ZooNote.png`, `alt="ZooNoteBar"` → `alt="ZooNote"` |
| `src/app/signup/page.tsx` | `/ZooNoteBar.png` → `/ZooNote.png`, `alt="ZooNoteBar"` → `alt="ZooNote"` |
| `src/app/admin/settings/page.tsx` | Display text "ZooNoteBar" → "ZooNote" |
| `src/lib/email.ts` | Subject lines and body text `ZooNoteBar` → `ZooNote` |
| `src/__tests__/email.test.ts` | Expected subject strings `ZooNoteBar` → `ZooNote` |
| `src/__tests__/notes-sidebar.test.tsx` | Expected text `ZooNoteBar` → `ZooNote` |
| `public/ZooNoteBar.png` | Delete file |

## Out of Scope

- No infrastructure changes (Docker, CI/CD, etc.)
- No functional or behavior changes
- No database schema changes
- Project/repository name (`zoo-note-bar`) is not changed

## Verification

After changes, the app should build without errors and all tests should pass.
