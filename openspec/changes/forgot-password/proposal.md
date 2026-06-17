## Why

Users have no way to recover access if they forget their password. The login page has a placeholder "Forgot your password?" link that does nothing.

## What Changes

- Add a "Forgot Password" page where users enter their email to receive a reset link
- Add a password reset email sending mechanism using Nodemailer
- Add a "Reset Password" page where users set a new password using a token from the email
- Add API routes: `POST /api/auth/forgot-password` (request reset) and `POST /api/auth/reset-password` (execute reset)
- Add a MongoDB collection (`passwordResetTokens`) to store reset tokens with expiration
- Activate the existing "Forgot your password?" link on the login page
- Add `nodemailer` package dependency

## Capabilities

### New Capabilities
- `password-reset`: Complete forgot/reset password flow including token generation, email delivery, and password update

### Modified Capabilities

None.

## Impact

- `src/app/login/page.tsx` — activate the existing "Forgot your password?" link
- `src/lib/auth.ts` — add helpers for password hashing/verification (reuse bcryptjs)
- `src/lib/mongodb.ts` — add helper for the reset tokens collection
- New files:
  - `src/app/forgot-password/page.tsx` — forgot password form
  - `src/app/reset-password/page.tsx` — reset password form
  - `src/app/api/auth/forgot-password/route.ts` — forgot password API
  - `src/app/api/auth/reset-password/route.ts` — reset password API
  - `src/lib/email.ts` — email sending utility
- Dependency added: `nodemailer`
- MongoDB collection: `passwordResetTokens`
