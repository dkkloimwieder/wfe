import { createCollection } from '@tanstack/db'
import type { Collection } from '@tanstack/db'
import { applyChanges } from './applyChanges'
import { CursorExpired } from './errors'
import { createStatus } from './status'
import { register, remove, upsert } from './writer'
import type { AnyCollection, Batch, SyncParams, Writer } from './writer'
import type { Feed, Persistence, Row, Trigger } from './types'

type Utils = {
  /** Run `list` again and reconcile the result into the collection. */
  refill: () => Promise<void>
  /** Run one follow pass now; resolves when it ends. */
  pull: () => Promise<void>
  /** The error of the last failed read, or undefined. */
  error: () => unknown
  /** ISO time of the last successful `list` or `changes`, or undefined. */
  currentAt: () => string | undefined
}

export type SyncCollection<T extends Row> = Collection<T, string, Utils, never>

/** Default interval between follow passes. */
const pollDefault = 10_000
/** A save waits this long; a later save in the wait replaces it. */
const saveDelay = 250

/** One run of the sync function. A restart after cleanup() makes a new run. */
interface Run<T extends Row> {
  writer: Writer<T>
  abort: AbortController
  stopped: boolean
  following: boolean
  /** Stop the timer and unsubscribe the trigger. */
  stops: (() => void)[]
  /** The running passes, until the last one ends. */
  pass?: Promise<void>
  /** A trigger or timer fired during a pass. */
  again: boolean
  save?: ReturnType<typeof setTimeout>
}

/**
 * A collection keyed by `row.id`. It loads saved rows from persistence when
 * given, fills from `feed.list(scope)`, then follows `feed.changes` from the
 * cursor.
 */
export function collection<T extends Row, S>(
  feed: Feed<T, S>,
  scope: S,
  options: {
    /** (model, scope) encoded by the caller; the persistence key. */
    key: string
    /** Saved rows load from here before the list; rows save after writes. */
    persistence?: Persistence
    /** A follow pass runs when the trigger fires. */
    trigger?: Trigger
    /** A follow pass runs on this interval; default 10000. */
    pollMs?: number
    /** Passed to `changes` as its limit; undefined means the host default. */
    pageSize?: number
  },
): SyncCollection<T> {
  const status = createStatus('loading')
  let error: unknown
  let cursor: string | undefined
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

  /** List, reconcile, take the list cursor, and follow. */
  async function fill(r: Run<T>, local = false): Promise<void> {
    try {
      const page = await feed.list(scope, r.abort.signal)
      if (r.stopped) return
      reconcile(c, r.writer, page.rows)
      cursor = page.cursor
      currentAt = new Date().toISOString()
      ready(r)
      scheduleSave(r)
      follow(r)
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
          cursor = saved.cursor
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
    // Saved rows are followed from their cursor when the list failed.
    if (local) follow(r)
  }

  function follow(r: Run<T>): void {
    if (r.following || r.stopped) return
    r.following = true
    const timer = setInterval(() => void fire(r), options.pollMs ?? pollDefault)
    r.stops.push(() => clearInterval(timer))
    if (options.trigger)
      r.stops.push(options.trigger.subscribe(options.key, () => void fire(r)))
  }

  /** Start a pass. During a pass, mark one more pass after it instead. */
  function fire(r: Run<T>): Promise<void> {
    if (r.stopped) return Promise.resolve()
    if (r.pass) {
      r.again = true
      return r.pass
    }
    r.pass = (async () => {
      do {
        r.again = false
        await pass(r)
      } while (r.again && !r.stopped)
      r.pass = undefined
    })()
    return r.pass
  }

  /** Ask `moved`, then read `changes` pages until the feed is complete. */
  async function pass(r: Run<T>): Promise<void> {
    if (cursor === undefined) return
    const { signal } = r.abort
    try {
      if (feed.moved && !(await feed.moved(scope, cursor, signal))) {
        if (!r.stopped) ready(r)
        return
      }
      for (;;) {
        const page = await feed.changes(scope, cursor, options.pageSize, signal)
        if (r.stopped) return
        applyChanges(c, page.rows)
        cursor = page.next_cursor
        scheduleSave(r)
        if (page.complete) break
      }
      currentAt = new Date().toISOString()
      ready(r)
    } catch (cause) {
      if (r.stopped) return
      if (cause instanceof CursorExpired) await fill(r)
      else failed(r, cause)
    }
  }

  function save(r: Run<T>): void {
    r.save = undefined
    if (!options.persistence || cursor === undefined) return
    // A failed save changes no status. The next save writes newer rows.
    options.persistence
      .save(options.key, c.toArray, cursor)
      .catch(() => undefined)
  }
  function scheduleSave(r: Run<T>): void {
    if (!options.persistence) return
    if (r.save !== undefined) clearTimeout(r.save)
    r.save = setTimeout(() => save(r), saveDelay)
  }

  /** The cleanup of one run. TanStack DB calls it before it drops the rows. */
  function stop(r: Run<T>): void {
    if (r.save !== undefined) {
      clearTimeout(r.save)
      save(r)
    }
    r.stopped = true
    r.abort.abort()
    for (const end of r.stops.splice(0)) end()
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
          following: false,
          stops: [],
          again: false,
        }
        run = r
        cursor = undefined
        status.set('loading')
        void start(r)
        return () => stop(r)
      },
    },
    utils: {
      refill: () => (run ? fill(run) : Promise.resolve()),
      pull: () => (run ? fire(run) : Promise.resolve()),
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
