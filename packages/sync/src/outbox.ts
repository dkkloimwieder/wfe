// The write queue. It never imports Solid, and it never builds a request,
// a URL, a hash or a header: Send and probe are the consumer's.

/** One write, as the consumer's binding builds it. */
export type OperationCall = {
  /** Opaque to the package; passed to Send. */
  operation: string
  request: unknown
  /** Computed by the caller; the write log dedupes on it. */
  request_hash: string
  /** The record that the write changes, for replay order and `until`. */
  expect: { model: string; id: string }
  /** A refusal of an earlier entry for the same id does not hold this one. */
  append_only: boolean
}

/** The consumer's Send decides what is retriable. */
export type Reply =
  | { ok: true }
  | { ok: false; retriable: boolean; refusal?: { code: string; text: string } }

export interface Send {
  (entry: OutboxEntry, signal: AbortSignal): Promise<Reply>
}

export type OutboxEntry = OperationCall & {
  /** Local and monotonic; the replay order. */
  seq: number
  /** ISO, browser clock; a display value only. */
  recorded_at: string
  state: 'pending' | 'sending' | 'refused'
  refusal?: { code: string; text: string }
}

export type OutboxCounts = {
  pending: number
  sending: number
  refused: number
  /** ISO time of the last ok reply in this page, or undefined. */
  lastSentAt: string | undefined
}

export interface Outbox {
  /** Resolves after the IndexedDB put commits. */
  enqueue(op: OperationCall): Promise<OutboxEntry>
  /** Sends pending entries to the end of the queue or the first retriable failure. */
  replay(): Promise<void>
  /** A refused entry goes back to pending, and a replay starts. */
  resubmit(seq: number): Promise<void>
  /** Removes the entry. */
  discard(seq: number): Promise<void>
  /** The entries in seq order, as this page holds them. */
  entries(): OutboxEntry[]
  /** Calls fn with the counts now and on each change; returns the unsubscribe. */
  watch(fn: (counts: OutboxCounts) => void): () => void
  /** Aborts sends in flight, leaves them pending, and closes the database. */
  close(): void
}

const store = 'outbox'
/** The seqs that each outbox discarded in this page, for recordWrite. */
const discards = new WeakMap<Outbox, Set<number>>()

/** True when `o` discarded the entry `seq` in this page. */
export function discarded(o: Outbox, seq: number): boolean {
  return discards.get(o)?.has(seq) ?? false
}
/** A replay runs on this interval while an entry is pending. */
const replayEvery = 30_000
/** The probe runs again on this interval while the last probe failed. */
const probeEvery = 15_000

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

function open(name: string): Promise<IDBDatabase> {
  const r = indexedDB.open(name, 1)
  r.onupgradeneeded = () => {
    const os = r.result.createObjectStore(store, {
      keyPath: 'seq',
      autoIncrement: true,
    })
    os.createIndex('expect.id', 'expect.id')
  }
  return request(r)
}

/**
 * A durable write queue in the IndexedDB database the caller names. One tab
 * replays at a time under a Web Lock; without navigator.locks, replay runs
 * unlocked. A replay runs on open, after each enqueue, after a successful
 * probe, and every 30 s while an entry is pending. The probe runs before each
 * replay, on the 'online' event, and every 15 s while the last probe failed.
 */
export function outbox(options: {
  /** IndexedDB name, chosen by the caller. */
  database: string
  send: Send
  /** True when the host answered. */
  probe: () => Promise<boolean>
  /** Sends at once across records; one at a time within a record. Default 4. */
  concurrency?: number
}): Outbox {
  const memory = new Map<number, OutboxEntry>()
  const listeners = new Set<(counts: OutboxCounts) => void>()
  const abort = new AbortController()
  const gone = new Set<number>()
  let lastSentAt: string | undefined
  let closed = false
  let running: Promise<void> | undefined
  let again = false
  let probing: ReturnType<typeof setInterval> | undefined
  const database = open(options.database).then(async (db) => {
    for (const entry of await all(db)) memory.set(entry.seq, entry)
    notify()
    return db
  })

  function all(db: IDBDatabase): Promise<OutboxEntry[]> {
    const os = db.transaction(store).objectStore(store)
    return request(os.getAll() as IDBRequest<OutboxEntry[]>)
  }
  async function put(entries: OutboxEntry[]): Promise<void> {
    const tx = (await database).transaction(store, 'readwrite')
    for (const entry of entries) tx.objectStore(store).put(entry)
    await done(tx)
  }
  async function remove(seq: number): Promise<void> {
    const tx = (await database).transaction(store, 'readwrite')
    tx.objectStore(store).delete(seq)
    await done(tx)
  }

  function counts(): OutboxCounts {
    const result = { pending: 0, sending: 0, refused: 0, lastSentAt }
    for (const entry of memory.values()) result[entry.state]++
    return result
  }
  function notify(): void {
    const value = counts()
    for (const listener of [...listeners]) listener(value)
  }
  function ordered(): OutboxEntry[] {
    return [...memory.values()].sort((a, b) => a.seq - b.seq)
  }

  /** Hold the lock for this database; without Web Locks, run unlocked. */
  function locked(fn: () => Promise<void>): Promise<void> {
    const locks = globalThis.navigator?.locks
    if (!locks) return fn()
    const name = `${options.database}:outbox`
    return locks.request(name, { signal: abort.signal }, fn)
  }

  /** Inside the lock: another tab may have changed the store. */
  async function reload(): Promise<void> {
    const stored = await all(await database)
    memory.clear()
    for (const entry of stored) memory.set(entry.seq, entry)
    // No tab sends without the lock, so a stored 'sending' entry lost its tab.
    const lost = stored.filter((entry) => entry.state === 'sending')
    for (const entry of lost) entry.state = 'pending'
    if (lost.length > 0) await put(lost)
    notify()
  }

  async function send(entry: OutboxEntry): Promise<Reply> {
    try {
      return await options.send({ ...entry }, abort.signal)
    } catch {
      // A Send that throws is a network failure.
      return { ok: false, retriable: true }
    }
  }

  /**
   * Send the entries of one record in seq order, one at a time. A refused
   * entry holds the later entries of the record, except append-only ones.
   */
  async function lane(entries: OutboxEntry[], halt: { now: boolean }) {
    let held = false
    for (const entry of entries) {
      if (closed || halt.now) return
      if (entry.state === 'refused') held = true
      if (entry.state !== 'pending' || (held && !entry.append_only)) continue
      entry.state = 'sending'
      await put([entry])
      notify()
      const reply = await send(entry)
      if (closed) return
      if (reply.ok) {
        await remove(entry.seq)
        memory.delete(entry.seq)
        lastSentAt = new Date().toISOString()
      } else if (reply.retriable) {
        // Network or 5xx: the whole replay stops and waits for a trigger.
        entry.state = 'pending'
        halt.now = true
        await put([entry])
      } else {
        entry.state = 'refused'
        if (reply.refusal) entry.refusal = reply.refusal
        held = true
        await put([entry])
      }
      notify()
    }
  }

  /** Records in parallel up to `concurrency`; each record in its own lane. */
  async function pass(): Promise<void> {
    await reload()
    const lanes = new Map<string, OutboxEntry[]>()
    for (const entry of ordered()) {
      const list = lanes.get(entry.expect.id)
      if (list) list.push(entry)
      else lanes.set(entry.expect.id, [entry])
    }
    const queue = [...lanes.values()]
    const halt = { now: false }
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        await lane(next, halt)
        if (closed || halt.now) return
      }
    }
    const width = Math.max(1, options.concurrency ?? 4)
    await Promise.all(Array.from({ length: width }, worker))
    // A retriable failure waits for a trigger that comes after it.
    if (halt.now) again = false
  }

  /** The probe never throws; a failed probe runs again every 15 s. */
  async function probe(): Promise<boolean> {
    let ok = false
    try {
      ok = await options.probe()
    } catch {
      ok = false
    }
    if (closed) return false
    if (ok && probing !== undefined) {
      clearInterval(probing)
      probing = undefined
    } else if (!ok && probing === undefined) {
      probing = setInterval(() => {
        void probe().then((answered) => {
          if (answered) kick()
        })
      }, probeEvery)
    }
    return ok
  }

  /** One replay at a time; a replay asked for during one runs once after it. */
  function replay(): Promise<void> {
    if (closed) return Promise.resolve()
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      try {
        do {
          again = false
          // The probe runs before each attempt; navigator.onLine is never read.
          if (await probe()) await locked(pass)
        } while (again && !closed)
      } catch (cause) {
        if (!closed) throw cause
      } finally {
        running = undefined
      }
    })()
    return running
  }
  const kick = () => void replay().catch(() => undefined)

  const timer = setInterval(() => {
    if (counts().pending > 0) kick()
  }, replayEvery)
  const online = () => {
    void probe().then((answered) => {
      if (answered) kick()
    })
  }
  globalThis.addEventListener?.('online', online)
  // On open, lost 'sending' entries go back to pending before the first replay.
  void database.then(() => locked(reload)).then(kick, () => undefined)

  const o: Outbox = {
    async enqueue(op) {
      if (closed) throw new Error('The outbox is closed')
      const entry = {
        operation: op.operation,
        request: op.request,
        request_hash: op.request_hash,
        expect: { model: op.expect.model, id: op.expect.id },
        append_only: op.append_only,
        recorded_at: new Date().toISOString(),
        state: 'pending',
      } as OutboxEntry
      const tx = (await database).transaction(store, 'readwrite')
      const key = request(tx.objectStore(store).add(entry))
      await done(tx)
      entry.seq = (await key) as number
      memory.set(entry.seq, entry)
      notify()
      kick()
      return { ...entry }
    },
    replay,
    async resubmit(seq) {
      const entry = memory.get(seq)
      if (!entry || entry.state !== 'refused') return
      entry.state = 'pending'
      delete entry.refusal
      await put([entry])
      notify()
      kick()
    },
    async discard(seq) {
      if (!memory.has(seq)) return
      await remove(seq)
      memory.delete(seq)
      gone.add(seq)
      notify()
    },
    entries: () => ordered().map((entry) => ({ ...entry })),
    watch(fn) {
      listeners.add(fn)
      fn(counts())
      return () => {
        listeners.delete(fn)
      }
    },
    close() {
      if (closed) return
      closed = true
      abort.abort()
      clearInterval(timer)
      if (probing !== undefined) clearInterval(probing)
      globalThis.removeEventListener?.('online', online)
      const sending = [...memory.values()].filter((e) => e.state === 'sending')
      for (const entry of sending) entry.state = 'pending'
      notify()
      void database.then(
        (db) => {
          // db.close() waits for this transaction to commit.
          if (sending.length > 0) {
            const tx = db.transaction(store, 'readwrite')
            for (const entry of sending) tx.objectStore(store).put(entry)
          }
          db.close()
        },
        () => undefined,
      )
    },
  }
  discards.set(o, gone)
  return o
}
