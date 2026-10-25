export type Status = 'loading' | 'ready' | 'error'

/** A plain signal owned by the sync source. The Solid adapter bridges it. */
export interface SourceSignal<T> {
  get(): T
  set(next: T): void
  subscribe(listener: (value: T) => void): () => void
}

export type StatusSignal = SourceSignal<Status>

export function createStatus(initial: Status): StatusSignal {
  return createSourceSignal(initial)
}

export function createSourceSignal<T>(initial: T): SourceSignal<T> {
  let current = initial
  const listeners = new Set<(value: T) => void>()
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
