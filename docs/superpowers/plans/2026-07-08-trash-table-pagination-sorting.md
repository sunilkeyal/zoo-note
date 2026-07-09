# Trash Table Pagination & Sorting + User Management Sorting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pagination and column sorting to the Trash table, and column sorting to the User Management table.

**Architecture:** Trash uses client-side pagination/sorting (all items already in memory). Users uses server-side sorting via API query params (consistent with existing server-side pagination). Both approaches follow existing component patterns in the codebase.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, MongoDB 6, shadcn/ui, Vitest + Testing Library

---

### Task 1: TrashTable — Add pagination + client-side sorting

**Files:**
- Modify: `src/components/TrashTable.tsx`

- [ ] **Step 1: Add state and computed values for sorting + pagination**

Add these imports at the top:
```tsx
import { useState, useCallback, useMemo } from "react"
import { Trash2, ArrowUp, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination"
```

Add the new state after the `confirmDelete` state:
```tsx
export default function TrashTable({ items, isAdmin, loading, error, onRestore, onPermanentDelete, onRetry }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ noteIds: string[]; folderIds: string[] } | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sortField, setSortField] = useState("deletedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
```

- [ ] **Step 2: Add `getPageNumbers` helper for truncated pagination**

Before the component function, add:
```tsx
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}
```

- [ ] **Step 3: Add sort + pagination computed values**

After the `notesByFolder` computation, add:
```tsx
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title)
      } else if (sortField === "type") {
        cmp = a.type.localeCompare(b.type)
      } else if (sortField === "deletedAt") {
        cmp = new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [items, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / limit))
  const safePage = Math.min(page, totalPages)
  const displayItems = sortedItems.slice((safePage - 1) * limit, safePage * limit)
```

- [ ] **Step 4: Add sort handler function**

Before the `return` statement, add:
```tsx
  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1)
  }
```

- [ ] **Step 5: Wrap `toggleAll` to use `displayItems` instead of `items`**

Modify the `toggleAll` useCallback — change to `displayItems`:
```tsx
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allCheckable = displayItems.filter((i) => !locked.has(i.id))
```

Also update the dependency array: replace `items` with `displayItems`:
```tsx
  }, [displayItems, locked])
```

- [ ] **Step 6: Update the table body to use `displayItems`**

Replace `items.map((item) => {` with `displayItems.map((item) => {`

- [ ] **Step 7: Sync `allCheckable` and `allSelected` references**

Update `allCheckable` to use `displayItems`:
```tsx
  const allCheckable = displayItems.filter((i) => !locked.has(i.id))
```

- [ ] **Step 8: Replace native `<table>` with shadcn Table components**

Replace the wrapper `<div>` containing `<table>`, `<thead>`, `<tbody>` etc. with equivalent shadcn components:
```tsx
  <div className="rounded-md border overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          ...
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayItems.map((item) => (
          <TableRow key={item.id}>
            ...
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
```

- [ ] **Step 9: Replace static header cells with sortable headers**

Use `TableHead` elements with click handlers and sort arrows:
```tsx
  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("title")}>
    <div className="flex items-center gap-1">
      Name
      {sortField === "title" && (
        <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
      )}
    </div>
  </TableHead>
```

Similar for Type ("type") and Deleted At ("deletedAt").

- [ ] **Step 10: Add shadcn Pagination controls after the table**

Insert after the closing `</Table>` wrapper and before the `Dialog`:
```tsx
      <div className="flex items-center justify-between mt-4 text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pl-1.5! hover:text-muted-foreground", safePage <= 1 && "pointer-events-none opacity-50")}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:block">Previous</span>
              </Button>
            </PaginationItem>
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <Button
                    variant={p === safePage ? "outline" : "ghost"}
                    size="icon"
                    className="h-8 w-8 hover:text-muted-foreground"
                    aria-current={p === safePage ? "page" : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pr-1.5! hover:text-muted-foreground", safePage >= totalPages && "pointer-events-none opacity-50")}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                aria-label="Go to next page"
              >
                <span className="hidden sm:block">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm">
          Page {safePage} of {totalPages} ({sortedItems.length} total)
        </span>
      </div>
```

*Note: Direct `<Button>` elements are used instead of `PaginationLink`/`PaginationPrevious`/`PaginationNext` because those use base-ui's `nativeButton={false}` + `render` prop which causes jsdom incompatibility in tests.*

- [ ] **Step 11: Commit**

```bash
git add src/components/TrashTable.tsx
git commit -m "feat: add pagination and column sorting to TrashTable"
```

---

### Task 2: Users API — Accept sort field/direction params

**Files:**
- Modify: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Add sort param parsing in GET handler**

After the `status` parsing, add:
```tsx
  const sortField = searchParams.get("sortField") || "createdAt"
  const sortDir = searchParams.get("sortDir") || "desc"
```

- [ ] **Step 2: Add allowed fields validation and dynamic sort**

After the `status` filter block, add:
```tsx
  const allowedSortFields = ["displayName", "email", "role", "isActive", "createdAt"]
  const safeSortField = allowedSortFields.includes(sortField) ? sortField : "createdAt"
  const safeSortDir = sortDir === "asc" ? 1 : -1
```

- [ ] **Step 3: Replace hard-coded sort with dynamic sort**

Replace `.sort({ createdAt: -1 })` with:
```tsx
    .sort({ [safeSortField]: safeSortDir })
```

- [ ] **Step 4: Change default limit from 20 to 10**

Update `parseInt(searchParams.get("limit") || "20")` to `parseInt(searchParams.get("limit") || "10")`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat: accept sortField/sortDir params in admin users API"
```

---

### Task 3: UsersTable — Add sortable column headers + shadcn Pagination

**Files:**
- Modify: `src/app/admin/users/users-table.tsx`

- [ ] **Step 1: Add ArrowUp and Chevron icon imports**

Add `ArrowUp`, `ChevronLeftIcon`, `ChevronRightIcon` to the lucide-react import, and add shadcn Pagination imports.

- [ ] **Step 2: Add new props to interface**

Add to `Props`:
```tsx
  sortField: string
  sortDir: "asc" | "desc"
  onSortChange: (field: string) => void
```

- [ ] **Step 3: Destructure new props**

Add to the destructuring:
```tsx
  sortField, sortDir, onSortChange,
```

- [ ] **Step 4: Replace native table headers with shadcn TableHead + sortable columns**

Convert existing `<table>`/`<thead>`/`<th>` to shadcn `<Table>`/`<TableHeader>`/`<TableHead>`. Make Name, Email, Role, Status, Created clickable with arrow indicators. Keep Actions non-clickable.

- [ ] **Step 5: Replace simple Previous/Next buttons with shadcn Pagination + numbered pages**

Same pattern as TrashTable Step 10: use `<Pagination>`, `<PaginationContent>`, `<PaginationItem>`, `<PaginationEllipsis>` with direct `<Button>` children. Use `variant="outline"` for active page, `variant="ghost"` for inactive. Rows options: `10`, `20`, `50` (no 100).

- [ ] **Step 6: Add `text-muted-foreground` + `hover:text-muted-foreground` styling**

Apply `text-muted-foreground` to the pagination bar container and `hover:text-muted-foreground` to all pagination buttons.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/users/users-table.tsx
git commit -m "feat: add sortable column headers to UsersTable"
```

---

### Task 4: UsersPage — Wire sort state to API + flicker fix

**Files:**
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Add sort state**

After `statusFilter` state, add:
```tsx
  const [sortField, setSortField] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
```

- [ ] **Step 2: Pass sort params in fetchUsers**

In the `fetchUsers` callback, add before the `res` call:
```tsx
      params.set("sortField", sortField)
      params.set("sortDir", sortDir)
```

Add `sortField` and `sortDir` to the dependency array of `fetchUsers`.

- [ ] **Step 3: Add flicker fix with `hasLoaded` ref**

Add `const hasLoaded = useRef(false)` state. In `fetchUsers`, replace `setLoading(true)` with:
```tsx
    if (!hasLoaded.current) setLoading(true)
```

Set `hasLoaded.current = true` after `setUsers`/`setTotal` so subsequent re-fetches (e.g. sort changes) don't show the loading skeleton.

- [ ] **Step 4: Add `currentUserId` from session**

```tsx
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
```

Pass `currentUserId` to `<UsersTable>`.

- [ ] **Step 5: Add sort handler**

After `handleSearchChange`, add:
```tsx
  function handleSortChange(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1)
  }
```

- [ ] **Step 6: Pass new props to UsersTable**

Add these props to the `<UsersTable>` component:
```tsx
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={handleSortChange}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: wire sort state in UsersPage and pass to API"
```

---

### Task 5: Add shadcn Table + Pagination components

**Files:**
- New: `src/components/ui/table.tsx`
- New: `src/components/ui/pagination.tsx`

- [ ] **Step 1: Create shadcn Table component**

```tsx
// src/components/ui/table.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) { ... }
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) { ... }
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) { ... }
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) { ... }
function TableRow({ className, ...props }: React.ComponentProps<"tr">) { ... }
function TableHead({ className, ...props }: React.ComponentProps<"th">) { ... }
function TableCell({ className, ...props }: React.ComponentProps<"td">) { ... }
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) { ... }

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption }
```

- [ ] **Step 2: Create shadcn Pagination component**

All components: `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink` (uses `nativeButton={false}` + `render` prop), `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`.

*Note: `PaginationLink`/`PaginationPrevious`/`PaginationNext` are available but NOT used by the tables (they use direct `<Button>` elements instead due to jsdom incompatibility). The visual page uses them for exploration.*

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/table.tsx src/components/ui/pagination.tsx
git commit -m "feat: add shadcn Table and Pagination components"
```

---

### Task 6: Update tests

**Files:**
- Modify: `src/__tests__/trash-table.test.tsx`
- Modify: `src/__tests__/admin-users-api.test.ts`

- [ ] **Step 1: Add Select mock to trash-table test**

```tsx
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { ... }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="select">{children}</select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => <></>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}))
```

- [ ] **Step 2: Add pagination rendering test**

```tsx
  it('shows pagination controls when items exceed page size', () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      id: `n${i}`,
      title: `Note ${i}`,
      type: 'note' as const,
      deletedAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
    render(
      <TrashTable items={manyItems} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    // Default limit is 10, so 25 items = 3 pages
    expect(screen.getByText('Page 1 of 3 (25 total)')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
  })
```

- [ ] **Step 3: Add sorting test**

```tsx
  it('sorts items when clicking column header', () => {
    const items = [
      { id: 'n1', title: 'Beta', type: 'note' as const, deletedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'n2', title: 'Alpha', type: 'note' as const, deletedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )

    const rows = screen.getAllByRole('row')
    // Default sort is deletedAt desc, so Beta (newer) should appear first
    expect(rows[1]).toHaveTextContent('Beta')

    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    // Now sorted by name asc: Alpha first, Beta second
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Alpha')
  })
```

- [ ] **Step 4: Add sort param test to admin-users-api test**

```tsx
  it("accepts sortField and sortDir params", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockSort = vi.fn().mockReturnThis()
    const mockSkip = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockToArray = vi.fn().mockResolvedValue([])
    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: mockSort, skip: mockSkip, limit: mockLimit, toArray: mockToArray }),
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?sortField=email&sortDir=asc")
    await GET(req)

    expect(mockSort).toHaveBeenCalledWith({ email: 1 })
  })

  it("rejects invalid sortField by falling back to createdAt", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockSort = vi.fn().mockReturnThis()
    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: mockSort, skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]) }),
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?sortField=invalid&sortDir=asc")
    await GET(req)

    expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 })
  })
```

- [ ] **Step 5: Run tests to verify**

```bash
npx vitest run src/__tests__/trash-table.test.tsx src/__tests__/admin-users-api.test.ts
```

Expected: All tests pass (21 + 31 = 52 tests).

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/trash-table.test.tsx src/__tests__/admin-users-api.test.ts
git commit -m "test: add tests for pagination, sorting, and sort params"
```

---

### Task 7: Visual comparison page + middleware exclusion

- [ ] **Step 1: Create `src/app/visual/page.tsx`**

A/B comparison page with 8 pagination styling options (A–H) using `PaginationLink`/`PaginationPrevious`/`PaginationNext` for exploration. Not used in production tables.

- [ ] **Step 2: Exclude `/visual` from auth middleware**

Add `visual` to the middleware matcher exclusion list to allow unauthenticated access.

- [ ] **Step 3: Commit**

```bash
git add src/app/visual/page.tsx src/middleware.ts
git commit -m "chore: add visual comparison page for pagination styling"
```

---

### Self-Review Checklist

**Spec coverage:**
- Trash pagination with 10/20/50/100 rows per page (default 10) → Task 1
- Trash sort on Name, Type, Deleted At → Task 1
- Users sort on all columns except Actions → Tasks 2-4
- shadcn Table and Pagination components → Task 5
- Numbered page buttons with ellipsis truncation → Task 1
- Flicker fix on sort re-fetch → Task 4
- No bright hover on pagination buttons → Tasks 1, 3
- Feature branch (not main) → already created

**No placeholders:** All code blocks are complete, no TBDs, no "implement later".

**Type consistency:** All field names match between API validation and UsersTable column headers (`displayName`, `email`, `role`, `isActive`, `createdAt`). Sort direction uses `"asc"`/`"desc"` strings consistently.

**Note on PaginationLink:** `PaginationLink`, `PaginationPrevious`, and `PaginationNext` are exported from `@/components/ui/pagination` but are NOT used in the tables. The tables use direct `<Button>` elements instead because `PaginationLink` uses base-ui's `nativeButton={false}` + `render` prop which causes rendering issues in jsdom tests.
