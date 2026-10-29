// The only module that imports solid-js. It uses createStore, createProjection,
// createOptimisticStore, action, until, from, createMemo, runWithOwner,
// onSettled and onCleanup.
import {
  action,
  createMemo,
  createOptimisticStore,
  createProjection,
  createStore,
  from,
  onCleanup,
  onSettled,
  runWithOwner,
  until,
} from 'solid-js'
import type { Collection } from '@tanstack/db'
import type { Accessor, Store } from 'solid-js'
import { OutboxDiscarded, OutboxRefused } from './errors'
import { discarded } from './outbox'
import { peek, source } from './writer'
import type { OperationCall, Outbox, OutboxCounts, OutboxEntry } from './outbox'
import { createSourceSignal } from './status'
import type { Status } from './status'
import type { SyncCollection } from './collection'
import type { Key } from './types'

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
 * Number and string keys with the same string form share one property.
 * A collection must use one key type to avoid these collisions.
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

/** The last successful list or changes time, or undefined for other collections. */
export function syncCurrentAt<T extends object>(
  c: KeyedCollection<T>,
): Accessor<string | undefined> {
  const found = peek(c)
  return createMemo<string | undefined>(() =>
    from<string | undefined>((next) => {
      next(found?.currentAt.get())
      return found?.currentAt.subscribe(next)
    }),
  )
}

/** The outbox counts, read through a memo over `watch`. */
export function outboxStatus(
  o: Outbox<string | number>,
): Accessor<OutboxCounts> {
  return createMemo<OutboxCounts>(() =>
    from<OutboxCounts>((next) => o.watch(next)),
  )
}

/** The rows of each pushed array, keyed by the collection accessor. */
async function* keyed<T extends object>(
  lists: AsyncIterable<T[]>,
  getKey: Key<T>,
): AsyncIterable<Record<string, T>> {
  for await (const list of lists) {
    const rows: Record<string, T> = {}
    for (const row of list) rows[getKey(row)] = row
    yield rows
  }
}

/** Subscribe before enqueue, so even an immediate reply records the pass boundary. */
function confirmation<T extends object>(
  c: SyncCollection<T>,
  o: Outbox<string | number>,
): (entry: OutboxEntry<string | number>, restored?: boolean) => boolean {
  let started = 0
  let completed = 0
  const sentAfter = new Map<number, number>()
  const changes = createSourceSignal(0)
  const notify = () => changes.set(changes.get() + 1)
  const stopFollow = c.utils.watchFollow((event) => {
    if (event.type === 'start') started = event.id
    else if (event.complete) completed = event.id
    notify()
  })
  const stopSent = o.watchSent((seq) => {
    sentAfter.set(seq, started)
    notify()
  })
  const stopOutbox = o.watch(notify)
  const moved = createMemo<number>(() =>
    from<number>((next) => {
      next(changes.get())
      return changes.subscribe(next)
    }),
  )
  onCleanup(() => {
    stopFollow()
    stopSent()
    stopOutbox()
  })
  return (entry, restored = false) => {
    moved()
    if (discarded(o, entry.seq)) {
      sentAfter.delete(entry.seq)
      throw new OutboxDiscarded(entry.seq)
    }
    const current = o.entries().find((e) => e.seq === entry.seq)
    if (current?.state === 'refused' && !restored) {
      sentAfter.delete(entry.seq)
      throw new OutboxRefused(entry.seq, current.refusal)
    }
    if (current !== undefined) return false
    // Another tab can remove a sent entry. In that case, wait for a pass
    // that starts after this tab first observes its removal.
    const after = sentAfter.get(entry.seq) ?? started
    sentAfter.set(entry.seq, after)
    if (completed <= after) return false
    sentAfter.delete(entry.seq)
    return true
  }
}

/**
 * The rows of the collection with an optimistic overlay, and a write action.
 * The write shows the expected row at once, enqueues the call, and waits
 * until a later follow pass ends complete. A refusal or a discard throws at the
 * wait, and the guess reverts. The wait has no timeout, so one action stays
 * open for each unsent entry.
 * Expected rows must contain the fields that `options.getKey` reads.
 * They need no id field. The outbox stores them without key aliases.
 * With a model, stored expected rows return as entries load. Restored refusals
 * and expired entries keep their overlay until discard or successful resubmission.
 */
export function recordWrite<
  T extends object,
  K extends string | number = string,
>(
  c: SyncCollection<T>,
  o: Outbox<K>,
  options?: { model?: string },
): {
  rows: Store<Record<string, T>>
  write: (op: OperationCall<K>, expected: Partial<T>) => Promise<void>
} {
  const getKey = source(c).getKey
  const [rows, setRows] = createOptimisticStore<Record<string, T>>(
    () => keyed(from(subscribe(c)), getKey),
    undefined,
    { key: (item: object) => getKey(item as T) },
  )
  const confirmed = confirmation(c, o)
  // Both restored entries and this adapter's own writes run once per seq.
  const seen = new Set<number>()
  let enqueuing = 0
  let disposed = false
  let settled = false
  const apply = (expected: Partial<T>) => {
    const id = getKey(expected as T)
    setRows((draft) => {
      draft[id] = { ...draft[id], ...expected } as T
    })
  }
  const restoreEntry = action(function* (entry: OutboxEntry<K>) {
    const expected = entry.expected as Partial<T>
    apply(expected)
    yield until(() => confirmed(entry, true))
  })
  function restore(): void {
    // enqueue notifies before its promise returns the seq. Wait for all local
    // enqueues to register their seqs before scanning that notification.
    if (disposed || !settled || enqueuing > 0 || options?.model === undefined)
      return
    for (const entry of o.entries()) {
      if (
        entry.expect.model !== options.model ||
        entry.expected === undefined ||
        seen.has(entry.seq)
      )
        continue
      seen.add(entry.seq)
      runWithOwner(null, () => {
        void restoreEntry(entry).catch(() => undefined)
      })
    }
  }
  async function enqueue(
    op: OperationCall<K>,
    expected: Partial<T>,
  ): Promise<OutboxEntry<K>> {
    enqueuing++
    try {
      const entry = await o.enqueue(op, expected)
      seen.add(entry.seq)
      return entry
    } finally {
      enqueuing--
      restore()
    }
  }
  const write = action(function* (op: OperationCall<K>, expected: Partial<T>) {
    apply(expected)
    const entry = (yield enqueue(op, expected)) as OutboxEntry<K>
    yield until(() => confirmed(entry))
  })
  // onSettled can run while persistence is still loading under a Loading
  // boundary. Read the store so restoration waits for its first committed
  // value. until reads authoritative state without adding a render effect
  // outside the caller's Loading boundary.
  if (options?.model !== undefined)
    onSettled(() => {
      const abort = new AbortController()
      let stop: (() => void) | undefined
      void runWithOwner(null, () =>
        until(
          () => {
            Object.keys(rows)
            return true
          },
          { signal: abort.signal },
        ),
      ).then(
        () => {
          if (disposed) return
          settled = true
          stop = o.watch(restore)
        },
        () => undefined,
      )
      return () => {
        abort.abort()
        stop?.()
      }
    })
  onCleanup(() => {
    disposed = true
  })
  return {
    rows,
    write: (op, expected) => runWithOwner(null, () => write(op, expected)),
  }
}
