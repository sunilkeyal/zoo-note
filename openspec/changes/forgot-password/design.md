## Context

The app uses NextAuth v5 with a Credentials provider and MongoDB. There is no email or notification system. The login page has a disabled "Forgot your password?" link. Users can only be created via the seed script — there is no self-registration or password recovery.

## Goals / Non-Goals

**Goals:**
- Allow users to request a password reset by entering their email
- Send a time-limited reset link via email
- Allow users to set a new password using a valid reset token
- Activate the existing "Forgot your password?" link on the login page

**Non-Goals:**
- User registration or sign-up flow
- Email verification on account creation
- Two-factor authentication
- Account recovery via username or security questions
- Admin-initiated password resets

## Decisions

- **Email service — Resend**: Chosen over Nodemailer+SMTP for its simple SDK, generous free tier (3,000 emails/month), and good deliverability without SPF/DKIM config. The `resend` SDK is used directly rather than SMTP. Domain verification is done via a single DNS TXT record — no email hosting required on the domain. Local dev falls back to console logging.
- **Token format — crypto.randomBytes(32) hex string**: 64-character hex string provides 256 bits of entropy. The raw token is sent in the email reset link; only its SHA-256 hash is stored in the database, making DB leaks useless to attackers.
- **Token expiration — 1 hour**: Balances security (short window for attack) with usability (long enough to check email).
- **Single-use tokens**: After a successful password reset the token is marked as used. Expired and used tokens are cleaned up on read or by a TTL index.
- **Rate limiting — in-memory cooldown per email**: A simple Map tracking the last request time per email prevents rapid-fire reset requests. Reset after 60 seconds. This is stateless and resets on server restart — acceptable for this app's scale.
- **Lookup by email only**: Users are looked up by email (not username) for the reset flow. The email field already exists in the user schema.
- **No token enumeration**: The forgot-password endpoint always returns success (even if the email doesn't exist) to prevent email enumeration attacks.
- **Middleware exemption**: `/forgot-password`, `/reset-password`, and the new API routes are added to the public access list in `auth.config.ts`.

## Risks / Trade-offs

- **No real email in dev** → Fall back to logging the reset link to console so developers can still test the flow. Resend sandbox (`onboarding@resend.dev`) can also be used for testing to your own verified email.
- **In-memory rate limiter resets on restart** → Acceptable for single-server deployment; if scaling needed, move to a DB-backed rate limiter.
- **No HTTPS in dev** → Token is sent in the clear in dev; mitigated by short expiration and single-use tokens. Production enforces HTTPS.
- **Forgot-password page is unauthenticated** → Must be carefully scoped to avoid abuse (rate limiting + constant-time responses mitigate this).
