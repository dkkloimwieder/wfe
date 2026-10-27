import { afterEach, expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { CursorExpired, collection, liveList, liveRows } from '@wfe/sync'
import type { Change, FollowPass } from '@wfe/sync'
import {
  changed,
  deferred,
  logFeed,
  order,
  persistenceOf,
  tick,
  triggerOf,
} from './sync-fixtures'
import type { Order } from './sync-fixtures'

afterEach(() => {
  vi.useRealTimers()
})

const ids = (c: { toArray: Order[] }) => c.toArray.map((row) => row.id).sort()
const cursors = (changes: unknown) =>
  vi
    .mocked(changes as (...args: unknown[]) => unknown)
    .mock.calls.map((call) => call[1])
const deleted = (id: string, row_version: number): Change<Order> => ({
  id,
  row_version,
  deleted: true,
})

test('a pass replays the change log in pages into both shapes', async () => {
  const { feed } = logFeed(
    [order('a', 1), order('b', 1)],
    [changed('a', 2, 5), changed('c', 1), deleted('b', 2)],
  )
  const c = collection(feed, 'all', { key: 'orders', pageSize: 2 })
  await tick()
  const events: FollowPass[] = []
  const stop = c.utils.watchFollow((event) => events.push(event))
  const listedAt = c.utils.currentAt()
  expect(listedAt).toBeDefined()
  const { rows, list, dispose } = createRoot((dispose) => ({
    rows: liveRows(c),
    list: liveList(c),
    dispose,
  }))
  flush()
  await new Promise((resolve) => setTimeout(resolve, 2))
  await c.utils.pull()
  flush()
  expect(feed.changes).toHaveBeenCalledTimes(2)
  expect(vi.mocked(feed.changes).mock.calls[0]?.slice(0, 3)).toEqual([
    'all',
    'c0',
    2,
  ])
  expect(vi.mocked(feed.changes).mock.calls[0]?.[3]).toBeInstanceOf(AbortSignal)
  expect(cursors(feed.changes)).toEqual(['c0', 'c2'])
  expect(ids(c)).toEqual(['a', 'c'])
  expect(c.get('a')).toMatchObject({ row_version: 2, quantity: 5 })
  expect(Object.keys(rows).sort()).toEqual(['a', 'c'])
  expect(rows.a?.quantity).toBe(5)
  expect(list.map((row) => row.id)).toEqual(['a', 'c'])
  expect(c.utils.currentAt()! > listedAt!).toBe(true)
  expect(events).toEqual([
    { type: 'start', id: 1 },
    { type: 'end', id: 1, complete: true },
  ])
  stop()
  await c.utils.pull()
  expect(events).toHaveLength(2)
  expect(cursors(feed.changes)).toEqual(['c0', 'c2', 'c3'])
  dispose()
})

test('saved rows render before the list, and absent rows leave after it', async () => {
  const persistence = persistenceOf(async () => ({
    rows: [order('a', 1), order('b', 1)],
    cursor: 'c0',
    saved_at: '2026-10-24T00:00:00.000Z',
  }))
  const { feed } = logFeed([order('b', 1)])
  const page = deferred<{ rows: Order[]; cursor: string }>()
  vi.mocked(feed.list).mockImplementationOnce(() => page.promise)
  const c = collection(feed, 'all', { key: 'orders', persistence })
  await tick()
  const { rows, dispose } = createRoot((dispose) => ({
    rows: liveRows(c),
    dispose,
  }))
  flush()
  expect(Object.keys(rows).sort()).toEqual(['a', 'b'])
  page.resolve({ rows: [order('b', 1)], cursor: 'c0' })
  await tick()
  flush()
  expect(Object.keys(rows)).toEqual(['b'])
  expect(ids(c)).toEqual(['b'])
  dispose()
})

test('saves wait 250 ms, collapse a list and two pages into one, and carry the cursor', async () => {
  vi.useFakeTimers()
  const persistence = persistenceOf(async () => undefined)
  const { feed } = logFeed(
    [order('a', 1)],
    [changed('b', 1), changed('c', 1), changed('d', 1)],
  )
  const c = collection(feed, 'all', { key: 'orders', persistence })
  await vi.advanceTimersByTimeAsync(0)
  await c.utils.pull()
  expect(feed.changes).toHaveBeenCalledTimes(2)
  expect(persistence.save).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(249)
  expect(persistence.save).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(persistence.save).toHaveBeenCalledTimes(1)
  const [key, rows, cursor] = vi.mocked(persistence.save).mock.calls[0]!
  expect(key).toBe('orders')
  expect((rows as Order[]).map((row) => row.id).sort()).toEqual([
    'a',
    'b',
    'c',
    'd',
  ])
  expect(cursor).toBe('c3')
  expect(persistence.remove).not.toHaveBeenCalled()
  await c.cleanup()
})

test('cleanup writes a waiting save at once', async () => {
  vi.useFakeTimers()
  const persistence = persistenceOf(async () => undefined)
  const { feed } = logFeed([order('a', 1)], [changed('b', 1)])
  const c = collection(feed, 'all', { key: 'orders', persistence })
  await vi.advanceTimersByTimeAsync(0)
  await c.utils.pull()
  expect(persistence.save).not.toHaveBeenCalled()
  await c.cleanup()
  expect(persistence.save).toHaveBeenCalledTimes(1)
  const [, rows, cursor] = vi.mocked(persistence.save).mock.calls[0]!
  expect((rows as Order[]).map((row) => row.id).sort()).toEqual(['a', 'b'])
  expect(cursor).toBe('c1')
})

test('moved false skips changes, and moved true reads them once', async () => {
  const { feed } = logFeed([order('a', 1)], [changed('b', 1)])
  const moved = vi.fn(async () => false)
  const c = collection({ ...feed, moved }, 'all', { key: 'orders' })
  await tick()
  await c.utils.pull()
  expect(moved).toHaveBeenCalledTimes(1)
  expect(vi.mocked(moved).mock.calls[0]?.slice(0, 2)).toEqual(['all', 'c0'])
  expect(feed.changes).not.toHaveBeenCalled()
  moved.mockResolvedValueOnce(true)
  await c.utils.pull()
  expect(feed.changes).toHaveBeenCalledTimes(1)
  expect(ids(c)).toEqual(['a', 'b'])
})

test('CursorExpired lists again and following goes on from the new cursor', async () => {
  const { feed } = logFeed([order('a', 1)], [changed('b', 1)])
  vi.mocked(feed.changes).mockRejectedValueOnce(new CursorExpired())
  const c = collection(feed, 'all', { key: 'orders' })
  await tick()
  await c.utils.pull()
  expect(feed.list).toHaveBeenCalledTimes(2)
  expect(c.status).toBe('ready')
  expect(c.utils.error()).toBeUndefined()
  await c.utils.pull()
  expect(cursors(feed.changes)).toEqual(['c0', 'c0'])
  expect(ids(c)).toEqual(['a', 'b'])
})

test('a failed pass keeps rows and sets error until the next pass succeeds', async () => {
  const failure = new Error('host down')
  const { feed } = logFeed([order('a', 1)], [changed('b', 1)])
  vi.mocked(feed.changes).mockRejectedValueOnce(failure)
  const c = collection(feed, 'all', { key: 'orders' })
  await tick()
  await c.utils.pull()
  expect(c.status).toBe('error')
  expect(c.utils.error()).toBe(failure)
  expect(ids(c)).toEqual(['a'])
  await c.utils.pull()
  expect(c.status).toBe('ready')
  expect(c.utils.error()).toBeUndefined()
  expect(ids(c)).toEqual(['a', 'b'])
})

test('two fires during a pass run exactly one more pass', async () => {
  const { feed } = logFeed([order('a', 1)])
  const { trigger, fire } = triggerOf()
  const first = deferred<{
    rows: Change<Order>[]
    next_cursor: string
    complete: boolean
  }>()
  vi.mocked(feed.changes).mockImplementationOnce(() => first.promise)
  const c = collection(feed, 'all', { key: 'orders', trigger })
  await tick()
  expect(trigger.subscribe).toHaveBeenCalledWith('orders', expect.any(Function))
  const running = c.utils.pull()
  fire('orders')
  fire('orders')
  expect(feed.changes).toHaveBeenCalledTimes(1)
  first.resolve({ rows: [], next_cursor: 'c0', complete: true })
  await running
  expect(feed.changes).toHaveBeenCalledTimes(2)
  await tick()
  expect(feed.changes).toHaveBeenCalledTimes(2)
})

test('a refill during a pass lists after it and keeps the list cursor', async () => {
  const { feed } = logFeed(
    [order('a', 1)],
    [changed('a', 2), changed('b', 1), changed('c', 1), changed('d', 1)],
  )
  const replay = vi.mocked(feed.changes).getMockImplementation()!
  const second = deferred<{
    rows: Change<Order>[]
    next_cursor: string
    complete: boolean
  }>()
  vi.mocked(feed.changes)
    .mockImplementationOnce(replay)
    .mockImplementationOnce(() => second.promise)
  const c = collection(feed, 'all', { key: 'orders', pageSize: 2 })
  await tick()
  const running = c.utils.pull()
  await tick()
  expect(cursors(feed.changes)).toEqual(['c0', 'c2'])
  vi.mocked(feed.list).mockResolvedValueOnce({
    rows: [order('a', 2), order('z', 1)],
    cursor: 'c9',
  })
  const refilled = c.utils.refill()
  await tick()
  expect(feed.list).toHaveBeenCalledTimes(1)
  second.resolve({
    rows: [changed('c', 1), changed('d', 1)],
    next_cursor: 'c4',
    complete: true,
  })
  await refilled
  await running
  expect(feed.list).toHaveBeenCalledTimes(2)
  expect(ids(c)).toEqual(['a', 'z'])
  await c.utils.pull()
  expect(cursors(feed.changes)).toEqual(['c0', 'c2', 'c9'])
})

test('pollMs runs passes on the interval and stops on cleanup', async () => {
  vi.useFakeTimers()
  const { feed } = logFeed([order('a', 1)])
  const { trigger, unsubscribe } = triggerOf()
  const c = collection(feed, 'all', { key: 'orders', trigger, pollMs: 1000 })
  await vi.advanceTimersByTimeAsync(0)
  expect(feed.changes).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1000)
  expect(feed.changes).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(2000)
  expect(feed.changes).toHaveBeenCalledTimes(3)
  await c.cleanup()
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
  await vi.advanceTimersByTimeAsync(5000)
  expect(feed.changes).toHaveBeenCalledTimes(3)
})

test('the poll defaults to 10000 ms', async () => {
  vi.useFakeTimers()
  const { feed } = logFeed([order('a', 1)])
  const c = collection(feed, 'all', { key: 'orders' })
  await vi.advanceTimersByTimeAsync(9999)
  expect(feed.changes).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(feed.changes).toHaveBeenCalledTimes(1)
  await c.cleanup()
})

test('cleanup aborts the pass in flight and drops its page', async () => {
  const { feed } = logFeed([order('a', 1)])
  const page = deferred<{
    rows: Change<Order>[]
    next_cursor: string
    complete: boolean
  }>()
  vi.mocked(feed.changes).mockImplementationOnce(() => page.promise)
  const c = collection(feed, 'all', { key: 'orders' })
  await tick()
  const events: FollowPass[] = []
  const stop = c.utils.watchFollow((event) => events.push(event))
  const running = c.utils.pull()
  const signal = vi.mocked(feed.changes).mock.calls[0]?.[3] as AbortSignal
  expect(signal.aborted).toBe(false)
  await c.cleanup()
  expect(signal.aborted).toBe(true)
  expect(events).toEqual([
    { type: 'start', id: 1 },
    { type: 'end', id: 1, complete: false },
  ])
  page.resolve({ rows: [changed('b', 1)], next_cursor: 'c1', complete: true })
  await running
  expect(c.has('b')).toBe(false)
  expect(events).toHaveLength(2)
  stop()
})

test('a restart after cleanup fills and follows again, and the old run stays stopped', async () => {
  vi.useFakeTimers()
  const { feed, log } = logFeed([order('a', 1)])
  const { trigger, unsubscribe } = triggerOf()
  const c = collection(feed, 'all', { key: 'orders', trigger, pollMs: 1000 })
  await vi.advanceTimersByTimeAsync(0)
  const events: FollowPass[] = []
  const stop = c.utils.watchFollow((event) => events.push(event))
  await c.utils.pull()
  await c.cleanup()
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  const subscription = c.subscribeChanges(() => {})
  await vi.advanceTimersByTimeAsync(0)
  expect(feed.list).toHaveBeenCalledTimes(2)
  expect(trigger.subscribe).toHaveBeenCalledTimes(2)
  log.push(changed('b', 1))
  await vi.advanceTimersByTimeAsync(1000)
  expect(feed.changes).toHaveBeenCalledTimes(2)
  expect(ids(c)).toEqual(['a', 'b'])
  expect(events).toEqual([
    { type: 'start', id: 1 },
    { type: 'end', id: 1, complete: true },
    { type: 'start', id: 2 },
    { type: 'end', id: 2, complete: true },
  ])
  stop()
  subscription.unsubscribe()
  await c.cleanup()
})
