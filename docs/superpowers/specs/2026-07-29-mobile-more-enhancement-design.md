# Mobile More Enhancement

**Date**: 2026-07-29
**Status**: Design

## Objective

Bring the mobile "More" menu to parity with the desktop sidebar footer dropdown by adding account management (edit name, email, password) and wiring up import/export functionality.

## Current State

The mobile More menu shows Profile (display-only), Appearance (works), Import (placeholder), Export (placeholder), Admin Dashboard (works for admins), and Sign Out.

The desktop sidebar footer has Account (edit name, email, password), Settings (sidebar density), Import/Export (ZIP export, ZIP import, OneNote import), and Log out — all fully functional.

## Approach

Create two new mobile full-screen components following the existing `MobileSettings.tsx` pattern:

### 1. MobileAccount (`src/components/MobileAccount.tsx`)

- **Header**: Back arrow + "Account" title (border-bottom separator)
- **Avatar row**: Initial letter avatar + display name and email
- **Form**: Display name input, Email input, Change password section (new password + confirm with show/hide toggles)
- **Validation**: Name required, email format check, password min 8 chars, passwords must match
- **Save**: Calls `PATCH /api/account`, shows loading spinner, error states per field, success message
- **On email/password change**: Signs user out after save (matching desktop behavior)
- **Footer**: Save changes button + Cancel button

### 2. MobileImportExport (`src/components/MobileImportExport.tsx`)

- **Header**: Back arrow + "Import / Export" title
- **Three cards** (matching desktop ImportExportSheet):
  - **Export card**: Download button → `/api/notes/export`, loading spinner
  - **Import ZIP card**: File picker (`.zip`) → `/api/notes/import`, success/error result
  - **Import OneNote card**: File picker (`.onepkg/.one`) → `ImportContext.startImport`, progress bar, cancel button, result display

### 3. Wiring Changes

- **MobileMore.tsx**: Add `onProfile` and `onImportExport` props; wire Profile, Import, and Export rows with click handlers
- **AppLayout.tsx**: Add `"account"` and `"import-export"` to MobileScreen type; render MobileAccount and MobileImportExport conditionally
- **MobileTabBar**: No changes needed

### MobileScreen type update

```ts
type MobileScreen = "home" | "folders" | "folder-detail" | "favorites" | "more" | "search" | "new-folder" | "settings" | "admin" | "note-detail" | "account" | "import-export"
```

## Fix: Appearance Tab Not Working

The existing `MobileSettings` rendering in `AppLayout.tsx` has `currentTheme="light"` (hardcoded) and `onThemeChange={() => {}}` (no-op).

**Fix**: Import `useThemeSync` from `ThemeSyncContext` and pass the real `theme` and `setTheme` to `MobileSettings`.

## Fix: Admin Dashboard Links Not Working

The management list items in `MobileAdmin.tsx` (User Management, All Notes, Folder Management, System Settings, Audit Logs) have no `onClick` handlers — they're display-only.

**Fix**: 
- Replace the item list to match actual available admin routes (Desktop sidebar uses: Dashboard `/admin`, Import Jobs `/admin/imports`, User Management `/admin/users`, System Settings `/admin/settings`)
- Add `router.push()` navigation via `useRouter` for each item
- Items that don't have corresponding routes (All Notes, Folder Management, Audit Logs) should be removed or routed to the admin dashboard

## Files to Create

- `src/components/MobileAccount.tsx`
- `src/components/MobileImportExport.tsx`

## Files to Modify

- `src/components/MobileMore.tsx` — add `onProfile` and `onImportExport` props; wire Profile, Import, Export rows with click handlers
- `src/components/AppLayout.tsx` — add `"account"` and `"import-export"` to MobileScreen; render new screens; fix theme wiring in MobileSettings
- `src/components/MobileAdmin.tsx` — add router navigation for admin management links
- `src/__tests__/mobile-more.test.tsx` — update for new click handlers

## Files to Create (Tests)

- `src/__tests__/mobile-account.test.tsx` for MobileAccount
- `src/__tests__/mobile-import-export.test.tsx` for MobileImportExport

## Testing

- Update existing mobile-more tests for new props
- Create tests for MobileAccount (form rendering, validation, save)
- Create tests for MobileImportExport (export button, import file picker, OneNote import)
