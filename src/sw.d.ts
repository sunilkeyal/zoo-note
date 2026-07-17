// Service Worker type declarations
declare const self: ServiceWorkerGlobalScope & typeof globalThis

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: unknown[]
  clients: Clients
  skipWaiting(): Promise<void>
}

interface Clients {
  matchAll(): Promise<Client[]>
}

interface Client {
  postMessage(message: unknown): void
}

export {}