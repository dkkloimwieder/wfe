import { vi } from 'vitest'
import type {
  Change,
  Feed,
  OperationCall,
  OutboxEntry,
  Persistence,
  Reply,
  Row,
  Trigger,
} from '@wfe/sync'

/** Shared helpers for the sync unit tests. */
export type Order = Row & {
  row_version: number
  name: string
  quantity: number
}

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
export function feedOf(
  pages: (Order[] | Awaited<ReturnType<Feed<Order, string>['list']>> | Error)[],
) {
  const queue = [...pages]
  const feed: Feed<Order, string> = {
    list: vi.fn(async () => {
      const page = queue.shift()
      if (page instanceof Error) throw page
      if (page && !Array.isArray(page)) return page
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

/**
 * A fake host that holds each reply until the test answers it by hash. The
 * write log dedupes on request_hash: `effects` counts one effect per hash.
 */
export function hostOf() {
  const waiting = new Map<string, (reply: Reply) => void>()
  const sent: string[] = []
  const effects = new Set<string>()
  const send = vi.fn((entry: OutboxEntry) => {
    sent.push(entry.request_hash)
    effects.add(entry.request_hash)
    return new Promise<Reply>((resolve) =>
      waiting.set(entry.request_hash, resolve),
    )
  })
  const answer = (hash: string, reply: Reply = { ok: true }) => {
    waiting.get(hash)?.(reply)
    waiting.delete(hash)
  }
  return { send, sent, effects, answer }
}

/** A probe the test switches. */
export function probeOf(up = true) {
  const state = { up }
  return { state, probe: vi.fn(async () => state.up) }
}

/** A refusal reply. */
export const refused: Reply = {
  ok: false,
  retriable: false,
  refusal: { code: 'stale', text: 'Stale' },
}

/**
 * A stand-in for navigator.locks: one holder per name, the others wait in
 * order. `install()` puts it on navigator and returns the removal.
 */
export function locksOf() {
  const queues = new Map<string, (() => void)[]>()
  const held = new Set<string>()
  const locks = {
    request(
      name: string,
      options: { signal?: AbortSignal },
      fn: () => Promise<void>,
    ): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        const run = () => {
          held.add(name)
          fn()
            .then(resolve, reject)
            .finally(() => {
              held.delete(name)
              queues.get(name)?.shift()?.()
            })
        }
        if (!held.has(name)) run()
        else {
          const queue = queues.get(name) ?? []
          queues.set(name, queue)
          queue.push(run)
          options.signal?.addEventListener('abort', () => {
            const at = queue.indexOf(run)
            if (at >= 0) queue.splice(at, 1)
            reject(options.signal?.reason)
          })
        }
      })
    },
  }
  const install = () => {
    Object.defineProperty(navigator, 'locks', {
      value: locks,
      configurable: true,
    })
    return () => {
      Reflect.deleteProperty(navigator, 'locks')
    }
  }
  return { locks, install }
}
