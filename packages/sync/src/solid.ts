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
import type { Collection } from '@tanstack/db'
import type { Accessor, Store } from 'solid-js'
import { OutboxDiscarded, OutboxRefused } from './errors'
import { discarded } from './outbox'
import { peek } from './writer'
import type { AnyCollection } from './writer'
import type { OperationCall, Outbox, OutboxCounts, OutboxEntry } from './outbox'
import type { Status } from './status'
import { rowVersion } from './types'
import type { Row } from './types'

/**
 * Any collection the read adapters take: one made by `collection()`, a live
 * query result, or any other keyed collection. Rows need no id or version.
 */
export type KeyedCollection<T extends object> = Pick<
  Collection<T, string | number>,
  'entries' | 'subscribeChanges' | 'status' | 'on' | 'onFirstReady' | 'toArray'
>

/**
 * A row map keyed by the collection's own key as a string, kept current by
 * one change subscription. Each batch lands in one store write. The
 * subscription starts first, because it starts a lazy collection: a live
 * query can load its first rows inside `subscribeChanges`, without change
 * events. The store is seeded after that, so it is complete at return for a
 * ready collection. A collection that becomes ready later sends its rows as
 * changes.
 */
export function liveRows<T extends object>(
  c: KeyedCollection<T>,
): Store<Record<string, T>> {
  type Draft = Record<string, T>
  let set: ((write: (draft: Draft) => void) => void) | undefined
  const subscription = c.subscribeChanges(
    (changes) => {
      // A change before the seed is in the seed.
      set?.((draft) => {
        for (const change of changes) {
          if (change.type === 'delete') delete draft[String(change.key)]
          else draft[String(change.key)] = change.value
        }
      })
    },
    { includeInitialState: false },
  )
  const seed: Draft = {}
  for (const [key, value] of c.entries()) seed[String(key)] = value
  const [rows, setRows] = createStore<Draft>(seed)
  set = setRows
  onCleanup(() => subscription.unsubscribe())
  return rows
}

/**
 * Pushes the whole array on every batch. The first value waits for the
 * collection to be ready, so `<Loading>` covers the first fill; a failed first
 * fill errors the source, so `<Errored>` covers it.
 */
function subscribe<T extends object>(c: KeyedCollection<T>) {
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

/**
 * Rows in collection order, reconciled by the collection's own key; for sets
 * under a few hundred rows.
 */
export function liveList<T extends object>(c: KeyedCollection<T>): Store<T[]> {
  // The key of each row the collection has held. A nested value has no key.
  const keys = new WeakMap<object, string | number>()
  const pushes = subscribe(c)
  return createProjection<T[]>(
    () =>
      from<T[]>((next, error) =>
        pushes((rows) => {
          for (const [key, row] of c.entries()) keys.set(row, key)
          next(rows)
        }, error),
      ),
    [],
    { key: (item: object) => keys.get(item) },
  )
}

/** The collection status as the adapter reports it. */
function statusOf(c: { status: string }): Status {
  return c.status === 'ready' || c.status === 'error' ? c.status : 'loading'
}

/**
 * The status of the collection, read through a memo. For a collection made by
 * `collection()` it reads the status signal of the sync source. For any other
 * collection it maps `c.status`: 'ready' and 'error' as they are, any other
 * status as 'loading'.
 */
export function syncStatus<T extends object>(
  c: KeyedCollection<T>,
): Accessor<'loading' | 'ready' | 'error'> {
  const found = peek(c)
  return createMemo<Status>(() =>
    from<Status>((next) => {
      if (found) {
        next(found.status.get())
        return found.status.subscribe(next)
      }
      next(statusOf(c))
      return c.on('status:change', () => next(statusOf(c)))
    }),
  )
}

/** The last successful list's completeness, or true for other collections. */
export function syncComplete<T extends object>(
  c: KeyedCollection<T>,
): Accessor<boolean> {
  const found = peek(c)
  return createMemo<boolean>(() =>
    from<boolean>((next) => {
      next(found?.complete.get() ?? true)
      return found?.complete.subscribe(next)
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
 * True after a successful send removes the entry from the outbox and the
 * collection holds the expected id. If the expected row has a version, the
 * stored version must be greater. The collection's version accessor reads
 * both versions. Without an expected version, the row and successful send
 * are enough. It reads the collection, so the optimistic value cannot end
 * the wait. It throws when the entry is refused or discarded.
 */
function confirmed<T extends Row>(
  c: AnyCollection<T>,
  o: Outbox,
  expected: Partial<T> & { id: string },
  entry: OutboxEntry,
): boolean {
  if (discarded(o, entry.seq)) throw new OutboxDiscarded(entry.seq)
  const current = o.entries().find((e) => e.seq === entry.seq)
  if (current?.state === 'refused')
    throw new OutboxRefused(entry.seq, current.refusal)
  if (current !== undefined) return false
  const row = c.get(expected.id)
  if (row === undefined) return false
  const version = peek(c)?.version ?? rowVersion
  const want = version(expected as T) as number | undefined
  return want === undefined || version(row) > want
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
    expected: Partial<T> & { id: string },
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
    expected: Partial<T> & { id: string },
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
