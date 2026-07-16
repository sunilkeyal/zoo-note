# Android App Design: PWA + Capacitor

## Overview

Wrap the existing Next.js ZooNote app as an Android APK using Capacitor, with full offline support via Serwist (service worker) and IndexedDB caching. Target audience: small group distribution via sideloaded APK.

## Goals

- Generate an installable Android APK from the existing codebase
- Full offline support: cached notes, offline editing, sync on reconnect
- Zero cost (open source tools, free GitHub Actions builds)
- No changes to existing web app behavior
- Mobile-only layout (bottom tab bar) in the APK; desktop layout unchanged in browser

## Architecture

```
┌─────────────────────────────────────────┐
│  Capacitor (Android APK shell)          │
│  ┌───────────────────────────────────┐  │
│  │  Serwist (Service Worker)         │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Next.js Web App            │  │  │
│  │  │  + Offline Sync Layer       │  │  │
│  │  │  (IndexedDB + Sync Queue)   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│  Capacitor Plugins (status bar,         │
│  keyboard, splash screen)               │
└─────────────────────────────────────────┘
```

Three layers:
1. **Capacitor** — Android WebView shell, native plugins
2. **Serwist** — service worker for offline caching
3. **Offline Sync Layer** — IndexedDB cache + sync queue for data

## Offline Sync Layer

### IndexedDB Cache (read path)

- Cache API responses in IndexedDB on every successful fetch
- On app load: check IndexedDB first → show cached data → fetch fresh data in background
- Tables: `notes`, `folders`, `settings` — mirrors API responses
- Uses the `idb` library (lightweight IndexedDB wrapper)

### Sync Queue (write path)

- On create/edit/delete offline: write to IndexedDB + enqueue in `sync_queue` table
- Queue entry schema: `{ id, action, endpoint, method, body, timestamp, status }`
- Status values: `pending` → `syncing` → `synced` | `failed`
- On reconnect (detected via `navigator.onLine` + periodic API health check): replay queue in order
- Conflict strategy: **last-write-wins** using `updatedAt` timestamp
- Failed syncs: exponential backoff (3 retries), then mark as `failed` for manual retry

### Caching Strategy (Serwist)

- **App shell** (HTML/JS/CSS): precache — instant load, no network needed
- **Notes/Folders API**: network-first → falls back to IndexedDB cache
- **Static assets** (images/fonts): cache-first
- **Auth API**: network-only — never cache login/session

## UI Changes

### Sync Indicator
- Small icon in mobile header: ✅ synced, 🔄 syncing, ⚠️ offline/failed
- Tap to see pending edits count

### Offline Banner
- Thin bar at top when offline: "You're offline — changes will sync when reconnected"
- Dismissible, reappears on next offline detection

### Conflict Toast
- On last-write-wins resolution: "Note updated — server version was newer"
- Tap to view server version

### No changes to:
- Existing mobile layout (bottom tabs, folder tree, editor)
- Desktop layout
- Login flow (requires internet)

## Capacitor Integration

### Config (`capacitor.config.ts`)
- `server.url`: Vercel deployment URL
- App ID: `com.sunilkeyal.zoonote`
- Plugins: StatusBar, Keyboard, SplashScreen

### Native Plugins
- `@capacitor/status-bar` — match status bar to theme (dark/light)
- `@capacitor/keyboard` — avoid covering inputs
- `@capacitor/splash-screen` — show while app loads

### Build Commands
```bash
npx cap add android      # one-time: generate android/ folder
npx cap sync             # sync web assets to android project
```

## GitHub Actions Build

### Workflow (`.github/workflows/build-android.yml`)
- **Trigger**: manual only (`workflow_dispatch`)
- **Steps**:
  1. Checkout code
  2. Setup Node.js, install dependencies
  3. `next build`
  4. Setup Java JDK + Android SDK
  5. `npx cap sync`
  6. Build APK with Gradle
  7. Upload APK as artifact

### Distribution
- Download APK from GitHub Actions artifacts
- Share .apk file directly with group
- Users enable "Install from unknown sources" → tap to install

### Cost
- GitHub Actions free tier: 2,000 minutes/month
- Each build: ~5-10 minutes
- Well within free tier for personal/small group use

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration |
| `src/sw.ts` | Serwist service worker entry |
| `src/lib/offline-db.ts` | IndexedDB cache layer |
| `src/lib/sync-queue.ts` | Sync queue logic |
| `src/hooks/use-online-status.ts` | Online/offline detection |
| `src/components/SyncIndicator.tsx` | Sync status UI |
| `src/components/OfflineBanner.tsx` | Offline notification banner |
| `.github/workflows/build-android.yml` | GitHub Actions workflow |

### Modified Files
| File | Change |
|------|--------|
| `next.config.mjs` | Wrap with Serwist |
| `src/app/providers.tsx` | Add SerwistProvider |
| `package.json` | Add new dependencies |

### Generated (gitignored)
| Path | Purpose |
|------|---------|
| `android/` | Capacitor-generated Android project |
| `public/sw.js` | Generated service worker |

## Dependencies to Add

- `@capacitor/core` — Capacitor runtime
- `@capacitor/cli` — Capacitor CLI
- `@capacitor/android` — Android platform
- `@capacitor/status-bar` — Status bar styling
- `@capacitor/keyboard` — Keyboard handling
- `@capacitor/splash-screen` — Splash screen
- `serwist` — Service worker (next-pwa replacement)
- `idb` — IndexedDB wrapper

## What Stays the Same

- All existing components, API routes, MongoDB, R2, auth
- Desktop web version (browser)
- Mobile web version (browser)
- Existing development workflow
- All features (notes, folders, import/export, admin, etc.)
