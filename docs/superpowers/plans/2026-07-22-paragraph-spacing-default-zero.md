# Paragraph Spacing Default Zero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the default paragraph spacing from 10px to 0px, and clean up the toolbar preset list to remove the now-redundant "None" option.

**Architecture:** One CSS rule change drives the visual default. One constant array update cleans up the toolbar UI. No extension, data model, or API changes required.

**Tech Stack:** CSS (globals.css), TypeScript/React (MainArea.tsx), Vitest for tests.

## Global Constraints

- Do not touch `src/extensions/ParagraphSpacing.ts` — the extension is correct as-is.
- The `paragraphSpacing` attribute default remains `null`; the CSS is the single source of truth for the visual default.
- Run `npm run test` to verify tests pass after each change.

---

### Task 1: Change the CSS paragraph margin default

**Files:**
- Modify: `src/app/globals.css` (line 141)

**Interfaces:**
- Produces: `.ProseMirror p` with `margin: 0` — used by every paragraph in the editor when no inline spacing override is applied.

- [ ] **Step 1: Locate the rule**

  Open `src/app/globals.css` and find line 141:
  ```css
  .ProseMirror p { margin: 0 0 10px 0; }
  ```

- [ ] **Step 2: Change the margin to 0**

  ```css
  .ProseMirror p { margin: 0; }
  ```

- [ ] **Step 3: Verify no other `.ProseMirror p` rules conflict**

  Search the file for `.ProseMirror p` — confirm existing overrides (table cells, task-list content) still explicitly set `margin: 0` and are unaffected.

- [ ] **Step 4: Run tests**

  ```bash
  npm run test
  ```
  Expected: all tests pass (no test asserts the 10px value).

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/globals.css
  git commit -m "style: default paragraph margin to 0px in editor"
  ```

---

### Task 2: Update toolbar spacing presets

**Files:**
- Modify: `src/components/MainArea.tsx` (`SPACING_PRESETS` constant, lines ~117–125)

**Interfaces:**
- Consumes: `SPACING_PRESETS` array — used in two places in `MainArea.tsx` to render the paragraph spacing picker (desktop toolbar popover and mobile bottom sheet).
- Produces: Updated `SPACING_PRESETS` — "Default" renamed to "Default (0px)", "None" entry removed.

- [ ] **Step 1: Locate `SPACING_PRESETS`**

  In `src/components/MainArea.tsx`, find:
  ```ts
  const SPACING_PRESETS = [
    { label: "Default", value: null },
    { label: "None", value: "0px" },
    { label: "Tight", value: "4px" },
    ...
  ]
  ```

- [ ] **Step 2: Rename "Default" and remove "None"**

  ```ts
  const SPACING_PRESETS = [
    { label: "Default (0px)", value: null },
    { label: "Tight", value: "4px" },
    { label: "Compact", value: "8px" },
    { label: "Normal", value: "10px" },
    { label: "Relaxed", value: "24px" },
    { label: "Loose", value: "32px" },
  ]
  ```

  The `value: null` entry still clears any inline spacing and defers to the CSS default (now 0px). The `"0px"` inline-style entry is removed because it produces an identical visual result to `null`.

- [ ] **Step 3: Run tests**

  ```bash
  npm run test
  ```
  Expected: all tests pass (no test asserts preset labels or the presence of "None").

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/MainArea.tsx
  git commit -m "feat: rename Default to Default (0px) and remove redundant None spacing preset"
  ```
