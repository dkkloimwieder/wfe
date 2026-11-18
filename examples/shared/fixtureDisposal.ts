import { action } from 'solid-js'

/**
 * Keep the qualified action boundary for fixture root disposal (wfe-0dj.4).
 * Callers must flush afterward, outside the action, at their existing boundary.
 * They own the current disposer, repeated-stop guards, and mount/hydrate choice.
 * This helper neither mounts a root nor clears references or flushes early.
 */
export function createFixtureDisposal<Args extends unknown[]>(
  dispose: (...args: Args) => void,
): (...args: Args) => void {
  // eslint-disable-next-line require-yield -- A synchronous generator action schedules the required disposal drain.
  const stop = action(function* (...args: Args) {
    dispose(...args)
  })
  return (...args) => {
    stop(...args).catch((error: unknown) => {
      // Preserve synchronous fixture APIs and surface asynchronous cleanup errors.
      queueMicrotask(() => {
        throw error instanceof Error
          ? error
          : new Error('Fixture disposal failed', { cause: error })
      })
    })
  }
}
