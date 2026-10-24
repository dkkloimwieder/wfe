export type Status = 'loading' | 'ready' | 'error'

/** A plain status signal owned by the sync source. The Solid adapter bridges it. */
export interface StatusSignal {
  get(): Status
  set(next: Status): void
  subscribe(listener: (status: Status) => void): () => void
}

export function createStatus(initial: Status): StatusSignal {
  let current = initial
  const listeners = new Set<(status: Status) => void>()
  return {
    get: () => current,
    set(next) {
      if (next === current) return
      current = next
      for (const listener of [...listeners]) listener(next)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
