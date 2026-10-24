import { createCollection } from '@tanstack/db'
import type { Collection } from '@tanstack/db'
import { createStatus } from './status'
import { register, remove, upsert } from './writer'
import type { AnyCollection, Batch, SyncParams, Writer } from './writer'
import type { Feed, Persistence, Row, Trigger } from './types'

type Utils = {
  /** Run `list` again and reconcile the result into the collection. */
  refill: () => Promise<void>
  /** The error of the last failed `list`, or undefined. */
  error: () => unknown
}

export type SyncCollection<T extends Row> = Collection<T, string, Utils, never>

/**
 * A collection keyed by `row.id`, filled once from `feed.list(scope)`.
 * Epic 1a fills only. Epic 2a adds `follow`, which uses the other options.
 */
export function collection<T extends Row, S>(
  feed: Feed<T, S>,
  scope: S,
  options: {
    /** (model, scope) encoded by the caller; the persistence key. */
    key: string
    /** Epic 2a: `follow` loads rows before the network and saves after each batch. */
    persistence?: Persistence
    /** Epic 2a: `follow` calls `changes` when the trigger fires. */
    trigger?: Trigger
    /** Epic 2a: `follow` polls on this interval; default 10000. */
    pollMs?: number
  },
): SyncCollection<T> {
  void options
  const status = createStatus('loading')
  let error: unknown
  let writer: Writer<T> | undefined
  let c: SyncCollection<T>
  async function fill(): Promise<void> {
    try {
      const page = await feed.list(scope)
      reconcile(c, writer!, page.rows)
      if (c.status !== 'ready') writer!.markReady()
      error = undefined
      status.set('ready')
    } catch (cause) {
      error = cause
      if (c.status !== 'error') writer!.markError(cause)
      status.set('error')
    }
  }
  c = createCollection<T, string, Utils>({
    getKey: (row) => row.id,
    startSync: true,
    gcTime: 0,
    sync: {
      // TanStack DB runs this again after cleanup() when a subscriber,
      // preload or mutation restarts the collection. Each run brings new
      // params, so readers go through the getter below.
      sync: (params: SyncParams<T>) => {
        writer = params
        void fill()
      },
    },
    utils: {
      refill: () => fill(),
      error: () => error,
    },
  })
  register(c, { writer: () => writer!, status, error: () => error })
  return c
}

/** Write one page as one transaction: absent rows leave, newer rows land. */
function reconcile<T extends Row>(
  c: AnyCollection<T>,
  writer: Writer<T>,
  rows: T[],
): void {
  const batch: Batch = new Map()
  const incoming = new Set<string>()
  writer.begin()
  for (const row of rows) {
    incoming.add(row.id)
    upsert(c, writer, row, batch)
  }
  for (const key of [...c.keys()])
    if (!incoming.has(key)) remove(c, writer, key, batch)
  writer.commit()
}
