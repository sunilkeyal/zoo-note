# Admin Dashboard Button Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate three admin maintenance buttons into a single button bar at the top of the dashboard with consistent naming, styling, and UX patterns.

**Architecture:** Move the cleanup buttons to the dashboard header, rename all three, add destructive styling to delete buttons, and make both delete buttons use inline confirmation + inline success messages. Remove the sweep button from the imports tab.

**Tech Stack:** Next.js, React, Tailwind CSS, Lucide icons

---

### Task 1: Add sweep orphans state and handler to dashboard page

**Files:**
- Modify: `src/app/admin/page.tsx:183-192` (state declarations)

- [ ] **Step 1: Add sweep-related state variables**

In `src/app/admin/page.tsx`, add these state variables after the existing cleanup state (line 185):

```tsx
const [sweepConfirm, setSweepConfirm] = useState(false)
const [sweepPending, setSweepPending] = useState(false)
const [sweepResult, setSweepResult] = useState<{ orphanedFound: number; filesDeleted: number } | null>(null)
```

- [ ] **Step 2: Add the runSweep handler**

In `src/app/admin/page.tsx`, add this handler after the `runCleanup` function (after line 225):

```tsx
const runSweep = useCallback(async () => {
  setSweepPending(true)
  setSweepConfirm(false)
  setSweepResult(null)
  try {
    const res = await fetch("/api/admin/r2/sweep", { method: "POST" })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || "Sweep failed")
    setSweepResult(json.data)
    fetchStats(range)
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : "Sweep failed")
  } finally {
    setSweepPending(false)
  }
}, [fetchStats, range])
```

- [ ] **Step 3: Verify state and handler are added correctly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add sweep orphans state and handler to dashboard"
```

---

### Task 2: Restructure dashboard header with all three buttons

**Files:**
- Modify: `src/app/admin/page.tsx:267-298` (page header section)

- [ ] **Step 1: Replace the page header section**

Replace the entire header div (lines 267-298) with:

```tsx
<div className="flex flex-wrap items-center gap-3">
  <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
    <LayoutDashboard className="size-5 text-violet-600 dark:text-violet-500" />
  </div>
  <div className="flex-1 min-w-0">
    <h1 className="text-2xl font-bold">Dashboard</h1>
    <p className="text-xs text-muted-foreground">System overview and activity</p>
  </div>
  <ToggleGroup
    type="single"
    value={[range]}
    onValueChange={(v: string[]) => {
      const n = v[0]
      if (n === "7" || n === "30" || n === "90") setRange(n)
    }}
    className="shrink-0"
  >
    <ToggleGroupItem value="7" aria-label="Last 7 days">7d</ToggleGroupItem>
    <ToggleGroupItem value="30" aria-label="Last 30 days">30d</ToggleGroupItem>
    <ToggleGroupItem value="90" aria-label="Last 90 days">90d</ToggleGroupItem>
  </ToggleGroup>
  <div className="flex items-center gap-2 shrink-0">
    <Button
      variant="outline"
      size="sm"
      onClick={() => { fetchStats(range); fetchR2Metrics(range) }}
      disabled={loading}
    >
      <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
      Reload Stats
    </Button>
    <div className="h-6 w-px bg-border" />
    {!cleanupConfirm ? (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { setCleanupConfirm(true); setCleanupResult(null) }}
        disabled={cleanupPending}
      >
        Delete Orphaned Images
      </Button>
    ) : (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Delete all images not referenced in any note?</span>
        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={runCleanup}>Yes, delete</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCleanupConfirm(false)}>Cancel</Button>
      </div>
    )}
    {!sweepConfirm ? (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { setSweepConfirm(true); setSweepResult(null) }}
        disabled={sweepPending}
      >
        Delete Orphaned R2 Imports
      </Button>
    ) : (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Scan R2 import files and delete any without a matching job?</span>
        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={runSweep}>Yes, delete</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSweepConfirm(false)}>Cancel</Button>
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Add success messages after the error banner**

After the error banner section (after line 306), add:

```tsx
{/* ── Cleanup success messages ──────────────────────────────────────── */}
{cleanupResult && (
  <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
    Deleted {cleanupResult.deletedCount} orphaned image{cleanupResult.deletedCount !== 1 ? "s" : ""}, freed {formatBytes(cleanupResult.freedBytes)}.
  </div>
)}
{sweepResult && (
  <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
    Found {sweepResult.orphanedFound} orphaned import{sweepResult.orphanedFound !== 1 ? "s" : ""}, deleted {sweepResult.filesDeleted} file{sweepResult.filesDeleted !== 1 ? "s" : ""}.
  </div>
)}
```

- [ ] **Step 3: Verify the header renders correctly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: consolidate all three buttons in dashboard header"
```

---

### Task 3: Remove cleanup button from Application Metrics section

**Files:**
- Modify: `src/app/admin/page.tsx:330-351` (cleanup banner in Application Metrics)

- [ ] **Step 1: Remove the cleanup banner from Application Metrics**

Delete the entire cleanup banner block (lines 332-351) from inside the Application Metrics `CollapsibleSection`:

```tsx
{/* Cleanup banner */}
<div className="flex items-center justify-between mb-3">
  {!cleanupConfirm ? (
    <Button variant="outline" size="sm" onClick={() => { setCleanupConfirm(true); setCleanupResult(null) }} disabled={cleanupPending} className="text-xs h-7 gap-1">
      <Sparkles className="size-3" />
      {cleanupPending ? "Cleaning…" : "Clean up orphaned images"}
    </Button>
  ) : (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Delete all images not referenced in any note?</span>
      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={runCleanup}>Yes, delete</Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCleanupConfirm(false)}>Cancel</Button>
    </div>
  )}
</div>
{cleanupResult && (
  <p className="text-xs text-green-600 dark:text-green-400 mb-3">
    Cleaned up {cleanupResult.deletedCount} orphaned image{cleanupResult.deletedCount !== 1 ? "s" : ""}, freed {formatBytes(cleanupResult.freedBytes)}.
  </p>
)}
```

- [ ] **Step 2: Verify the Application Metrics section still renders correctly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: remove cleanup button from Application Metrics section"
```

---

### Task 4: Remove sweep button from imports page

**Files:**
- Modify: `src/app/admin/imports/page.tsx:106-107` (sweep state)
- Modify: `src/app/admin/imports/page.tsx:196-214` (handleSweep function)
- Modify: `src/app/admin/imports/page.tsx:230-237` (sweep button)
- Modify: `src/app/admin/imports/page.tsx:509-527` (sweep dialog)

- [ ] **Step 1: Remove sweep-related state variables**

Delete these lines from `src/app/admin/imports/page.tsx` (lines 106-107):

```tsx
const [sweepDialogOpen, setSweepDialogOpen] = useState(false)
const [sweeping, setSweeping] = useState(false)
```

- [ ] **Step 2: Remove the handleSweep function**

Delete the entire `handleSweep` function (lines 196-214):

```tsx
async function handleSweep() {
  setSweeping(true)
  try {
    const res = await fetch("/api/admin/r2/sweep", { method: "POST" })
    const data = await res.json()
    if (data.success) {
      toast.success("Sweep complete", {
        description: `Found ${data.orphanedFound} orphaned import${data.orphanedFound !== 1 ? "s" : ""}, deleted ${data.filesDeleted} file${data.filesDeleted !== 1 ? "s" : ""}.`,
      })
      setSweepDialogOpen(false)
    } else {
      toast.error("Sweep failed", { description: data.error })
    }
  } catch {
    toast.error("Sweep failed", { description: "Network error" })
  } finally {
    setSweeping(false)
  }
}
```

- [ ] **Step 3: Remove the sweep button from the header**

Delete these lines from the imports page header (lines 230-237):

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setSweepDialogOpen(true)}
>
  <HardDrive size={14} className="mr-1" />
  Sweep Orphans
</Button>
```

- [ ] **Step 4: Remove the sweep dialog**

Delete the entire sweep dialog (lines 509-527):

```tsx
{/* Sweep Orphans Confirmation Dialog */}
<Dialog open={sweepDialogOpen} onOpenChange={(open) => { if (!open) setSweepDialogOpen(false) }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Sweep Orphaned R2 Files</DialogTitle>
      <DialogDescription>
        This will scan all R2 import files and delete any that don&apos;t have a matching import job in the database.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSweepDialogOpen(false)} disabled={sweeping}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleSweep} disabled={sweeping}>
        {sweeping ? "Sweeping..." : "Sweep"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Remove unused imports**

Remove `HardDrive` from the lucide-react import if it's no longer used (line 31). Check if `HardDrive` is used elsewhere in the file first — it is not used in any other remaining code, so remove it.

- [ ] **Step 6: Verify the imports page still compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/imports/page.tsx
git commit -m "feat: remove sweep orphans button from imports page"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Verify the dashboard renders correctly**

Check that the dashboard page loads without errors and all three buttons appear in the header with correct styling.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any issues from final verification"
```
