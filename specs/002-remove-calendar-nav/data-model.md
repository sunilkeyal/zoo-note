# Data Model: Remove Calendar Nav Bar

**Date**: 2026-07-17
**Feature**: Remove Calendar Nav Bar
**Branch**: 002-remove-calendar-nav

## Summary

No data model changes required. This feature is purely a UI modification that removes a navigation item.

## Entities

### Navigation Item (existing)

- **Description**: A menu entry in the sidebar that links to a specific page
- **Attributes**: label, icon, href, isActive
- **Relationships**: Part of Sidebar component
- **Changes**: One instance (calendar) will be removed

### Sidebar (existing)

- **Description**: The main navigation component that displays menu items
- **Attributes**: items array, density, etc.
- **Relationships**: Contains Navigation Items
- **Changes**: Items array will have one fewer element

## State Transitions

None. No lifecycle changes.

## Validation Rules

- Sidebar must maintain layout consistency after removal
- Keyboard navigation order must remain logical (removal only, no reordering)

## Assumptions

- No database changes required
- No API changes required
- No migration needed