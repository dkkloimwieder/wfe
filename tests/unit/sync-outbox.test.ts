import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { outbox, outboxStatus } from '@wfe/sync'
import type { OutboxCounts, OutboxEntry, Reply } from '@wfe/sync'
import { call, deferred, tick } from './sync-fixtures'

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
  const entry = await o.enqueue(call('a', 'h1'))
  expect(entry).toMatchObject({
    seq: 1,
    operation: 'orders.update',
    request_hash: 'h1',
    expect: { model: 'orders', id: 'a' },
    append_only: false,
    state: 'pending',
  })
  expect(typeof entry.recorded_at).toBe('string')
  expect(await stored(database)).toHaveLength(1)
  await tick()
  o.close()
  await tick()
  const again = outbox({ database, send: vi.fn(offline), probe })
  // A replay waits for the open, so the entries are loaded after it.
  await again.replay()
  expect(again.entries().map((e) => e.request_hash)).toEqual(['h1'])
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
  expect(seen[0]).toEqual({
    pending: 0,
    sending: 0,
    refused: 0,
    lastSentAt: undefined,
  })
  await o.enqueue(call('a', 'h1'))
  await o.replay()
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal)
  expect(o.entries()).toEqual([])
  expect(seen.at(-1)?.lastSentAt).toEqual(expect.any(String))
  expect(seen.some((counts) => counts.sending === 1)).toBe(true)
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

/** A host that holds each reply until the test answers it by hash. */
function hostOf() {
  const waiting = new Map<string, (reply: Reply) => void>()
  const sent: string[] = []
  const send = vi.fn((entry: OutboxEntry) => {
    sent.push(entry.request_hash)
    return new Promise<Reply>((resolve) =>
      waiting.set(entry.request_hash, resolve),
    )
  })
  const answer = (hash: string, reply: Reply = { ok: true }) => {
    waiting.get(hash)?.(reply)
    waiting.delete(hash)
  }
  return { send, sent, answer }
}
/** A probe the test switches. */
function probeOf(up = true) {
  const state = { up }
  return { state, probe: vi.fn(async () => state.up) }
}
const refused: Reply = {
  ok: false,
  retriable: false,
  refusal: { code: 'stale', text: 'Stale' },
}

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

test('on open, an entry left sending by a lost tab goes back to pending', async () => {
  const database = name()
  const lost = hostOf()
  const a = outbox({ database, send: lost.send, probe })
  await a.enqueue(call('a', 'a1'))
  await vi.waitFor(async () =>
    expect(await stored(database)).toMatchObject([{ state: 'sending' }]),
  )
  const net = probeOf(false)
  const b = outbox({ database, send: vi.fn(offline), probe: net.probe })
  await vi.waitFor(async () =>
    expect(await stored(database)).toMatchObject([{ state: 'pending' }]),
  )
  expect(b.entries()[0]?.state).toBe('pending')
  b.close()
  a.close()
})
