import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { outbox, outboxStatus } from '@wfe/sync'
import type { OutboxCounts, OutboxEntry, Reply } from '@wfe/sync'
import {
  call,
  deferred,
  hostOf,
  locksOf,
  probeOf,
  refused,
  tick,
} from './sync-fixtures'

afterEach(() => {
  vi.useRealTimers()
})

let count = 0
const name = () => `outbox-test-${++count}`
const offline = async (): Promise<Reply> => ({ ok: false, retriable: true })
const probe = async () => true

/** Read the stored entries straight from IndexedDB. */
async function stored(database: string) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(database, 1)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  const rows = await new Promise<unknown[]>((resolve, reject) => {
    const r = db.transaction('outbox').objectStore('outbox').getAll()
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  db.close()
  return rows
}

test('enqueue resolves after the put commits, and a reopen finds the entry', async () => {
  const database = name()
  const o = outbox({ database, send: vi.fn(offline), probe })
  const expected = { id: 'a', quantity: 9, nested: { dates: [new Date(0)] } }
  const entry = await o.enqueue(call('a', 'h1'), expected)
  expect(entry).toMatchObject({
    seq: 1,
    operation: 'orders.update',
    request_hash: 'h1',
    expect: { model: 'orders', id: 'a' },
    append_only: false,
    state: 'pending',
    expected,
  })
  expect(typeof entry.recorded_at).toBe('string')
  expect(await stored(database)).toMatchObject([{ expected }])
  await tick()
  o.close()
  await tick()
  const again = outbox({ database, send: vi.fn(offline), probe })
  // A replay waits for the open, so the entries are loaded after it.
  await again.replay()
  expect(again.entries().map((e) => e.request_hash)).toEqual(['h1'])
  expect(again.entries()[0]?.expected).toEqual(expected)
  expect(again.entries()[0]?.expected).not.toBe(expected)
  again.close()
})

test('ok removes the entry and sets lastSentAt; watch reports counts', async () => {
  const seen: OutboxCounts[] = []
  const send = vi.fn(
    async (_entry: unknown, _signal: AbortSignal): Promise<Reply> => ({
      ok: true,
    }),
  )
  const o = outbox({ database: name(), send, probe })
  const stop = o.watch((counts) => seen.push(counts))
  const sent: number[] = []
  const stopSent = o.watchSent((seq) => {
    expect(o.entries()).toContainEqual(
      expect.objectContaining({ seq, state: 'sending' }),
    )
    sent.push(seq)
  })
  expect(sent).toEqual([])
  expect(seen[0]).toEqual({
    pending: 0,
    sending: 0,
    refused: 0,
    expired: 0,
    lastSentAt: undefined,
  })
  await o.enqueue(call('a', 'h1'))
  await o.replay()
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal)
  expect(o.entries()).toEqual([])
  expect(seen.at(-1)?.lastSentAt).toEqual(expect.any(String))
  expect(seen.some((counts) => counts.sending === 1)).toBe(true)
  expect(sent).toEqual([1])
  stopSent()
  await o.enqueue(call('b', 'h2'))
  await o.replay()
  expect(sent).toEqual([1])
  stop()
  o.close()
})

test('a refusal keeps the entry; resubmit sends it again and discard removes it', async () => {
  const replies: Reply[] = [
    { ok: false, retriable: false, refusal: { code: 'stale', text: 'Stale' } },
    { ok: false, retriable: false, refusal: { code: 'stale', text: 'Stale' } },
  ]
  const send = vi.fn(async () => replies.shift() ?? { ok: true as const })
  const database = name()
  const o = outbox({ database, send, probe })
  const sent = vi.fn()
  o.watchSent(sent)
  const entry = await o.enqueue(call('a', 'h1'))
  await o.replay()
  expect(o.entries()[0]).toMatchObject({
    state: 'refused',
    refusal: { code: 'stale', text: 'Stale' },
  })
  await o.resubmit(entry.seq)
  await o.replay()
  expect(send).toHaveBeenCalledTimes(2)
  expect(o.entries()[0]?.state).toBe('refused')
  await o.discard(entry.seq)
  expect(o.entries()).toEqual([])
  expect(await stored(database)).toEqual([])
  expect(sent).not.toHaveBeenCalled()
  o.close()
})

test('on open, an old entry expires even while the probe fails', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
  const database = name()
  const send = vi.fn(async (): Promise<Reply> => ({ ok: true }))
  const net = probeOf(false)
  const first = outbox({ database, send, probe: net.probe })
  const entry = await first.enqueue(call('a', 'h1'))
  await first.replay()
  first.close()
  await tick()
  vi.setSystemTime(1001)
  const o = outbox({ database, send, probe: net.probe, maxAge: 1000 })
  const seen: OutboxCounts[] = []
  o.watch((counts) => seen.push(counts))
  const { status, dispose } = createRoot((dispose) => ({
    status: outboxStatus(o),
    dispose,
  }))
  await vi.waitFor(() => expect(seen.at(-1)?.expired).toBe(1))
  expect(o.entries()).toMatchObject([{ seq: entry.seq, state: 'expired' }])
  expect(await stored(database)).toMatchObject([{ state: 'expired' }])
  flush()
  expect(status()).toMatchObject({
    pending: 0,
    sending: 0,
    refused: 0,
    expired: 1,
  })
  net.state.up = true
  await o.replay()
  expect(send).not.toHaveBeenCalled()
  dispose()
  o.close()
})

test('on open, an old refused entry stays refused', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
  const database = name()
  const send = vi.fn(async () => refused)
  const first = outbox({ database, send, probe })
  await first.enqueue(call('a', 'h1'))
  await vi.waitFor(() => expect(first.entries()[0]?.state).toBe('refused'))
  first.close()
  await tick()
  vi.setSystemTime(1001)
  const o = outbox({ database, send, probe, maxAge: 1000 })
  await vi.waitFor(() => expect(o.entries()).toHaveLength(1))
  await o.replay()
  expect(o.entries()).toMatchObject([{ state: 'refused' }])
  expect(await stored(database)).toMatchObject([{ state: 'refused' }])
  o.close()
})

test('expiry before a send holds later entries, except append-only ones', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
  const host = hostOf()
  const net = probeOf(false)
  const database = name()
  const o = outbox({
    database,
    send: host.send,
    probe: net.probe,
    maxAge: 1000,
  })
  await o.enqueue(call('a', 'a1'))
  await o.enqueue(call('a', 'a2'))
  await o.replay()
  vi.setSystemTime(1000)
  await o.enqueue(call('a', 'a3'))
  await o.enqueue(call('a', 'a4', true))
  net.state.up = true
  const done = o.replay()
  // Age equal to maxAge still sends.
  await vi.waitFor(() => expect(host.sent).toEqual(['a1']), { interval: 0 })
  vi.setSystemTime(1001)
  host.answer('a1')
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'a4']))
  host.answer('a4')
  await done
  expect(o.entries().map((e) => [e.request_hash, e.state])).toEqual([
    ['a2', 'expired'],
    ['a3', 'pending'],
  ])
  expect(await stored(database)).toMatchObject([
    { request_hash: 'a2', state: 'expired' },
    { request_hash: 'a3', state: 'pending' },
  ])
  await o.replay()
  expect(host.sent).toEqual(['a1', 'a4'])
  o.close()
})

test.each(['expired', 'refused'] as const)(
  'resubmit gives a %s entry a fresh age and sends it once with the same seq',
  async (state) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(0)
    const host = hostOf()
    const net = probeOf(state === 'refused')
    const o = outbox({
      database: name(),
      send: host.send,
      probe: net.probe,
      maxAge: 1000,
    })
    const entry = await o.enqueue(call('a', 'h1'))
    if (state === 'refused') {
      await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
      host.answer('h1', refused)
    }
    await o.replay()
    vi.setSystemTime(1001)
    net.state.up = true
    if (state === 'expired') await o.replay()
    expect(o.entries()[0]?.state).toBe(state)
    host.send.mockClear()
    await o.resubmit(entry.seq)
    await vi.waitFor(() => expect(host.send).toHaveBeenCalledTimes(1))
    const sent = host.send.mock.calls[0]![0]
    expect(sent).toMatchObject({
      seq: entry.seq,
      recorded_at: entry.recorded_at,
      resubmitted_at: new Date(1001).toISOString(),
      state: 'sending',
    })
    expect(sent.refusal).toBeUndefined()
    host.answer('h1')
    await o.replay()
    expect(host.send).toHaveBeenCalledTimes(1)
    expect(o.entries()).toEqual([])
    o.close()
  },
)

test('the resubmit time survives a reopen and becomes the age origin', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
  const database = name()
  const net = probeOf(false)
  const send = vi.fn(async (): Promise<Reply> => ({ ok: true }))
  const first = outbox({ database, send, probe: net.probe, maxAge: 1000 })
  const entry = await first.enqueue(call('a', 'h1'))
  await first.replay()
  vi.setSystemTime(1001)
  net.state.up = true
  await first.replay()
  net.state.up = false
  await first.resubmit(entry.seq)
  await first.replay()
  first.close()
  await tick()
  vi.setSystemTime(2001)
  const o = outbox({ database, send, probe: net.probe, maxAge: 1000 })
  await vi.waitFor(() => expect(o.entries()).toHaveLength(1), { interval: 0 })
  await o.replay()
  expect(o.entries()[0]).toMatchObject({
    seq: entry.seq,
    recorded_at: entry.recorded_at,
    resubmitted_at: new Date(1001).toISOString(),
    state: 'pending',
  })
  net.state.up = true
  await o.replay()
  expect(send).toHaveBeenCalledTimes(1)
  expect(o.entries()).toEqual([])
  o.close()
})

test('without maxAge, an old entry still sends after a reopen', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
  const database = name()
  const send = vi.fn(async (): Promise<Reply> => ({ ok: true }))
  const first = outbox({ database, send, probe: async () => false })
  await first.enqueue(call('a', 'h1'))
  await first.replay()
  first.close()
  await tick()
  vi.setSystemTime(365 * 24 * 60 * 60 * 1000)
  const o = outbox({ database, send, probe })
  await o.replay()
  expect(send).toHaveBeenCalledTimes(1)
  expect(o.entries()).toEqual([])
  o.close()
})

test('close aborts a send in flight and leaves the entry pending', async () => {
  const reply = deferred<Reply>()
  let signal: AbortSignal | undefined
  const send = vi.fn((_entry: unknown, s: AbortSignal) => {
    signal = s
    return reply.promise
  })
  const database = name()
  const o = outbox({ database, send, probe })
  await o.enqueue(call('a', 'h1'))
  await vi.waitFor(() => expect(send).toHaveBeenCalled())
  expect(o.entries()[0]?.state).toBe('sending')
  o.close()
  expect(signal?.aborted).toBe(true)
  expect(o.entries()[0]?.state).toBe('pending')
  reply.resolve({ ok: true })
  await tick()
  expect(await stored(database)).toMatchObject([{ state: 'pending' }])
})

test('outboxStatus follows the counts', async () => {
  const o = outbox({ database: name(), send: vi.fn(offline), probe })
  const { status, dispose } = createRoot((dispose) => ({
    status: outboxStatus(o),
    dispose,
  }))
  flush()
  expect(status()).toMatchObject({ pending: 0, refused: 0 })
  await o.enqueue(call('a', 'h1'))
  await o.replay()
  flush()
  expect(status()).toMatchObject({ pending: 1, sending: 0, refused: 0 })
  dispose()
  o.close()
})

test('replay sends one record in seq order and two records in parallel', async () => {
  const host = hostOf()
  const net = probeOf(false)
  const o = outbox({ database: name(), send: host.send, probe: net.probe })
  await o.enqueue(call('a', 'a1'))
  await o.enqueue(call('b', 'b1'))
  await o.enqueue(call('a', 'a2'))
  net.state.up = true
  const done = o.replay()
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'b1']))
  host.answer('b1')
  await tick()
  expect(host.sent).toEqual(['a1', 'b1'])
  host.answer('a1')
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'b1', 'a2']))
  host.answer('a2')
  await done
  expect(o.entries()).toEqual([])
  o.close()
})

test('a retriable reply stops the replay; the next replay resumes from it', async () => {
  const host = hostOf()
  const net = probeOf(false)
  const o = outbox({
    database: name(),
    send: host.send,
    probe: net.probe,
    concurrency: 1,
  })
  await o.enqueue(call('a', 'a1'))
  await o.enqueue(call('b', 'b1'))
  net.state.up = true
  const first = o.replay()
  await vi.waitFor(() => expect(host.sent).toEqual(['a1']))
  host.answer('a1', { ok: false, retriable: true })
  await first
  expect(host.sent).toEqual(['a1'])
  expect(o.entries().map((e) => e.state)).toEqual(['pending', 'pending'])
  const second = o.replay()
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'a1']))
  host.answer('a1')
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'a1', 'b1']))
  host.answer('b1')
  await second
  expect(o.entries()).toEqual([])
  o.close()
})

test('a refusal holds later entries of its record, except append-only ones', async () => {
  const host = hostOf()
  const net = probeOf(false)
  const o = outbox({ database: name(), send: host.send, probe: net.probe })
  await o.enqueue(call('a', 'a1'))
  await o.enqueue(call('a', 'a2'))
  await o.enqueue(call('a', 'a3', true))
  await o.enqueue(call('b', 'b1'))
  net.state.up = true
  const done = o.replay()
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'b1']))
  host.answer('a1', refused)
  host.answer('b1')
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'b1', 'a3']))
  host.answer('a3')
  await done
  expect(o.entries().map((e) => [e.request_hash, e.state])).toEqual([
    ['a1', 'refused'],
    ['a2', 'pending'],
  ])
  o.close()
})

test('a failed probe sends nothing; the online event and the 15 s probe resume', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const host = hostOf()
  const net = probeOf(false)
  const o = outbox({ database: name(), send: host.send, probe: net.probe })
  await o.enqueue(call('a', 'a1'))
  await tick()
  expect(host.sent).toEqual([])
  expect(o.entries()[0]?.state).toBe('pending')
  net.state.up = true
  window.dispatchEvent(new Event('online'))
  await vi.waitFor(() => expect(host.sent).toEqual(['a1']))
  host.answer('a1', { ok: false, retriable: true })
  await vi.waitFor(() => expect(o.entries()[0]?.state).toBe('pending'))
  net.state.up = false
  await o.replay()
  const probes = net.probe.mock.calls.length
  await vi.advanceTimersByTimeAsync(15_000)
  expect(net.probe.mock.calls.length).toBe(probes + 1)
  expect(host.sent).toEqual(['a1'])
  net.state.up = true
  await vi.advanceTimersByTimeAsync(15_000)
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'a1']))
  host.answer('a1')
  o.close()
})

test('a 30 s timer replays while an entry is pending, and close stops it', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const host = hostOf()
  const o = outbox({ database: name(), send: host.send, probe })
  await o.enqueue(call('a', 'a1'))
  await vi.waitFor(() => expect(host.sent).toEqual(['a1']))
  host.answer('a1', { ok: false, retriable: true })
  await vi.waitFor(() => expect(o.entries()[0]?.state).toBe('pending'))
  await vi.advanceTimersByTimeAsync(30_000)
  await vi.waitFor(() => expect(host.sent).toEqual(['a1', 'a1']))
  o.close()
  expect(vi.getTimerCount()).toBe(0)
})

test.each([undefined, 1000])(
  'on open, a lost sending entry recovers, then expires only with maxAge: %s',
  async (maxAge) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(0)
    const database = name()
    const lost = hostOf()
    const a = outbox({ database, send: lost.send, probe })
    await a.enqueue(call('a', 'a1'))
    await vi.waitFor(async () =>
      expect(await stored(database)).toMatchObject([{ state: 'sending' }]),
    )
    vi.setSystemTime(1001)
    const net = probeOf(false)
    const b = outbox({
      database,
      send: vi.fn(offline),
      probe: net.probe,
      maxAge,
    })
    const state = maxAge === undefined ? 'pending' : 'expired'
    await vi.waitFor(async () =>
      expect(await stored(database)).toMatchObject([{ state }]),
    )
    expect(b.entries()[0]?.state).toBe(state)
    b.close()
    a.close()
  },
)

test('a lost reply sends the same request_hash again, and the host keeps one effect', async () => {
  const host = hostOf()
  const o = outbox({ database: name(), send: host.send, probe })
  await o.enqueue(call('a', 'h1'))
  await vi.waitFor(() => expect(host.sent).toEqual(['h1']))
  // The effect landed, but the reply was lost on the way back.
  host.answer('h1', { ok: false, retriable: true })
  await vi.waitFor(() => expect(o.entries()[0]?.state).toBe('pending'))
  const again = o.replay()
  await vi.waitFor(() => expect(host.sent).toEqual(['h1', 'h1']))
  host.answer('h1')
  await again
  expect(host.effects.size).toBe(1)
  expect(o.entries()).toEqual([])
  o.close()
})

test('two outboxes on one database replay one at a time under the Web Lock', async () => {
  const uninstall = locksOf().install()
  try {
    const database = name()
    const host = hostOf()
    const busy = new Set<string>()
    let overlap = false
    const sendAs = (tab: string) =>
      vi.fn(async (entry: OutboxEntry) => {
        busy.add(tab)
        if (busy.size > 1) overlap = true
        try {
          return await host.send(entry)
        } finally {
          busy.delete(tab)
        }
      })
    const net = probeOf(false)
    const a = outbox({ database, send: sendAs('a'), probe: net.probe })
    const b = outbox({ database, send: sendAs('b'), probe: net.probe })
    await a.enqueue(call('x', 'x1'))
    await b.enqueue(call('y', 'y1'))
    net.state.up = true
    const first = a.replay()
    const second = b.replay()
    await vi.waitFor(() => expect([...host.sent].sort()).toEqual(['x1', 'y1']))
    await tick()
    host.answer('x1')
    host.answer('y1')
    await first
    await second
    expect([...host.sent].sort()).toEqual(['x1', 'y1'])
    expect(overlap).toBe(false)
    a.close()
    b.close()
  } finally {
    uninstall()
  }
})

test('entries stored before expected existed load with expected undefined', async () => {
  const database = name()
  const o = outbox({ database, send: vi.fn(offline), probe: async () => false })
  const entry = await o.enqueue(call('a', 'h1'))
  o.close()
  await tick()
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = indexedDB.open(database, 1)
    r.onsuccess = () => resolve(r.result)
  })
  const legacy = { ...entry }
  Reflect.deleteProperty(legacy, 'expected')
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite')
    tx.objectStore('outbox').put(legacy)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  const again = outbox({
    database,
    send: vi.fn(offline),
    probe: async () => false,
  })
  await vi.waitFor(() => expect(again.entries()).toHaveLength(1))
  expect(again.entries()[0]?.expected).toBeUndefined()
  again.close()
})
