import { createCollection } from '@tanstack/db'
import type { Collection } from '@tanstack/db'
import { createStatus } from './status'
import { register, remove, upsert } from './writer'
import type { AnyCollection, Batch, SyncParams, Writer } from './writer'
import type { Feed, Persistence, Row, Trigger } from './types'

type Utils = {
  /** Run `list` again and reconcile the result into the collection. */
  refill: () => Promise<void>
  /** The error of the last failed read, or undefined. */
  error: () => unknown
  /** ISO time of the last successful `list` or `changes`, or undefined. */
  currentAt: () => string | undefined
}

export type SyncCollection<T extends Row> = Collection<T, string, Utils, never>

/** One run of the sync function. A restart after cleanup() makes a new run. */
interface Run<T extends Row> {
  writer: Writer<T>
  abort: AbortController
  stopped: boolean
}

/**
 * A collection keyed by `row.id`. It loads saved rows from persistence when
 * given, then fills from `feed.list(scope)`. Epic 2a `follow` uses the other
 * options.
 */
export function collection<T extends Row, S>(
  feed: Feed<T, S>,
  scope: S,
  options: {
    /** (model, scope) encoded by the caller; the persistence key. */
    key: string
    /** Saved rows load from here before the list. */
    persistence?: Persistence
    /** Epic 2a: `follow` calls `changes` when the trigger fires. */
    trigger?: Trigger
    /** Epic 2a: `follow` polls on this interval; default 10000. */
    pollMs?: number
  },
): SyncCollection<T> {
  const status = createStatus('loading')
  let error: unknown
  let currentAt: string | undefined
  let run: Run<T> | undefined
  let c: SyncCollection<T>

  function ready(r: Run<T>): void {
    if (c.status !== 'ready') r.writer.markReady()
    error = undefined
    status.set('ready')
  }
  function failed(r: Run<T>, cause: unknown): void {
    error = cause
    if (c.status !== 'error') r.writer.markError(cause)
    status.set('error')
  }

  /** List and reconcile. */
  async function fill(r: Run<T>, local = false): Promise<void> {
    try {
      const page = await feed.list(scope, r.abort.signal)
      if (r.stopped) return
      reconcile(c, r.writer, page.rows)
      currentAt = new Date().toISOString()
      ready(r)
    } catch (cause) {
      if (r.stopped) return
      // Saved rows stay readable: the status stays ready and error() holds
      // the failure.
      if (local) error = cause
      else failed(r, cause)
    }
  }

  /** Saved rows first, then the list. */
  async function start(r: Run<T>): Promise<void> {
    let local = false
    if (options.persistence) {
      try {
        const saved = await options.persistence.load(options.key)
        if (r.stopped) return
        if (saved && saved.rows.length > 0) {
          const batch: Batch = new Map()
          r.writer.begin()
          for (const row of saved.rows as T[]) upsert(c, r.writer, row, batch)
          r.writer.commit()
          ready(r)
          local = true
        }
      } catch (cause) {
        if (r.stopped) return
        // A failed load is no saved rows. error() holds it until a list
        // succeeds.
        error = cause
      }
    }
    await fill(r, local)
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
        const r: Run<T> = {
          writer: params,
          abort: new AbortController(),
          stopped: false,
        }
        run = r
        status.set('loading')
        void start(r)
        return () => {
          r.stopped = true
          r.abort.abort()
        }
      },
    },
    utils: {
      refill: () => (run ? fill(run) : Promise.resolve()),
      error: () => error,
      currentAt: () => currentAt,
    },
  })
  register(c, { writer: () => run!.writer, status, error: () => error })
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
