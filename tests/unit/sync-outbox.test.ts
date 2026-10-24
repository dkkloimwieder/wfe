import 'fake-indexeddb/auto'
import { expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { outbox, outboxStatus } from '@wfe/sync'
import type { OutboxCounts, Reply } from '@wfe/sync'
import { call, deferred, tick } from './sync-fixtures'

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
