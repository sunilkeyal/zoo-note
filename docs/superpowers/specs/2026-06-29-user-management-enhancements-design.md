# User Management Enhancements — Design Spec

Date: 2026-06-29

## Overview

Improve the admin user management table with better action button visuals, consolidate password management into the Edit dialog, and remove the separate Reset Password flow.

## Requirements

1. Remove the "Reset PW" action button from the user table actions column.
2. Add an optional "New Password" field to the Edit User dialog so admins can set a specific password.
3. Do not display (or pre-populate) any current password value in the Edit dialog.
4. When an admin changes a user's password via the Edit dialog, send the new password to the user's email.
5. Replace the text ghost-buttons (Edit / Reset PW / Delete) with icon buttons: pencil icon for Edit, trash icon for Delete. Each button has a tooltip. Edit highlights blue on hover, Delete highlights red on hover.
6. Allow an admin user to edit their own profile (email, display name, password) via the Edit dialog.
7. Forbid an admin user from changing their own role from "admin" to "user" — both in the API and in the UI.
8. Forbid an admin user from deleting their own account — in both API and UI. The Delete button is shown but disabled for the current user with a tooltip reading "Cannot delete yourself".

## Architecture

No new files are added. Two files are deleted. Four files are modified.

### Deleted Files

- `src/app/admin/users/reset-password-dialog.tsx` — no longer used
- `src/app/api/admin/users/[id]/reset-password/route.ts` — no longer used

### Modified Files

#### `src/app/admin/users/users-table.tsx`

- Remove the `onResetPassword` prop from the `Props` interface.
- Replace the three text `<Button variant="ghost" size="sm">` elements in the actions cell with two icon buttons:
  - Pencil icon (`Pencil` from lucide-react) wrapped in shadcn `Tooltip` — label "Edit user" — highlights blue on hover
  - Trash icon (`Trash2` from lucide-react) wrapped in shadcn `Tooltip` — label "Delete user" — highlights red on hover
- Remove all references to `onResetPassword` from the component body.

#### `src/app/admin/users/page.tsx`

- Remove `ResetPasswordDialog` import.
- Remove `resetPwUser` state variable.
- Remove `setResetPwUser` call sites.
- Remove the `<ResetPasswordDialog>` JSX element.
- Remove the `onResetPassword` prop passed to `<UsersTable>`.

#### `src/app/admin/users/edit-user-dialog.tsx`

- Add `newPassword` state variable, initialized to `""`.
- Add `showPassword` state variable (boolean) for show/hide toggle, initialized to `false`.
- Add a "New Password" field at the bottom of the form grid:
  - `<Input type={showPassword ? "text" : "password"}>`
  - Placeholder: `"Leave blank to keep current password"`
  - An eye / eye-off icon button (`Eye` / `EyeOff` from lucide-react) inside the input wrapper to toggle visibility
- Reset `newPassword` and `showPassword` to defaults in the `useEffect` that runs when `user` changes.
- In `handleSubmit`, include `password: newPassword` in the PUT body only if `newPassword.trim()` is non-empty. If blank, omit the field entirely.

#### `src/app/api/admin/users/[id]/route.ts` (PUT handler)

- Extract `password` from the request body alongside `email`, `displayName`, `role`, `isActive`.
- If `password` is a non-empty string:
  - Hash it: `const passwordHash = await bcrypt.hash(password, 12)`
  - Include `passwordHash` in the `$set` update object.
  - After the DB update, call `sendPasswordResetByAdminEmail(email, password)` using the `email` value from the request body (fire-and-forget with `.catch` logging, same pattern as the existing reset-password route). Using the body's email is correct: if the admin changed the email in the same request, the new email is the one the user will log in with going forward.
- If `password` is absent or empty, skip password handling entirely.

#### `src/app/api/admin/users/[id]/route.ts` (PUT handler — self-edit changes)

- Remove the blanket "Cannot modify your own account" guard (line 68–70).
- In the `body.role` validation block: if `currentUserId === id` and the existing user role is `"admin"` and `body.role` is `"user"`, return a 400 error: `"Cannot change your own role from admin to user"`.
- Keep the existing self-delete guard in the `DELETE` handler (it already returns "Cannot delete your own account").

#### `src/app/admin/users/users-table.tsx`

- Show the Edit (pencil) icon button even for the current user. The Delete (trash) icon button is always rendered but disabled for self with `disabled={isCurrentUser}` and tooltip "Cannot delete yourself", keeping both buttons in consistent alignment across all rows.

#### `src/app/admin/users/edit-user-dialog.tsx`

- Accept a new optional prop `currentUserId?: string`.
- When `user._id === currentUserId`:
  - Disable the Role `<Select>` component.
  - Hardcode the value to `"admin"` in the submit body (belt-and-suspenders with the API guard).
  - Show a small hint: `"Your role cannot be changed."`

## Data Flow

```
Admin fills Edit dialog
  → (optionally) types new password
  → clicks Save

PUT /api/admin/users/:id
  { email, displayName, role, password? }
  → validate admin session
  → hash password if present
  → update user document
  → if password changed: sendPasswordResetByAdminEmail(email, plainPassword) [async, non-blocking]
  → return updated user

Email arrives in user's inbox with new password
```

## Security Notes

- The plain-text password is only held in memory during the request and passed to the email function before the request ends. It is never stored or logged.
- `bcrypt` cost factor 12 matches existing usage in the codebase.
- Input is validated at the API boundary: password must be a string; no minimum length is enforced by this spec (existing create-user flow sets no minimum either).
- Admins can now edit their own profile, but the API explicitly rejects any attempt to change role from "admin" to "user" when editing self.
- The Edit dialog disables the Role dropdown when editing your own account, preventing accidental role change at the UI level.
- Self-deletion is always rejected by the API, and the Delete button is disabled in the table for the current user (grayed out, non-clickable) with the tooltip "Cannot delete yourself".

## Testing

- Update `src/__tests__/admin-users-api.test.ts`: add a test case for PUT with a `password` field — verify the response is successful and `sendPasswordResetByAdminEmail` is called.
- Update `src/__tests__/edit-user-dialog.test.tsx` (if it covers form submission): verify the password field is present and that a blank value does not include `password` in the submitted body.
- Add test case for PUT self-edit: verify that an admin can edit their own email/displayName but receives a 400 error when attempting to change role from admin to user.
- Add test case for DELETE self: verify that deleting your own account returns a 400 error.
- No new test files needed.

## Feature Branches

- `feature/user-management-enhancements` — main feature branch (already merged into `main`).
- `feature/admin-self-edit` — cut from `main` for the admin self-edit enhancement.
