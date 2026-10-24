import { action } from 'solid-js'

/**
 * Keep the qualified action boundary for fixture root disposal (wfe-0dj.4).
 * Callers must flush afterward, outside the action, at their existing boundary.
 * They own the current disposer, repeated-stop guards, and mount/hydrate choice.
 * This helper neither mounts a root nor clears references or flushes early.
 */
export function createFixtureDisposal(dispose: () => void): () => void {
  // eslint-disable-next-line require-yield -- A synchronous generator action schedules the required disposal drain.
  return action(function* () {
    dispose()
  })
}
