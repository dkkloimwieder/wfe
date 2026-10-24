// The only module that imports solid-js. It uses createStore, createProjection,
// from, createMemo and onCleanup, and nothing outside the adapter table.
import {
  createMemo,
  createProjection,
  createStore,
  from,
  onCleanup,
} from 'solid-js'
import type { Accessor, Store } from 'solid-js'
import { peek, source } from './writer'
import type { AnyCollection } from './writer'
import type { Outbox, OutboxCounts } from './outbox'
import type { Status } from './status'
import type { Row } from './types'

/**
 * A keyed row map kept current by one change subscription. Each batch lands
 * in one store write. The store is seeded from the collection before the
 * subscription starts, so it is complete at return.
 */
export function liveRows<T extends Row>(
  c: AnyCollection<T>,
): Store<Record<string, T>> {
  const seed: Record<string, T> = {}
  for (const [key, value] of c.entries()) seed[key] = value
  const [rows, set] = createStore<Record<string, T>>(seed)
  const subscription = c.subscribeChanges(
    (changes) => {
      set((draft) => {
        for (const change of changes) {
          if (change.type === 'delete') delete draft[change.key]
          else draft[change.key] = change.value
        }
      })
    },
    { includeInitialState: false },
  )
  onCleanup(() => subscription.unsubscribe())
  return rows
}

/**
 * Pushes the whole array on every batch. The first value waits for the
 * collection to be ready, so `<Loading>` covers the first fill; a failed first
 * fill errors the source, so `<Errored>` covers it.
 */
function subscribe<T extends Row>(c: AnyCollection<T>) {
  return (next: (rows: T[]) => void, error: (reason: unknown) => void) => {
    let delivered = false
    const push = () => {
      delivered = true
      next(c.toArray)
    }
    const subscription = c.subscribeChanges(() => push(), {
      includeInitialState: false,
    })
    const stops: (() => void)[] = [() => subscription.unsubscribe()]
    const fail = () => error(peek(c)?.error() ?? new Error('Sync failed'))
    if (c.status === 'ready') push()
    else if (c.status === 'error') fail()
    else {
      stops.push(
        c.onFirstReady(() => {
          if (!delivered) push()
        }),
        c.on('status:change', (event) => {
          if (event.status === 'error' && !delivered) fail()
        }),
      )
    }
    return () => {
      for (const stop of stops) stop()
    }
  }
}

/** Rows in collection key order, reconciled by id; for sets under a few hundred rows. */
export function liveList<T extends Row>(c: AnyCollection<T>): Store<T[]> {
  return createProjection<T[]>(() => from(subscribe(c)), [], { key: 'id' })
}

/** The status signal the sync source owns, read through a memo. */
export function syncStatus<T extends Row>(
  c: AnyCollection<T>,
): Accessor<'loading' | 'ready' | 'error'> {
  const { status } = source(c)
  return createMemo<Status>(() =>
    from<Status>((next) => {
      next(status.get())
      return status.subscribe(next)
    }),
  )
}

/** The outbox counts, read through a memo over `watch`. */
export function outboxStatus(o: Outbox): Accessor<OutboxCounts> {
  return createMemo<OutboxCounts>(() =>
    from<OutboxCounts>((next) => o.watch(next)),
  )
}
