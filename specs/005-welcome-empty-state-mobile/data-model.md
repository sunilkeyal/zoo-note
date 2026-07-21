# Data Model: Welcome Empty State Mobile

**Date**: 2026-07-21
**Feature**: Welcome Empty State Mobile

## Summary

This is a UI-only feature. No data model changes are required. The existing Note and Folder entities remain unchanged.

## Existing Entities (Reference)

### Note

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `title` | string | Note title |
| `content` | string | HTML content |
| `folderId` | ObjectId (optional) | Associated folder |
| `userId` | ObjectId | Owner |
| `position` | number | Sort order |
| `isFavorite` | boolean | Starred status |
| `favoritedAt` | Date (optional) | When favorited |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |
| `isDeleted` | boolean | Soft-delete flag |
| `deletedAt` | Date (optional) | Deletion timestamp |

### Folder

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `name` | string | Folder name |
| `userId` | ObjectId | Owner |
| `position` | number | Sort order |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |
| `isDeleted` | boolean | Soft-delete flag |
| `deletedAt` | Date (optional) | Deletion timestamp |

## State Transitions

The empty state is determined by the `notes` array length in `NoteContext.tsx`:

```
notes.length === 0 → Show welcome empty state (NEW)
notes.length > 0   → Show NoteCardGrid with note cards (EXISTING)
```

No new state transitions are introduced.
