# Missing Editor Toolbar Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add toolbar buttons for Blockquote, Inline code, Code block, Horizontal rule, and Undo/Redo to both the desktop and mobile editor toolbars, with matching editor CSS.

**Architecture:** All five commands already exist via the existing `StarterKit` config — no new TipTap extensions. Changes are confined to `src/components/MainArea.tsx` (the `DesktopToolbar` and `MobileToolbar` components), `src/app/globals.css` (element styling), and `src/__tests__/main-area.test.tsx` (tests + mocks).

**Tech Stack:** Next.js, React, TypeScript, TipTap (StarterKit), Tailwind CSS, lucide-react, Vitest + Testing Library.

## Global Constraints

- Desktop toolbar buttons use the existing `Toggle` + `Tooltip`/`TooltipTrigger render={...}` pattern; plain insert/action buttons use a `<button className="h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent">`.
- Mobile toolbar buttons use `<button className="flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] ...">` with 44px touch targets; active state uses `bg-accent text-accent-foreground`, inactive uses `text-muted-foreground hover:text-foreground`.
- Toggle-type buttons (inline code, blockquote, code block) show active state via `editor.isActive(...)`.
- Undo/Redo are disabled when `editor.can().undo()` / `editor.can().redo()` is false.
- Icons come from `lucide-react` (already installed): `Quote`, `Code`, `SquareCode`, `Minus`, `Undo2`, `Redo2`.
- Editor element CSS is theme-aware, using existing CSS variables (`--border`, `--muted`, `--muted-foreground`) inside `.ProseMirror` rules in `src/app/globals.css`.
- Run the full test suite with `npm test` (Vitest, non-watch) before each commit.

---

### Task 1: Editor CSS for blockquote, inline code, code block, and horizontal rule

**Files:**
- Modify: `src/app/globals.css` (after the existing `.ProseMirror h3` rule, ~line 165)

**Interfaces:**
- Produces: CSS classes/selectors `.ProseMirror blockquote`, `.ProseMirror code`, `.ProseMirror pre`, `.ProseMirror pre code`, `.ProseMirror hr`. No JS exports.

- [ ] **Step 1: Add the CSS rules**

In `src/app/globals.css`, immediately after the line
`.ProseMirror h3 { font-size: 16px; font-weight: 600; line-height: 1.25; margin: 0 0 8px 0; }`
add:

```css
.ProseMirror blockquote {
  border-left: 3px solid var(--border);
  padding-left: 1rem;
  margin: 8px 0;
  color: var(--muted-foreground);
}
.ProseMirror code {
  background-color: var(--muted);
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.ProseMirror pre {
  background-color: var(--muted);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  line-height: 1.5;
}
.ProseMirror pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}
.ProseMirror hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0;
}
```

- [ ] **Step 2: Verify the rules are present and the app builds**

Run: `grep -n "ProseMirror blockquote\|ProseMirror pre\|ProseMirror hr" src/app/globals.css`
Expected: three matches printed.

Run: `npm test`
Expected: PASS (existing suite unaffected; CSS is not type-checked but must not break the build).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add editor CSS for blockquote, code, pre, and hr"
```

---

### Task 2: Desktop toolbar — add new buttons and regroup

**Files:**
- Modify: `src/components/MainArea.tsx` (lucide-react imports ~line 75-82; `DesktopToolbar` component ~line 140-485)
- Test: `src/__tests__/main-area.test.tsx` (lucide-react mock ~line 76-99; mock editor chain ~line 8-38; add test cases)

**Interfaces:**
- Consumes: existing `editor: Editor` prop, `useToolbarReRender(editor)`, `fileInputRef`.
- Produces: new toolbar buttons calling `editor.chain().focus().undo()/.redo()/.toggleCode()/.toggleBlockquote()/.toggleCodeBlock()/.setHorizontalRule().run()`, and `editor.can().undo()/.redo()` for disabled state.

- [ ] **Step 1: Extend the test's lucide-react mock and mock editor**

In `src/__tests__/main-area.test.tsx`, add these entries to the `vi.mock('lucide-react', ...)` object (alongside the existing icons):

```ts
  Quote: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Quote', ...props }),
  Code: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Code', ...props }),
  SquareCode: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-SquareCode', ...props }),
  Minus: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Minus', ...props }),
  Undo2: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Undo2', ...props }),
  Redo2: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Redo2', ...props }),
```

In the same file, add these methods inside the `focus: vi.fn(() => ({ ... }))` return object of the mock editor chain:

```ts
        toggleCode: vi.fn(() => ({ run: vi.fn() })),
        toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
        toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
        setHorizontalRule: vi.fn(() => ({ run: vi.fn() })),
        undo: vi.fn(() => ({ run: vi.fn() })),
        redo: vi.fn(() => ({ run: vi.fn() })),
```

And add a `can` method to the top-level `mockEditor` object (next to `isActive`):

```ts
    can: vi.fn(() => ({ undo: () => true, redo: () => true })),
```

- [ ] **Step 2: Write the failing test**

Add to the `describe('MainArea', ...)` block in `src/__tests__/main-area.test.tsx`:

```ts
  it('renders the new toolbar buttons (undo, redo, inline code, blockquote, code block, horizontal rule)', () => {
    vi.mocked(useNotes).mockReturnValue({
      activeNote: createActiveNote(),
      activeNoteId: 'note1',
      updateNote: vi.fn(),
      createNote: vi.fn(),
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)

    expect(screen.getAllByTestId('icon-Undo2').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('icon-Redo2').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('icon-Code').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('icon-Quote').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('icon-SquareCode').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('icon-Minus').length).toBeGreaterThan(0)
  })
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- main-area`
Expected: FAIL — icons `icon-Undo2` etc. not found (buttons not yet added).

- [ ] **Step 4: Add the new icon imports**

In `src/components/MainArea.tsx`, extend the second lucide-react import block (the one containing `Bold, Italic, ... Image`) to include the new icons:

```ts
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ListChecks,
  Image,
  Quote,
  Code,
  SquareCode,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react"
```

- [ ] **Step 5: Add the History group (Undo/Redo) at the start of the desktop toolbar**

In `DesktopToolbar`, the toolbar container is:
`<div className="flex items-center gap-1 px-3 py-1 border rounded-lg bg-card overflow-x-auto">`

As the **first children** inside that div (before the Bold `Tooltip`), insert:

```tsx
          <Tooltip>
            <TooltipTrigger render={
              <button
                disabled={!editor.can().undo()}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 className="h-4 w-4" />
              </button>
            } />
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={
              <button
                disabled={!editor.can().redo()}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 className="h-4 w-4" />
              </button>
            } />
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />
```

- [ ] **Step 6: Add Inline code to the Inline group**

Immediately after the Strikethrough `Tooltip` block (and before the Link button block) in `DesktopToolbar`, insert:

```tsx
          <Tooltip>
            <TooltipTrigger render={<Toggle pressed={editor.isActive("code")} onPressedChange={() => editor.chain().focus().toggleCode().run()} size="sm" />}>
              <Code className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Inline code</TooltipContent>
          </Tooltip>
```

- [ ] **Step 7: Add Blockquote and Code block to the Blocks group**

The Blocks group currently starts with the Bullet list `Tooltip` (right after the `<Separator ... />` that follows the Link button). Insert these two blocks **before** the Bullet list `Tooltip`:

```tsx
          <Tooltip>
            <TooltipTrigger render={<Toggle pressed={editor.isActive("blockquote")} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} size="sm" />}>
              <Quote className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Blockquote</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Toggle pressed={editor.isActive("codeBlock")} onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()} size="sm" />}>
              <SquareCode className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Code block</TooltipContent>
          </Tooltip>
```

- [ ] **Step 8: Move Image into the Insert group and add Horizontal rule**

First, **remove** the existing Image block from near the end of `DesktopToolbar` — the `<Separator ... />` + Image `Tooltip` + the `<input ref={fileInputRef} ... />` that sit right before the `{showLinkInput && (` block. (Keep the `<input>` — it moves with the Image button.)

Then locate the `<TableGridPicker editor={editor} />` and its surrounding separators:

```tsx
        <Separator orientation="vertical" className="mx-1 h-6" />

        <TableGridPicker editor={editor} />

        <Separator orientation="vertical" className="mx-1 h-6" />
```

Replace that block with the Insert group (Table, Horizontal rule, Image + hidden input):

```tsx
        <Separator orientation="vertical" className="mx-1 h-6" />

        <TableGridPicker editor={editor} />
        <Tooltip>
          <TooltipTrigger render={
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="h-4 w-4" />
            </button>
          } />
          <TooltipContent>Horizontal rule</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={
            <button className="h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4" />
            </button>
          } />
          <TooltipContent>Insert image</TooltipContent>
        </Tooltip>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = '' }}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -- main-area`
Expected: PASS — all six new icons found; existing tests still pass.

- [ ] **Step 10: Add a click test for the horizontal-rule button**

Add to the `describe('MainArea', ...)` block:

```ts
  it('horizontal-rule button is clickable without throwing', () => {
    vi.mocked(useNotes).mockReturnValue({
      activeNote: createActiveNote(),
      activeNoteId: 'note1',
      updateNote: vi.fn(),
      createNote: vi.fn(),
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)
    const hrButton = screen.getAllByTestId('icon-Minus')[0].closest('button')!
    expect(() => fireEvent.click(hrButton)).not.toThrow()
  })
```

> NOTE: The shared mock editor returns a fresh chain each call, so asserting exact call counts is unreliable. This test verifies the button is wired and clickable; the icon-render test in Step 2 covers presence.

- [ ] **Step 11: Run the full suite**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 12: Commit**

```bash
git add src/components/MainArea.tsx src/__tests__/main-area.test.tsx
git commit -m "feat: add undo/redo, inline code, blockquote, code block, horizontal rule to desktop toolbar"
```

---

### Task 3: Mobile toolbar — add new buttons

**Files:**
- Modify: `src/components/MainArea.tsx` (`MobileToolbar` component ~line 487-760)

**Interfaces:**
- Consumes: `editor: Editor`, `fileInputRef`, existing `useToolbarReRender(editor)`.
- Produces: mobile buttons for undo/redo/inline code/blockquote/code block, and a Horizontal rule entry inside the existing "+" overflow popover.

- [ ] **Step 1: Add Undo/Redo at the far left of the mobile toolbar**

In `MobileToolbar`, the container is `<div className="editor-toolbar-mobile">`. Insert as the **first children** (before the Bold button):

```tsx
      <button
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        className="flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
      >
        <Undo2 className="h-5 w-5" />
      </button>
      <button
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        className="flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
      >
        <Redo2 className="h-5 w-5" />
      </button>

      <span className="w-px h-6 bg-border mx-0.5" />
```

- [ ] **Step 2: Add Inline code to the mobile inline group**

Immediately after the mobile Link button (the `<button>` whose icon is `<LinkIcon className="h-5 w-5" />`) and before the `<span className="w-px h-6 bg-border mx-0.5" />` that follows it, insert:

```tsx
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] ${editor.isActive("code") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Code className="h-5 w-5" />
      </button>
```

- [ ] **Step 3: Add Blockquote and Code block near the mobile list buttons**

Immediately after the mobile Todo-list button (icon `<ListChecks className="h-5 w-5" />`) and before `<TableGridPicker ... />`, insert:

```tsx
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] ${editor.isActive("blockquote") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Quote className="h-5 w-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] ${editor.isActive("codeBlock") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <SquareCode className="h-5 w-5" />
      </button>
```

- [ ] **Step 4: Add Horizontal rule to the mobile "+" overflow popover**

In the "+" `Popover`, inside its `PopoverContent`, after the closing `</div>` of the "Spacing" preset row (the last section) and before the `PopoverContent` closes, add:

```tsx
          <div className="text-sm font-medium mb-2 mt-2">Insert</div>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md border bg-background hover:bg-accent w-full"
          >
            <Minus className="h-4 w-4" /> Horizontal rule
          </button>
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS. The icon-render test from Task 2 Step 2 now also counts the mobile instances (`getAllByTestId(...).length` increases), which still satisfies `toBeGreaterThan(0)`.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open a note, and confirm on a narrow viewport (≤768px) the bottom toolbar shows Undo/Redo at the far left, Inline code after Link, Blockquote + Code block near the lists, and Horizontal rule inside the "+" menu. Confirm each formats the selection and the styles from Task 1 render.

- [ ] **Step 7: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: add undo/redo, inline code, blockquote, code block, horizontal rule to mobile toolbar"
```

---

## Self-Review Notes

- **Spec coverage:** All five features (blockquote, inline code, code block, horizontal rule, undo/redo) are implemented on both desktop (Task 2) and mobile (Task 3); editor CSS gap identified in the spec is covered by Task 1.
- **Type consistency:** Command names used across tasks match TipTap StarterKit APIs: `toggleBlockquote`, `toggleCode`, `toggleCodeBlock`, `setHorizontalRule`, `undo`, `redo`, and `editor.can().undo()/.redo()`. Icon names (`Quote`, `Code`, `SquareCode`, `Minus`, `Undo2`, `Redo2`) are consistent between the import (Task 2 Step 4), the test mock (Task 2 Step 1), and all usages.
- **Testing caveat:** The shared mock editor returns a new chain object per call, so tests assert button presence and clickability rather than exact chain call counts, consistent with the existing test suite's approach.
