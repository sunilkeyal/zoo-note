# Link Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add link support to the TipTap editor so that links in notes look like clickable links and support both auto-detecting pasted URLs and manual link creation.

**Architecture:** Use TipTap's official `@tiptap/extension-link` package to add link functionality. Configure the extension for auto-linking and add toolbar buttons for manual link creation/editing. Style links with CSS for visual distinction.

**Tech Stack:** TipTap, React, TypeScript, Tailwind CSS

---

## File Structure

| File | Purpose |
|------|---------|
| `package.json` | Add `@tiptap/extension-link` dependency |
| `src/components/MainArea.tsx` | Add Link extension to editor, add toolbar buttons |
| `src/app/globals.css` | Add link styling rules |

---

## Task 1: Install Link Extension

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @tiptap/extension-link
```

- [ ] **Step 2: Verify installation**

```bash
npm list @tiptap/extension-link
```
Expected: Shows installed package version

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @tiptap/extension-link dependency"
```

---

## Task 2: Add Link Extension to Editor

**Files:**
- Modify: `src/components/MainArea.tsx:1-19` (imports)
- Modify: `src/components/MainArea.tsx:616-634` (extensions array)

- [ ] **Step 1: Add import statement**

Add after line 19 (after `import TableCellBase from "@tiptap/extension-table-cell"`):

```typescript
import Link from "@tiptap/extension-link"
```

- [ ] **Step 2: Add Link to extensions array**

Add after `CustomTaskItem.configure({ nested: true })` (line 628):

```typescript
Link.configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
}),
```

- [ ] **Step 3: Verify editor renders**

Run: `npm run dev`
Expected: Editor loads without errors

- [ ] **Step 4: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: add Link extension to TipTap editor"
```

---

## Task 3: Add Desktop Toolbar Link Button

**Files:**
- Modify: `src/components/MainArea.tsx:55-60` (icon imports)
- Modify: `src/components/MainArea.tsx:138-401` (DesktopToolbar)

- [ ] **Step 1: Add Link icon import**

Add to the lucide-react imports (around line 56):

```typescript
import {
  Strikethrough,
  Palette,
  Highlighter,
  ArrowUpDown,
  ChevronDown,
  Link as LinkIcon,
} from "lucide-react"
```

- [ ] **Step 2: Add Link button state**

Add state variable and handler after `useToolbarReRender(editor)` call in DesktopToolbar (after line 143):

```typescript
const [showLinkInput, setShowLinkInput] = useState(false)
const [linkUrl, setLinkUrl] = useState("")
const linkInputRef = useRef<HTMLInputElement | null>(null)

useEffect(() => {
  if (showLinkInput && linkInputRef.current) {
    linkInputRef.current.focus()
  }
}, [showLinkInput])
```

- [ ] **Step 3: Add Link button to toolbar**

Add after the Strikethrough button (after line 172):

```typescript
<Tooltip>
  <TooltipTrigger render={
    <button
      className={`h-7 w-7 flex items-center justify-center rounded-md border border-input ${
        editor.isActive("link") ? "bg-accent text-accent-foreground" : "hover:bg-accent"
      }`}
      onClick={() => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run()
        } else {
          const { from, to } = editor.state.selection
          const selectedText = editor.state.doc.textBetween(from, to)
          setLinkUrl(editor.getAttributes("link").href || selectedText || "")
          setShowLinkInput(true)
        }
      }}
    >
      <LinkIcon className="h-4 w-4" />
    </button>
  } />
  <TooltipContent>Insert link</TooltipContent>
</Tooltip>
```

- [ ] **Step 4: Add link input popover**

Add after the Link button (before the closing `</div>` of the toolbar):

```typescript
{showLinkInput && (
  <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
    <PopoverContent className="w-[300px] p-3" align="start">
      <div className="text-sm font-medium mb-2">Enter URL</div>
      <div className="flex items-center gap-2">
        <input
          ref={linkInputRef}
          type="url"
          placeholder="https://example.com"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="flex-1 h-7 px-2 text-sm rounded-md border border-input bg-background"
          onKeyDown={(e) => {
            if (e.key === "Enter" && linkUrl) {
              editor.chain().focus().setLink({ href: linkUrl }).run()
              setShowLinkInput(false)
              setLinkUrl("")
            }
          }}
        />
        <button
          className="h-7 px-3 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            if (linkUrl) {
              editor.chain().focus().setLink({ href: linkUrl }).run()
              setShowLinkInput(false)
              setLinkUrl("")
            }
          }}
        >
          Apply
        </button>
      </div>
      {editor.isActive("link") && (
        <button
          className="mt-2 text-sm text-destructive hover:underline"
          onClick={() => {
            editor.chain().focus().unsetLink().run()
            setShowLinkInput(false)
            setLinkUrl("")
          }}
        >
          Remove link
        </button>
      )}
    </PopoverContent>
  </Popover>
)}
```

- [ ] **Step 5: Add missing imports**

Add `useState` and `useEffect` to the React imports (line 1):

```typescript
import React, { useState, useEffect } from "react"
```

Note: `useRef` is already imported.

- [ ] **Step 6: Verify toolbar renders**

Run: `npm run dev`
Expected: Link button appears in toolbar, clicking opens input popover

- [ ] **Step 7: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: add link button to desktop toolbar"
```

---

## Task 4: Add Mobile Toolbar Link Button

**Files:**
- Modify: `src/components/MainArea.tsx:403-593` (MobileToolbar)

- [ ] **Step 1: Add Link button state to MobileToolbar**

Add state variables after `useToolbarReRender(editor)` call (after line 407):

```typescript
const [showLinkInput, setShowLinkInput] = useState(false)
const [linkUrl, setLinkUrl] = useState("")
const linkInputRef = useRef<HTMLInputElement | null>(null)

useEffect(() => {
  if (showLinkInput && linkInputRef.current) {
    linkInputRef.current.focus()
  }
}, [showLinkInput])
```

- [ ] **Step 2: Add Link button to mobile toolbar**

Add after the Strikethrough button (after line 434):

```typescript
<button
  onClick={() => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run()
    } else {
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to)
      setLinkUrl(editor.getAttributes("link").href || selectedText || "")
      setShowLinkInput(true)
    }
  }}
  className={`flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] ${editor.isActive("link") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
>
  <LinkIcon className="h-5 w-5" />
</button>
```

- [ ] **Step 3: Add link input popover for mobile**

Add before the closing `</div>` of the mobile toolbar (before line 591):

```typescript
{showLinkInput && (
  <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
    <PopoverContent className="w-[300px] p-3" align="center" side="top">
      <div className="text-sm font-medium mb-2">Enter URL</div>
      <div className="flex items-center gap-2">
        <input
          ref={linkInputRef}
          type="url"
          placeholder="https://example.com"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="flex-1 h-7 px-2 text-sm rounded-md border border-input bg-background"
          onKeyDown={(e) => {
            if (e.key === "Enter" && linkUrl) {
              editor.chain().focus().setLink({ href: linkUrl }).run()
              setShowLinkInput(false)
              setLinkUrl("")
            }
          }}
        />
        <button
          className="h-7 px-3 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            if (linkUrl) {
              editor.chain().focus().setLink({ href: linkUrl }).run()
              setShowLinkInput(false)
              setLinkUrl("")
            }
          }}
        >
          Apply
        </button>
      </div>
      {editor.isActive("link") && (
        <button
          className="mt-2 text-sm text-destructive hover:underline"
          onClick={() => {
            editor.chain().focus().unsetLink().run()
            setShowLinkInput(false)
            setLinkUrl("")
          }}
        >
          Remove link
        </button>
      )}
    </PopoverContent>
  </Popover>
)}
```

- [ ] **Step 4: Verify mobile toolbar renders**

Run: `npm run dev` and resize browser to mobile width
Expected: Link button appears in mobile toolbar, clicking opens input popover

- [ ] **Step 5: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: add link button to mobile toolbar"
```

---

## Task 5: Add Link Styling

**Files:**
- Modify: `src/app/globals.css:131-140`

- [ ] **Step 1: Add link CSS rules**

Add after the `.ProseMirror` rule block (after line 140):

```css
.ProseMirror a {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}

.ProseMirror a:hover {
  opacity: 0.8;
}
```

- [ ] **Step 2: Verify styling**

Run: `npm run dev`
Expected: Links appear with blue color and underline

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add link styling to editor"
```

---

## Task 6: Test Link Functionality

**Files:**
- Test: Manual testing

- [ ] **Step 1: Test auto-link on paste**

1. Open editor
2. Paste a URL (e.g., `https://example.com`)
3. Expected: URL auto-converts to a clickable link

- [ ] **Step 2: Test manual link creation**

1. Select text in editor
2. Click link button in toolbar
3. Enter URL and click Apply
4. Expected: Selected text becomes a link

- [ ] **Step 3: Test link on plain text**

1. Click link button with no selection
2. Enter URL
3. Expected: URL appears as link text

- [ ] **Step 4: Test remove link**

1. Click on a link
2. Click link button
3. Click "Remove link"
4. Expected: Link is removed, text remains

- [ ] **Step 5: Run lint**

```bash
npm run lint
```
Expected: No lint errors

- [ ] **Step 6: Run tests**

```bash
npm test
```
Expected: All tests pass

---

## Summary

| Task | Description | Files Modified |
|------|-------------|----------------|
| 1 | Install link extension | `package.json` |
| 2 | Add extension to editor | `MainArea.tsx` |
| 3 | Add desktop toolbar button | `MainArea.tsx` |
| 4 | Add mobile toolbar button | `MainArea.tsx` |
| 5 | Add link styling | `globals.css` |
| 6 | Test functionality | Manual testing |
