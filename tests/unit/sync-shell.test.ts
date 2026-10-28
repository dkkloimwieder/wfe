import { afterEach, expect, test, vi } from 'vitest'
import { shell } from '@wfe/sync'

afterEach(() => {
  vi.unstubAllGlobals()
})

const none = { worker: false, persisted: false, quota: { usage: 0, quota: 0 } }

/** A worker stand-in that records its messages. */
class FakeWorker extends EventTarget {
  state: string
  messages: unknown[] = []
  constructor(state: string) {
    super()
    this.state = state
  }
  postMessage(message: unknown) {
    this.messages.push(message)
  }
  move(state: string) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

/** A registration stand-in with the given workers. */
class FakeRegistration extends EventTarget {
  active: FakeWorker | null = null
  waiting: FakeWorker | null = null
  installing: FakeWorker | null = null
}

/** navigator.serviceWorker with one registration. */
function workerApi(registration = new FakeRegistration()) {
  const container = Object.assign(new EventTarget(), {
    register: vi.fn(async () => registration),
  })
  return { container, registration }
}

function stubNavigator(value: object) {
  vi.stubGlobal('navigator', value)
}

test('with no worker or storage API, shell resolves false and zeros', async () => {
  stubNavigator({})
  await expect(shell({ workerUrl: '/sw.js' })).resolves.toEqual(none)
})

test('without a worker URL, shell registers nothing', async () => {
  const { container } = workerApi()
  stubNavigator({ serviceWorker: container })
  await expect(shell()).resolves.toEqual(none)
  expect(container.register).not.toHaveBeenCalled()
})

test('each missing or failing API gives its false or zero result', async () => {
  // storage without persist reads persisted(); without estimate, zeros.
  stubNavigator({ storage: { persisted: vi.fn(async () => true) } })
  await expect(shell()).resolves.toEqual({ ...none, persisted: true })
  // Every call rejects: still no throw.
  stubNavigator({
    serviceWorker: {
      register: vi.fn(async () => {
        throw new Error('blocked')
      }),
    },
    storage: {
      persist: vi.fn(async () => {
        throw new Error('denied')
      }),
      estimate: vi.fn(async () => {
        throw new Error('unavailable')
      }),
    },
  })
  await expect(shell({ workerUrl: '/sw.js' })).resolves.toEqual(none)
  // An estimate without numbers is zeros.
  stubNavigator({ storage: { estimate: vi.fn(async () => ({})) } })
  await expect(shell()).resolves.toEqual(none)
})

test('shell registers the worker, persists once, and reads the estimate', async () => {
  const { container } = workerApi()
  const storage = {
    persist: vi.fn(async () => true),
    persisted: vi.fn(async () => false),
    estimate: vi.fn(async () => ({ usage: 12, quota: 3_000 })),
  }
  stubNavigator({ serviceWorker: container, storage })
  await expect(shell({ workerUrl: '/sw.js' })).resolves.toEqual({
    worker: true,
    persisted: true,
    quota: { usage: 12, quota: 3_000 },
  })
  expect(container.register).toHaveBeenCalledTimes(1)
  expect(container.register).toHaveBeenCalledWith('/sw.js')
  expect(storage.persist).toHaveBeenCalledTimes(1)
  expect(storage.persisted).not.toHaveBeenCalled()
  // persist: false reads the current state and asks for nothing.
  await expect(shell({ persist: false })).resolves.toMatchObject({
    persisted: false,
  })
  expect(storage.persist).toHaveBeenCalledTimes(1)
  expect(storage.persisted).toHaveBeenCalledTimes(1)
})

test('onUpdate fires for a waiting worker, and reload asks it to take over', async () => {
  const registration = new FakeRegistration()
  registration.active = new FakeWorker('activated')
  registration.waiting = new FakeWorker('installed')
  const { container } = workerApi(registration)
  const reloadPage = vi.fn()
  stubNavigator({ serviceWorker: container })
  vi.stubGlobal('location', { reload: reloadPage })
  const onUpdate = vi.fn()
  await shell({ workerUrl: '/sw.js', onUpdate })
  expect(onUpdate).toHaveBeenCalledTimes(1)
  const reload = onUpdate.mock.calls[0]![0] as () => void
  expect(registration.waiting.messages).toEqual([])
  reload()
  reload()
  expect(registration.waiting.messages).toEqual([
    { type: 'wfe-sync:skip-waiting' },
  ])
  // The package reloads only after the reload call, once the worker controls.
  expect(reloadPage).not.toHaveBeenCalled()
  container.dispatchEvent(new Event('controllerchange'))
  container.dispatchEvent(new Event('controllerchange'))
  expect(reloadPage).toHaveBeenCalledTimes(1)
})

test('onUpdate fires when a new worker installs behind an active one, not on the first install', async () => {
  const registration = new FakeRegistration()
  const { container } = workerApi(registration)
  stubNavigator({ serviceWorker: container })
  const onUpdate = vi.fn()
  await shell({ workerUrl: '/sw.js', onUpdate })
  // The first install has no active worker.
  const first = new FakeWorker('installing')
  registration.installing = first
  registration.dispatchEvent(new Event('updatefound'))
  first.move('installed')
  expect(onUpdate).not.toHaveBeenCalled()
  first.move('activated')
  registration.active = first
  // A new build installs behind it.
  const next = new FakeWorker('installing')
  registration.installing = next
  registration.dispatchEvent(new Event('updatefound'))
  next.move('installed')
  expect(onUpdate).toHaveBeenCalledTimes(1)
  ;(onUpdate.mock.calls[0]![0] as () => void)()
  expect(next.messages).toEqual([{ type: 'wfe-sync:skip-waiting' }])
})
