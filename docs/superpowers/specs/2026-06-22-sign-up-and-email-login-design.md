# Sign Up & Email Login Design

## Overview
Replace username-based authentication with email-based authentication, add a sign-up page for self-registration of normal (role: `user`) accounts, and remove the `username` field from the codebase and database.

## Architecture

### Auth Changes
- **Login identifier** — switch from `username` to `email` in the Credentials provider
- **Sign-up** — new API route and page for user self-registration

### Database
- **Users collection** — stop using `username` field; documents become:
  - `email` (unique — new index)
  - `displayName`
  - `passwordHash` (bcrypt, 12 rounds)
  - `role` (`"admin"` | `"user"`)
  - `createdAt`, `updatedAt`
- **Unique email index** — added in `mongodb.ts` to prevent duplicate registrations
- **Seed** — remove `username` from seed users; lookup existing users by `email` instead

## Components & Routes

### Login Page (`/login`)
- Route: `src/app/login/page.tsx` (client component)
- Replace username input with email input (`type="email"`, `id="email"`)
- Call `signIn("credentials", { email, password, redirect: false })`
- Error message: "Invalid email or password"
- Enable the **Sign Up** button — links to `/signup`

### Sign-Up Page (`/signup`) — NEW
- Route: `src/app/signup/page.tsx` (client component)
- Card layout matching login page style
- Fields: Email (`type="email"`), Name, Password (`minLength=8`)
- Submits POST to `/api/auth/signup` via `fetch`
- On success: redirects to `/login` with success message in query param
- On error: inline error display
- Footer link: "Already have an account? Sign in"

### Sign-Up API (`POST /api/auth/signup`) — NEW
- Route: `src/app/api/auth/signup/route.ts`
- Validates:
  - `email` — valid format, non-empty
  - `password` — minimum 8 characters
  - `name` — non-empty
- Checks email uniqueness (DB unique index handles race conditions)
- Hashes password with bcrypt (12 rounds)
- Inserts user with `role: "user"`
- Returns `201 { success: true }` on success
- Returns `400` on validation errors
- Returns `409` on duplicate email (unique index error)
- No auto-login — redirects to login page

### Auth Config Update
- `src/lib/auth.config.ts` — add `/signup` to the list of public routes
- `src/lib/auth.ts` — change credential field from `username` to `email`, update lookup query

### Seed Update
- `src/lib/seed.ts` — remove `username` from seed user objects; find existing users by `email` instead
- Seed users identified by `email` going forward

### Middleware
- `src/middleware.ts` — no changes needed (uses `auth.config.ts` which will allow `/signup`)

## Data Flow

### Sign-Up Flow
1. User fills sign-up form → POST `/api/auth/signup`
2. API validates input, checks email uniqueness, hashes password
3. User document inserted with `role: "user"`
4. Response `201` → client redirects to `/login?signup=success`
5. Login page shows success banner

### Login Flow (updated)
1. User enters email + password → POST handled by NextAuth Credentials provider
2. `authorize` callback looks up user by email in MongoDB
3. Verifies bcrypt hash
4. Creates JWT session with `id`, `name`, `email`, `role`
5. Redirects to app

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/signup/page.tsx` | Create — sign-up page |
| `src/app/api/auth/signup/route.ts` | Create — sign-up API endpoint |
| `src/lib/auth.ts` | Modify — change username→email in Credentials provider |
| `src/lib/auth.config.ts` | Modify — add `/signup` to public routes |
| `src/lib/seed.ts` | Modify — remove username, use email for lookup |
| `src/lib/mongodb.ts` | Modify — add unique email index |
| `src/app/login/page.tsx` | Modify — replace username with email, enable Sign Up button |

## Testing
- Visit `/signup` → fill form → submit → redirected to `/login` with success message
- Try duplicate email → see error message
- Try invalid email / short password → see validation errors
- Login with email+password → works
- Login with old username → fails (as expected)
- Admin seed still works (looked up by email)
