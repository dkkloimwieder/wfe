import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { For, Loading, createRoot, flush, snapshot } from 'solid-js'
import {
  CursorExpired,
  OutboxDiscarded,
  OutboxRefused,
  collection,
  outbox,
  recordWrite,
} from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import {
  call,
  changed,
  deferred,
  feedOf,
  hostOf,
  order,
  persistenceOf,
  refused,
  tick,
} from './sync-fixtures'
import type { Order } from './sync-fixtures'
import type { Change, Feed } from '@wfe/sync'

afterEach(cleanup)

let count = 0
const name = () => `record-test-${++count}`

/** A filled collection, an outbox, and a rendered list over recordWrite. */
async function mounted(up = true, model?: string) {
  const feed = feedOf([[order('a', 1), order('b', 1)]])
  const c = collection(feed, 'all', {
    key: 'orders:all',
  })
  await tick()
  const host = hostOf()
  const net = { up }
  const probe = vi.fn(async () => net.up)
  const database = name()
  const o = outbox({ database, send: host.send, probe })
  const view = mountedRecord(c, o, model)
  await tick()
  flush()
  return { c, o, host, net, database, probe, feed, ...view }
}

function mountedRecord(
  c: ReturnType<typeof collection<Order, string>>,
  o: ReturnType<typeof outbox>,
  model?: string,
) {
  let record!: ReturnType<typeof recordWrite<Order>>
  const h = render(() => {
    record =
      model === undefined ? recordWrite(c, o) : recordWrite(c, o, { model })
    return (
      <ul>
        <For each={Object.keys(record.rows)}>
          {(id) => (
            <li data-id={id}>
              {id}:{record.rows[id]?.quantity}
            </li>
          )}
        </For>
      </ul>
    )
  })
  const item = (id: string) => h.container.querySelector(`[data-id="${id}"]`)
  return { record, item, dispose: h.unmount }
}

/** Settle a promise into a readable state without awaiting it. */
function track<T>(promise: Promise<T>) {
  const state: { done: boolean; error?: unknown } = { done: false }
  promise.then(
    () => (state.done = true),
    (error: unknown) => {
      state.done = true
      state.error = error
    },
  )
  return state
}

/** Supply authoritative changes through one complete follow pass. */
async function follow(
  c: ReturnType<typeof collection<Order, string>>,
  feed: Feed<Order, string>,
  rows: Change<Order>[] = [],
) {
  vi.mocked(feed.changes).mockResolvedValueOnce({
    rows,
    next_cursor: 'followed',
    complete: true,
  })
  await c.utils.pull()
}

test('a joined write confirms after a later complete pass without comparing the expected version', async () => {
  const { c, o, host, record, item, feed } = await mounted()
  expect(item('a')?.textContent).toBe('a:1')
  const write = track(
    record.write(
      { ...call('line-a', 'h1'), operation: 'receiptLines.update' },
      { id: 'a', row_version: 999, quantity: 9 },
    ),
  )
  flush()
  expect(item('a')?.textContent).toBe('a:9')
  await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
  host.answer('h1')
  await vi.waitFor(() => expect(o.entries()).toEqual([]))
  expect(write.done).toBe(false)
  applyChanges(c, [changed('a', 2, 9)])
  await tick()
  expect(write.done).toBe(false)
  await follow(c, feed)
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
  flush()
  expect(item('a')?.textContent).toBe('a:9')
  expect(record.rows.a?.row_version).toBe(2)
})

test.each([false, true])(
  'a pass running at the reply does not confirm, including an adapter mounted during that pass: %s',
  async (mountDuringPass) => {
    const setup = await mounted()
    const { c, o, host, feed } = setup
    const first = deferred<Awaited<ReturnType<typeof feed.changes>>>()
    const last = deferred<Awaited<ReturnType<typeof feed.changes>>>()
    vi.mocked(feed.changes)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(last.promise)
    const pull = c.utils.pull()
    expect(feed.changes).toHaveBeenCalledTimes(1)
    const view = mountDuringPass ? mountedRecord(c, o) : setup
    await tick()
    flush()
    const write = track(
      view.record.write(call('line-a', 'joined'), { id: 'a', quantity: 9 }),
    )
    await vi.waitFor(() => expect(host.sent).toEqual(['joined']))
    host.answer('joined')
    await vi.waitFor(() => expect(o.entries()).toEqual([]))
    first.resolve({
      rows: [changed('a', 2, 8)],
      next_cursor: 'page-1',
      complete: false,
    })
    await vi.waitFor(() => expect(feed.changes).toHaveBeenCalledTimes(2))
    expect(write.done).toBe(false)
    last.resolve({ rows: [], next_cursor: 'page-2', complete: true })
    await pull
    await tick()
    expect(write.done).toBe(false)
    expect(view.record.rows.a?.quantity).toBe(9)
    await follow(c, feed)
    await vi.waitFor(() => expect(write.done).toBe(true))
    expect(write.error).toBeUndefined()
    expect(view.record.rows.a?.quantity).toBe(8)
    o.close()
  },
)

test('a later pass waits for its final complete page', async () => {
  const { c, o, host, record, feed } = await mounted()
  const write = track(
    record.write(call('a', 'paged'), { id: 'a', quantity: 9 }),
  )
  await vi.waitFor(() => expect(host.sent).toEqual(['paged']))
  host.answer('paged')
  await vi.waitFor(() => expect(o.entries()).toEqual([]))
  const last = deferred<Awaited<ReturnType<typeof feed.changes>>>()
  vi.mocked(feed.changes)
    .mockResolvedValueOnce({
      rows: [changed('a', 2, 8)],
      next_cursor: 'partial',
      complete: false,
    })
    .mockReturnValueOnce(last.promise)
  const pull = c.utils.pull()
  await vi.waitFor(() => expect(feed.changes).toHaveBeenCalledTimes(2))
  await tick()
  expect(write.done).toBe(false)
  expect(record.rows.a?.quantity).toBe(9)
  last.resolve({ rows: [], next_cursor: 'complete', complete: true })
  await pull
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(record.rows.a?.quantity).toBe(8)
  o.close()
})

test.each(['failed', 'expired', 'unmoved'] as const)(
  'a pass that ends %s without complete does not confirm a write',
  async (ending) => {
    const { c, o, host, record, feed } = await mounted()
    const write = track(record.write(call('a', 'h1'), { id: 'a', quantity: 9 }))
    await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
    host.answer('h1')
    await vi.waitFor(() => expect(o.entries()).toEqual([]))
    if (ending === 'unmoved') feed.moved = async () => false
    else {
      vi.mocked(feed.changes)
        .mockResolvedValueOnce({
          rows: [changed('a', 2, 8)],
          next_cursor: 'partial',
          complete: false,
        })
        .mockRejectedValueOnce(
          ending === 'expired' ? new CursorExpired() : new Error('offline'),
        )
    }
    await c.utils.pull()
    // A successful refill cannot substitute for a complete changes pass.
    await c.utils.refill()
    await tick()
    expect(write.done).toBe(false)
    expect(record.rows.a?.quantity).toBe(9)
    delete feed.moved
    await follow(c, feed, [changed('a', 3, 8)])
    await vi.waitFor(() => expect(write.done).toBe(true))
    expect(write.error).toBeUndefined()
    expect(record.rows.a?.quantity).toBe(8)
    o.close()
  },
)

test('a pass after the reply can complete before durable outbox removal', async () => {
  const { c, o, host, record, feed } = await mounted()
  const write = track(record.write(call('a', 'fast'), { id: 'a', quantity: 9 }))
  let pull: Promise<void> | undefined
  const stop = o.watchSent(() => {
    expect(o.entries()[0]?.state).toBe('sending')
    pull = follow(c, feed, [changed('a', 2, 8)])
  })
  await vi.waitFor(() => expect(host.sent).toEqual(['fast']))
  host.answer('fast')
  await vi.waitFor(() => expect(write.done).toBe(true))
  await pull
  expect(write.error).toBeUndefined()
  expect(record.rows.a?.quantity).toBe(8)
  stop()
  o.close()
})

test('a refusal rejects the write with OutboxRefused and the guess reverts', async () => {
  const { o, host, record, item } = await mounted()
  const write = track(
    record.write(call('a', 'h1'), { id: 'a', row_version: 1, quantity: 9 }),
  )
  flush()
  expect(item('a')?.textContent).toBe('a:9')
  await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
  host.answer('h1', refused)
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeInstanceOf(OutboxRefused)
  const error = write.error as OutboxRefused
  expect(error).toBeInstanceOf(Error)
  expect([error.code, error.text, error.message]).toEqual([
    'stale',
    'Stale',
    'Stale',
  ])
  expect(error.seq).toBe(o.entries()[0]!.seq)
  flush()
  expect(item('a')?.textContent).toBe('a:1')
})

test('a discard rejects the write with OutboxDiscarded and the seq', async () => {
  const { o, record, item } = await mounted(false)
  const write = track(
    record.write(call('a', 'h1'), { id: 'a', row_version: 1, quantity: 9 }),
  )
  await vi.waitFor(() => expect(o.entries()).toHaveLength(1))
  const seq = o.entries()[0]!.seq
  await o.discard(seq)
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeInstanceOf(OutboxDiscarded)
  expect((write.error as OutboxDiscarded).seq).toBe(seq)
  flush()
  expect(item('a')?.textContent).toBe('a:1')
})

test('two overlapping writes keep both guesses, and neither row remounts', async () => {
  const { c, o, host, record, item, feed } = await mounted()
  const a = item('a')
  const b = item('b')
  const first = track(
    record.write(call('a', 'h1'), { id: 'a', row_version: 1, quantity: 7 }),
  )
  const second = track(
    record.write(call('b', 'h2'), { id: 'b', row_version: 1, quantity: 8 }),
  )
  flush()
  expect(item('a')?.textContent).toBe('a:7')
  expect(item('b')?.textContent).toBe('b:8')
  await vi.waitFor(() => expect(host.sent).toEqual(['h1', 'h2']))
  host.answer('h1')
  host.answer('h2')
  applyChanges(c, [changed('a', 2, 7)])
  await tick()
  flush()
  expect(item('a')?.textContent).toBe('a:7')
  expect(item('b')?.textContent).toBe('b:8')
  applyChanges(c, [changed('b', 2, 8)])
  await vi.waitFor(() => expect(o.entries()).toEqual([]))
  expect(first.done || second.done).toBe(false)
  await follow(c, feed)
  await vi.waitFor(() => expect(first.done && second.done).toBe(true))
  expect(first.error).toBeUndefined()
  expect(second.error).toBeUndefined()
  flush()
  expect(item('a')?.textContent).toBe('a:7')
  expect(item('b')?.textContent).toBe('b:8')
  expect(item('a')).toBe(a)
  expect(item('b')).toBe(b)
})

test('offline, the write stays tentative until replay and a later complete pass', async () => {
  const { c, o, host, net, record, item, feed } = await mounted(false)
  const write = track(
    record.write(call('a', 'h1'), { id: 'a', row_version: 1, quantity: 9 }),
  )
  await vi.waitFor(() => expect(o.entries()).toHaveLength(1))
  await tick()
  flush()
  expect(o.entries()[0]?.state).toBe('pending')
  expect(host.sent).toEqual([])
  expect(item('a')?.textContent).toBe('a:9')
  expect(write.done).toBe(false)
  net.up = true
  window.dispatchEvent(new Event('online'))
  await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
  host.answer('h1')
  await vi.waitFor(() => expect(o.entries()).toEqual([]))
  expect(write.done).toBe(false)
  expect(item('a')?.textContent).toBe('a:9')
  await follow(c, feed, [changed('a', 2, 9)])
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
  expect(o.entries()).toEqual([])
})

test.each([undefined, 1])(
  'an offline update with expected version %s ignores a complete pass before replay',
  async (version) => {
    const { c, o, host, net, record, item, feed } = await mounted(false)
    const write = track(
      record.write(call('a', 'h1'), {
        id: 'a',
        row_version: version,
        quantity: 9,
      }),
    )
    await vi.waitFor(() => expect(o.entries()).toHaveLength(1))
    await tick()
    flush()
    expect(o.entries()[0]?.state).toBe('pending')
    expect(host.sent).toEqual([])
    expect(c.get('a')?.quantity).toBe(1)
    expect(record.rows.a?.quantity).toBe(9)
    expect(item('a')?.textContent).toBe('a:9')
    expect(write.done).toBe(false)

    await follow(c, feed, [changed('a', 2, 9)])
    await tick()
    flush()
    expect(c.get('a')?.row_version).toBe(2)
    expect(write.done).toBe(false)
    expect(item('a')?.textContent).toBe('a:9')

    net.up = true
    const replay = o.replay()
    await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
    expect(o.entries()[0]?.state).toBe('sending')
    expect(write.done).toBe(false)
    expect(item('a')?.textContent).toBe('a:9')
    host.answer('h1')
    await replay
    expect(o.entries()).toEqual([])
    expect(write.done).toBe(false)
    await follow(c, feed)
    await vi.waitFor(() => expect(write.done).toBe(true))
    expect(write.error).toBeUndefined()
    flush()
    expect(record.rows.a?.row_version).toBe(2)
    expect(item('a')?.textContent).toBe('a:9')
    o.close()
  },
)

test('a complete pass can confirm without the expected row in the collection', async () => {
  const { c, o, host, record, feed } = await mounted()
  const write = track(
    record.write(call('a', 'delete'), { id: 'a', quantity: 9 }),
  )
  await vi.waitFor(() => expect(host.sent).toEqual(['delete']))
  host.answer('delete')
  await vi.waitFor(() => expect(o.entries()).toEqual([]))
  await follow(c, feed, [{ id: 'a', row_version: 2, deleted: true }])
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
  expect(c.has('a')).toBe(false)
  expect(record.rows.a).toBeUndefined()
})

/** Reopen the same database and mount before IndexedDB loads its entries. */
function reload(
  previous: Awaited<ReturnType<typeof mounted>>,
  model = 'orders',
) {
  previous.o.close()
  previous.dispose()
  const o = outbox({
    database: previous.database,
    send: previous.host.send,
    probe: previous.probe,
  })
  expect(o.entries()).toEqual([])
  return { o, ...mountedRecord(previous.c, o, model) }
}

test('an offline write restores before network activity and clears after the send and feed', async () => {
  const first = await mounted(false)
  track(
    first.record.write(call('a', 'h1'), {
      id: 'a',
      row_version: 1,
      quantity: 9,
    }),
  )
  await vi.waitFor(() => expect(first.o.entries()).toHaveLength(1))
  const next = reload(first)
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:9'))
  expect(first.host.sent).toEqual([])
  expect(first.c.get('a')?.quantity).toBe(1)
  expect(next.o.entries()[0]?.state).toBe('pending')
  first.net.up = true
  const replay = next.o.replay()
  await vi.waitFor(() => expect(first.host.sent).toEqual(['h1']))
  first.host.answer('h1')
  await replay
  expect(next.item('a')?.textContent).toBe('a:9')
  // A different server value proves that the tentative overlay clears.
  await follow(first.c, first.feed, [changed('a', 2, 8)])
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:8'))
  expect(snapshot(next.record.rows)).toEqual(
    Object.fromEntries(first.c.entries()),
  )
  next.o.close()
})

test('an offline reopen renders saved rows while a restored action waits for replay and the feed', async () => {
  const database = name()
  const host = hostOf()
  let online = false
  const probe = async () => online
  const previous = outbox({ database, send: host.send, probe })
  const entry = await previous.enqueue(call('a', 'reopen'), {
    id: 'a',
    row_version: 1,
    quantity: 9,
  })
  await previous.replay()
  previous.close()

  const saved = {
    rows: [order('a', 1), order('b', 1), order('c', 1)],
    cursor: 'saved',
    saved_at: '2026-10-24T00:00:00.000Z',
  }
  const load = deferred<typeof saved>()
  const persistence = persistenceOf(() => load.promise)
  const offline = new Error('offline')
  const feed = feedOf([offline])
  vi.mocked(feed.changes).mockRejectedValue(offline)
  const c = collection(feed, 'all', { key: 'orders:all', persistence })
  const o = outbox({ database, send: host.send, probe })
  let record!: ReturnType<typeof recordWrite<Order>>
  const view = render(() => {
    record = recordWrite(c, o, { model: 'orders' })
    return (
      <Loading fallback={<p>Loading saved rows</p>}>
        <ul>
          <For each={Object.keys(record.rows)}>
            {(id) => (
              <li>
                {id}:{record.rows[id]?.quantity}
              </li>
            )}
          </For>
        </ul>
      </Loading>
    )
  })
  const rendered = () =>
    Array.from(view.container.querySelectorAll('li'), (li) => li.textContent)
  try {
    // The outbox can load before the independent collection persistence.
    await vi.waitFor(() => expect(o.entries()).toHaveLength(1))
    await tick()
    flush()
    load.resolve(saved)
    await vi.waitFor(() => expect(c.status).toBe('ready'))
    expect(c.toArray).toMatchObject(saved.rows)
    await vi.waitFor(() => expect(rendered()).toEqual(['a:9', 'b:1', 'c:1']))
    await o.replay()
    await tick()
    flush()
    expect(host.sent).toEqual([])
    expect(o.entries()[0]).toMatchObject({ seq: entry.seq, state: 'pending' })
    // Optimistic values revert when their action settles. This one stays open.
    expect(record.rows.a?.quantity).toBe(9)
    expect(c.get('a')?.quantity).toBe(1)

    online = true
    vi.mocked(feed.changes).mockResolvedValue({
      rows: [changed('a', 2, 8)],
      next_cursor: 'confirmed',
      complete: true,
    })
    const replay = o.replay()
    await vi.waitFor(() => expect(host.sent).toEqual(['reopen']))
    host.answer('reopen')
    await replay
    expect(o.entries()).toEqual([])
    expect(record.rows.a?.quantity).toBe(9)
    await c.utils.pull()
    // A different authoritative value proves that confirmation clears the overlay.
    await vi.waitFor(() => expect(rendered()).toEqual(['a:8', 'b:1', 'c:1']))
    expect(snapshot(record.rows)).toEqual(Object.fromEntries(c.entries()))
  } finally {
    for (const pending of o.entries()) await o.discard(pending.seq)
    o.close()
    view.unmount()
    await c.cleanup()
  }
})

test.each(['discard', 'resubmit'] as const)(
  'a refused entry restores its expected row and supports %s',
  async (finish) => {
    const first = await mounted()
    const write = track(
      first.record.write(call('a', 'h1'), {
        id: 'a',
        row_version: 1,
        quantity: 9,
      }),
    )
    await vi.waitFor(() => expect(first.host.sent).toEqual(['h1']))
    first.host.answer('h1', refused)
    await vi.waitFor(() => expect(write.error).toBeInstanceOf(OutboxRefused))
    const next = reload(first)
    await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:9'))
    expect(next.o.entries()[0]).toMatchObject({
      state: 'refused',
      refusal: { code: 'stale', text: 'Stale' },
    })
    const seq = next.o.entries()[0]!.seq
    if (finish === 'discard') {
      await next.o.discard(seq)
      await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:1'))
    } else {
      await next.o.resubmit(seq)
      await vi.waitFor(() => expect(first.host.sent).toEqual(['h1', 'h1']))
      expect(next.item('a')?.textContent).toBe('a:9')
      first.host.answer('h1')
      await vi.waitFor(() => expect(next.o.entries()).toEqual([]))
      await follow(first.c, first.feed, [changed('a', 2, 8)])
      await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:8'))
    }
    expect(next.o.entries()).toEqual([])
    expect(snapshot(next.record.rows)).toEqual(
      Object.fromEntries(first.c.entries()),
    )
    next.o.close()
  },
)

test('a restored pending entry keeps its row when refused, then discard reverts it', async () => {
  const first = await mounted(false)
  track(first.record.write(call('a', 'h1'), { id: 'a', quantity: 9 }))
  await vi.waitFor(() => expect(first.o.entries()).toHaveLength(1))
  const next = reload(first)
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:9'))
  first.net.up = true
  const replay = next.o.replay()
  await vi.waitFor(() => expect(first.host.sent).toEqual(['h1']))
  first.host.answer('h1', refused)
  await replay
  expect(next.o.entries()[0]?.state).toBe('refused')
  expect(next.item('a')?.textContent).toBe('a:9')
  await next.o.discard(next.o.entries()[0]!.seq)
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:1'))
  next.o.close()
})

test.each(['no option', 'other model', 'no expected'])(
  '%s leaves stored entries without an overlay',
  async (kind) => {
    const first = await mounted(false)
    await first.o.enqueue(
      call('a', 'h1'),
      kind === 'no expected' ? undefined : { id: 'a', quantity: 9 },
    )
    first.o.close()
    first.dispose()
    const o = outbox({
      database: first.database,
      send: first.host.send,
      probe: first.probe,
    })
    const next = mountedRecord(
      first.c,
      o,
      kind === 'no option'
        ? undefined
        : kind === 'other model'
          ? 'products'
          : 'orders',
    )
    await vi.waitFor(() => expect(o.entries()).toHaveLength(1))
    await tick()
    flush()
    expect(next.item('a')?.textContent).toBe('a:1')
    await o.discard(o.entries()[0]!.seq)
    o.close()
  },
)

test('a model adapter never restores its own write, even across overlapping enqueues', async () => {
  const { o, host, net, record, item } = await mounted(false, 'orders')
  const first = track(record.write(call('a', 'h1'), { id: 'a', quantity: 9 }))
  const second = track(record.write(call('b', 'h2'), { id: 'b', quantity: 8 }))
  await vi.waitFor(() => expect(o.entries()).toHaveLength(2))
  net.up = true
  const replay = o.replay()
  await vi.waitFor(() => expect(host.sent).toEqual(['h1', 'h2']))
  host.answer('h1', refused)
  host.answer('h2', refused)
  await replay
  await vi.waitFor(() => expect(first.done && second.done).toBe(true))
  expect(first.error).toBeInstanceOf(OutboxRefused)
  expect(second.error).toBeInstanceOf(OutboxRefused)
  // A duplicate restored action would retain each refused row.
  expect(item('a')?.textContent).toBe('a:1')
  expect(item('b')?.textContent).toBe('b:1')
  o.close()
})

test('already loaded entries restore and writes can start inside an owned scope', async () => {
  const first = await mounted(false)
  await first.o.enqueue(call('a', 'h1'), { id: 'a', quantity: 9 })
  first.dispose()
  const next = mountedRecord(first.c, first.o, 'orders')
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:9'))
  const owned = createRoot((dispose) => ({
    dispose,
    write: track(next.record.write(call('b', 'h2'), { id: 'b', quantity: 8 })),
  }))
  await vi.waitFor(() => expect(next.item('b')?.textContent).toBe('b:8'))
  await vi.waitFor(() => expect(first.o.entries()).toHaveLength(2))
  for (const entry of first.o.entries()) await first.o.discard(entry.seq)
  await vi.waitFor(() =>
    expect(owned.write.error).toBeInstanceOf(OutboxDiscarded),
  )
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:1'))
  owned.dispose()
  first.o.close()
})
