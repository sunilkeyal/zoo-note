# Research: Resizable Sidebar Navigation

## Key Findings

### react-resizable-panels v4 API

**Decision**: Use string-based percentage values for Panel sizes (e.g., `defaultSize="18%"`)

**Rationale**: In v4, numeric values are interpreted as **pixels**, not percentages. Percentage strings (e.g., `"18%"`) are required for proportional sizing. The API changed from v3 where all values were percentages by default.

**Source**: [react-resizable-panels v4 migration](https://github.com/bvaughn/react-resizable-panels)

### Integration with shadcn SidebarProvider

**Decision**: Place ResizablePanelGroup as a direct child of SidebarProvider's wrapper div

**Rationale**: The SidebarProvider wraps children in a `flex min-h-svh` container. The PanelGroup with `flex-1` stretches to fill available space via flex layout. No additional wrapper needed.

### Alternative: Pure CSS resize property

**Considered but rejected**: CSS `resize: horizontal` on the sidebar. Rejected because it provides no control over min/max widths and the visual handle is inconsistent across browsers.

### Accessibility

ResizableHandle from react-resizable-panels includes built-in keyboard support (arrow keys) and ARIA attributes. No custom accessibility work needed.
