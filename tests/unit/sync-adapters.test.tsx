import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import {
  Errored,
  For,
  Loading,
  createEffect,
  createRoot,
  flush,
} from 'solid-js'
import { createCollection, createLiveQueryCollection, sum } from '@tanstack/db'
import {
  collection,
  liveList,
  liveRows,
  syncComplete,
  syncCurrentAt,
  syncStatus,
} from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import type { Change } from '@wfe/sync'
import { deferred, feedOf, order, tick } from './sync-fixtures'
import type { Order } from './sync-fixtures'
import { peek } from '../../packages/sync/src/writer'

afterEach(cleanup)

const update = (
  id: string,
  row_version: number,
  quantity: number,
): Change<Order> => ({
  id,
  row_version,
  deleted: false,
  data: order(id, row_version, quantity),
})
const deleted = (id: string, row_version: number): Change<Order> => ({
  id,
  row_version,
  deleted: true,
})
async function filled(rows: Order[]) {
  const c = collection(feedOf([rows]), 'all', { key: 'orders:all' })
  await tick()
  return c
}

test('liveRows lands a mixed batch as one write and keeps untouched row identity', async () => {
  const c = await filled([order('a', 1), order('b', 1), order('c', 1)])
  const counter = { applied: 0 }
  const { rows, dispose } = createRoot((dispose) => {
    const rows = liveRows(c)
    createEffect(
      () => [
        rows.a?.quantity,
        rows.b?.quantity,
        rows.c?.quantity,
        rows.d?.quantity,
      ],
      () => {
        counter.applied++
      },
    )
    return { rows, dispose }
  })
  flush()
  expect(Object.keys(rows).sort()).toEqual(['a', 'b', 'c'])
  expect(counter.applied).toBe(1)
  const untouched = rows.b
  applyChanges(c, [update('a', 2, 5), deleted('c', 2), update('d', 1, 4)])
  flush()
  expect(Object.keys(rows).sort()).toEqual(['a', 'b', 'd'])
  expect(rows.a?.quantity).toBe(5)
  expect(rows.d?.quantity).toBe(4)
  expect(rows.b).toBe(untouched)
  expect(counter.applied).toBe(2)
  dispose()
  applyChanges(c, [update('e', 1, 1)])
  flush()
  expect(Object.keys(rows).sort()).toEqual(['a', 'b', 'd'])
})

test('liveRows is complete at return for a filled collection', async () => {
  const c = await filled([order('a', 1), order('b', 1)])
  createRoot((dispose) => {
    const rows = liveRows(c)
    flush()
    expect(Object.keys(rows)).toEqual(['a', 'b'])
    expect(rows.a?.row_version).toBe(1)
    dispose()
  })
})

test('liveList reconciles by id when the key order shifts and keeps surviving identity', async () => {
  const c = await filled([order('b', 1), order('c', 1), order('d', 1)])
  const { list, dispose } = createRoot((dispose) => ({
    list: liveList(c),
    dispose,
  }))
  flush()
  expect(list.map((row) => row.id)).toEqual(['b', 'c', 'd'])
  const b = list[0]
  const d = list[2]
  applyChanges(c, [update('a', 1, 9), update('c', 2, 3)])
  await tick()
  flush()
  expect(c.toArray.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])
  expect(list.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd'])
  expect(new Set(list.map((row) => row.id)).size).toBe(4)
  expect(list[1]).toBe(b)
  expect(list[3]).toBe(d)
  expect(list[2]).toMatchObject({ id: 'c', row_version: 2, quantity: 3 })
  applyChanges(c, [deleted('b', 2)])
  await tick()
  flush()
  expect(list.map((row) => row.id)).toEqual(['a', 'c', 'd'])
  expect(list[2]).toBe(d)
  dispose()
})

test('liveList shows Loading until the first fill and Errored on a failed fill', async () => {
  const page = deferred<Order[]>()
  const feed = feedOf([])
  ;(
    feed.list as unknown as {
      mockImplementationOnce: (
        fn: () => Promise<{ rows: Order[]; cursor: string }>,
      ) => void
    }
  ).mockImplementationOnce(async () => ({
    rows: await page.promise,
    cursor: 'end',
  }))
  const c = collection(feed, 'all', { key: 'orders:all' })
  function List(props: { source: typeof c }) {
    const list = liveList(props.source)
    return (
      <ul>
        <For each={list}>{(row) => <li>{row.name}</li>}</For>
      </ul>
    )
  }
  const h = render(() => (
    <Loading fallback={<p>loading</p>}>
      <List source={c} />
    </Loading>
  ))
  flush()
  expect(h.container.textContent).toBe('loading')
  page.resolve([order('a', 1), order('b', 1)])
  await tick()
  flush()
  expect(h.container.querySelectorAll('li')).toHaveLength(2)
  expect(h.container.textContent).toBe('Order aOrder b')

  const failing = collection(feedOf([new Error('offline')]), 'all', {
    key: 'orders:all',
  })
  const failed = render(() => (
    <Errored fallback={(error) => <p>failed: {String(error())}</p>}>
      <Loading fallback={<p>loading</p>}>
        <List source={failing} />
      </Loading>
    </Errored>
  ))
  flush()
  expect(failed.container.textContent).toBe('loading')
  await tick()
  flush()
  expect(failed.container.textContent).toBe('failed: Error: offline')
})

test('syncStatus follows loading, ready, and error', async () => {
  const failure = new Error('timeout')
  const c = collection(
    feedOf([[order('a', 1)], failure, [order('a', 1)]]),
    'all',
    { key: 'orders:all' },
  )
  await createRoot(async (dispose) => {
    const status = syncStatus(c)
    flush()
    expect(status()).toBe('loading')
    await tick()
    flush()
    expect(status()).toBe('ready')
    await c.utils.refill()
    flush()
    expect(status()).toBe('error')
    expect(c.utils.error()).toBe(failure)
    await c.utils.refill()
    flush()
    expect(status()).toBe('ready')
    dispose()
  })
})

test('syncComplete reacts to successful lists and unsubscribes on disposal', async () => {
  const c = collection(
    feedOf([
      { rows: [], cursor: 'partial', complete: false },
      new Error('offline'),
      { rows: [], cursor: 'full', complete: true },
      { rows: [], cursor: 'partial', complete: false },
      [],
      { rows: [], cursor: 'partial', complete: false },
    ]),
    'all',
    { key: 'orders:all' },
  )
  const seen: boolean[] = []
  const { complete, dispose } = createRoot((dispose) => {
    const complete = syncComplete(c)
    createEffect(complete, (value) => {
      seen.push(value)
    })
    return { complete, dispose }
  })
  try {
    flush()
    expect(complete()).toBe(true)
    await tick()
    flush()
    expect(complete()).toBe(false)
    await c.utils.refill()
    flush()
    expect(seen).toEqual([true, false])
    for (const expected of [true, false, true]) {
      await c.utils.refill()
      flush()
      expect(complete()).toBe(expected)
    }
    expect(seen).toEqual([true, false, true, false, true])
    dispose()
    await c.utils.refill()
    flush()
    expect(seen).toEqual([true, false, true, false, true])
  } finally {
    dispose()
    await c.cleanup()
  }
})

test('syncCurrentAt follows successful reads and keeps its value after failures', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  const failure = new Error('offline')
  const feed = feedOf([failure, [], failure, []])
  const c = collection(feed, 'all', { key: 'orders:all' })
  const seen: (string | undefined)[] = []
  const { currentAt, dispose } = createRoot((dispose) => {
    const currentAt = syncCurrentAt(c)
    createEffect(currentAt, (value) => {
      seen.push(value)
    })
    return { currentAt, dispose }
  })
  const expectAt = (expected: string | undefined) => {
    flush()
    expect(currentAt()).toBe(expected)
    expect(currentAt()).toBe(c.utils.currentAt())
  }
  try {
    expectAt(undefined)
    await tick()
    expectAt(undefined)
    const listedAt = '2026-10-25T00:00:00.000Z'
    vi.setSystemTime(new Date(listedAt))
    await c.utils.refill()
    expectAt(listedAt)

    // No rows, status changes, or timers can trigger this observer.
    const followedAt = '2026-10-25T00:00:01.000Z'
    vi.setSystemTime(new Date(followedAt))
    await c.utils.pull()
    expectAt(followedAt)
    expect(c.status).toBe('ready')
    expect(c.toArray).toEqual([])
    expect(seen).toEqual([undefined, listedAt, followedAt])

    vi.setSystemTime(new Date('2026-10-25T00:00:02.000Z'))
    vi.mocked(feed.changes).mockRejectedValueOnce(failure)
    await c.utils.pull()
    expectAt(followedAt)
    expect(c.utils.error()).toBe(failure)
    await c.utils.refill()
    expectAt(followedAt)
    expect(c.utils.error()).toBe(failure)
    expect(seen).toEqual([undefined, listedAt, followedAt])

    const refilledAt = '2026-10-25T00:00:03.000Z'
    vi.setSystemTime(new Date(refilledAt))
    await c.utils.refill()
    expectAt(refilledAt)
    expect(seen).toEqual([undefined, listedAt, followedAt, refilledAt])
  } finally {
    dispose()
    await c.cleanup()
    vi.useRealTimers()
  }
})

test('syncCurrentAt unsubscribes from the source on disposal', async () => {
  const c = await filled([])
  const signal = peek(c)!.currentAt
  const subscribe = signal.subscribe
  const unsubscribe = vi.fn()
  const subscription = vi
    .spyOn(signal, 'subscribe')
    .mockImplementation((next) => {
      const stop = subscribe(next)
      return () => {
        unsubscribe()
        stop()
      }
    })
  const { currentAt, dispose } = createRoot((dispose) => ({
    currentAt: syncCurrentAt(c),
    dispose,
  }))
  try {
    flush()
    expect(currentAt()).toBe(c.utils.currentAt())
    expect(subscription).toHaveBeenCalledTimes(1)
    expect(unsubscribe).not.toHaveBeenCalled()
    dispose()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  } finally {
    dispose()
    subscription.mockRestore()
    await c.cleanup()
  }
})

test('syncCurrentAt returns undefined for a plain collection', async () => {
  const c = createCollection<{ id: string }, string>({
    getKey: (row) => row.id,
    sync: { sync: ({ markReady }) => markReady() },
  })
  const { currentAt, dispose } = createRoot((dispose) => ({
    currentAt: syncCurrentAt(c),
    dispose,
  }))
  try {
    await c.preload()
    flush()
    expect(c.status).toBe('ready')
    expect(currentAt()).toBeUndefined()
  } finally {
    dispose()
    await c.cleanup()
  }
})

test('read adapters read a grouped live query with no cast', async () => {
  const region = (id: string, name: string, quantity: number): Order => ({
    ...order(id, 1, quantity),
    name,
  })
  const c = await filled([
    region('a', 'North', 2),
    region('b', 'North', 3),
    region('c', 'South', 4),
  ])
  const totals = createLiveQueryCollection((q) =>
    q
      .from({ o: c })
      .groupBy(({ o }) => o.name)
      .select(({ o }) => ({ name: o.name, total: sum(o.quantity) })),
  )
  const { rows, list, status, complete, dispose } = createRoot((dispose) => ({
    rows: liveRows(totals),
    list: liveList(totals),
    status: syncStatus(totals),
    complete: syncComplete(totals),
    dispose,
  }))
  await totals.preload()
  await tick()
  flush()
  const byName = () =>
    Object.fromEntries(Object.values(rows).map((row) => [row.name, row.total]))
  expect(status()).toBe('ready')
  expect(complete()).toBe(true)
  expect(byName()).toEqual({ North: 5, South: 4 })
  expect(Object.keys(rows).sort()).toEqual(
    [...totals.keys()].map(String).sort(),
  )
  const north = list.find((row) => row.name === 'North')
  applyChanges(c, [
    {
      id: 'c',
      row_version: 2,
      deleted: false,
      data: { ...region('c', 'South', 10), row_version: 2 },
    },
    {
      id: 'd',
      row_version: 1,
      deleted: false,
      data: region('d', 'East', 1),
    },
  ])
  await tick()
  flush()
  expect(byName()).toEqual({ North: 5, South: 10, East: 1 })
  expect(list.map((row) => row.name).sort()).toEqual(['East', 'North', 'South'])
  // The untouched group keeps its node in the projection.
  expect(list.find((row) => row.name === 'North')).toBe(north)
  dispose()
})

test('syncStatus and liveRows over a live query whose source is still loading', async () => {
  const page = deferred<Order[]>()
  const feed = feedOf([])
  vi.mocked(feed.list).mockImplementationOnce(async () => ({
    rows: await page.promise,
    cursor: 'end',
  }))
  const c = collection(feed, 'all', { key: 'orders:all' })
  const totals = createLiveQueryCollection((q) =>
    q
      .from({ o: c })
      .groupBy(({ o }) => o.name)
      .select(({ o }) => ({ name: o.name, total: sum(o.quantity) })),
  )
  const { rows, status, dispose } = createRoot((dispose) => ({
    rows: liveRows(totals),
    status: syncStatus(totals),
    dispose,
  }))
  flush()
  expect(status()).toBe('loading')
  expect(Object.keys(rows)).toEqual([])
  page.resolve([order('a', 1, 2), order('b', 1, 3)])
  await tick()
  await tick()
  flush()
  expect(status()).toBe('ready')
  expect(Object.values(rows).map((row) => row.total)).toEqual([2, 3])
  dispose()
})
