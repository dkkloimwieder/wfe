// The service worker module. A consumer imports it into its own worker entry
// and calls precache with the asset list of its build. It never imports Solid.
// It imports no other module of the package, so a bundler never splits a
// chunk that the page and the worker share.

/** The message that `shell()` posts; the same string is in shell.ts. */
export const skipWaitingMessage = 'wfe-sync:skip-waiting'

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}
interface FetchEvent extends ExtendableEvent {
  readonly request: Request
  respondWith(response: Promise<Response>): void
}
/** The part of ServiceWorkerGlobalScope that the worker uses. */
interface WorkerScope {
  readonly registration: { readonly scope: string }
  readonly clients: { claim(): Promise<void> }
  readonly caches: CacheStorage
  skipWaiting(): Promise<void>
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEvent) => void,
  ): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent) => void,
  ): void
}

/** Cache names start with this, then the scope, then the build id. */
const prefix = 'wfe-sync-shell'

/** A short FNV-1a hash of the manifest; the default build id. */
function digest(manifest: string[]): string {
  let hash = 0x811c9dc5
  for (const char of manifest.join('\n')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** The URL without its query or fragment. */
function bare(url: string): string {
  const parsed = new URL(url)
  return parsed.origin + parsed.pathname
}

/**
 * Precache the manifest and serve it cache-first. Each manifest entry is a
 * URL relative to the worker scope. Every other request goes to the network.
 * A request whose path starts with `apiPrefix` is never answered from the
 * cache and never cached, even when the manifest lists it. Activation deletes the caches of older builds.
 */
export function precache(
  manifest: string[],
  options: {
    /** Names the cache; default a hash of the manifest. */
    buildId?: string
    /** Default '/api'. */
    apiPrefix?: string
  } = {},
): void {
  const scope = globalThis as unknown as WorkerScope
  const base = scope.registration.scope
  const api = options.apiPrefix ?? '/api'
  // A manifest entry under the API prefix is never cached.
  const urls = new Set(
    manifest
      .map((url) => new URL(url, base))
      .filter((url) => !url.pathname.startsWith(api))
      .map((url) => bare(url.href)),
  )
  const family = `${prefix}:${base}:`
  const name = family + (options.buildId ?? digest(manifest))

  scope.addEventListener('install', (event) => {
    event.waitUntil(
      scope.caches.open(name).then((cache) => cache.addAll([...urls])),
    )
  })
  scope.addEventListener('activate', (event) => {
    event.waitUntil(
      scope.caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(family) && key !== name)
              .map((key) => scope.caches.delete(key)),
          ),
        )
        .then(() => scope.clients.claim()),
    )
  })
  scope.addEventListener('fetch', (event) => {
    const { request } = event
    if (request.method !== 'GET') return
    const key = bare(request.url)
    if (!urls.has(key)) return
    event.respondWith(
      scope.caches
        .open(name)
        .then((cache) => cache.match(key))
        .then((hit) => hit ?? fetch(request)),
    )
  })
  scope.addEventListener('message', (event) => {
    if ((event.data as { type?: unknown } | null)?.type === skipWaitingMessage)
      void scope.skipWaiting()
  })
}
