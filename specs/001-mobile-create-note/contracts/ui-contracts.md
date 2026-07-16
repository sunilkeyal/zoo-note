# UI Contracts: Mobile Create Note Enhancement

**Date**: 2026-07-15
**Feature**: Mobile Create Note Enhancement

## Component Contracts

### FolderPickerModal

A modal dialog that allows users to select a folder when creating a note from the Home/All Notes view.

**Props**:
```typescript
interface FolderPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  onSelect: (folderId: string | null) => void;
}
```

**Behavior**:
- Displays a list of folders with radio buttons
- "No folder" option at the top (creates note in root)
- "Confirm" button to apply selection
- Clicking outside or pressing Escape dismisses without selection
- Note is created before modal opens; folder is assigned on confirmation

**Accessibility**:
- Focus trapped within modal
- Escape key closes modal
- ARIA labels on folder list items

### Mobile FAB (Modified)

The floating action button ("+") that triggers note creation.

**Props**: No changes to existing props.

**Behavior**:
- Visible in Home/All Notes view (existing behavior)
- Visible in folder view (new behavior)
- On tap: creates note immediately via `createNote()` API
- Context-aware: in folder view, sets folderId directly; in Home view, opens FolderPickerModal

**Accessibility**:
- ARIA label: "Create new note"
- 44x44px minimum touch target

### AppLayout (Modified)

The main layout orchestrator that manages mobile screens.

**Behavior changes**:
- Remove `mobileScreen === "new-note"` state (no separate screen)
- After note creation, navigate to `/notes/[id]` (same as desktop)
- Hide tab bar when on note editor page (existing behavior, now applies to newly created notes)

## API Contracts

### Existing Endpoints (No Changes)

**POST /api/notes**
- Request: `{ title: string, folderId?: string, position?: number }`
- Response: `{ _id, title, content, folderId, userId, position, createdAt, updatedAt }`
- Status: 201 Created

**PUT /api/notes/:id**
- Request: `{ title?: string, content?: string, folderId?: string }`
- Response: `{ _id, title, content, folderId, userId, position, createdAt, updatedAt }`
- Status: 200 OK

**DELETE /api/notes/:id**
- Request: (none)
- Response: `{ success: true }`
- Status: 200 OK

## State Contracts

### AppLayout State

```typescript
interface AppState {
  mobileScreen: 'home' | 'folders' | 'folder-detail' | 'search' | 'favorites' | 'more';
  // Remove: 'new-note' screen
}
```

### Note Creation State

```typescript
interface NoteCreationState {
  isCreating: boolean;
  createdNoteId: string | null;
  showFolderPicker: boolean;
  initialFolderId: string | null; // null = Home view, string = folder view
}
```
