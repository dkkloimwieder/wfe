import { vi } from 'vitest'
import type { Feed, Persistence, Row } from '@wfe/sync'

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
