import '@testing-library/jest-dom/vitest'

// Node 22+ exposes a native (unavailable) `localStorage` global that shadows
// jsdom's implementation, causing bare `localStorage` access to throw. Install a
// working in-memory implementation on `Storage.prototype` so components relying
// on it behave correctly and tests can spy on `Storage.prototype` methods. Only
// applies in the jsdom (DOM) environment; node-environment tests skip it.
if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
  const backing = new Map<string, string>()
  const proto = Storage.prototype as unknown as Storage
  proto.getItem = function (key: string) { return backing.has(key) ? backing.get(key)! : null }
  proto.setItem = function (key: string, value: string) { backing.set(key, String(value)) }
  proto.removeItem = function (key: string) { backing.delete(key) }
  proto.clear = function () { backing.clear() }
  proto.key = function (index: number) { return Array.from(backing.keys())[index] ?? null }
  Object.defineProperty(proto, 'length', { get() { return backing.size }, configurable: true })

  const instance = Object.create(Storage.prototype) as Storage
  Object.defineProperty(globalThis, 'localStorage', { value: instance, configurable: true, writable: true })
  Object.defineProperty(window, 'localStorage', { value: instance, configurable: true, writable: true })
}

// jsdom does not implement ResizeObserver, which react-resizable-panels requires.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
