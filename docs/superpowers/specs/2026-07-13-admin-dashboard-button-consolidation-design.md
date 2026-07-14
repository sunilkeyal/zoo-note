# Admin Dashboard Button Consolidation

## Summary

Consolidate three admin maintenance buttons (Refresh, Cleanup orphaned images, Sweep orphans) into a single button bar at the top of the admin dashboard, with consistent naming, styling, and UX patterns.

## Current State

| Button | Current Location | Current Name | Confirmation | Feedback |
|---|---|---|---|---|
| Dashboard header | `src/app/admin/page.tsx:288` | "Refresh" | None | Spinner on button |
| Application Metrics section | `src/app/admin/page.tsx:335` | "Clean up orphaned images" | Inline confirmation | Inline success message |
| Imports tab header | `src/app/admin/imports/page.tsx:230` | "Sweep Orphans" | Dialog popup | Toast notification |

## Proposed Changes

### Button Bar Layout

All three buttons move to the dashboard header, displayed in a horizontal row:

```
[Reload Stats]  |  [Delete Orphaned Images]  [Delete Orphaned R2 Imports]
```

A visual separator (`|`) divides the read-only action from the destructive actions.

### Button Specifications

| Button | API Endpoint | Style | Confirmation | Feedback |
|---|---|---|---|---|
| **Reload Stats** | `GET /api/admin/stats` + 4x `GET /api/admin/r2` | Standard | None | Spinner on button while loading, data updates in place |
| **Delete Orphaned Images** | `DELETE /api/admin/orphaned-images` | Destructive (red) | Inline: "Delete all images not referenced in any note?" + Yes/Cancel | Inline green success: "Deleted X image(s), freed Y bytes" |
| **Delete Orphaned R2 Imports** | `POST /api/admin/r2/sweep` | Destructive (red) | Inline: "Scan R2 import files and delete any without a matching job?" + Yes/Cancel | Inline green success: "Found X orphaned import(s), deleted Y file(s)" |

### Rename Summary

- "Refresh" → "Reload Stats"
- "Clean up orphaned images" → "Delete Orphaned Images"
- "Sweep Orphans" → "Delete Orphaned R2 Imports"

### UX Pattern

Both destructive buttons follow the same pattern:

1. **Idle state:** Button visible with destructive styling (red variant)
2. **Clicked:** Button replaced with inline confirmation message + Yes/Cancel buttons
3. **Confirmed:** Loading state shown, then inline green success message with result counts
4. **Cancelled:** Returns to idle state

The reload button follows a simpler pattern:

1. **Clicked:** Spinner shown on button, button disabled
2. **Complete:** Spinner removed, button re-enabled, dashboard data refreshed

## Files to Modify

### Frontend

- `src/app/admin/page.tsx` — Move cleanup button from Application Metrics section to header, rename all three buttons, add destructive styling to delete buttons, move sweep handler and state from imports page
- `src/app/admin/imports/page.tsx` — Remove sweep orphans button and related handler/state

### Backend

No backend changes needed. All three API endpoints remain the same.

## Out of Scope

- Adding new maintenance actions to the button bar
- Changing the backend API logic for any of the three operations
- Modifying the Application Metrics section layout (other than removing the cleanup button from it)
