// src/sw.ts
import { Serwist, NetworkFirst, CacheFirst, NetworkOnly } from "serwist"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any

const serwist = new Serwist({
  precacheEntries: sw.__WB_MANIFEST,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      matcher: /^\/api\/(?!auth).*/,
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheDidUpdate: async ({ request }: { request: Request }) => {
              const clients = await sw.clients.matchAll()
              clients.forEach((client: any) => {
                client.postMessage({ type: "SW_CACHE_UPDATED", url: request.url })
              })
            },
          },
        ],
      }),
    },
    {
      matcher: /\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$/,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          {
            cacheWillUpdate: async ({ response }: { response: Response }) => {
              return response.type === "basic" ? response : null
            },
          },
        ],
      }),
    },
    {
      matcher: /^\/api\/auth/,
      handler: new NetworkOnly(),
    },
  ],
})

// Listen for messages from the app
sw.addEventListener("message", (event: any) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    sw.skipWaiting()
  }
})

// Initialize serwist
serwist.addEventListeners()