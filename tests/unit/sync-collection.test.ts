import { expect, test, vi } from 'vitest'
import { CursorExpired, collection } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import type { Change } from '@wfe/sync'
import { deferred, feedOf, order, tick } from './sync-fixtures'
import type { Order } from './sync-fixtures'

const ids = (c: { toArray: Order[] }) => c.toArray.map((row) => row.id).sort()
const change = (
  id: string,
  row_version: number,
  quantity?: number,
): Change<Order> =>
  quantity === undefined
    ? { id, row_version, deleted: true }
    : {
        id,
        row_version,
        deleted: false,
        data: order(id, row_version, quantity),
      }

test('fill calls list once and marks the collection ready', async () => {
  const page = deferred<Order[]>()
  const feed = feedOf([])
  vi.mocked(feed.list).mockImplementationOnce(async () => ({
    rows: await page.promise,
    cursor: 'end',
  }))
  const c = collection(feed, 'all', { key: 'orders:all' })
  expect(feed.list).toHaveBeenCalledTimes(1)
  expect(feed.list).toHaveBeenCalledWith('all', expect.any(AbortSignal))
  expect(c.status).toBe('loading')
  expect(c.size).toBe(0)
  page.resolve([order('a', 1), order('b', 1)])
  await tick()
  expect(c.status).toBe('ready')
  expect(ids(c)).toEqual(['a', 'b'])
  expect(c.get('a')?.quantity).toBe(1)
  expect(c.utils.error()).toBeUndefined()
  expect(feed.list).toHaveBeenCalledTimes(1)
  expect(feed.changes).not.toHaveBeenCalled()
})

test('a rejecting list sets error and leaves the collection empty', async () => {
  const failure = new Error('offline')
  const c = collection(feedOf([failure]), 'all', { key: 'orders:all' })
  await tick()
  expect(c.status).toBe('error')
  expect(c.utils.error()).toBe(failure)
  expect(c.size).toBe(0)
})

test('refill removes absent rows and applies the row_version rule', async () => {
  const feed = feedOf([
    [order('a', 1), order('b', 1), order('c', 1), order('e', 3)],
    [order('a', 2, 5), order('b', 1, 9), order('d', 1), order('e', 2, 9)],
  ])
  const c = collection(feed, 'all', { key: 'orders:all' })
  await tick()
  await c.utils.refill()
  expect(feed.list).toHaveBeenCalledTimes(2)
  expect(ids(c)).toEqual(['a', 'b', 'd', 'e'])
  expect(c.get('a')).toMatchObject({ row_version: 2, quantity: 5 })
  expect(c.get('b')).toMatchObject({ row_version: 1, quantity: 1 })
  expect(c.get('e')).toMatchObject({ row_version: 3, quantity: 1 })
  expect(c.get('d')?.row_version).toBe(1)
  expect(c.status).toBe('ready')
})

test('a failed refill keeps rows and reports the error until the next success', async () => {
  const failure = new Error('timeout')
  const c = collection(
    feedOf([[order('a', 1)], failure, [order('a', 1), order('b', 1)]]),
    'all',
    { key: 'orders:all' },
  )
  await tick()
  await c.utils.refill()
  expect(c.status).toBe('error')
  expect(c.utils.error()).toBe(failure)
  expect(ids(c)).toEqual(['a'])
  await c.utils.refill()
  expect(c.status).toBe('ready')
  expect(c.utils.error()).toBeUndefined()
  expect(ids(c)).toEqual(['a', 'b'])
})

test('applyChanges deletes, inserts, and updates by the row_version rule', async () => {
  const c = collection(
    feedOf([[order('a', 1), order('b', 1), order('c', 2)]]),
    'all',
    { key: 'orders:all' },
  )
  await tick()
  const batches: string[][] = []
  const subscription = c.subscribeChanges(
    (changes) => {
      batches.push(changes.map((entry) => `${entry.type}:${entry.key}`))
    },
    { includeInitialState: false },
  )
  applyChanges(c, [
    change('a', 1),
    change('d', 1, 4),
    change('b', 2, 7),
    change('c', 2, 9),
    change('c', 1, 9),
    change('zz', 1),
  ])
  expect(ids(c)).toEqual(['b', 'c', 'd'])
  expect(c.get('b')).toMatchObject({ row_version: 2, quantity: 7 })
  expect(c.get('c')).toMatchObject({ row_version: 2, quantity: 1 })
  expect(c.get('d')).toMatchObject({ row_version: 1, quantity: 4 })
  expect(batches).toEqual([['delete:a', 'insert:d', 'update:b']])
  applyChanges(c, [change('d', 2, 5), change('d', 3, 6), change('b', 3)])
  expect(c.get('d')).toMatchObject({ row_version: 3, quantity: 6 })
  expect(c.has('b')).toBe(false)
  expect(batches).toHaveLength(2)
  subscription.unsubscribe()
})

test('a restart after cleanup fills again and applyChanges writes through the new run', async () => {
  const feed = feedOf([[order('a', 1)], [order('b', 1)]])
  const c = collection(feed, 'all', { key: 'orders' })
  await tick()
  await c.cleanup()
  expect(c.status).toBe('cleaned-up')
  const subscription = c.subscribeChanges(() => {})
  await tick()
  expect(feed.list).toHaveBeenCalledTimes(2)
  expect(ids(c)).toEqual(['b'])
  applyChanges(c, [change('c', 1, 3)])
  expect(ids(c)).toEqual(['b', 'c'])
  subscription.unsubscribe()
})

test('CursorExpired is an Error with its own name and cause', () => {
  const cause = new Error('gone')
  const expired = new CursorExpired(undefined, { cause })
  expect(expired).toBeInstanceOf(Error)
  expect(expired).toBeInstanceOf(CursorExpired)
  expect(expired.name).toBe('CursorExpired')
  expect(expired.message).toBe('The host no longer holds this cursor')
  expect(expired.cause).toBe(cause)
})
