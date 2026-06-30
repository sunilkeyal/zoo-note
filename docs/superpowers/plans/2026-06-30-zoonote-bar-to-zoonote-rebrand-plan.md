# ZooNoteBar to ZooNote Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the application from ZooNoteBar to ZooNote across all source files and assets.

**Architecture:** Simple find-and-replace of the string "ZooNoteBar" to "ZooNote" (and "/ZooNoteBar.png" to "/ZooNote.png") across 8 source files + 2 test files, plus deleting the old logo asset.

**Tech Stack:** Next.js, TypeScript, Vitest

---

### Task 1: Update app metadata

**Files:**
- Modify: `src/app/layout.tsx:10-12`

- [ ] **Update title, description, and icon path**

Change lines 10-12:
```tsx
  title: "ZooNote",
  description: "ZooNote — your personal notes workspace",
  icons: { icon: '/ZooNote.png' },
```

- [ ] **Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update app metadata to ZooNote"
```

### Task 2: Update sidebar branding

**Files:**
- Modify: `src/components/NotesSidebar.tsx:649-650`

- [ ] **Update logo src, alt text, and brand name**

```tsx
            <img src="/ZooNote.png" alt="ZooNote" className="size-6 rounded-sm" />
            <span className="text-sm font-semibold">ZooNote</span>
```

- [ ] **Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: update sidebar branding to ZooNote"
```

### Task 3: Update login and signup pages

**Files:**
- Modify: `src/app/login/page.tsx:47`
- Modify: `src/app/signup/page.tsx:46`

- [ ] **Update login page logo**

```tsx
        <img src="/ZooNote.png" alt="ZooNote" className="size-16 rounded-xl" />
```

- [ ] **Update signup page logo**

```tsx
        <img src="/ZooNote.png" alt="ZooNote" className="size-16 rounded-xl" />
```

- [ ] **Commit**

```bash
git add src/app/login/page.tsx src/app/signup/page.tsx
git commit -m "feat: update login/signup pages to ZooNote"
```

### Task 4: Update admin settings page

**Files:**
- Modify: `src/app/admin/settings/page.tsx:10`

- [ ] **Update application name display**

```tsx
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">ZooNote</div>
```

- [ ] **Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat: update admin settings display to ZooNote"
```

### Task 5: Update email templates

**Files:**
- Modify: `src/lib/email.ts:45-46,67-68`

- [ ] **Update welcome email subject and body** (line 45-46)

```tsx
    subject: "Your ZooNote account has been created",
    html: `<p>An admin has created an account for you at ZooNote.</p><p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in and change your password.</p>`,
```

- [ ] **Update admin password reset email subject and body** (line 67-68)

```tsx
    subject: "Your ZooNote password has been reset",
    html: `<p>An admin has reset your ZooNote password.</p><p>Your new temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in and change your password.</p>`,
```

- [ ] **Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: update email templates to ZooNote"
```

### Task 6: Update tests

**Files:**
- Modify: `src/__tests__/email.test.ts:90,143`
- Modify: `src/__tests__/notes-sidebar.test.tsx:374`

- [ ] **Update email test expectations** (line 90 and 143)

```typescript
      subject: 'Your ZooNote account has been created',
```

```typescript
      subject: 'Your ZooNote password has been reset',
```

- [ ] **Update sidebar test expectation** (line 374)

```typescript
    expect(screen.getByText('ZooNote')).toBeInTheDocument()
```

- [ ] **Commit**

```bash
git add src/__tests__/email.test.ts src/__tests__/notes-sidebar.test.tsx
git commit -m "test: update test expectations to ZooNote"
```

### Task 7: Delete old logo asset

**Files:**
- Delete: `public/ZooNoteBar.png`

- [ ] **Remove old logo**

Run: `git rm public/ZooNoteBar.png`

- [ ] **Commit**

```bash
git commit -m "feat: remove old ZooNoteBar logo asset"
```

### Task 8: Verify build and tests

- [ ] **Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Run type check / lint**

Run: `npx tsc --noEmit`
Expected: No type errors
