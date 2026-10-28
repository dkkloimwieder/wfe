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

/** A short FNV-1a hash of the manifest and fallback. The default build id. */
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
 * Precache the manifest and navigation fallback, relative to the worker scope.
 * Serve manifest URLs from the cache first. For other GET navigations, try
 * the network first and return its response, including HTTP errors.
 * If the network fails, serve the cached fallback. If it is missing, fail
 * with the network error. Leave other requests to the network.
 * Start with `bypassPrefixes` when given, including an empty list.
 * Otherwise, start with [] when `apiPrefix` is given, or ['/api'] by default.
 * The `apiPrefix` alias adds one entry. Normalize each prefix and remove duplicates.
 * Each prefix matches the exact path or the path followed by '/'.
 * The worker strips trailing slashes from each prefix. '/' matches every path.
 * Matching requests never use the cache or fallback, even when the manifest
 * lists them. The worker never caches matching manifest URLs or fallbacks.
 * It never calls `respondWith` for matching requests.
 * Activation deletes the caches of older builds.
 */
export function precache(
  manifest: string[],
  options: {
    /** Names the cache. Default is a hash of the manifest and fallback. */
    buildId?: string
    /** Paths to bypass. Default ['/api'] without apiPrefix. [] bypasses nothing. */
    bypassPrefixes?: string[]
    /** Adds one bypass prefix. Used alone, replaces the default '/api'. */
    apiPrefix?: string
    /** URL relative to the worker scope. Default 'index.html'. */
    navigationFallback?: string
  } = {},
): void {
  const scope = globalThis as unknown as WorkerScope
  const base = scope.registration.scope
  const prefixes =
    options.bypassPrefixes ?? (options.apiPrefix !== undefined ? [] : ['/api'])
  const bypassPrefixes = [
    ...new Set(
      [
        ...prefixes,
        ...(options.apiPrefix !== undefined ? [options.apiPrefix] : []),
      ].map((prefix) => prefix.replace(/\/+$/, '') || '/'),
    ),
  ]
  const isBypassed = (url: URL) =>
    bypassPrefixes.some(
      (prefix) =>
        prefix === '/' ||
        url.pathname === prefix ||
        url.pathname.startsWith(`${prefix}/`),
    )
  const navigationFallback = options.navigationFallback ?? 'index.html'
  const fallbackUrl = new URL(navigationFallback, base)
  const fallback = bare(fallbackUrl.href)
  // A manifest entry under any bypass prefix is never cached.
  const urls = new Set(
    manifest
      .map((url) => new URL(url, base))
      .filter((url) => !isBypassed(url))
      .map((url) => bare(url.href)),
  )
  const precached = new Set(urls)
  if (!isBypassed(fallbackUrl)) precached.add(fallback)
  const family = `${prefix}:${base}:`
  const name =
    family + (options.buildId ?? digest([...manifest, navigationFallback]))

  scope.addEventListener('install', (event) => {
    event.waitUntil(
      scope.caches.open(name).then((cache) => cache.addAll([...precached])),
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
    if (request.method !== 'GET' || isBypassed(new URL(request.url))) return
    const key = bare(request.url)
    if (!urls.has(key)) {
      if (request.mode !== 'navigate') return
      event.respondWith(
        fetch(request).catch(async (error: unknown) => {
          if (isBypassed(fallbackUrl)) throw error
          const cache = await scope.caches.open(name)
          const hit = await cache.match(fallback)
          if (hit) return hit
          throw error
        }),
      )
      return
    }
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
