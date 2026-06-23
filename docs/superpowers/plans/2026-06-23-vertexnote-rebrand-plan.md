# VertexNote Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the application from "Notes" / "Notes App" to "VertexNote" and wire the `vertexnote.png` logo into the sidebar header, login/signup pages, and browser tab favicon.

**Architecture:** Move `vertexnote.png` to `public/` so Next.js serves it at `/vertexnote.png`, then update metadata in `layout.tsx` for the favicon, add logo `<img>` tags to the sidebar and auth pages, and update all user-visible brand name strings.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, shadcn/ui

## Global Constraints

- Brand name must be spelled exactly `VertexNote` (CamelCase, one word) in all user-visible text
- Logo image is served from `/vertexnote.png` (public folder) — no duplication of the file
- Internal code symbols (`NotesSidebar`, `NoteContext`, `useNotes`, etc.) are NOT renamed
- The "Notes" section label inside the sidebar content list is NOT changed — it is a section label, not a brand name

---

### Task 1: Move logo to public folder

**Files:**
- Move: `vertexnote.png` (project root) → `public/vertexnote.png`

**Interfaces:**
- Produces: `/vertexnote.png` available as a static asset URL for all subsequent tasks

- [ ] **Step 1: Move the file**

```bash
mv vertexnote.png public/vertexnote.png
```

- [ ] **Step 2: Verify the file is in place**

```bash
ls public/vertexnote.png
```

Expected output: `public/vertexnote.png`

- [ ] **Step 3: Commit**

```bash
git add public/vertexnote.png
git add -u vertexnote.png
git commit -m "chore: move vertexnote.png to public folder"
```

---

### Task 2: Update layout metadata (title, description, favicon)

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `/vertexnote.png` static asset from Task 1
- Produces: Browser tab shows "VertexNote" title and `vertexnote.png` favicon

- [ ] **Step 1: Open `src/app/layout.tsx` and locate the metadata export**

Current content around the metadata block:
```typescript
export const metadata: Metadata = {
  title: "Notes",
  description: "A simple notes application",
}
```

- [ ] **Step 2: Replace the metadata block**

Replace the metadata block with:
```typescript
export const metadata: Metadata = {
  title: "VertexNote",
  description: "VertexNote — your personal notes workspace",
  icons: { icon: '/vertexnote.png' },
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update metadata for VertexNote rebrand"
```

---

### Task 3: Update sidebar header branding

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

**Interfaces:**
- Consumes: `/vertexnote.png` static asset from Task 1
- Produces: Sidebar header shows the VertexNote logo (24×24) beside the "VertexNote" name

- [ ] **Step 1: Locate the sidebar header block in `src/components/NotesSidebar.tsx`**

Find this block (around line 459–462):
```tsx
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <Pen className="size-5" />
            <span className="text-sm font-semibold">Notes</span>
          </div>
```

- [ ] **Step 2: Replace the logo and name**

Replace that `<div>` with:
```tsx
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <img src="/vertexnote.png" alt="VertexNote" className="size-6 rounded-sm" />
            <span className="text-sm font-semibold">VertexNote</span>
          </div>
```

- [ ] **Step 3: Remove the unused `Pen` import**

Find the lucide-react import block that includes `Pen`. Remove `Pen` from it. For example, if the line is:
```tsx
import { ..., Pen, ... } from "lucide-react"
```
Remove `Pen,` from the list.

- [ ] **Step 4: Verify no TypeScript / lint errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: update sidebar header to VertexNote logo and name"
```

---

### Task 4: Add logo to login page

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `/vertexnote.png` static asset from Task 1
- Produces: Login page shows centered VertexNote logo (64×64) above the login card

- [ ] **Step 1: Locate the return block in the `LoginForm` component**

Find the wrapping `<div>` that contains the `<Card>` (around line 40):
```tsx
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
```

- [ ] **Step 2: Add the logo above the Card**

Replace that opening section with:
```tsx
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <img src="/vertexnote.png" alt="VertexNote" className="size-16 rounded-xl" />
      <Card className="w-full max-w-sm">
```

And close the new outer `<div>` after `</Card>`:
```tsx
      </Card>
      </div>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add VertexNote logo to login page"
```

---

### Task 5: Add logo to signup page

**Files:**
- Modify: `src/app/signup/page.tsx`

**Interfaces:**
- Consumes: `/vertexnote.png` static asset from Task 1
- Produces: Signup page shows centered VertexNote logo (64×64) above the signup card

- [ ] **Step 1: Locate the return block in `SignupPage`**

Find the wrapping `<div>` that contains the `<Card>` (around line 44):
```tsx
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
```

- [ ] **Step 2: Add the logo above the Card**

Replace that opening section with:
```tsx
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <img src="/vertexnote.png" alt="VertexNote" className="size-16 rounded-xl" />
      <Card className="w-full max-w-sm">
```

And close the new outer `<div>` after `</Card>`:
```tsx
      </Card>
      </div>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat: add VertexNote logo to signup page"
```

---

### Task 6: Update admin settings page and package.json

**Files:**
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: Admin settings displays "VertexNote" as the application name; package name is "vertexnote"

- [ ] **Step 1: Update the application name in `src/app/admin/settings/page.tsx`**

Find (around line 10):
```tsx
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">Notes App</div>
```

Replace with:
```tsx
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">VertexNote</div>
```

- [ ] **Step 2: Update the package name in `package.json`**

Find:
```json
  "name": "notes-app",
```

Replace with:
```json
  "name": "vertexnote",
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/page.tsx package.json
git commit -m "feat: update app name to VertexNote in settings and package.json"
```

---

## Verification

After all tasks are complete, do a final check:

```bash
# Check no stray "Notes App" or title="Notes" remain in src/
grep -rn '"Notes App"\|title: "Notes"\|<title>Notes' src/
```

Expected: no matches.

```bash
# Confirm vertexnote.png is only in public/, not at root
ls vertexnote.png 2>/dev/null && echo "FOUND AT ROOT - ERROR" || echo "Not at root - OK"
ls public/vertexnote.png && echo "In public/ - OK"
```

Expected: "Not at root - OK" and "In public/ - OK".
