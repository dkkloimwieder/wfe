// The page side of the shell. It never imports Solid.
import { skipWaitingMessage } from './message'

/** What the browser gave the shell. A missing API is false or zeros. */
export interface ShellResult {
  worker: boolean
  persisted: boolean
  quota: { usage: number; quota: number }
}

/**
 * Register the service worker, ask for persistent storage, and read the
 * storage estimate. It never throws. `onUpdate` is called when a new worker
 * waits. Its `reload` asks the new worker to take over and reloads the page
 * once it controls. The package never reloads on its own.
 */
export async function shell(
  options: {
    /** Call navigator.storage.persist(); default true. */
    persist?: boolean
    onUpdate?: (reload: () => void) => void
    /** The worker script. Without it, no worker is registered. */
    workerUrl?: string
  } = {},
): Promise<ShellResult> {
  const [worker, persisted, quota] = await Promise.all([
    register(options.workerUrl, options.onUpdate),
    persist(options.persist ?? true),
    estimate(),
  ])
  return { worker, persisted, quota }
}

function storage(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage
}

async function persist(ask: boolean): Promise<boolean> {
  const manager = storage()
  try {
    if (ask && typeof manager?.persist === 'function')
      return (await manager.persist()) === true
    if (typeof manager?.persisted === 'function')
      return (await manager.persisted()) === true
  } catch {
    // A failed call is not persisted.
  }
  return false
}

async function estimate(): Promise<ShellResult['quota']> {
  const manager = storage()
  try {
    if (typeof manager?.estimate === 'function') {
      const { usage, quota } = await manager.estimate()
      return { usage: usage ?? 0, quota: quota ?? 0 }
    }
  } catch {
    // A failed estimate is zeros.
  }
  return { usage: 0, quota: 0 }
}

async function register(
  url: string | undefined,
  onUpdate: ((reload: () => void) => void) | undefined,
): Promise<boolean> {
  const container =
    typeof navigator === 'undefined' ? undefined : navigator.serviceWorker
  if (url === undefined || !container) return false
  try {
    const registration = await container.register(url)
    if (onUpdate) watch(container, registration, onUpdate)
    return true
  } catch {
    return false
  }
}

/** Offer each worker that waits behind an active one. */
function watch(
  container: ServiceWorkerContainer,
  registration: ServiceWorkerRegistration,
  onUpdate: (reload: () => void) => void,
): void {
  const offered = new WeakSet<ServiceWorker>()
  const offer = (waiting: ServiceWorker) => {
    if (offered.has(waiting)) return
    offered.add(waiting)
    let asked = false
    onUpdate(() => {
      if (asked) return
      asked = true
      container.addEventListener('controllerchange', () => location.reload(), {
        once: true,
      })
      waiting.postMessage({ type: skipWaitingMessage })
    })
  }
  if (registration.waiting && registration.active) offer(registration.waiting)
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed' && registration.active)
        offer(installing)
    })
  })
}
