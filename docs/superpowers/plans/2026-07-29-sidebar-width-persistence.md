# Sidebar Width Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist sidebar width as a user preference in MongoDB and keep it at a fixed pixel width when the browser window resizes.

**Architecture:** Use a controlled `size` prop on the `ResizablePanel` with a `ResizeObserver` tracking the container width to recalculate the percentage from the stored pixel width. The pixel width is saved to both localStorage (fast local access) and MongoDB via the existing `/api/user/preferences` endpoint (sync across devices/sessions).

**Tech Stack:** Next.js, react-resizable-panels, MongoDB, localStorage

---

### Task 1: Add `sidebarWidth` to preferences API

**Files:**
- Modify: `src/app/api/user/preferences/route.ts`

- [ ] **Step 1: Add `sidebarWidth` to valid keys and validation**

Edit `src/app/api/user/preferences/route.ts`:

```typescript
const VALID_PREF_KEYS = new Set(["sidebarDensity", "theme", "sidebarWidth"])
```

Add validation block after the `theme` validation (after line 93):

```typescript
  if ("sidebarWidth" in body) {
    const w = Number(body.sidebarWidth)
    if (!Number.isInteger(w) || w < 200 || w > 600) {
      return NextResponse.json(
        { error: "sidebarWidth must be an integer between 200 and 600." },
        { status: 400 }
      )
    }
  }
```

Add read in GET response (after line 44):

```typescript
    sidebarWidth: (typeof preferences.sidebarWidth === "number"
      ? preferences.sidebarWidth
      : null) as number | null,
```

Add write in PUT handler (after line 109):

```typescript
  if (body.sidebarWidth !== undefined) {
    update["preferences.sidebarWidth"] = Number(body.sidebarWidth)
  }
```

- [ ] **Step 2: Verify the API changes compile**

Run: `npx tsc --noEmit --pretty` (no errors expected)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/preferences/route.ts
git commit -m "feat: add sidebarWidth to user preferences API"
```

---

### Task 2: Create `use-sidebar-width` hook

**Files:**
- Create: `src/hooks/use-sidebar-width.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-sidebar-width.ts`:

```typescript
"use client"

import { useState, useCallback, useEffect, useRef } from "react"

const STORAGE_KEY = "sidebar_width_px"
const DEFAULT_WIDTH = 260

function getInitialWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const n = parseInt(stored, 10)
      if (!isNaN(n) && n >= 200 && n <= 600) return n
    }
  } catch { /* unavailable */ }
  return DEFAULT_WIDTH
}

async function fetchWidth(): Promise<number | null> {
  try {
    const res = await fetch("/api/user/preferences")
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data.sidebarWidth === "number" && data.sidebarWidth >= 200 && data.sidebarWidth <= 600) {
      return data.sidebarWidth
    }
    return null
  } catch {
    return null
  }
}

async function saveWidthToApi(width: number): Promise<void> {
  try {
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarWidth: width }),
    })
  } catch { /* ignore */ }
}

export function useSidebarWidth() {
  const [width, setWidthState] = useState<number>(getInitialWidth)
  const userChanged = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from API on mount (overrides local if user hasn't changed)
  useEffect(() => {
    fetchWidth().then((apiWidth) => {
      if (apiWidth !== null && !userChanged.current && apiWidth !== width) {
        setWidthState(apiWidth)
        try { localStorage.setItem(STORAGE_KEY, String(apiWidth)) } catch { /* unavailable */ }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setWidth = useCallback((value: number) => {
    userChanged.current = true
    setWidthState(value)
    try { localStorage.setItem(STORAGE_KEY, String(value)) } catch { /* unavailable */ }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveWidthToApi(value)
    }, 300)
  }, [])

  return { width, setWidth }
}
```

- [ ] **Step 2: Verify the hook compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-sidebar-width.ts
git commit -m "feat: add use-sidebar-width hook with localStorage + API sync"
```

---

### Task 3: Update `AppLayout.tsx` to use controlled sidebar sizing

**Files:**
- Modify: `src/components/AppLayout.tsx`

- [ ] **Step 1: Add imports and hook usage**

Add import for the new hook near the other imports (after line 23):

```typescript
import { useSidebarWidth } from "@/hooks/use-sidebar-width"
```

Add after the existing hooks (after line 39, before state declarations):

```typescript
  const { width: sidebarWidthPx, setWidth: setSidebarWidthPx } = useSidebarWidth()
```

Add ref and container width state (after `setAdminStats` state at line 52):

```typescript
  const panelGroupRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
```

Add ResizeObserver effect (after the existing effects, before the `if (status !== "authenticated")` check):

```typescript
  useEffect(() => {
    const el = panelGroupRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
```

Add sidebar percentage calculation (before the desktop layout return):

```typescript
  const sidebarPercent = containerWidth > 0
    ? Math.min(100, Math.max(0, (sidebarWidthPx / containerWidth) * 100))
    : undefined
```

Add resize handler (before the desktop layout return):

```typescript
  const handleSidebarResize = useCallback((size: number) => {
    if (containerWidth <= 0) return
    const px = Math.round((size / 100) * containerWidth)
    setSidebarWidthPx(px)
  }, [containerWidth, setSidebarWidthPx])
```

- [ ] **Step 2: Update the ResizablePanelGroup and ResizablePanel**

Change the desktop layout from:

```tsx
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
          style={{ height: '100dvh' }}
        >
          <ResizablePanel id="sidebar" defaultSize="18%" minSize="200px" maxSize="25%" className="h-full">
            <NotesSidebar resizable />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="content" defaultSize="82%" minSize="65%" className="h-full">
```

To:

```tsx
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
          style={{ height: '100dvh' }}
          ref={panelGroupRef}
        >
          <ResizablePanel
            id="sidebar"
            size={sidebarPercent}
            minSize={200}
            maxSize={500}
            onResize={handleSidebarResize}
            className="h-full"
          >
            <NotesSidebar resizable />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="content" defaultSize={undefined} minSize="65%" className="h-full">
```

Note: The content panel doesn't need a `defaultSize` when using controlled layout — the library distributes remaining space automatically.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Run existing tests**

Run: `npm test`
Expected: All existing tests pass (the preferences API test may need updates if it validates exact keys)

- [ ] **Step 5: Commit**

```bash
git add src/components/AppLayout.tsx
git commit -m "feat: persist sidebar width with pixel-locked controlled sizing"
```

---

### Task 4: Update preferences API test

- [ ] **Check if there's a test for the preferences API**

Run: `rg -l "preferences" src/__tests__/`

If a test exists at `src/__tests__/preferences.test.ts` or similar, update it to include `sidebarWidth` in the valid keys test. If no test exists for the preferences API directly, skip this task.

- [ ] **Commit if changes made**

```bash
git add src/__tests__/preferences.test.ts
git commit -m "test: update preferences test for sidebarWidth"
```
