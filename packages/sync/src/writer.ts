import type { Collection, SyncConfig, UtilsRecord } from '@tanstack/db'
import type { Row } from './types'
import type { StatusSignal } from './status'

/** The sync hooks `@tanstack/db` hands to a custom sync source. */
export type SyncParams<T extends Row> = Parameters<
  SyncConfig<T, string>['sync']
>[0]

export type Writer<T extends Row> = Pick<
  SyncParams<T>,
  'begin' | 'write' | 'commit' | 'markReady' | 'markError'
>

/** Any collection the adapters can read. */
export type AnyCollection<T extends Row> = Collection<
  T,
  string,
  UtilsRecord,
  never
>

/** What `collection()` registers so other modules can write and read status. */
export interface Source<T extends Row> {
  /** The current sync params. A restarted sync run hands over new ones. */
  writer(): Writer<T>
  status: StatusSignal
  error(): unknown
}

const sources = new WeakMap<object, Source<Row>>()

export function register<T extends Row>(
  c: AnyCollection<T>,
  source: Source<T>,
): void {
  sources.set(c, source as Source<Row>)
}

/** The source behind a collection made by `collection()`, or undefined. */
export function peek<T extends Row>(
  c: AnyCollection<T>,
): Source<T> | undefined {
  return sources.get(c) as Source<T> | undefined
}

export function source<T extends Row>(c: AnyCollection<T>): Source<T> {
  const found = peek(c)
  if (!found)
    throw new Error('This collection was not created by @wfe/sync collection()')
  return found
}

/**
 * Versions written in the open sync transaction. A number is the version
 * written for that id; null marks an id deleted in this transaction.
 */
export type Batch = Map<string, number | null>

/** Insert or update one row; equal or lower row_version is ignored. */
export function upsert<T extends Row>(
  c: AnyCollection<T>,
  writer: Writer<T>,
  row: T,
  batch: Batch,
): void {
  const pending = batch.get(row.id)
  const stored =
    pending === undefined
      ? c.get(row.id)?.row_version
      : pending === null
        ? undefined
        : pending
  if (stored === undefined) writer.write({ type: 'insert', value: row })
  else if (row.row_version > stored)
    writer.write({ type: 'update', value: row })
  else return
  batch.set(row.id, row.row_version)
}

/** Delete one row when the collection holds it. */
export function remove<T extends Row>(
  c: AnyCollection<T>,
  writer: Writer<T>,
  id: string,
  batch: Batch,
): void {
  const pending = batch.get(id)
  const present = pending === undefined ? c.has(id) : pending !== null
  if (!present) return
  writer.write({ type: 'delete', key: id })
  batch.set(id, null)
}
