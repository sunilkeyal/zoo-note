# Research: Mobile Create Note Enhancement

**Date**: 2026-07-15
**Feature**: Mobile Create Note Enhancement

## Research Tasks

### 1. How does the current desktop create note flow work?

**Decision**: Desktop creates note immediately via `POST /api/notes` with default title "Untitled Note", then navigates to the editor. No separate "create" screen.

**Rationale**: This is the existing behavior in `NotesSidebar.tsx` (line 458) and `HomePage.tsx` (line 117). The `createNote()` function in `NoteContext.tsx` sends a POST to `/api/notes` and returns the created note.

**Alternatives considered**: Separate "new note" screen (current mobile approach) — rejected because it creates a two-step flow and doesn't match desktop behavior.

### 2. How does the existing mobile toolbar work?

**Decision**: The `MobileToolbar` component in `MainArea.tsx` (lines 400-588) provides the full formatting toolbar with horizontal scrolling and a "+" overflow menu.

**Rationale**: The toolbar is already functional and tested. It includes bold, italic, underline, strikethrough, headings, lists, task lists, tables, text color, highlight color, image insertion, and a "+" overflow menu for font size, font family, and paragraph spacing.

**Alternatives considered**: Simplified toolbar — rejected because the user wants full feature parity with desktop.

### 3. How does autosave work in the editor?

**Decision**: Title autosaves with 600ms debounce, content autosaves with 1000ms debounce via `handleUpdate` in `MainArea.tsx` (lines 590-609).

**Rationale**: The existing autosave mechanism works for newly created notes because the note is created immediately on the server (has an ID), then autosave updates it via `PUT /api/notes/:id`.

**Alternatives considered**: Manual save — rejected because it doesn't match desktop behavior.

### 4. How should the folder picker modal be implemented?

**Decision**: Use shadcn/ui Dialog component for the folder picker modal, matching existing modal patterns in the codebase.

**Rationale**: The project already uses shadcn/ui for modals (e.g., confirmation dialogs). A Dialog with a list of folders and a "Confirm" button is consistent with existing patterns.

**Alternatives considered**: Inline folder selector — rejected because it would require more screen space and wouldn't match existing modal patterns.

### 5. How should empty note cleanup work?

**Decision**: Track whether the user has made any edits to the note. If the user navigates away without any edits (title still "Untitled", no content), delete the note via `DELETE /api/notes/:id`.

**Rationale**: This matches the user's requirement to auto-delete empty notes when navigating away. The check is simple: compare current state to initial state.

**Alternatives considered**: Time-based cleanup — rejected because it's more complex and less predictable than navigation-based cleanup.

### 6. How does the folder view currently work?

**Decision**: `MobileFolderDetail.tsx` displays notes filtered to a specific folder. It doesn't have a "+" button currently.

**Rationale**: Adding a "+" button to `MobileFolderDetail.tsx` is straightforward — similar to the FAB in the home view, but creating notes directly in the current folder.

**Alternatives considered**: No changes to folder view — rejected because the user explicitly requested "+" in folder views.
