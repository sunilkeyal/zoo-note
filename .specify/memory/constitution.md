# ZooNote Project Constitution

> **Ratification Date:** 2026-07-15
> **Last Amended Date:** 2026-07-15
> **Version:** 1.2.0

---

## 1. Core Principles

### 1.1 Data Privacy First

ZooNote handles personal notes that may contain sensitive information.

- User data MUST NOT be logged, exposed, or transmitted to third parties
- Authentication secrets and API keys MUST NOT be committed to version control
- Image uploads MUST use secure, authenticated storage (R2/GridFS) with proper access controls
- Password hashing MUST use bcryptjs with appropriate salt rounds

### 1.2 Offline-Resilient Architecture

Notes should be accessible and reliable even under poor network conditions.

- API routes MUST handle network failures gracefully
- Client-side state MUST remain consistent with server state
- Optimistic updates SHOULD be used where appropriate for perceived performance
- Data loss prevention MUST be prioritized over feature velocity

### 1.3 Accessibility & Responsiveness

ZooNote must work well on all devices and be usable by all users.

- Mobile-first responsive design using dedicated mobile components
- Keyboard navigation MUST be supported for all interactive elements
- ARIA labels MUST be present on non-text UI controls
- Color contrast MUST meet WCAG AA standards

### 1.4 Testable Code

All business logic and critical user flows MUST have test coverage.

- New features MUST include corresponding Vitest test files
- Components with complex state MUST have integration tests
- API routes MUST be tested for happy and error paths
- Tests MUST be runnable via `npm test` without environment-specific setup

### 1.5 Consistent User Experience

The UI should feel cohesive and predictable across all views.

- shadcn/ui primitives MUST be used when available; custom components only when shadcn lacks the needed functionality
- Tailwind CSS MUST be used for all styling; avoid inline styles or CSS-in-JS
- Follow existing component patterns (e.g., sidebar, editor, mobile views)
- Transitions and animations MUST be consistent with existing app behavior
- Theme support (dark/light) MUST be maintained in all new UI

### 1.6 Branch-Based Development

All feature work MUST use GitHub feature branches, not direct commits to `main`.

- Feature branches MUST be named descriptively (e.g., `feat/notes-export`, `fix/trash-empty`)
- Pull requests MUST be opened before merging to `main`
- `main` MUST always be deployable
- Branches SHOULD be deleted after merge

---

## 2. Technical Standards

### 2.1 Code Quality

- TypeScript strict mode is enabled; all new code MUST be fully typed
- ESLint rules MUST pass before merging (`npm run lint`)
- No `any` types unless explicitly justified and documented
- Error boundaries MUST be used for runtime error handling

### 2.2 Dependency Management

- New dependencies MUST be justified by project need
- Prefer built-in Next.js/React APIs over external libraries
- Dependencies MUST be actively maintained (check npm weekly downloads, last publish date)
- Package versions MUST use semantic versioning ranges

### 2.3 API Design

- API routes MUST use proper HTTP status codes
- Request validation MUST be performed before processing
- Responses MUST follow a consistent shape (success/error)
- Rate limiting SHOULD be considered for public-facing endpoints

### 2.4 Database & Storage

- MongoDB collections MUST use appropriate indexes for query patterns
- Large binary data (images) MUST use R2 storage, not database
- Data migrations MUST be versioned and reversible
- Soft deletes (trash) MUST preserve data integrity

---

## 3. Governance

### 3.1 Amendment Process

- Principles MAY be amended via pull request with rationale
- Breaking changes to principles require version increment (MAJOR)
- Additions or expansions require MINOR increment
- Clarifications and typo fixes require PATCH increment

### 3.2 Compliance Review

- New features SHOULD be reviewed against these principles
- Existing code SHOULD be refactored when principles are violated
- Principle violations MUST be documented with justification

### 3.3 Versioning Policy

This constitution follows semantic versioning:
- **MAJOR**: Backward incompatible governance changes or principle removals
- **MINOR**: New principles added or materially expanded guidance
- **PATCH**: Clarifications, wording improvements, non-semantic refinements
