# Research: Welcome Empty State Mobile

**Date**: 2026-07-21
**Feature**: Welcome Empty State Mobile

## Research Tasks

### 1. Empty State Design Pattern

**Decision**: Replace inline empty state in NoteCardGrid with a centered welcome card containing an icon, welcome message, and subtitle.

**Rationale**: The current empty state (`<div className="text-center py-10 text-muted-foreground text-sm">No notes yet</div>`) is too minimal. A centered card with icon and text creates a warmer, more inviting experience for first-time users.

**Alternatives considered**:
- Create a separate `EmptyState` component: Rejected for now since the empty state is simple and only used in one place. Can be extracted later if needed.
- Use a modal/sheet: Rejected as it would block interaction and feel intrusive.

### 2. Icon Choice

**Decision**: Use `BookOpen` icon from lucide-react.

**Rationale**: The project already uses lucide-react for all icons. `BookOpen` is visually appropriate for a notes app and conveys the idea of "ready to be written in". The desktop HomePage.tsx already uses `FileText`, `Star`, `Search`, `Plus` from lucide.

**Alternatives considered**:
- `NotebookPen`: More specific to note-taking, but less universally recognized.
- `FileText`: Already used elsewhere in the app, could feel repetitive.
- `PenLine`: Too action-focused, not welcoming enough.

### 3. Mobile Font Size Strategy

**Decision**: Increase font sizes using Tailwind responsive utility classes (`sm:` prefix) applied to mobile-specific elements.

**Rationale**: The project uses Tailwind CSS 4 with a `768px` breakpoint. Current mobile text uses sizes like `text-[13px]`, `text-[11px]`, `text-[10px]`. A modest increase (~15%) improves readability without overwhelming the layout. Using Tailwind classes keeps the approach consistent with the existing codebase.

**Alternatives considered**:
- CSS custom properties: More flexible but adds complexity for a simple change.
- JavaScript-based scaling: Overkill for font size adjustments.

### 4. Welcome Message Content

**Decision**: 
- Primary message: "Welcome to ZooNote"
- Subtitle: "Your personal space for notes and ideas. Tap + to create your first note."

**Rationale**: Friendly, clear, and provides a direct call-to-action guiding the user to the "+" button. The subtitle explains what the app is for and how to get started.

**Alternatives considered**:
- Just "No Notes Yet": Too minimal, doesn't feel welcoming.
- Longer welcome message: Could overwhelm on mobile screens.
