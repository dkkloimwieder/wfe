import { vi } from 'vitest'
import type {
  Change,
  Feed,
  OperationCall,
  Persistence,
  Row,
  Trigger,
} from '@wfe/sync'

/** Shared helpers for the sync unit tests. */
export type Order = Row & { name: string; quantity: number }

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
export const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
export const order = (
  id: string,
  row_version: number,
  quantity = 1,
): Order => ({
  id,
  row_version,
  name: `Order ${id}`,
  quantity,
})
/** A feed whose pages come from a queue; an Error entry rejects. */
export function feedOf(pages: (Order[] | Error)[]) {
  const queue = [...pages]
  const feed: Feed<Order, string> = {
    list: vi.fn(async () => {
      const page = queue.shift()
      if (page instanceof Error) throw page
      return { rows: page ?? [], cursor: 'end' }
    }),
    changes: vi.fn(async () => ({
      rows: [],
      next_cursor: 'end',
      complete: true,
    })),
  }
  return feed
}

/** A persistence whose load result the test supplies. */
export function persistenceOf(
  load: () => Promise<
    { rows: unknown[]; cursor: string; saved_at: string } | undefined
  >,
) {
  const persistence: Persistence = {
    load: vi.fn(load),
    save: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  }
  return persistence
}

/** A change that carries an order. */
export const changed = (
  id: string,
  row_version: number,
  quantity = 1,
): Change<Order> => ({
  id,
  row_version,
  deleted: false,
  data: order(id, row_version, quantity),
})

/**
 * A feed over a change log. `list` returns the rows and cursor 'c0'. The
 * cursor 'cN' means the first N log entries are applied; `changes` replays
 * the log from there in pages of `limit`, default 2.
 */
export function logFeed(rows: Order[], log: Change<Order>[] = []) {
  const feed: Feed<Order, string> = {
    list: vi.fn(async () => ({ rows, cursor: 'c0' })),
    changes: vi.fn(async (_scope: string, cursor: string, limit = 2) => {
      const start = Number(cursor.slice(1))
      const page = log.slice(start, start + limit)
      const next = start + page.length
      return {
        rows: page,
        next_cursor: `c${next}`,
        complete: next >= log.length,
      }
    }),
  }
  return { feed, log }
}

/** A trigger whose fire the test calls. */
export function triggerOf() {
  const fires = new Map<string, () => void>()
  const unsubscribe = vi.fn()
  const trigger: Trigger = {
    subscribe: vi.fn((key: string, fire: () => void) => {
      fires.set(key, fire)
      return unsubscribe
    }),
  }
  return { trigger, unsubscribe, fire: (key: string) => fires.get(key)?.() }
}

/** An operation call on one order; the hash stands for the request. */
export const call = (
  id: string,
  request_hash: string,
  append_only = false,
): OperationCall => ({
  operation: 'orders.update',
  request: { id },
  request_hash,
  expect: { model: 'orders', id },
  append_only,
})
