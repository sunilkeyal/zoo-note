# MUI to shadcn/ui Migration Design

**Date:** 2026-06-13
**Status:** Draft
**Branch:** feat/mui-to-shadcn-migration

## Overview

Replace MUI (Material UI v9) with shadcn/ui as the UI component library in the Notes App. This is a full rewrite of all UI components while preserving application logic, data flow, and backend API.

## Goals

- Remove all MUI dependencies (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- Add shadcn/ui with Tailwind CSS 4 and lucide-react icons
- Migrate from Pages Router to App Router (Next.js 16)
- Adopt shadcn's default neutral theme for light/dark mode
- Use next-themes for dark mode management
- Maintain all existing functionality (note CRUD, folders, TipTap editor, dark mode)

## Architecture

### File Structure Changes

```
src/
├── app/                          # App Router (was pages/)
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Main page (was index.tsx)
│   └── api/
│       ├── notes/
│       │   └── route.ts          # GET, POST (was pages/api/notes.ts)
│       ├── notes/[id]/
│       │   └── route.ts          # PUT, DELETE (was pages/api/notes/[id].ts)
│       ├── folders/
│       │   └── route.ts          # GET, POST (was pages/api/folders.ts)
│       └── folders/[id]/
│           └── route.ts          # PUT, DELETE (was pages/api/folders/[id].ts)
├── components/
│   ├── AppHeader.tsx             # Replaced with shadcn-based header
│   ├── NotesSidebar.tsx          # Replaced with Sheet + Command + Collapsible
│   ├── MainArea.tsx              # Replaced with shadcn-based editor area
│   ├── NoteEditor.tsx            # Kept (TipTap wrapper - no MUI deps)
│   ├── DeleteConfirmDialog.tsx   # Replaced with shadcn Dialog
│   ├── DeleteFolderDialog.tsx    # Replaced with shadcn Dialog
│   └── ui/                       # shadcn components (generated)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── sheet.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── toggle.tsx
│       ├── toggle-group.tsx
│       ├── tooltip.tsx
│       ├── separator.tsx
│       ├── dropdown-menu.tsx
│       ├── badge.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── card.tsx
│       └── switch.tsx
├── contexts/
│   ├── NoteContext.tsx           # Kept (no MUI deps)
│   └── ThemeContext.tsx          # Removed (replaced by next-themes)
├── styles/
│   └── globals.css               # Replaced with Tailwind + shadcn CSS variables
├── extensions/
│   └── FontSize.ts               # Kept
├── lib/
│   └── mongodb.ts                # Kept
└── types/
    └── index.ts                  # Kept
```

### Layout Hierarchy

```
app/layout.tsx (server)
  └── Providers (client component)
       ├── ThemeProvider (next-themes)
       └── NoteProvider (NoteContext)
            ├── AppHeader
            │   ├── Title
            │   ├── Theme toggle button
            │   └── Sidebar menu button
            ├── NotesSidebar (Sheet)
            │   ├── Search input
            │   ├── Add note / Add folder buttons
            │   ├── Folder tree (Collapsible)
            │   └── Note list (Command)
            └── MainArea
                ├── Title input
                ├── Editor toolbar (ToggleGroup, Select, etc.)
                └── TipTap editor
```

## Component Mapping

| MUI Component | shadcn Replacement |
|---|---|
| `AppBar` + `Toolbar` | `<header>` with Tailwind (sticky, border, flex) |
| `Drawer` | `Sheet` |
| `List` / `ListItem` / `ListItemButton` | `Command` + `CommandItem` for note list; `Collapsible` for folders |
| `Dialog` | `Dialog` |
| `Button` | `Button` |
| `TextField` | `Input` |
| `ToggleButtonGroup` / `ToggleButton` | `ToggleGroup` / `Toggle` |
| `Select` + `MenuItem` | `Select` |
| `Tooltip` | `Tooltip` |
| `Typography` | HTML (`<h1>`, `<h2>`, `<p>`, etc.) + Tailwind classes |
| `Divider` | `Separator` |
| `Switch` | `Switch` |
| `Chip` | `Badge` |
| `Menu` + `MenuItem` | `DropdownMenu` |
| `Collapse` | Tailwind `hidden`/`block` or `Collapsible` |
| `Box` | `<div>` with Tailwind |
| `IconButton` | `Button variant="ghost"` with lucide icon |
| `useMediaQuery` / `useTheme` | Tailwind responsive classes + next-themes `useTheme` |

## Theming

### Approach
- Use CSS variables in `globals.css` (shadcn's default approach)
- `:root` block = light theme, `.dark` class = dark theme
- Use shadcn's default neutral base color palette
- Use `next-themes` `<ThemeProvider>` with `attribute="class"` for dark mode toggling

### Font
- Default Tailwind system font stack (`ui-sans-serif, system-ui, sans-serif`)
- Replaces MUI's Roboto/Helvetica/Arial stack
- Font sizes use Tailwind's default scale (`text-sm`, `text-base`, `text-lg`, etc.)

### Radius
- Default shadcn radius (`var(--radius)` = 0.625rem)

## Data Flow

- **NoteContext** stays as-is (React Context with CRUD operations)
- **ThemeContext** removed → replaced by `next-themes` `useTheme()`
- **API routes** migrate from `pages/api` to `app/api` with Route Handlers (same business logic)
- **_app.tsx** providers wrapper → `app/layout.tsx` with a client `Providers` component

## Editor Toolbar

Built from shadcn primitives:
- `ToggleGroup` for bold/italic/underline/list formatting toggles
- `Select` for font family and font size dropdowns
- `Separator` between toolbar groups
- Plain `<div>` with Tailwind for the toolbar container

TipTap editor wrapper (`NoteEditor.tsx`) remains unchanged.

## Implementation Order

### Phase 1: Foundation
1. Install dependencies: Tailwind CSS 4, @tailwindcss/postcss, postcss, lucide-react, next-themes, cva, clsx, tailwind-merge
2. Configure Tailwind CSS 4 (`postcss.config.js`, `app/globals.css`)
3. Create `app/` directory structure with `layout.tsx` and `page.tsx`
4. Run `npx shadcn@latest init` to generate `components.json` and base config
5. Add shadcn components via CLI: button, dialog, sheet, input, select, toggle, tooltip, separator, dropdown-menu, badge, collapsible, command, card, switch

### Phase 2: Core UI
6. Create `Providers` component wrapping `ThemeProvider` + `NoteProvider`
7. Rewrite `AppHeader` with lucide icons and next-themes toggle
8. Rewrite `NotesSidebar` using Sheet + Command + Collapsible
9. Rewrite `MainArea` with shadcn toolbar (ToggleGroup, Select, etc.)
10. Rewrite `DeleteConfirmDialog` and `DeleteFolderDialog` with shadcn Dialog

### Phase 3: API & Cleanup
11. Migrate API routes: `pages/api/notes.ts` → `app/api/notes/route.ts` (and folders, [id] variants)
12. Remove `ThemeContext.tsx`, integrate `next-themes`
13. Remove obsolete files: `_app.tsx`, `_document.tsx`, `pages/index.tsx`, `pages/api/`, `src/styles/globals.css` (replaced)
14. Remove MUI/Emotion dependencies from `package.json`
15. Verify `npm run build` passes
16. Verify `npm run lint` passes

## Packages

### Removed
- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`

### Added
- `tailwindcss` (^4)
- `lucide-react`
- `next-themes`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `@radix-ui/*` packages (managed by shadcn CLI)

## Testing

- `npm run build` must succeed
- `npm run lint` must succeed
- Visual verification: light/dark mode toggle, note CRUD, folder management, editor toolbar
