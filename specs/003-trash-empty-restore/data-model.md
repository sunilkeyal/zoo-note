# Data Model: Trash Empty & Restore Buttons

**Date**: 2026-07-17
**Feature**: 003-trash-empty-restore

## Existing Entities

### Note

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `_id` | string | Unique identifier | Primary key |
| `title` | string | Note title | Required |
| `content` | string | Note content | Optional |
| `folderId` | string | Parent folder ID | Optional, foreign key |
| `folderName` | string | Parent folder name | Optional, denormalized |
| `userId` | string | Owner user ID | Optional, foreign key |
| `position` | number | Sort position | Required |
| `isFavorite` | boolean | Favorite flag | Optional, default false |
| `favoritedAt` | string | Favorite timestamp | Optional |
| `createdAt` | string | Creation timestamp | Required |
| `updatedAt` | string | Last update timestamp | Required |
| `isDeleted` | boolean | Soft delete flag | Optional, default false |
| `deletedAt` | string | Deletion timestamp | Optional |

### Folder

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `_id` | string | Unique identifier | Primary key |
| `name` | string | Folder name | Required |
| `userId` | string | Owner user ID | Optional, foreign key |
| `position` | number | Sort position | Required |
| `createdAt` | string | Creation timestamp | Required |
| `updatedAt` | string | Last update timestamp | Required |
| `isDeleted` | boolean | Soft delete flag | Optional, default false |
| `deletedAt` | string | Deletion timestamp | Optional |

## State Transitions

### Note States

```
Active → Soft Deleted → Restored to Active
Active → Soft Deleted → Permanently Deleted
```

### Folder States

```
Active → Soft Deleted → Restored to Active
Active → Soft Deleted → Permanently Deleted
```

## Relationships

### Note to Folder

- **Type**: Many-to-one (optional)
- **Foreign Key**: `Note.folderId` → `Folder._id`
- **Cascade**: When folder is deleted, notes in folder are also soft deleted
- **Restore**: When folder is restored, notes in folder are also restored

### User Ownership

- **Type**: One-to-many
- **Foreign Key**: `Note.userId` → `User._id`, `Folder.userId` → `User._id`
- **Constraint**: Users can only access their own trash items

## Validation Rules

### Trash Operations

1. **Empty Trash**: All items with `isDeleted: true` and `userId: currentUser` are permanently deleted
2. **Restore All**: All items with `isDeleted: true` and `userId: currentUser` are restored to active state
3. **Partial Operations**: System supports restoring/deleting subsets of trash items

### Data Integrity

1. **Soft Delete**: Must set `isDeleted: true` and `deletedAt: timestamp`
2. **Restore**: Must set `isDeleted: false` and clear `deletedAt`
3. **Permanent Delete**: Must remove document from database
4. **Auto-Purge**: Items with `deletedAt` older than 7 days are permanently deleted

## Indexes

### Existing Indexes

- `Note.userId`: For user-specific queries
- `Note.folderId`: For folder-based queries
- `Note.isDeleted`: For trash queries
- `Note.deletedAt`: For auto-purge queries
- `Folder.userId`: For user-specific queries
- `Folder.isDeleted`: For trash queries
- `Folder.deletedAt`: For auto-purge queries

### Recommended Indexes

- Compound index on `(userId, isDeleted)` for trash page queries
- Compound index on `(isDeleted, deletedAt)` for auto-purge operations

## Scale Considerations

### Expected Data Volume

- **Notes per user**: 10-1000 notes
- **Folders per user**: 5-100 folders
- **Trash items per user**: 0-100 items (typically small due to 7-day auto-purge)

### Performance Implications

- **Bulk Operations**: Up to 100 items can be restored/deleted in single operation
- **Query Performance**: Indexed queries should complete in <100ms
- **Network Latency**: Bulk operations may take 1-3 seconds depending on item count

## Migration Considerations

### No Schema Changes Required

This feature uses existing data model and API endpoints. No database migrations needed.

### Backward Compatibility

- Existing trash items remain accessible
- Existing API contracts maintained
- No breaking changes to data structure