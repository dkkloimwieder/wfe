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
    async (request: { url: string }): Promise<string | Response> =>
      `network ${request.url}`,
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
  async function request(url: string, method = 'GET', mode = 'cors') {
    let answer: Promise<unknown> | undefined
    listeners.get('fetch')!({
      request: { url, method, mode },
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

test.each([200, 404, 500])(
  'a deep navigation returns the network response with status %i',
  async (status) => {
    const scope = workerScope()
    precache(manifest)
    await scope.extend('install')
    const response = new Response('server response', { status })
    scope.network.mockResolvedValueOnce(response)
    expect(
      await scope.request(`${scopeUrl}pallets/42`, 'GET', 'navigate'),
    ).toBe(response)
    expect(scope.network).toHaveBeenCalledExactlyOnceWith({
      url: `${scopeUrl}pallets/42`,
      method: 'GET',
      mode: 'navigate',
    })
  },
)

test('an offline deep navigation returns the cached fallback', async () => {
  const scope = workerScope()
  precache(manifest)
  await scope.extend('install')
  scope.network.mockRejectedValueOnce(new TypeError('offline'))
  expect(
    await scope.request(`${scopeUrl}pallets/42?tab=details`, 'GET', 'navigate'),
  ).toBe(`cached ${scopeUrl}index.html`)
})

test('an offline navigation with no cached fallback rethrows the network error', async () => {
  const scope = workerScope()
  precache(manifest)
  const error = new TypeError('offline')
  scope.network.mockRejectedValueOnce(error)
  await expect(
    scope.request(`${scopeUrl}pallets/42`, 'GET', 'navigate'),
  ).rejects.toBe(error)
})

test.each(['/api', '/v2'])(
  'offline navigation under %s is never intercepted, including prefix matches',
  async (apiPrefix) => {
    const scope = workerScope()
    precache([...manifest, `${apiPrefix}/health`, `${apiPrefix}-other`], {
      apiPrefix,
    })
    await scope.extend('install')
    scope.network.mockRejectedValue(new TypeError('offline'))
    for (const path of [
      apiPrefix,
      `${apiPrefix}/health`,
      `${apiPrefix}-other`,
    ]) {
      expect(
        await scope.request(new URL(path, scopeUrl).href, 'GET', 'navigate'),
      ).toBeUndefined()
    }
    expect(scope.network).not.toHaveBeenCalled()
    const cached = [...[...scope.stores.values()][0]!.keys()]
    expect(
      cached.some((url) => new URL(url).pathname.startsWith(apiPrefix)),
    ).toBe(false)
  },
)

test('a non-navigation deep request and a POST navigation are not intercepted', async () => {
  const scope = workerScope()
  precache(manifest)
  await scope.extend('install')
  expect(await scope.request(`${scopeUrl}pallets/42`)).toBeUndefined()
  expect(
    await scope.request(`${scopeUrl}pallets/42`, 'POST', 'navigate'),
  ).toBeUndefined()
  expect(scope.network).not.toHaveBeenCalled()
})

test.each(['index.html', 'offline/shell.html'])(
  'install caches the omitted fallback %s and uses it offline',
  async (navigationFallback) => {
    const scope = workerScope()
    precache(
      ['assets/index-abc.js'],
      navigationFallback === 'index.html' ? {} : { navigationFallback },
    )
    await scope.extend('install')
    const cached = [...[...scope.stores.values()][0]!.keys()]
    expect(cached).toEqual([
      `${scopeUrl}assets/index-abc.js`,
      `${scopeUrl}${navigationFallback}`,
    ])
    // Adding the fallback to the cache does not make it a manifest request.
    expect(
      await scope.request(`${scopeUrl}${navigationFallback}`),
    ).toBeUndefined()
    scope.network.mockRejectedValueOnce(new TypeError('offline'))
    expect(
      await scope.request(`${scopeUrl}pallets/42`, 'GET', 'navigate'),
    ).toBe(`cached ${scopeUrl}${navigationFallback}`)
  },
)

test('a manifest navigation stays cache-first', async () => {
  const scope = workerScope()
  precache(manifest)
  await scope.extend('install')
  expect(await scope.request(scopeUrl, 'GET', 'navigate')).toBe(
    `cached ${scopeUrl}`,
  )
  expect(scope.network).not.toHaveBeenCalled()
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
  expect(cached).toEqual([scopeUrl, `${scopeUrl}index.html`])
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

test('the default build id is stable and follows the fallback name', async () => {
  const names: string[] = []
  for (const options of [
    {},
    { navigationFallback: 'index.html' },
    { navigationFallback: 'offline.html' },
  ]) {
    const scope = workerScope()
    precache(manifest, options)
    await scope.extend('install')
    names.push([...scope.stores.keys()][0]!)
  }
  expect(names[0]).toBe(names[1])
  expect(names[0]).not.toBe(names[2])
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
