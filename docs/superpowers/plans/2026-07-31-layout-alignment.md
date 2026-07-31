# Layout Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix layout misalignment on the Favorites, Recent, and admin Import Jobs screens so they match the Home page and other admin pages.

**Architecture:** Introduce a shared `PageContainer` component that provides the scroll container + responsive padding + max-width shell the Home page already uses inline. Apply it to the Favorites and Recent pages (which currently render a bare `<div>` and clip content), refactor the Home page to use it, and align the admin Import Jobs page header with the Dashboard / User Management header pattern.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vitest + Testing Library.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/components/PageContainer.tsx` | Shared scroll + padding + max-width layout shell | Create |
| `src/app/recent/page.tsx` | Recent notes page | Modify (wrap in PageContainer) |
| `src/app/favorites/page.tsx` | Favorites page | Modify (wrap in PageContainer) |
| `src/components/HomePage.tsx` | Home page | Modify (use PageContainer, drop duplicated classes) |
| `src/app/admin/imports/page.tsx` | Admin import jobs page | Modify (align header) |
| `src/__tests__/page-container.test.tsx` | PageContainer unit test | Create |
| `src/__tests__/recent-page.test.tsx` | Recent page tests | Modify (add scroll-container assertion) |
| `src/__tests__/favorites-page.test.tsx` | Favorites page tests | Create |
| `src/__tests__/home-page.test.tsx` | Home page regression test | Create |
| `src/__tests__/admin-imports-page.test.tsx` | Admin imports page test | Create |

---

### Task 1: Create the `PageContainer` component

**Files:**
- Create: `src/components/PageContainer.tsx`
- Test: `src/__tests__/page-container.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/page-container.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PageContainer from '@/components/PageContainer'

describe('PageContainer', () => {
  it('renders its children', () => {
    render(<PageContainer><p>Hello</p></PageContainer>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies the scroll container and responsive max-width', () => {
    const { container } = render(<PageContainer><p>Hi</p></PageContainer>)
    const outer = container.firstElementChild
    expect(outer?.className).toContain('overflow-auto')
    const inner = outer?.firstElementChild
    expect(inner?.className).toContain('md:max-w-[900px]')
    expect(inner?.className).toContain('lg:max-w-[1140px]')
    expect(inner?.className).toContain('px-4')
  })

  it('merges an extra className onto the inner container', () => {
    const { container } = render(<PageContainer className="custom-class"><p>Hi</p></PageContainer>)
    const inner = container.firstElementChild?.firstElementChild
    expect(inner?.className).toContain('custom-class')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/page-container.test.tsx`
Expected: FAIL — "Cannot find module '@/components/PageContainer'"

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/PageContainer.tsx`:

```tsx
"use client"

import { cn } from "@/lib/utils"

export default function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div
        className={cn(
          "px-4 sm:px-6 md:px-8 lg:px-10 pt-2 pb-4 sm:pt-3 sm:pb-6 w-full md:max-w-[900px] lg:max-w-[1140px]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/page-container.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/PageContainer.tsx src/__tests__/page-container.test.tsx
git commit -m "feat: add shared PageContainer layout component"
```

---

### Task 2: Apply `PageContainer` to the Recent page

**Files:**
- Modify: `src/app/recent/page.tsx:149` (root `<div>` → `<PageContainer>`, and closing tag at line 310)
- Test: `src/__tests__/recent-page.test.tsx`

- [ ] **Step 1: Add a failing scroll-container assertion**

Add this test to `src/__tests__/recent-page.test.tsx`, after the existing `renders the page heading` test:

```tsx
  it('wraps content in the scroll container', () => {
    const { container } = render(<RecentPage />)
    expect(container.querySelector('.overflow-auto')).not.toBeNull()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/recent-page.test.tsx`
Expected: the new `wraps content in the scroll container` test FAILS (no `.overflow-auto` element); all others still pass.

- [ ] **Step 3: Swap the wrapper**

In `src/app/recent/page.tsx`:

Add the import after `import DeleteConfirmDialog from "@/components/DeleteConfirmDialog"` (line 22):

```tsx
import PageContainer from "@/components/PageContainer"
```

Replace the opening root element (lines 149-150):

```tsx
  return (
    <div>
```

with:

```tsx
  return (
    <PageContainer>
```

Replace the closing root element (line 311):

```tsx
      />
    </div>
  )
}
```

with:

```tsx
      />
    </PageContainer>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/recent-page.test.tsx`
Expected: PASS (all tests, including the new scroll-container assertion)

- [ ] **Step 5: Commit**

```bash
git add src/app/recent/page.tsx src/__tests__/recent-page.test.tsx
git commit -m "fix: wrap recent page in shared page container"
```

---

### Task 3: Apply `PageContainer` to the Favorites page

**Files:**
- Modify: `src/app/favorites/page.tsx:147` (root `<div>` → `<PageContainer>`, and closing tag at line 310)
- Test: `src/__tests__/favorites-page.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/favorites-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/contexts/NoteContext', () => ({ useNotes: vi.fn() }))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return { ...actual }
})

vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', p),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  ContextMenuContent: () => null,
  ContextMenuItem: () => null,
  ContextMenuSeparator: () => null,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? React.createElement(React.Fragment, null, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  default: () => null,
}))

import { useNotes } from '@/contexts/NoteContext'
import FavoritesPage from '@/app/favorites/page'

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>

function baseContext(overrides = {}) {
  return {
    notes: [],
    folders: [],
    loading: false,
    error: null,
    setActiveNoteId: vi.fn(),
    expandedFolders: new Set<string>(),
    toggleFolder: vi.fn(),
    fetchNotes: vi.fn(),
    updateNote: vi.fn().mockResolvedValue(null),
    deleteNote: vi.fn().mockResolvedValue(true),
    toggleFavorite: vi.fn(),
    favoriteNotes: [],
    ...overrides,
  }
}

const FAVORITE = {
  _id: '1',
  title: 'Starred Note',
  content: '<p>Star content</p>',
  folderId: undefined,
  position: 0,
  isFavorite: true,
  favoritedAt: new Date(Date.now() - 60_000).toISOString(),
  createdAt: '',
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
  isDeleted: false,
}

beforeEach(() => mockUseNotes.mockReturnValue(baseContext()))

describe('FavoritesPage', () => {
  it('renders the page heading', () => {
    render(<FavoritesPage />)
    expect(screen.getByRole('heading', { name: /favorites/i })).toBeInTheDocument()
  })

  it('wraps content in the scroll container', () => {
    const { container } = render(<FavoritesPage />)
    expect(container.querySelector('.overflow-auto')).not.toBeNull()
  })

  it('renders favorite notes', () => {
    mockUseNotes.mockReturnValue(baseContext({ favoriteNotes: [FAVORITE], notes: [FAVORITE] }))
    render(<FavoritesPage />)
    expect(screen.getByText('Starred Note')).toBeInTheDocument()
    expect(screen.getByText('Star content')).toBeInTheDocument()
  })

  it('shows the empty state when there are no favorites', () => {
    render(<FavoritesPage />)
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/favorites-page.test.tsx`
Expected: all tests except `wraps content in the scroll container` PASS; that one FAILS (no `.overflow-auto` element).

- [ ] **Step 3: Swap the wrapper**

In `src/app/favorites/page.tsx`:

Add the import after `import DeleteConfirmDialog from "@/components/DeleteConfirmDialog"` (line 22):

```tsx
import PageContainer from "@/components/PageContainer"
```

Replace the opening root element (lines 146-147):

```tsx
  return (
    <div>
```

with:

```tsx
  return (
    <PageContainer>
```

Replace the closing root element (line 310):

```tsx
      />
    </div>
  )
}
```

with:

```tsx
      />
    </PageContainer>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/favorites-page.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/favorites/page.tsx src/__tests__/favorites-page.test.tsx
git commit -m "fix: wrap favorites page in shared page container"
```

---

### Task 4: Refactor the Home page to use `PageContainer`

**Files:**
- Modify: `src/components/HomePage.tsx:168-170` and `:274-276`
- Test: `src/__tests__/home-page.test.tsx` (create)

This is a behavior-preserving refactor: the rendered classes are identical before and after, so the test is a characterization test written first, then run again after the change.

- [ ] **Step 1: Write the characterization test**

Create `src/__tests__/home-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => React.createElement('img', { alt: props.alt }),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { name: 'Test' } } }) }))

vi.mock('@/contexts/NoteContext', () => ({ useNotes: vi.fn() }))

vi.mock('@/components/SearchDropdown', () => ({ default: () => null }))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', p),
}))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return { ...actual }
})

import { useNotes } from '@/contexts/NoteContext'
import HomePage from '@/components/HomePage'

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>

function baseContext(overrides = {}) {
  return {
    notes: [],
    folders: [],
    loading: false,
    error: null,
    setActiveNoteId: vi.fn(),
    createNote: vi.fn(),
    fetchNotes: vi.fn(),
    expandedFolders: new Set<string>(),
    toggleFolder: vi.fn(),
    toggleFavorite: vi.fn(),
    favoriteNotes: [],
    ...overrides,
  }
}

beforeEach(() => {
  mockUseNotes.mockReturnValue(baseContext())
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { count: 0 } }),
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('HomePage', () => {
  it('renders the welcome heading', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument()
  })

  it('keeps the scroll container and responsive padded container', () => {
    const { container } = render(<HomePage />)
    const outer = container.querySelector('.overflow-auto')
    expect(outer).not.toBeNull()
    const inner = outer?.firstElementChild
    expect(inner?.className).toContain('px-4')
    expect(inner?.className).toContain('md:max-w-[900px]')
    expect(inner?.className).toContain('lg:max-w-[1140px]')
  })
})
```

- [ ] **Step 2: Run the test to verify it passes before the refactor**

Run: `npx vitest run src/__tests__/home-page.test.tsx`
Expected: PASS (2 tests) — this characterizes current behavior.

- [ ] **Step 3: Refactor HomePage to use PageContainer**

In `src/components/HomePage.tsx`:

Add the import after `import SearchDropdown from "@/components/SearchDropdown"` (line 13):

```tsx
import PageContainer from "@/components/PageContainer"
```

Replace the opening wrapper (lines 169-170):

```tsx
    <div className="flex-1 overflow-auto bg-background">
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-2 pb-4 sm:pt-3 sm:pb-6 space-y-6 w-full md:max-w-[900px] lg:max-w-[1140px]">
```

with:

```tsx
    <PageContainer>
      <div className="space-y-6">
```

Replace the closing wrapper (lines 274-276):

```tsx
      </div>
    </div>
  )
}
```

with:

```tsx
      </div>
    </PageContainer>
  )
}
```

- [ ] **Step 4: Run the test to verify the refactor preserved behavior**

Run: `npx vitest run src/__tests__/home-page.test.tsx`
Expected: PASS (2 tests) — identical assertions still hold after the refactor.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomePage.tsx src/__tests__/home-page.test.tsx
git commit -m "refactor: use PageContainer in home page"
```

---

### Task 5: Align the admin Import Jobs header

**Files:**
- Modify: `src/app/admin/imports/page.tsx:196-200`
- Test: `src/__tests__/admin-imports-page.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/admin-imports-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableBody: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableHead: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableRow: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableCell: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PaginationContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PaginationItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PaginationEllipsis: () => null,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogDescription: () => null,
  DialogFooter: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
}))

import ImportsPage from '@/app/admin/imports/page'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { jobs: [], total: 0 } }),
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('ImportsPage', () => {
  it('renders the Import Jobs header with avatar and subtitle', () => {
    render(<ImportsPage />)
    expect(screen.getByRole('heading', { name: /import jobs/i })).toBeInTheDocument()
    expect(screen.getByText(/monitor notebook imports and clean up failed jobs/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no jobs', async () => {
    render(<ImportsPage />)
    expect(await screen.findByText(/no import jobs found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/admin-imports-page.test.tsx`
Expected: the subtitle assertion FAILS (current header has no subtitle text); the empty-state test PASSES.

- [ ] **Step 3: Implement the header change**

In `src/app/admin/imports/page.tsx`, replace the header block (lines 196-200):

```tsx
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="size-5 text-purple-600" />
          <h1 className="text-2xl font-bold">Import Jobs</h1>
        </div>
```

with:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <Upload className="size-5 text-purple-600 dark:text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Import Jobs</h1>
            <p className="text-xs text-muted-foreground">Monitor notebook imports and clean up failed jobs</p>
          </div>
        </div>
```

The right side (`{total} total` text + status filter `Select`) and the page root's `space-y-6` are unchanged — do not add `mb-6` to the header.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-imports-page.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/imports/page.tsx src/__tests__/admin-imports-page.test.tsx
git commit -m "fix: align admin import jobs header with dashboard and user management"
```

---

### Task 6: Full verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: ALL tests PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, sign in, and verify:
1. `/favorites` and `/recent` content is padded off the window edges and scrolls vertically when it overflows.
2. Home page renders identically to before (padded, centered, scrolls).
3. `/admin/imports` shows the avatar-circle header with the subtitle, aligned with `/admin` and `/admin/users`.

---

## Self-Review

- **Spec coverage:** Spec section 1 → Task 1 (PageContainer). Section 2 → Tasks 2-4 (favorites, recent, home). Section 3 → Task 5 (admin header). Testing → Tasks 1-5 tests + Task 6 verification. Out-of-scope items (trash page, drawer styling, mobile) are not touched. ✓
- **Placeholder scan:** Every step has exact code or exact commands. ✓
- **Type consistency:** `PageContainer` has a single name and signature everywhere; test mocks use the same prop shapes as the components they mock. ✓
