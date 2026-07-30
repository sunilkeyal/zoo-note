# Phase 1 Data Model: Consolidate Sidebar Toolbar

**Feature**: 009-consolidate-sidebar-toolbar
**Date**: 2026-07-30

## Entities

**None.** This feature is a UI layout and control-placement change. It introduces no new persisted data, no schema changes, and no new API payloads.

## Existing State Reused (not modified)

| State | Source | Usage in this feature |
|-------|--------|-----------------------|
| Theme preference (`theme`, `setTheme`) | `ThemeSyncContext` (`useThemeSync`) | Consumed by the relocated theme toggle; persistence/sync behavior is reused unchanged (FR-002). |
| Expanded folders (`expandedFolders`, `toggleFolder`) | `NotesSidebar` local/context state | Unchanged; the toggle is added adjacent to the existing Expand/Collapse controls. |

## Notes

- No migrations, indexes, or validation rules apply.
- No changes to MongoDB collections or R2 storage.
