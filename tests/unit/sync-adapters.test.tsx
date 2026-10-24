import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import {
  Errored,
  For,
  Loading,
  createEffect,
  createRoot,
  flush,
} from 'solid-js'
import { collection, liveList, liveRows, syncStatus } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import type { Change } from '@wfe/sync'
import { deferred, feedOf, order, tick } from './sync-collection.test'

afterEach(cleanup)

type Order = ReturnType<typeof order>
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
