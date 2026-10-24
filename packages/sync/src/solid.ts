// The only module that imports solid-js. It uses createStore, createProjection,
// createOptimisticStore, action, until, from, createMemo and onCleanup, and
// nothing outside the adapter table.
import {
  action,
  createMemo,
  createOptimisticStore,
  createProjection,
  createStore,
  from,
  onCleanup,
  until,
} from 'solid-js'
import type { Accessor, Store } from 'solid-js'
import { OutboxDiscarded } from './errors'
import { discarded } from './outbox'
import { peek, source } from './writer'
import type { AnyCollection } from './writer'
import type { OperationCall, Outbox, OutboxCounts, OutboxEntry } from './outbox'
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

/** The rows of each pushed array, keyed by id. */
async function* keyed<T extends Row>(
  lists: AsyncIterable<T[]>,
): AsyncIterable<Record<string, T>> {
  for await (const list of lists) {
    const rows: Record<string, T> = {}
    for (const row of list) rows[row.id] = row
    yield rows
  }
}

/** A counter that moves on each change of the collection or the outbox. */
function moves<T extends Row>(
  c: AnyCollection<T>,
  o: Outbox,
): Accessor<number> {
  return createMemo<number>(() =>
    from<number>((next) => {
      let count = 0
      next(count)
      const subscription = c.subscribeChanges(() => next(++count), {
        includeInitialState: false,
      })
      const stop = o.watch(() => next(++count))
      return () => {
        subscription.unsubscribe()
        stop()
      }
    }),
  )
}

/**
 * True when the collection holds the written row. It reads the collection,
 * never the optimistic store, so the guess of the action never satisfies it.
 * It throws when the entry is refused or discarded.
 */
function confirmed<T extends Row>(
  c: AnyCollection<T>,
  o: Outbox,
  expected: { id: string; row_version?: number },
  entry: OutboxEntry,
): boolean {
  if (discarded(o, entry.seq)) throw new OutboxDiscarded(entry.seq)
  const current = o.entries().find((e) => e.seq === entry.seq)
  if (current?.state === 'refused')
    throw current.refusal ?? new Error('The host refused the write')
  const row = c.get(expected.id)
  if (row === undefined) return false
  return (
    expected.row_version === undefined || row.row_version > expected.row_version
  )
}

/**
 * The rows of the collection with an optimistic overlay, and a write action.
 * The write shows the expected row at once, enqueues the call, and waits
 * until the feed brings the row back. A refusal or a discard throws at the
 * wait, and the guess reverts. The wait has no timeout, so one action stays
 * open for each unsent entry.
 */
export function recordWrite<T extends Row>(
  c: AnyCollection<T>,
  o: Outbox,
): {
  rows: Store<Record<string, T>>
  write: (
    op: OperationCall,
    expected: Partial<T> & { id: string; row_version?: number },
  ) => Promise<void>
} {
  const [rows, setRows] = createOptimisticStore<Record<string, T>>(
    () => keyed(from(subscribe(c))),
    undefined,
    { key: 'id' },
  )
  const moved = moves(c, o)
  const write = action(function* (
    op: OperationCall,
    expected: Partial<T> & { id: string; row_version?: number },
  ) {
    setRows((draft) => {
      draft[expected.id] = { ...draft[expected.id], ...expected } as T
    })
    const entry = (yield o.enqueue(op)) as OutboxEntry
    yield until(() => {
      moved()
      return confirmed(c, o, expected, entry)
    })
  })
  return { rows, write }
}
