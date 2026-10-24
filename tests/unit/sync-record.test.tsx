import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { For, flush } from 'solid-js'
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
async function mounted(up = true) {
  const c = collection(feedOf([[order('a', 1), order('b', 1)]]), 'all', {
    key: 'orders:all',
  })
  await tick()
  const host = hostOf()
  const net = { up }
  const probe = vi.fn(async () => net.up)
  const o = outbox({ database: name(), send: host.send, probe })
  let record!: ReturnType<typeof recordWrite<Order>>
  const h = render(() => {
    record = recordWrite(c, o)
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
  await tick()
  flush()
  const item = (id: string) => h.container.querySelector(`[data-id="${id}"]`)
  return { c, o, host, net, record, item }
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
  applyChanges(c, [changed('a', 2, 9)])
  await vi.waitFor(() => expect(write.done).toBe(true))
  expect(write.error).toBeUndefined()
  expect(o.entries()).toEqual([])
})
