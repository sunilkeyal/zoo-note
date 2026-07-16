# Data Model: Mobile Create Note Enhancement

**Date**: 2026-07-15
**Feature**: Mobile Create Note Enhancement

## Entities

### Note

The existing Note entity is reused without modification. No schema changes are required.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier (auto-generated) |
| `title` | String | Note title (default: "Untitled Note") |
| `content` | String | Rich text body (HTML format from TipTap) |
| `folderId` | ObjectId? | Optional reference to Folder (null = root) |
| `userId` | ObjectId | Owner of the note |
| `position` | Number | Sort order within folder/root |
| `isDeleted` | Boolean | Soft delete flag (trash) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last modification timestamp |

### Folder

The existing Folder entity is reused without modification. No schema changes are required.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier (auto-generated) |
| `name` | String | Folder name |
| `userId` | ObjectId | Owner of the folder |
| `position` | Number | Sort order |
| `createdAt` | Date | Creation timestamp |

## State Transitions

### Note Creation Flow (Mobile)

```
[User taps "+"]
       │
       ▼
[POST /api/notes] ──► [Note created on server]
       │
       ▼
[Check context]
       │
       ├── [In folder view] ──► [Set folderId to current folder] ──► [Navigate to editor]
       │
       └── [In Home view] ──► [Show folder picker modal]
                                    │
                                    ▼
                              [User picks folder or dismisses]
                                    │
                                    ▼
                              [PUT /api/notes/:id] ──► [Navigate to editor]
```

### Empty Note Cleanup Flow

```
[User navigates away from editor]
       │
       ▼
[Check if note has edits]
       │
       ├── [Title = "Untitled Note" AND content = ""] ──► [DELETE /api/notes/:id]
       │
       └── [Title ≠ "Untitled Note" OR content ≠ ""] ──► [Note persists]
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| Note | title | Required, max 200 characters |
| Note | content | Optional (can be empty string) |
| Note | folderId | Optional, must reference valid Folder if provided |
| Note | userId | Required, must reference valid User |

## Indexes

No new indexes required. Existing indexes on `Note` (userId, folderId, isDeleted) are sufficient for the queries involved in this feature.
