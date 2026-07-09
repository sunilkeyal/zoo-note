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
import { Trash2, ArrowUp } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

Replace the existing `useState` imports (currently only `useState` and `useCallback` are imported) and add the new state after the `confirmDelete` state (around line 91):

```tsx
export default function TrashTable({ items, isAdmin, loading, error, onRestore, onPermanentDelete, onRetry }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ noteIds: string[]; folderIds: string[] } | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortField, setSortField] = useState("deletedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
```

- [ ] **Step 2: Add sort + pagination computed values**

After the `notesByFolder` computation (around line 100), add:

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

- [ ] **Step 3: Add sort handler function**

Before the `return` statement (around line 238), add:

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

- [ ] **Step 4: Wrap `toggleAll` to use `displayItems` instead of `items`**

Modify the `toggleAll` useCallback (around line 148) — change the first line inside to use `displayItems`:

Replace:
```tsx
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allCheckable = items.filter((i) => !locked.has(i.id))
```

With:
```tsx
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allCheckable = displayItems.filter((i) => !locked.has(i.id))
```

Also update the dependency array: replace `items` with `displayItems`:
```tsx
  }, [displayItems, locked])
```

- [ ] **Step 5: Update the table body to use `displayItems`**

Replace `items.map((item) => {` (line 271) with `displayItems.map((item) => {`

- [ ] **Step 6: Replace static header cells with sortable headers**

Find the `<thead>` section (lines 258-268). Replace the Name, Type, and Deleted At `<th>` elements with sortable versions:

```tsx
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 md:p-3 w-10"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
              <th className="p-2 md:p-3 w-8"><span className="sr-only">Type</span></th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("title")}>
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "title" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("type")}>
                <div className="flex items-center gap-1">
                  Type
                  {sortField === "type" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              {isAdmin && <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Deleted By</th>}
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("deletedAt")}>
                <div className="flex items-center gap-1">
                  Deleted At
                  {sortField === "deletedAt" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Auto-purge</th>
              <th className="text-right p-2 md:p-3 font-medium whitespace-nowrap">Actions</th>
            </tr>
          </thead>
```

- [ ] **Step 7: Add pagination controls after the table**

Insert after the closing `</table>` tag (around line 336) and before the `Dialog`:

```tsx
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16">
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
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {safePage} of {totalPages} ({sortedItems.length} total)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
```

- [ ] **Step 8: Sync `allCheckable` reference**

Update the `allCheckable` computed value (line 175) to use `displayItems` instead of `items`:

```tsx
  const allCheckable = displayItems.filter((i) => !locked.has(i.id))
```

- [ ] **Step 9: Commit**

```bash
git add src/components/TrashTable.tsx
git commit -m "feat: add pagination and column sorting to TrashTable"
```

---

### Task 2: Users API — Accept sort field/direction params

**Files:**
- Modify: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Add sort param parsing in GET handler**

After the `status` parsing (line 23), add:

```tsx
  const sortField = searchParams.get("sortField") || "createdAt"
  const sortDir = searchParams.get("sortDir") || "desc"
```

- [ ] **Step 2: Add allowed fields validation and dynamic sort**

After the `status` filter block (around line 41), add:

```tsx
  const allowedSortFields = ["displayName", "email", "role", "isActive", "createdAt"]
  const safeSortField = allowedSortFields.includes(sortField) ? sortField : "createdAt"
  const safeSortDir = sortDir === "asc" ? 1 : -1
```

- [ ] **Step 3: Replace hard-coded sort with dynamic sort**

Replace line 46:
```tsx
    .sort({ createdAt: -1 })
```
With:
```tsx
    .sort({ [safeSortField]: safeSortDir })
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat: accept sortField/sortDir params in admin users API"
```

---

### Task 3: UsersTable — Add sortable column headers

**Files:**
- Modify: `src/app/admin/users/users-table.tsx`

- [ ] **Step 1: Add ArrowUp import**

Add `ArrowUp` to the lucide-react import (line 16):
```tsx
import { Pencil, Trash2, ArrowUp } from "lucide-react"
```

- [ ] **Step 2: Add new props to interface**

Add to `Props` (after line 50, before the closing `}`):
```tsx
  sortField: string
  sortDir: "asc" | "desc"
  onSortChange: (field: string) => void
```

- [ ] **Step 3: Destructure new props**

Add to the destructuring (around line 57-58):
```tsx
  sortField, sortDir, onSortChange,
```

- [ ] **Step 4: Replace static header cells with sortable ones**

Find the `<thead>` section (lines 95-103). Replace each `<th>` from Name through Created with clickable versions:

```tsx
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("displayName")}>
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "displayName" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("email")}>
                <div className="flex items-center gap-1">
                  Email
                  {sortField === "email" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("role")}>
                <div className="flex items-center gap-1">
                  Role
                  {sortField === "role" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("isActive")}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === "isActive" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("createdAt")}>
                <div className="flex items-center gap-1">
                  Created
                  {sortField === "createdAt" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-right p-2 md:p-3 font-medium whitespace-nowrap">Actions</th>
            </tr>
          </thead>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/users/users-table.tsx
git commit -m "feat: add sortable column headers to UsersTable"
```

---

### Task 4: UsersPage — Wire sort state to API

**Files:**
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Add sort state**

After `statusFilter` state (line 21), add:
```tsx
  const [sortField, setSortField] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
```

- [ ] **Step 2: Pass sort params in fetchUsers**

In the `fetchUsers` callback (around line 38), add before the `res` call:
```tsx
      params.set("sortField", sortField)
      params.set("sortDir", sortDir)
```

Add `sortField` and `sortDir` to the dependency array of `fetchUsers` (line 51):
```tsx
  }, [page, limit, search, roleFilter, statusFilter, sortField, sortDir])
```

- [ ] **Step 3: Add sort handler**

After `handleSearchChange` (around line 63), add:
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

- [ ] **Step 4: Pass new props to UsersTable**

Add these props to the `<UsersTable>` component (around line 114-132):
```tsx
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={handleSortChange}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: wire sort state in UsersPage and pass to API"
```

---

### Task 5: Update tests

**Files:**
- Modify: `src/__tests__/trash-table.test.tsx`
- Modify: `src/__tests__/admin-users-api.test.ts`

- [ ] **Step 1: Add Select mock to trash-table test**

Add a mock for `@/components/ui/select` at the top of the test file (after the dialog mock):

```tsx
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => (
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

- [ ] **Step 2: Add pagination rendering test to trash-table test**

After the existing "renders items in a table" test (after line 73), add:

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
    expect(screen.getByText('Page 1 of 2 (25 total)')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })
```

- [ ] **Step 3: Add sorting test to trash-table test**

Add after the pagination test:

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

After the status filter tests (around line 201), add:

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

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/trash-table.test.tsx src/__tests__/admin-users-api.test.ts
git commit -m "test: add tests for pagination, sorting, and sort params"
```

---

### Self-Review Checklist

**Spec coverage:**
- Trash pagination with 10/20/50/100 rows per page (default 20) → Task 1
- Trash sort on Name, Type, Deleted At → Task 1
- Users sort on all columns except Actions → Tasks 2-4
- Feature branch (not main) → already created

**No placeholders:** All code blocks are complete, no TBDs, no "implement later".

**Type consistency:** All field names match between API validation and UsersTable column headers (`displayName`, `email`, `role`, `isActive`, `createdAt`). Sort direction uses `"asc"`/`"desc"` strings consistently.
