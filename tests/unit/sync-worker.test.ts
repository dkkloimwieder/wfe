import { afterEach, expect, test, vi } from 'vitest'
import { precache, skipWaitingMessage } from '@wfe/sync/worker'

afterEach(() => {
  vi.unstubAllGlobals()
})

const scopeUrl = 'https://app.example/shop/'

/** A worker scope stand-in: listeners, caches, clients and fetch. */
function workerScope() {
  const listeners = new Map<string, (event: unknown) => void>()
  const stores = new Map<string, Map<string, string>>()
  const caches = {
    open: vi.fn(async (name: string) => {
      const store = stores.get(name) ?? new Map<string, string>()
      stores.set(name, store)
      return {
        addAll: async (urls: string[]) => {
          for (const url of urls) store.set(url, `cached ${url}`)
        },
        match: async (url: string) => store.get(url),
      }
    }),
    keys: async () => [...stores.keys()],
    delete: vi.fn(async (name: string) => stores.delete(name)),
  }
  const network = vi.fn(
    async (request: { url: string }) => `network ${request.url}`,
  )
  const claim = vi.fn(async () => {})
  const skipWaiting = vi.fn(async () => {})
  vi.stubGlobal('registration', { scope: scopeUrl })
  vi.stubGlobal('clients', { claim })
  vi.stubGlobal('caches', caches)
  vi.stubGlobal('skipWaiting', skipWaiting)
  vi.stubGlobal('fetch', network)
  vi.stubGlobal('addEventListener', (type: string, listener: () => void) =>
    listeners.set(type, listener),
  )
  /** Dispatch an extendable event and wait for its work. */
  async function extend(type: 'install' | 'activate') {
    const work: Promise<unknown>[] = []
    listeners.get(type)!({ waitUntil: (p: Promise<unknown>) => work.push(p) })
    await Promise.all(work)
  }
  /** Dispatch a fetch; undefined means the worker left it to the network. */
  async function request(url: string, method = 'GET') {
    let answer: Promise<unknown> | undefined
    listeners.get('fetch')!({
      request: { url, method },
      respondWith: (p: Promise<unknown>) => (answer = p),
    })
    return answer && (await answer)
  }
  const message = (data: unknown) => listeners.get('message')!({ data })
  return {
    stores,
    caches,
    network,
    claim,
    skipWaiting,
    extend,
    request,
    message,
  }
}

const manifest = [
  './',
  'index.html',
  'assets/index-abc.js',
  'assets/index-def.css',
]

test('install caches each manifest URL against the scope', async () => {
  const scope = workerScope()
  precache(manifest, { buildId: 'b1' })
  await scope.extend('install')
  expect([...scope.stores.keys()]).toEqual([`wfe-sync-shell:${scopeUrl}:b1`])
  expect([...[...scope.stores.values()][0]!.keys()]).toEqual(
    expect.arrayContaining([
      scopeUrl,
      `${scopeUrl}index.html`,
      `${scopeUrl}assets/index-abc.js`,
      `${scopeUrl}assets/index-def.css`,
    ]),
  )
})

test('a manifest URL is served from the cache, with or without a query', async () => {
  const scope = workerScope()
  precache(manifest)
  await scope.extend('install')
  expect(await scope.request(`${scopeUrl}assets/index-abc.js`)).toBe(
    `cached ${scopeUrl}assets/index-abc.js`,
  )
  expect(await scope.request(`${scopeUrl}?qualification=1`)).toBe(
    `cached ${scopeUrl}`,
  )
  expect(scope.network).not.toHaveBeenCalled()
})

test('a manifest URL missing from the cache goes to the network', async () => {
  const scope = workerScope()
  precache(manifest)
  expect(await scope.request(`${scopeUrl}index.html`)).toBe(
    `network ${scopeUrl}index.html`,
  )
})

test('every other request is left to the network and never cached', async () => {
  const scope = workerScope()
  precache([...manifest, '/api/health'])
  await scope.extend('install')
  // A request left alone gets no respondWith.
  expect(await scope.request(`${scopeUrl}assets/other.js`)).toBeUndefined()
  expect(await scope.request(`${scopeUrl}index.html`, 'POST')).toBeUndefined()
  // The API prefix is never answered from the cache, even when listed.
  expect(await scope.request('https://app.example/api/health')).toBeUndefined()
  expect(
    await scope.request('https://app.example/api/orders?page=2'),
  ).toBeUndefined()
  const cached = [...[...scope.stores.values()][0]!.keys()]
  expect(cached.some((url) => url.includes('/api'))).toBe(false)
  expect(scope.network).not.toHaveBeenCalled()
})

test('apiPrefix configures the path that is never cached', async () => {
  const scope = workerScope()
  precache(['./', '/v2/health'], { apiPrefix: '/v2' })
  await scope.extend('install')
  expect(await scope.request('https://app.example/v2/health')).toBeUndefined()
  expect(await scope.request(scopeUrl)).toBe(`cached ${scopeUrl}`)
  const cached = [...[...scope.stores.values()][0]!.keys()]
  expect(cached).toEqual([scopeUrl])
})

test('activate deletes older caches of this scope and claims the clients', async () => {
  const scope = workerScope()
  scope.stores.set(`wfe-sync-shell:${scopeUrl}:old`, new Map())
  scope.stores.set('wfe-sync-shell:https://app.example/other/:old', new Map())
  scope.stores.set('unrelated', new Map())
  precache(manifest, { buildId: 'new' })
  await scope.extend('install')
  await scope.extend('activate')
  expect([...scope.stores.keys()].sort()).toEqual(
    [
      `wfe-sync-shell:${scopeUrl}:new`,
      'wfe-sync-shell:https://app.example/other/:old',
      'unrelated',
    ].sort(),
  )
  expect(scope.claim).toHaveBeenCalledTimes(1)
})

test('the default build id follows the manifest', async () => {
  const first = workerScope()
  precache(manifest)
  await first.extend('install')
  const second = workerScope()
  precache(['./', 'assets/index-xyz.js'])
  await second.extend('install')
  const name = (scope: typeof first) => [...scope.stores.keys()][0]
  expect(name(first)).toMatch(
    /^wfe-sync-shell:https:\/\/app\.example\/shop\/:[0-9a-f]{8}$/,
  )
  expect(name(first)).not.toBe(name(second))
})

test('the skip-waiting message from shell() makes the worker take over', () => {
  const scope = workerScope()
  precache(manifest)
  expect(skipWaitingMessage).toBe('wfe-sync:skip-waiting')
  scope.message({ type: 'other' })
  scope.message(null)
  expect(scope.skipWaiting).not.toHaveBeenCalled()
  scope.message({ type: skipWaitingMessage })
  expect(scope.skipWaiting).toHaveBeenCalledTimes(1)
})
