import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { For, Loading, flush, snapshot } from 'solid-js'
import { collection, liveList, liveRows, outbox, recordWrite } from '@wfe/sync'
import type { Change, Feed, Row } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import { source } from '../../packages/sync/src/writer'
import {
  deferred,
  hostOf,
  persistenceOf,
  tick,
  triggerOf,
} from './sync-fixtures'

afterEach(cleanup)

type Item = { id: number; code: number; revision: number; quantity: number }
const item = (id: number, revision = 1, quantity = 1): Item => ({
  id,
  code: id + 100,
  revision,
  quantity,
})

function feedOf<T extends Row>(initial: T[]) {
  const page = deferred<{ rows: T[]; cursor: string }>()
  const feed: Feed<T, string> = {
    list: vi
      .fn(async () => ({ rows: initial, cursor: 'list' }))
      .mockReturnValueOnce(page.promise),
    changes: vi.fn(async () => ({
      rows: [] as Change<T>[],
      next_cursor: 'next',
      complete: true,
    })),
  }
  return { feed, fill: () => page.resolve({ rows: initial, cursor: 'list' }) }
}

test.each([false, true])(
  'integer rows fill, follow, refill, and render with custom key %s',
  async (custom) => {
    const initial = [item(10), item(2), item(1)]
    const { feed, fill } = feedOf(initial)
    const getKey = (row: Item) => (custom ? row.code : row.id)
    const c = collection(feed, 'all', {
      key: 'items:all',
      ...(custom ? { getKey } : {}),
      version: (row) => row.revision,
    })
    const writes = vi.spyOn(source(c).writer(), 'write')
    let rows!: ReturnType<typeof liveRows<Item>>
    let list!: ReturnType<typeof liveList<Item>>
    function View() {
      rows = liveRows(c)
      list = liveList(c)
      return (
        <>
          <div data-map>
            <For each={Object.keys(rows)}>
              {(id) => (
                <span>
                  {rows[id]?.id}:{rows[id]?.quantity};
                </span>
              )}
            </For>
          </div>
          <div data-list>
            <For each={list}>
              {(row) => (
                <span>
                  {row.id}:{row.quantity};
                </span>
              )}
            </For>
          </div>
        </>
      )
    }
    const h = render(() => (
      <Loading fallback="loading">
        <View />
      </Loading>
    ))
    fill()
    await vi.waitFor(() =>
      expect(h.container.querySelector('[data-list]')?.textContent).toBe(
        '1:1;2:1;10:1;',
      ),
    )
    expect(h.container.querySelector('[data-map]')?.textContent).toBe(
      '1:1;2:1;10:1;',
    )
    for (const row of initial) {
      expect(c.get(getKey(row))).toMatchObject(row)
      expect(
        writes.mock.calls.some(
          ([write]) => 'value' in write && write.value === row,
        ),
      ).toBe(true)
      expect(c.get(String(getKey(row)))).toBeUndefined()
      expect(rows[getKey(row)]).toBe(rows[String(getKey(row))])
      expect(snapshot(rows[getKey(row)]!)).toMatchObject(row)
    }
    const survivor = list[2]
    const survivorNode =
      h.container.querySelector('[data-list]')!.lastElementChild
    const update = item(1, 2, 9)
    const inserted = item(3)
    const changes: Change<Item>[] = [
      { id: getKey(update), row_version: 200, deleted: false, data: update },
      { id: getKey(item(2)), row_version: 2, deleted: true },
      { id: getKey(inserted), row_version: 1, deleted: false, data: inserted },
      {
        id: getKey(update),
        row_version: 300,
        deleted: false,
        data: item(1, 1, 99),
      },
    ]
    vi.mocked(feed.changes).mockResolvedValueOnce({
      rows: changes,
      next_cursor: 'changed',
      complete: true,
    })
    await c.utils.pull()
    await vi.waitFor(() =>
      expect(h.container.querySelector('[data-list]')?.textContent).toBe(
        '1:9;3:1;10:1;',
      ),
    )
    expect(h.container.querySelector('[data-map]')?.textContent).toBe(
      '1:9;3:1;10:1;',
    )
    expect(c.get(getKey(update))).toMatchObject(update)
    expect(list[2]).toBe(survivor)
    expect(h.container.querySelector('[data-list]')!.lastElementChild).toBe(
      survivorNode,
    )
    vi.mocked(feed.list).mockResolvedValueOnce({
      rows: [item(1, 3, 7), item(10)],
      cursor: 'refill',
    })
    await c.utils.refill()
    await vi.waitFor(() =>
      expect(h.container.querySelector('[data-list]')?.textContent).toBe(
        '1:7;10:1;',
      ),
    )
    expect(h.container.querySelector('[data-map]')?.textContent).toBe(
      '1:7;10:1;',
    )
    expect(c.has(getKey(inserted))).toBe(false)
    h.unmount()
    await c.cleanup()
  },
)

test('numeric-looking string ids retain lexical collection order and object lookups', async () => {
  const initial = ['2', '10', '1'].map((id) => ({ id, row_version: 1 }))
  const { feed, fill } = feedOf(initial)
  const c = collection(feed, 'all', { key: 'strings:all' })
  let rows!: ReturnType<typeof liveRows<(typeof initial)[number]>>
  const h = render(() => {
    rows = liveRows(c)
    const list = liveList(c)
    return (
      <Loading fallback="loading">
        <For each={list}>{(row) => <span>{row.id};</span>}</For>
      </Loading>
    )
  })
  fill()
  await vi.waitFor(() => expect(h.container.textContent).toBe('1;10;2;'))
  expect(c.toArray.map((row) => row.id)).toEqual(['1', '10', '2'])
  expect(Object.keys(rows)).toEqual(['1', '2', '10'])
  expect(rows[1]).toBe(rows['1'])
  expect(c.get('1')).toMatchObject(initial[2]!)
  expect(c.get(1)).toBeUndefined()
  applyChanges(c, [
    {
      id: '10',
      row_version: 2,
      deleted: false,
      data: { id: '10', row_version: 2 },
    },
  ])
  await tick()
  flush()
  expect(h.container.textContent).toBe('1;10;2;')
  expect(rows['10']?.row_version).toBe(2)
  h.unmount()
  await c.cleanup()
})

test('custom keys govern saved rows, batch versions, deletion, and scope subscriptions', async () => {
  const saved = item(1, 2)
  const persistence = persistenceOf(async () => ({
    rows: [saved],
    cursor: 'saved',
    saved_at: 'now',
  }))
  const { trigger } = triggerOf()
  const { feed, fill } = feedOf([saved])
  const c = collection(feed, 'all', {
    key: 'items:all',
    getKey: (row) => row.code,
    version: (row) => row.revision,
    persistence,
    trigger,
  })
  await tick()
  expect(c.get(101)).toMatchObject(saved)
  expect(c.get(1)).toBeUndefined()
  fill()
  await tick()
  expect(persistence.load).toHaveBeenCalledWith('items:all')
  expect(trigger.subscribe).toHaveBeenCalledWith(
    'items:all',
    expect.any(Function),
  )
  const row = item(1, 4, 8)
  applyChanges(c, [
    { id: 101, row_version: 3, deleted: false, data: item(1, 3, 7) },
    { id: 101, row_version: 1, deleted: true },
    { id: 101, row_version: 4, deleted: false, data: row },
    { id: 101, row_version: 3, deleted: false, data: item(1, 3, 99) },
  ])
  expect(c.get(101)).toMatchObject(row)
  expect(() =>
    applyChanges(c, [
      { id: 101, row_version: 5, deleted: true },
      { id: 1, row_version: 5, deleted: false, data: item(1, 5) },
    ]),
  ).toThrow('Change id must equal the collection key of its data')
  expect(c.get(101)).toMatchObject(row)
  await c.cleanup()
  expect(persistence.save).toHaveBeenCalledWith(
    'items:all',
    [expect.objectContaining(row)],
    'list',
  )
})

test.each([1, '1'])(
  'a change with the wrong key type rejects the batch before writing for %s',
  async (id) => {
    const initial = { id, row_version: 1 }
    const { feed, fill } = feedOf([initial])
    const c = collection(feed, 'all', { key: 'items:all' })
    fill()
    await tick()
    const writer = source(c).writer()
    const begin = vi.spyOn(writer, 'begin')
    const write = vi.spyOn(writer, 'write')
    const wrongId = typeof id === 'number' ? String(id) : Number(id)
    expect(() =>
      applyChanges(c, [
        { id, row_version: 2, deleted: true },
        {
          id: wrongId,
          row_version: 2,
          deleted: false,
          data: { id, row_version: 2 },
        },
      ]),
    ).toThrow('Change id must equal the collection key of its data')
    expect(begin).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(c.get(id)).toMatchObject(initial)
    expect(c.get(wrongId)).toBeUndefined()
    await c.cleanup()
  },
)

test('a restored integer-key write uses its persisted custom key', async () => {
  const database = 'key-restored'
  const host = hostOf<number>()
  const first = outbox({ database, send: host.send, probe: async () => false })
  const expected = item(1, 1, 8)
  await first.enqueue(
    {
      operation: 'items.update',
      request: {},
      request_hash: 'restored',
      expect: { model: 'items', id: expected.code },
      append_only: false,
    },
    expected,
  )
  first.close()
  const { feed, fill } = feedOf([item(1)])
  const c = collection(feed, 'all', {
    key: 'items:all',
    getKey: (row) => row.code,
    version: (row) => row.revision,
  })
  fill()
  await tick()
  const o = outbox({ database, send: host.send, probe: async () => false })
  const h = render(() => {
    const record = recordWrite(c, o, { model: 'items' })
    return (
      <Loading fallback="loading">
        <span>{record.rows[101]?.quantity}</span>
      </Loading>
    )
  })
  await vi.waitFor(() => expect(h.container.textContent).toBe('8'))
  const entry = o.entries()[0]!
  expect(entry.expect.id).toBe(101)
  expect(entry.expected).toEqual(expected)
  await o.discard(entry.seq)
  await vi.waitFor(() => expect(h.container.textContent).toBe('1'))
  h.unmount()
  o.close()
  await c.cleanup()
})

test.each([false, true])(
  'recordWrite persists integer ids and confirms custom key %s',
  async (custom) => {
    const { feed, fill } = feedOf([item(1)])
    const getKey = (row: Item) => (custom ? row.code : row.id)
    const c = collection(feed, 'all', {
      key: 'items:all',
      ...(custom ? { getKey } : {}),
      version: (row) => row.revision,
    })
    fill()
    await tick()
    const host = hostOf<number>()
    const database = `key-write-${custom}`
    const o = outbox({ database, send: host.send, probe: async () => true })
    let record!: ReturnType<typeof recordWrite<Item, number>>
    const h = render(() => {
      record = recordWrite(c, o)
      return (
        <Loading fallback="loading">
          <span>{record.rows[getKey(item(1))]?.quantity}</span>
        </Loading>
      )
    })
    await vi.waitFor(() => expect(h.container.textContent).toBe('1'))
    const expected = item(1, 1, 9)
    let done = false
    const write = record
      .write(
        {
          operation: 'items.update',
          request: {},
          request_hash: 'integer',
          expect: { model: 'items', id: getKey(expected) },
          append_only: false,
        },
        expected,
      )
      .then(() => {
        done = true
      })
    flush()
    expect(h.container.textContent).toBe('9')
    await vi.waitFor(() => expect(host.sent).toEqual(['integer']))
    expect(o.entries()[0]?.expect.id).toBe(getKey(expected))
    expect(o.entries()[0]?.expected).toEqual(expected)
    host.answer('integer')
    await vi.waitFor(() => expect(o.entries()).toEqual([]))
    expect(done).toBe(false)
    vi.mocked(feed.changes).mockResolvedValueOnce({
      rows: [
        {
          id: getKey(expected),
          row_version: 2,
          deleted: false,
          data: item(1, 2, 9),
        },
      ],
      next_cursor: 'confirmed',
      complete: true,
    })
    await c.utils.pull()
    await vi.waitFor(() => expect(done).toBe(true))
    await write
    expect(record.rows[getKey(expected)]?.revision).toBe(2)
    expect(h.container.textContent).toBe('9')
    h.unmount()
    o.close()
    await c.cleanup()
  },
)
