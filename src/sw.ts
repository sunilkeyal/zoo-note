// src/sw.ts
import { precacheAndRoute, registerRoute, NetworkFirst, CacheFirst, NetworkOnly } from "serwist"

// Precache app shell (HTML, JS, CSS)
precacheAndRoute(self.__WB_MANIFEST)

// API routes: network-first (fallback to cache)
const apiStrategy = new NetworkFirst({
  cacheName: "api-cache",
  networkTimeoutSeconds: 3,
  plugins: [
    {
      cacheDidUpdate: async ({ request }) => {
        // Notify the app about fresh data
        const clients = await self.clients.matchAll()
        clients.forEach((client) => {
          client.postMessage({ type: "SW_CACHE_UPDATED", url: request.url })
        })
      },
    },
  ],
})

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth"),
  apiStrategy
)

// Static assets: cache-first
const staticStrategy = new CacheFirst({
  cacheName: "static-assets",
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        return response.type === "basic" ? response : null
      },
    },
  ],
})

registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  staticStrategy
)

// Auth routes: network-only (never cache)
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/auth"),
  new NetworkOnly()
)

// Activate: claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
