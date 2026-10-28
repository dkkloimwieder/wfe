import { expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { collection, liveRows } from '@wfe/sync'
import { deferred, feedOf, order, persistenceOf, tick } from './sync-fixtures'
import type { Order } from './sync-fixtures'

const saved = (rows: Order[]) =>
  persistenceOf(async () => ({
    rows,
    cursor: 'saved',
    saved_at: '2026-10-24T00:00:00.000Z',
  }))
const ids = (c: { toArray: Order[] }) => c.toArray.map((row) => row.id).sort()

test('saved rows are ready before the list, and the list then reconciles them', async () => {
  const persistence = saved([order('a', 1), order('b', 1)])
  const feed = feedOf([])
  const page = deferred<{ rows: Order[]; cursor: string }>()
  vi.mocked(feed.list).mockImplementationOnce(() => page.promise)
  const c = collection(feed, 'all', { key: 'orders', persistence })
  await tick()
  expect(persistence.load).toHaveBeenCalledWith('orders')
  expect(c.status).toBe('ready')
  expect(ids(c)).toEqual(['a', 'b'])
  expect(c.utils.currentAt()).toBeUndefined()
  page.resolve({ rows: [order('b', 2), order('c', 1)], cursor: 'c0' })
  await tick()
  expect(ids(c)).toEqual(['b', 'c'])
  expect(c.get('b')?.row_version).toBe(2)
  expect(c.utils.currentAt()).toMatch(/^\d{4}-\d\d-\d\dT/)
})

test('a failed list after saved rows keeps them ready and reports the error', async () => {
  const failure = new Error('offline')
  const persistence = saved([order('a', 1)])
  const c = collection(feedOf([failure]), 'all', { key: 'orders', persistence })
  await tick()
  expect(c.status).toBe('ready')
  expect(ids(c)).toEqual(['a'])
  expect(c.utils.error()).toBe(failure)
  expect(c.utils.currentAt()).toBeUndefined()
})

test('saved rows use the last equal version and ignore lower versions within the load', async () => {
  const persistence = saved([
    order('a', 2),
    order('a', 2, 9),
    order('a', 1, 99),
  ])
  const c = collection(feedOf([new Error('offline')]), 'all', {
    key: 'orders',
    persistence,
  })
  try {
    await tick()
    expect(c.status).toBe('ready')
    expect(c.get('a')).toMatchObject(order('a', 2, 9))
  } finally {
    await c.cleanup()
  }
})

test.each([1, 9])(
  'an equal-version list reconciles saved rows with quantity %s',
  async (quantity) => {
    const feed = feedOf([])
    const page = deferred<{ rows: Order[]; cursor: string }>()
    vi.mocked(feed.list).mockReturnValueOnce(page.promise)
    const c = collection(feed, 'all', {
      key: 'orders',
      persistence: saved([order('a', 2)]),
    })
    await tick()
    const { rows, dispose } = createRoot((dispose) => ({
      rows: liveRows(c),
      dispose,
    }))
    const held = rows.a
    const notify = vi.fn()
    const subscription = c.subscribeChanges(notify, {
      includeInitialState: false,
    })
    try {
      page.resolve({ rows: [order('a', 2, quantity)], cursor: 'listed' })
      await tick()
      flush()
      expect(rows.a?.quantity).toBe(quantity)
      expect(c.get('a')).toMatchObject(order('a', 2, quantity))
      expect(notify).toHaveBeenCalledTimes(quantity === 1 ? 0 : 1)
      if (quantity === 1) expect(rows.a).toBe(held)
    } finally {
      dispose()
      subscription.unsubscribe()
      await c.cleanup()
    }
  },
)

test('a rejecting load counts as no saved rows and its error clears on the first list', async () => {
  const failure = new Error('storage')
  const persistence = persistenceOf(async () => {
    throw failure
  })
  const feed = feedOf([])
  const page = deferred<{ rows: Order[]; cursor: string }>()
  vi.mocked(feed.list).mockImplementationOnce(() => page.promise)
  const c = collection(feed, 'all', { key: 'orders', persistence })
  await tick()
  expect(feed.list).toHaveBeenCalledTimes(1)
  expect(c.status).toBe('loading')
  expect(c.utils.error()).toBe(failure)
  page.resolve({ rows: [order('a', 1)], cursor: 'c0' })
  await tick()
  expect(c.status).toBe('ready')
  expect(ids(c)).toEqual(['a'])
  expect(c.utils.error()).toBeUndefined()
})

test('no saved rows and a failed list set the error status', async () => {
  const failure = new Error('offline')
  const persistence = persistenceOf(async () => undefined)
  const c = collection(feedOf([failure]), 'all', { key: 'orders', persistence })
  await tick()
  expect(c.status).toBe('error')
  expect(c.utils.error()).toBe(failure)
  expect(ids(c)).toEqual([])
})
