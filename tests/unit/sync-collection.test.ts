import { expect, test, vi } from 'vitest'
import { CursorExpired, collection } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import type { Change, Feed } from '@wfe/sync'
import {
  deferred,
  feedOf,
  order,
  persistenceOf,
  tick,
  triggerOf,
} from './sync-fixtures'
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
  expect(c.utils.complete()).toBe(true)
  page.resolve([order('a', 1), order('b', 1)])
  await tick()
  expect(c.status).toBe('ready')
  expect(c.utils.complete()).toBe(true)
  expect(ids(c)).toEqual(['a', 'b'])
  expect(c.get('a')?.quantity).toBe(1)
  expect(c.utils.error()).toBeUndefined()
  expect(feed.list).toHaveBeenCalledTimes(1)
  expect(feed.changes).not.toHaveBeenCalled()
})

test('an incomplete list saves its cursor and rows and still follows changes', async () => {
  const feed = feedOf([
    { rows: [order('a', 1)], cursor: 'capped', complete: false },
  ])
  vi.mocked(feed.changes).mockResolvedValueOnce({
    rows: [change('a', 2, 5)],
    next_cursor: 'followed',
    complete: true,
  })
  const persistence = persistenceOf(async () => undefined)
  const { trigger, fire } = triggerOf()
  const c = collection(feed, 'all', {
    key: 'orders:all',
    trigger,
    persistence,
  })
  try {
    await tick()
    expect(c.utils.complete()).toBe(false)
    expect(c.status).toBe('ready')
    await vi.waitFor(() =>
      expect(persistence.save).toHaveBeenCalledWith(
        'orders:all',
        [expect.objectContaining(order('a', 1))],
        'capped',
      ),
    )
    fire('orders:all')
    await tick()
    expect(feed.changes).toHaveBeenCalledWith(
      'all',
      'capped',
      undefined,
      expect.any(AbortSignal),
    )
    expect(c.get('a')?.quantity).toBe(5)
    expect(c.utils.complete()).toBe(false)
  } finally {
    await c.cleanup()
  }
})

test.each([true, undefined])(
  'a refill with complete %s resets completeness and failed refills preserve it',
  async (complete) => {
    const failure = new Error('offline')
    const c = collection(
      feedOf([
        { rows: [], cursor: 'partial', complete: false },
        failure,
        {
          rows: [],
          cursor: 'full',
          ...(complete === undefined ? {} : { complete }),
        },
        failure,
      ]),
      'all',
      { key: 'orders:all' },
    )
    try {
      await tick()
      expect(c.utils.complete()).toBe(false)
      await c.utils.refill()
      expect(c.utils.error()).toBe(failure)
      expect(c.utils.complete()).toBe(false)
      await c.utils.refill()
      expect(c.utils.complete()).toBe(true)
      await c.utils.refill()
      expect(c.utils.error()).toBe(failure)
      expect(c.utils.complete()).toBe(true)
    } finally {
      await c.cleanup()
    }
  },
)

test('saved rows do not change completeness before a list or on restart', async () => {
  const page = deferred<Awaited<ReturnType<Feed<Order, string>['list']>>>()
  const failure = new Error('offline')
  const feed = feedOf([failure])
  vi.mocked(feed.list).mockReturnValueOnce(page.promise)
  const persistence = persistenceOf(async () => ({
    rows: [order('a', 1)],
    cursor: 'saved',
    saved_at: '2026-10-25T00:00:00.000Z',
  }))
  const c = collection(feed, 'all', { key: 'orders:all', persistence })
  try {
    await tick()
    expect(c.get('a')).toMatchObject(order('a', 1))
    expect(c.status).toBe('ready')
    expect(c.utils.complete()).toBe(true)
    page.resolve({ rows: [], cursor: 'partial', complete: false })
    await tick()
    expect(c.utils.complete()).toBe(false)
    await c.cleanup()
    await c.preload()
    await tick()
    expect(c.get('a')).toMatchObject(order('a', 1))
    expect(c.utils.error()).toBe(failure)
    expect(c.utils.complete()).toBe(false)
  } finally {
    await c.cleanup()
  }
})

test('a rejecting list sets error and leaves the collection empty', async () => {
  const failure = new Error('offline')
  const c = collection(feedOf([failure]), 'all', { key: 'orders:all' })
  await tick()
  expect(c.status).toBe('error')
  expect(c.utils.error()).toBe(failure)
  expect(c.size).toBe(0)
  expect(c.utils.complete()).toBe(true)
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
  expect(c.get('b')).toMatchObject({ row_version: 1, quantity: 9 })
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
  expect(c.get('c')).toMatchObject({ row_version: 2, quantity: 9 })
  expect(c.get('d')).toMatchObject({ row_version: 1, quantity: 4 })
  expect(batches).toEqual([['delete:a', 'insert:d', 'update:b', 'update:c']])
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

test('applyChanges compares repeated keys with the last accepted version in the batch', async () => {
  const c = collection(feedOf([[order('a', 2)]]), 'all', { key: 'orders' })
  await tick()
  const notify = vi.fn()
  const subscription = c.subscribeChanges(notify, {
    includeInitialState: false,
  })
  try {
    applyChanges(c, [change('a', 2, 5), change('a', 2, 1), change('a', 1, 99)])
    expect(c.get('a')).toMatchObject(order('a', 2))
    expect(notify).not.toHaveBeenCalled()

    applyChanges(c, [
      change('a', 3, 5),
      change('a', 2, 99),
      change('a', 3, 7),
      change('b', 2, 1),
      change('b', 2, 9),
      change('b', 1, 99),
      change('c', 4, 1),
      change('c', 4),
      change('c', 2, 5),
      change('c', 2, 8),
    ])
    expect(c.get('a')).toMatchObject(order('a', 3, 7))
    expect(c.get('b')).toMatchObject(order('b', 2, 9))
    expect(c.get('c')).toMatchObject(order('c', 2, 8))
    expect(notify).toHaveBeenCalledTimes(1)
  } finally {
    subscription.unsubscribe()
    await c.cleanup()
  }
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

test('a collection over rows with rowVersion applies the version rule through options.version', async () => {
  type Camel = { id: string; rowVersion: number; quantity: number }
  const camel = (id: string, rowVersion: number, quantity = 1): Camel => ({
    id,
    rowVersion,
    quantity,
  })
  const pages = [
    [camel('a', 1), camel('b', 2), camel('c', 1)],
    [camel('a', 2, 5), camel('b', 1, 9), camel('c', 1, 9)],
  ]
  const feed: Feed<Camel, string> = {
    list: vi.fn(async () => ({ rows: pages.shift() ?? [], cursor: 'end' })),
    changes: vi.fn(async () => ({
      rows: [],
      next_cursor: 'end',
      complete: true,
    })),
  }
  const persistence = persistenceOf(async () => ({
    rows: [camel('a', 1, 3), camel('s', 4)],
    cursor: 'saved',
    saved_at: '2026-10-24T00:00:00.000Z',
  }))
  const c = collection(feed, 'all', {
    key: 'camel:all',
    persistence,
    version: (row) => row.rowVersion,
  })
  await tick()
  // An equal version from the list replaces the saved row; absent rows leave.
  expect(c.get('a')).toMatchObject(camel('a', 1))
  expect(c.has('s')).toBe(false)
  await c.utils.refill()
  expect(c.get('a')).toMatchObject(camel('a', 2, 5))
  expect(c.get('b')).toMatchObject(camel('b', 2))
  expect(c.get('c')).toMatchObject(camel('c', 1, 9))
  applyChanges(c, [
    { id: 'a', row_version: 3, deleted: false, data: camel('a', 3, 7) },
    { id: 'b', row_version: 2, deleted: false, data: camel('b', 2, 8) },
    { id: 'c', row_version: 0, deleted: false, data: camel('c', 0, 8) },
    { id: 'd', row_version: 1, deleted: false, data: camel('d', 1) },
  ])
  expect(c.get('a')).toMatchObject(camel('a', 3, 7))
  expect(c.get('b')).toMatchObject(camel('b', 2, 8))
  expect(c.get('c')).toMatchObject(camel('c', 1, 9))
  expect(c.get('d')).toMatchObject(camel('d', 1))
})
