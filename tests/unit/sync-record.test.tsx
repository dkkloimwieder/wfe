import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { For, createRoot, flush, snapshot } from 'solid-js'
import {
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
  feedOf,
  hostOf,
  order,
  refused,
  tick,
} from './sync-fixtures'
import type { Order } from './sync-fixtures'

afterEach(cleanup)

let count = 0
const name = () => `record-test-${++count}`

/** A filled collection, an outbox, and a rendered list over recordWrite. */
async function mounted(up = true, model?: string) {
  const c = collection(feedOf([[order('a', 1), order('b', 1)]]), 'all', {
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
  return { c, o, host, net, database, probe, ...view }
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

test('the guess shows at once, and the write ends when the feed brings a newer row', async () => {
  const { c, host, record, item } = await mounted()
  expect(item('a')?.textContent).toBe('a:1')
  const write = track(
    record.write(call('a', 'h1'), { id: 'a', row_version: 1, quantity: 9 }),
  )
  flush()
  expect(item('a')?.textContent).toBe('a:9')
  await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
  host.answer('h1')
  await tick()
  expect(write.done).toBe(false)
  applyChanges(c, [changed('a', 2, 9)])
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
  flush()
  expect(item('a')?.textContent).toBe('a:9')
  expect(record.rows.a?.row_version).toBe(2)
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
  const { c, host, record, item } = await mounted()
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
  await vi.waitFor(() => expect(first.done && second.done).toBe(true))
  expect(first.error).toBeUndefined()
  expect(second.error).toBeUndefined()
  flush()
  expect(item('a')?.textContent).toBe('a:7')
  expect(item('b')?.textContent).toBe('b:8')
  expect(item('a')).toBe(a)
  expect(item('b')).toBe(b)
})

test('offline, the entry waits and the guess shows; a good probe sends and the echo ends the write', async () => {
  const { c, o, host, net, record, item } = await mounted(false)
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
  applyChanges(c, [changed('a', 2, 9)])
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
  expect(o.entries()).toEqual([])
})

test.each([undefined, 1])(
  'an offline update with expected version %s keeps its guess until an early feed row and the send succeed',
  async (version) => {
    const { c, o, host, net, record, item } = await mounted(false)
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

    applyChanges(c, [changed('a', 2, 9)])
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
    await vi.waitFor(() => expect(write.done).toBe(true))
    expect(write.error).toBeUndefined()
    flush()
    expect(record.rows.a?.row_version).toBe(2)
    expect(item('a')?.textContent).toBe('a:9')
    o.close()
  },
)

test('the write reads the versions through options.version', async () => {
  type Camel = { id: string; rowVersion: number; quantity: number }
  const camel = (id: string, rowVersion: number, quantity = 1): Camel => ({
    id,
    rowVersion,
    quantity,
  })
  const c = collection(
    {
      list: async () => ({ rows: [camel('a', 1)], cursor: 'end' }),
      changes: async () => ({ rows: [], next_cursor: 'end', complete: true }),
    },
    'all',
    { key: 'camel:all', version: (row: Camel) => row.rowVersion },
  )
  await tick()
  const host = hostOf()
  const o = outbox({
    database: name(),
    send: host.send,
    probe: async () => true,
  })
  let record!: ReturnType<typeof recordWrite<Camel>>
  render(() => {
    record = recordWrite(c, o)
    return null
  })
  await tick()
  const write = track(
    record.write(call('a', 'h1'), { id: 'a', rowVersion: 1, quantity: 9 }),
  )
  await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
  host.answer('h1')
  applyChanges(c, [
    { id: 'a', row_version: 1, deleted: false, data: camel('a', 1, 9) },
  ])
  await tick()
  expect(write.done).toBe(false)
  applyChanges(c, [
    { id: 'a', row_version: 2, deleted: false, data: camel('a', 2, 9) },
  ])
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
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
  applyChanges(first.c, [changed('a', 2, 8)])
  await vi.waitFor(() => expect(next.item('a')?.textContent).toBe('a:8'))
  expect(snapshot(next.record.rows)).toEqual(
    Object.fromEntries(first.c.entries()),
  )
  next.o.close()
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
      applyChanges(first.c, [changed('a', 2, 8)])
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
