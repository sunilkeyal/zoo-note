# Research: Keyboard Navigation for Left Sidebar

**Date**: 2026-07-20
**Feature**: 004-keyboard-nav-sidebar

## R1: Roving Tabindex Pattern for Navigation Menus

**Decision**: Use the roving tabindex pattern where only the currently active item has `tabIndex={0}` and all other items have `tabIndex={-1}`. Arrow keys move focus between items and update which item has `tabIndex={0}`.

**Rationale**: This is the WAI-ARIA recommended pattern for composite widgets (menus, toolbars, treeviews). It allows Tab to move focus into/out of the widget while arrow keys navigate within it. The existing sidebar already has items as `<button>` or `<a>` elements, making this a natural fit.

**Alternatives considered**:
- `aria-activedescendant` pattern: Requires managing a single `tabIndex={0}` container and virtual focus. More complex to implement with the existing `render` prop composition in `SidebarMenuButton`. Rejected due to higher complexity with Radix/base-ui render props.
- Natural tab order (no change): Currently all items are in tab order, making keyboard navigation tedious for large sidebars. Rejected because it doesn't meet the accessibility requirement.

## R2: Focusable Item Selection Strategy

**Decision**: Use `data-sidebar-nav-item` attribute on all focusable sidebar items (navigation links, folder headers, notes, toolbar buttons, admin links, footer menu items). The keyboard nav hook queries `[data-sidebar-nav-item]` within the sidebar to build the flat list of focusable items.

**Rationale**: The sidebar has a complex nested structure with render prop composition. Using a data attribute is the most reliable way to identify focusable items regardless of how components compose (e.g., `SidebarMenuButton render={<Link />}` vs `SidebarMenuButton render={<CollapsibleTrigger />}`). This avoids fragile CSS selector chains.

**Alternatives considered**:
- Querying all `button` and `a` elements in the sidebar: Too broad — would include the search input, context menu triggers, and other non-navigation elements.
- Using `role="treeitem"` selectors: Would require adding ARIA roles to all items first. Could be done as part of this feature but adds scope.
- React ref-based approach: Would require threading refs through render props. Fragile with Radix composition.

## R3: Handling Collapsed Sections

**Decision**: Skip items inside `CollapsibleContent` that is not expanded (i.e., when `data-state="closed"` or the collapsible content is not rendered). The hook checks if an item's closest `CollapsibleContent` ancestor has `data-state="open"` before including it in the navigation list.

**Rationale**: When a folder is collapsed, its child notes are either unmounted or hidden. The hook should dynamically rebuild the focusable item list when expand/collapse state changes.

**Alternatives considered**:
- Always including collapsed items but skipping focus to them: Doesn't work because collapsed items are unmounted (not just hidden).
- Using `aria-hidden` on collapsed sections: The existing Collapsible component already unmounts content when closed.

## R4: Context Menu Keyboard Trigger

**Decision**: Listen for `Shift+F10` and `contextmenu` keyboard events on focused sidebar items. When detected, programmatically dispatch a `contextmenu` event on the focused element to trigger the existing Radix ContextMenu.

**Rationale**: Radix ContextMenu already responds to the `contextmenu` event. Dispatching this event programmatically when Shift+F10 is pressed triggers the existing context menu without any changes to the ContextMenu component itself. This is the standard keyboard shortcut for context menus.

**Alternatives considered**:
- Adding a separate `onKeyDown` handler to each ContextMenuTrigger: Would require modifying every context menu usage. More invasive.
- Using Radix's `onOpenChange` API: The context menu doesn't expose a keyboard trigger API directly. Programmatic event dispatch is simpler.

## R5: Focus Restoration on Sidebar Re-open

**Decision**: When the sidebar re-opens (after being collapsed via Ctrl/Cmd+B or icon mode), restore focus to the last focused sidebar item if it still exists in the DOM. Store the last focused item's identifier in a ref.

**Rationale**: Users expect focus to persist across sidebar open/close cycles. Without this, users would need to Tab back into the sidebar and re-navigate to their position.

**Alternatives considered**:
- Always focusing the first item on re-open: Disruptive if the user was mid-navigation.
- No focus restoration: Poor UX for keyboard users.

## R6: Escape Key Behavior

**Decision**: When Escape is pressed while a sidebar item is focused, move focus to the main content area by focusing the `<main>` element (SidebarInset). Use `document.querySelector('main')?.focus()` or a ref.

**Rationale**: The spec requires Escape to move focus out of the sidebar. The `<main>` element in SidebarInset is the natural target. Setting `tabIndex={-1}` on the main element allows it to receive programmatic focus.

**Alternatives considered**:
- Focusing a specific editor element: Too specific — the main content area varies by page.
- Removing focus entirely (blur): Leaves the page without a focused element, which is bad for accessibility.
