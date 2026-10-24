import type { Change, Feed, Row, Trigger } from '@wfe/sync'

export type OrderStatus = 'open' | 'picked' | 'shipped'
export type Order = Row & {
  name: string
  quantity: number
  status: OrderStatus
  updated_at: string
}
export type Scope = { size: number }

const statuses: OrderStatus[] = ['open', 'picked', 'shipped']

/** A UUIDv7: 48 bits of milliseconds, then version, variant and random bits. */
export function uuidv7(now = Date.now()): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[0] = Math.floor(now / 2 ** 40) & 0xff
  bytes[1] = Math.floor(now / 2 ** 32) & 0xff
  bytes[2] = Math.floor(now / 2 ** 24) & 0xff
  bytes[3] = Math.floor(now / 2 ** 16) & 0xff
  bytes[4] = Math.floor(now / 2 ** 8) & 0xff
  bytes[5] = now & 0xff
  bytes[6] = (bytes[6]! & 0x0f) | 0x70
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

function order(index: number, now: number): Order {
  return {
    id: uuidv7(now + index),
    row_version: 1,
    name: `Order ${String(index + 1).padStart(6, '0')}`,
    quantity: (index * 7919) % 97,
    status: statuses[index % statuses.length]!,
    updated_at: new Date(now + index).toISOString(),
  }
}

/** Synthetic rows with time-ordered ids. */
export function makeRows(count: number): Order[] {
  const now = Date.now() - count
  return Array.from({ length: count }, (_, index) => order(index, now))
}

/**
 * A fake host for one scope: a row table, a change log, and a trigger. The
 * cursor 'cN' means the first N log entries. `changes` pages the log, 50
 * entries by default.
 */
export function fakeServer(count: number) {
  let rows = makeRows(count)
  const log: Change<Order>[] = []
  const fires = new Map<string, Set<() => void>>()
  const feed: Feed<Order, Scope> = {
    async list() {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return { rows, cursor: `c${log.length}` }
    },
    async changes(_scope, cursor, limit = 50) {
      const start = Number(cursor.slice(1))
      const page = log.slice(start, start + limit)
      const next = start + page.length
      return {
        rows: page,
        next_cursor: `c${next}`,
        complete: next >= log.length,
      }
    },
  }
  const trigger: Trigger = {
    subscribe(key, fire) {
      const set = fires.get(key) ?? new Set()
      set.add(fire)
      fires.set(key, set)
      return () => {
        set.delete(fire)
      }
    },
  }
  /** Append 100 random changes to the log, then fire the trigger for the key. */
  function change(key: string): void {
    const batch = randomChanges(rows)
    log.push(...batch)
    const byId = new Map(rows.map((row) => [row.id, row]))
    for (const entry of batch) {
      if (entry.deleted) byId.delete(entry.id)
      else byId.set(entry.id, entry.data)
    }
    rows = [...byId.values()]
    for (const fire of [...(fires.get(key) ?? [])]) fire()
  }
  return { feed, trigger, change }
}

/**
 * One hundred random changes against the current rows: seventy updates,
 * twenty inserts and ten deletes, so one batch adds ten rows.
 */
export function randomChanges(
  current: Order[],
  counts = { updates: 70, inserts: 20, deletes: 10 },
): Change<Order>[] {
  const picked = new Set<number>()
  const pick = () => {
    let index = Math.floor(Math.random() * current.length)
    while (picked.has(index) && picked.size < current.length)
      index = (index + 1) % current.length
    picked.add(index)
    return current[index]!
  }
  const changes: Change<Order>[] = []
  const now = Date.now()
  for (
    let step = 0;
    step < counts.updates && picked.size < current.length;
    step++
  ) {
    const row = pick()
    changes.push({
      id: row.id,
      row_version: row.row_version + 1,
      deleted: false,
      data: {
        ...row,
        row_version: row.row_version + 1,
        quantity: Math.floor(Math.random() * 97),
        status: statuses[Math.floor(Math.random() * statuses.length)]!,
        updated_at: new Date(now).toISOString(),
      },
    })
  }
  for (
    let step = 0;
    step < counts.deletes && picked.size < current.length;
    step++
  ) {
    const row = pick()
    changes.push({
      id: row.id,
      row_version: row.row_version + 1,
      deleted: true,
    })
  }
  for (let step = 0; step < counts.inserts; step++) {
    const row = order(current.length + step, now)
    changes.push({ id: row.id, row_version: 1, deleted: false, data: row })
  }
  return changes
}
