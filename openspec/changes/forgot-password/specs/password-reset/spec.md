## ADDED Requirements

### Requirement: Request password reset

The system SHALL allow an unauthenticated user to request a password reset by providing their email address. The system SHALL always return a success response regardless of whether the email exists (to prevent email enumeration). If the email exists, the system SHALL generate a cryptographically random reset token, store its hash in the `passwordResetTokens` collection with a 1-hour expiration, and deliver the reset link via email.

#### Scenario: Request reset for existing email
- **WHEN** an unauthenticated user submits a POST request to `/api/auth/forgot-password` with `email` matching an existing user
- **THEN** the system SHALL return a 200 response with `{ message: "If an account exists, a reset link has been sent" }`
- **AND** the system SHALL store a hashed reset token in `passwordResetTokens` with `expiresAt` set to 1 hour from now
- **AND** the system SHALL send an email to the user's email address containing the reset link

#### Scenario: Request reset for non-existent email
- **WHEN** an unauthenticated user submits a POST request to `/api/auth/forgot-password` with an email that does not match any user
- **THEN** the system SHALL return a 200 response with `{ message: "If an account exists, a reset link has been sent" }`
- **AND** the system SHALL NOT store any token or send any email

#### Scenario: Rate limiting prevents rapid requests
- **WHEN** a user submits more than one forgot-password request for the same email within 60 seconds
- **THEN** the system SHALL return a 429 response with an appropriate error message

#### Scenario: Missing email field
- **WHEN** a POST request to `/api/auth/forgot-password` is submitted without an `email` field
- **THEN** the system SHALL return a 400 response with a validation error

### Requirement: Reset password with token

The system SHALL allow a user to set a new password using a valid reset token. The token SHALL be verified against the stored hash, checked for expiration, and checked for prior use. On success, the user's `passwordHash` SHALL be updated, the token SHALL be marked as used, and the user SHALL be able to log in with the new password.

#### Scenario: Successful password reset
- **WHEN** a user submits a POST request to `/api/auth/reset-password` with a valid `token` and a new `password` meeting minimum requirements
- **THEN** the system SHALL verify the token hash matches the stored hash
- **AND** the system SHALL verify the token has not expired
- **AND** the system SHALL verify the token has not been used
- **AND** the system SHALL hash the new password with bcryptjs
- **AND** the system SHALL update the user's `passwordHash` in the `users` collection
- **AND** the system SHALL mark the token as used
- **AND** the system SHALL return a 200 response with `{ message: "Password has been reset successfully" }`

#### Scenario: Expired token
- **WHEN** a user submits a POST request to `/api/auth/reset-password` with a token that has exceeded its 1-hour expiration
- **THEN** the system SHALL return a 400 response with an error indicating the token has expired

#### Scenario: Already used token
- **WHEN** a user submits a POST request to `/api/auth/reset-password` with a token that has already been marked as used
- **THEN** the system SHALL return a 400 response with an error indicating the token is invalid

#### Scenario: Invalid token format
- **WHEN** a user submits a POST request to `/api/auth/reset-password` with a token that does not match the expected format
- **THEN** the system SHALL return a 400 response with an error indicating the token is invalid

#### Scenario: Weak new password
- **WHEN** a user submits a POST request to `/api/auth/reset-password` with a valid token but a password shorter than 6 characters
- **THEN** the system SHALL return a 400 response with a validation error

### Requirement: Reset password page

The system SHALL provide a reset password page at `/reset-password` that reads the `token` query parameter, presents a new password form, and calls the reset password API on submission.

#### Scenario: Visit reset page with valid token
- **WHEN** an unauthenticated user navigates to `/reset-password?token=<valid-token>`
- **THEN** the system SHALL display a form with a new password field and a "Reset Password" submit button

#### Scenario: Visit reset page without token
- **WHEN** an unauthenticated user navigates to `/reset-password` without a `token` parameter
- **THEN** the system SHALL display an error message indicating the reset link is invalid or missing

#### Scenario: Successful reset redirects to login
- **WHEN** a user submits the reset password form with a valid token and new password
- **THEN** the system SHALL display a success message with a link to the login page

### Requirement: Forgot password page

The system SHALL provide a forgot password page at `/forgot-password` with an email input form that calls the forgot-password API on submission.

#### Scenario: View forgot password page
- **WHEN** an unauthenticated user navigates to `/forgot-password`
- **THEN** the system SHALL display a form with an email field and a "Send Reset Link" submit button

#### Scenario: Successful request shows confirmation
- **WHEN** a user submits the forgot password form with an email address
- **THEN** the system SHALL show a confirmation message: "If an account exists, a reset link has been sent"
- **AND** the system SHALL provide a link back to the login page

### Requirement: Login page link to forgot password

The login page SHALL link to the forgot password page instead of showing a disabled placeholder link.

#### Scenario: Forgot password link navigates to forgot password page
- **WHEN** an unauthenticated user clicks "Forgot your password?" on the login page
- **THEN** the browser SHALL navigate to `/forgot-password`

### Requirement: Public access to recovery pages

The forgot-password and reset-password pages and their API routes SHALL be accessible without authentication.

#### Scenario: Unauthenticated access allowed
- **WHEN** an unauthenticated user navigates to `/forgot-password`, `/reset-password`, `/api/auth/forgot-password`, or `/api/auth/reset-password`
- **THEN** the system SHALL allow access without redirecting to login

### Requirement: Email delivery with console fallback

The system SHALL send password reset emails via Nodemailer using configurable SMTP settings. In development, if SMTP is not configured, the system SHALL log the reset link to the console so developers can test the flow.

#### Scenario: Email sent with reset link
- **WHEN** a reset token is generated for an existing user
- **THEN** the system SHALL send an email to the user's email address containing the reset link URL with the raw token

#### Scenario: Console fallback in development
- **WHEN** SMTP is not configured and a reset token is generated
- **THEN** the system SHALL log the reset link to the console: `[Password Reset] Link: <url>`
