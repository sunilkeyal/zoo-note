# User Authentication Design

## Overview
Add username/password authentication to the notes app using Auth.js (NextAuth v5) with Credentials provider and MongoDB adapter. Unauthenticated users are redirected to `/login`. A default admin user is seeded into MongoDB on first run.

## Architecture

### Auth Layer
- **Auth.js (NextAuth v5)** — `next-auth@beta`
- **Credentials provider** — username/password verified against bcrypt hash against MongoDB `users` collection (no adapter)
- **Config** at `src/lib/auth.ts`

### Database
- **Users collection** (`users`) — documents contain:
  - `username` (unique)
  - `email`
  - `displayName`
  - `passwordHash` (bcrypt)
  - `role` (`"admin"` | `"user"`)
- Seed script at `src/lib/seed.ts` — checks if any user exists; if not, inserts default admin (`admin` / `admin123`)

## Components & Routes

### Login Page (`/login`)
- Route: `src/app/login/page.tsx` (client component)
- Uses shadcn `Card`, `Input`, `Button`, `Label` components
- Card layout: Header (title + description + Sign Up action), Content (username + password fields, "Forgot password?" link), Footer (Login button)
- On submit: calls `signIn("credentials", { username, password, redirect: false })` — uses `window.location.href = "/"` on success (client-side router.push doesn't remount NoteProvider)
- Displays error messages from Auth.js on failed login

### Auth Middleware
- File: `src/middleware.ts`
- Uses a separate lightweight NextAuth config (no Node.js modules — avoids Edge Runtime "stream" module error)
- Checks session on all routes except `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`
- Redirects to `/login` if unauthenticated

### Sidebar User Section
- Located in `NotesSidebar.tsx` inside a `<SidebarFooter>` component
- Uses shadcn `DropdownMenu` pattern — clicking the user row opens a popup:
  1. User info header in `DropdownMenuGroup > DropdownMenuLabel` (avatar initials + name + email)
  2. Separator
  3. Settings menu item (disabled)
  4. Account menu item (disabled)
  5. Upgrade to Pro menu item (disabled)
  6. Separator
  7. Log out menu item (`variant="destructive"`, calls `signOut()`)
- Uses `render` prop on `DropdownMenuTrigger` (not `asChild` — `@base-ui/react` doesn't support it)
- In collapsed/icon mode: shows avatar only, which opens the same dropdown
- In expanded mode: shows avatar + display name + role + chevron
- Settings, Account, and Upgrade to Pro are placeholder menu items (visual-only for now)
- "Forgot your password?" link on login page is visual-only (password reset out of scope)

### Provider Updates
- `src/app/providers.tsx` — wrap with `SessionProvider` from `next-auth/react`

## Data Flow
1. User navigates to any protected route → middleware checks session → redirects to `/login`
2. User submits credentials → Auth.js `authorize` callback looks up user by username in MongoDB, verifies bcrypt hash
3. On success → session created, redirect to `/`
4. On failure → error message displayed on login page
5. Logout → `signOut()` clears session, redirects to `/login`

## Seed Flow
- `src/lib/seed.ts` — connects to MongoDB, checks `users.countDocuments()`, if 0 inserts default admin user with bcrypt-hashed password
- Called on app startup from `src/lib/auth.ts` (lazy seed on first auth call)

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/lib/auth.ts` | Create — Auth.js config |
| `src/lib/seed.ts` | Create — seed default admin |
| `src/types/next-auth.d.ts` | Create — type augmentation for user role |
| `src/app/login/page.tsx` | Create — login page |
| `src/middleware.ts` | Create — auth middleware |
| `src/app/api/auth/[...nextauth]/route.ts` | Create — Auth.js API route |
| `src/app/providers.tsx` | Modify — add SessionProvider |
| `src/components/NotesSidebar.tsx` | Modify — add SidebarFooter with user dropdown |
| `package.json` | Modify — add next-auth, bcryptjs, @types/bcryptjs deps |

## Testing
- Manual flow: visit app → redirected to `/login` → sign in with admin/admin123 → see sidebar with user section
- Logout → redirected back to `/login`
