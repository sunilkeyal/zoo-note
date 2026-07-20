# Data Model: Keyboard Navigation for Left Sidebar

**Date**: 2026-07-20
**Feature**: 004-keyboard-nav-sidebar

## Summary

This feature does not introduce new data entities or modify existing data models. It is a pure UI/accessibility enhancement that adds keyboard navigation behavior to existing sidebar components.

## State (Client-Side Only)

The keyboard navigation hook maintains ephemeral state that is not persisted:

| State | Type | Scope | Persistence |
| --- | --- | --- | --- |
| `focusedIndex` | `number` | Component mount | None (resets on unmount) |
| `focusableItems` | `Element[]` | Rebuilt on DOM changes | None |

### State Transitions

```
[Initial] --Tab/Click into sidebar--> [focusedIndex = 0 or clicked index]
[focusedIndex = N] --ArrowDown--> [focusedIndex = N+1] (if not at end)
[focusedIndex = N] --ArrowUp--> [focusedIndex = N-1] (if not at start)
[focusedIndex = N] --Enter--> [activates item at N, focus stays]
[focusedIndex = N] --Shift+F10--> [opens context menu for item at N]
[focusedIndex = N] --Escape--> [focus moves to <main>, focusedIndex = -1]
[Item at N expanded/collapsed] --DOM change--> [focusableItems rebuilt, focusedIndex adjusted]
```

## No Persistence Required

- `focusedIndex` resets on component unmount (page navigation or sidebar close).
- No API calls, no localStorage, no cookies for this feature.
