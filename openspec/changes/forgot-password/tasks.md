## 1. Setup & Dependencies

- [x] 1.1 Install `resend` npm package
- [x] 1.2 Add `RESEND_API_KEY` and `EMAIL_FROM` environment variables to `.env.local`
- [x] 1.3 Add `/forgot-password`, `/reset-password`, `/api/auth/forgot-password`, `/api/auth/reset-password` to public routes in `src/lib/auth.config.ts`
- [x] 1.4 Create TTL index on `passwordResetTokens.expiresAt` in the MongoDB connection or seed logic

## 2. Email Utility

- [x] 2.1 Create `src/lib/email.ts` with a `sendPasswordResetEmail(to: string, link: string)` function using Resend SDK
- [x] 2.2 Implement console fallback when Resend API key is not configured (log `[Password Reset] Link: <url>`)

## 3. Token Management

- [x] 3.1 Create `src/lib/reset-token.ts` with helpers: `generateResetToken()`, `hashToken(token)`, `storeResetToken(email, tokenHash)`, `verifyResetToken(token)` 
- [x] 3.2 Implement rate limiter (in-memory Map with 60s cooldown per email)

## 4. API: Forgot Password

- [x] 4.1 Create `src/app/api/auth/forgot-password/route.ts` with POST handler
- [x] 4.2 Validate email input, check rate limit, look up user, generate token, store hash, send email
- [x] 4.3 Always return 200 `{ message: "If an account exists, a reset link has been sent" }`

## 5. API: Reset Password

- [x] 5.1 Create `src/app/api/auth/reset-password/route.ts` with POST handler
- [x] 5.2 Validate token and password input
- [x] 5.3 Verify token hash against stored hash, check expiration and usage
- [x] 5.4 Hash new password with bcryptjs, update user's `passwordHash`, mark token used

## 6. Forgot Password Page

- [x] 6.1 Create `src/app/forgot-password/page.tsx` with email input form and submit handler
- [x] 6.2 Show confirmation message on success with link back to login

## 7. Reset Password Page

- [x] 7.1 Create `src/app/reset-password/page.tsx` that reads `token` from query params
- [x] 7.2 Show new password form with validation (minimum 6 characters)
- [x] 7.3 Show success message with link to login on completion

## 8. Update Login Page

- [x] 8.1 Change the "Forgot your password?" link in `src/app/login/page.tsx` to navigate to `/forgot-password`
