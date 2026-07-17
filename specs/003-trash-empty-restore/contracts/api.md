# API Contracts: Trash Empty & Restore Buttons

**Date**: 2026-07-17
**Feature**: 003-trash-empty-restore

## Overview

This document defines the API contracts for the trash empty and restore functionality. These contracts extend the existing trash API endpoints to support bulk operations.

## Existing Endpoints

### GET /api/trash

**Purpose**: Fetch all trash items for the current user

**Request**:
```http
GET /api/trash
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "_id": "string",
        "title": "string",
        "content": "string",
        "folderId": "string",
        "folderName": "string",
        "userId": "string",
        "position": 0,
        "isFavorite": false,
        "createdAt": "2026-07-17T00:00:00.000Z",
        "updatedAt": "2026-07-17T00:00:00.000Z",
        "isDeleted": true,
        "deletedAt": "2026-07-17T00:00:00.000Z"
      }
    ],
    "folders": [
      {
        "_id": "string",
        "name": "string",
        "userId": "string",
        "position": 0,
        "createdAt": "2026-07-17T00:00:00.000Z",
        "updatedAt": "2026-07-17T00:00:00.000Z",
        "isDeleted": true,
        "deletedAt": "2026-07-17T00:00:00.000Z"
      }
    ]
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### POST /api/trash/restore

**Purpose**: Restore items from trash to active state

**Request**:
```http
POST /api/trash/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "noteIds": ["string"],
  "folderIds": ["string"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "restoredNotes": 1,
    "restoredFolders": 1
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid request"
}
```

### DELETE /api/trash

**Purpose**: Permanently delete items from trash

**Request**:
```http
DELETE /api/trash
Authorization: Bearer <token>
Content-Type: application/json

{
  "noteIds": ["string"],
  "folderIds": ["string"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "deletedNotes": 1,
    "deletedFolders": 1
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid request"
}
```

## New UI Contracts

### Empty Trash Button

**Trigger**: User clicks "Empty Trash" button on trash page

**Preconditions**:
- User is authenticated
- Trash contains at least one item

**Flow**:
1. User clicks "Empty Trash" button
2. `EmptyTrashDialog` opens with item counts
3. User confirms deletion
4. System calls `permanentDeleteItems` with all trash item IDs
5. System shows success/error notification
6. Trash page updates to show empty state

**Success Criteria**:
- All trash items permanently deleted
- Trash page shows empty state
- Success notification displayed

**Error Handling**:
- Network failure: Show error notification with retry option
- Partial failure: Show notification with count of successful/failed operations

### Restore All Button

**Trigger**: User clicks "Restore All" button on trash page

**Preconditions**:
- User is authenticated
- Trash contains at least one item

**Flow**:
1. User clicks "Restore All" button
2. System calls `restoreItems` with all trash item IDs
3. System shows success/error notification
4. Trash page updates to show empty state
5. Notes/folders restored to original locations

**Success Criteria**:
- All trash items restored to original locations
- Trash page shows empty state
- Success notification displayed

**Error Handling**:
- Network failure: Show error notification with retry option
- Partial failure: Show notification with count of successful/failed operations

## Validation Rules

### Request Validation

1. **Note IDs**: Must be valid MongoDB ObjectIds
2. **Folder IDs**: Must be valid MongoDB ObjectIds
3. **Array Limits**: Maximum 100 items per request
4. **User Ownership**: All items must belong to the authenticated user

### Response Validation

1. **Success Flag**: Must be boolean
2. **Data Object**: Must contain operation counts
3. **Error Message**: Must be descriptive string

## Rate Limiting

### Current Limits

- No specific rate limiting for trash operations
- General API rate limiting applies (100 requests per minute per user)

### Recommendations

- Consider implementing request batching for large trash volumes
- Add progress indicators for operations > 50 items

## Error Codes

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request (invalid parameters)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (items don't exist)
- **500**: Internal Server Error

### Application Error Codes

- **TRASH_001**: Invalid item IDs
- **TRASH_002**: Items not found
- **TRASH_003**: Permission denied
- **TRASH_004**: Operation failed
- **TRASH_005**: Partial failure

## Testing Contracts

### Unit Tests

1. Test button click handlers
2. Test API call functions
3. Test state updates
4. Test error handling

### Integration Tests

1. Test complete user flow
2. Test API integration
3. Test UI updates
4. Test notification system

### Edge Case Tests

1. Test with empty trash
2. Test with large number of items
3. Test with network failures
4. Test with partial failures