import type { Collection, SyncConfig, UtilsRecord } from '@tanstack/db'
import type { Key, Version } from './types'
import type { SourceSignal, StatusSignal } from './status'

/** The sync hooks `@tanstack/db` hands to a custom sync source. */
export type SyncParams<T extends object> = Parameters<
  SyncConfig<T, string | number>['sync']
>[0]

export type Writer<T extends object> = Pick<
  SyncParams<T>,
  'begin' | 'write' | 'commit' | 'markReady' | 'markError'
>

/** Any collection the adapters can read. */
export type AnyCollection<T extends object> = Collection<
  T,
  string | number,
  UtilsRecord,
  never
>

/** What `collection()` registers so other modules can write and read status. */
export interface Source<T extends object> {
  /** The current sync params. A restarted sync run hands over new ones. */
  writer(): Writer<T>
  status: StatusSignal
  complete: SourceSignal<boolean>
  currentAt: SourceSignal<string | undefined>
  error(): unknown
  /** Reads the version of a row; `options.version` of the collection. */
  version: Version<T>
  /** Reads the key of a row; `options.getKey` of the collection. */
  getKey: Key<T>
}

const sources = new WeakMap<object, Source<object>>()

export function register<T extends object>(
  c: AnyCollection<T>,
  source: Source<T>,
): void {
  sources.set(c, source as Source<object>)
}

/** The source behind a collection made by `collection()`, or undefined. */
export function peek<T extends object = object>(
  c: object,
): Source<T> | undefined {
  return sources.get(c) as Source<T> | undefined
}

export function source<T extends object>(c: AnyCollection<T>): Source<T> {
  const found = peek<T>(c)
  if (!found)
    throw new Error('This collection was not created by @wfe/sync collection()')
  return found
}

/**
 * Versions written in the open sync transaction. A number is the version
 * written for that id; null marks an id deleted in this transaction.
 */
export type Batch = Map<string | number, number | null>

/** Insert or replace one row; only a lower version is ignored. */
export function upsert<T extends object>(
  c: AnyCollection<T>,
  writer: Writer<T>,
  row: T,
  batch: Batch,
  version: Version<T>,
  getKey: Key<T>,
): void {
  const id = getKey(row)
  const pending = batch.get(id)
  const held = pending === undefined ? c.get(id) : undefined
  const stored =
    pending === undefined
      ? held === undefined
        ? undefined
        : version(held)
      : pending === null
        ? undefined
        : pending
  const incoming = version(row)
  if (stored === undefined) writer.write({ type: 'insert', value: row })
  // Equal snapshot xmin values can come from different reads. The later row
  // wins; TanStack DB suppresses change events when its values are identical.
  else if (incoming >= stored) writer.write({ type: 'update', value: row })
  else return
  batch.set(id, incoming)
}

/** Delete one row when the collection holds it. */
export function remove<T extends object>(
  c: AnyCollection<T>,
  writer: Writer<T>,
  id: string | number,
  batch: Batch,
): void {
  const pending = batch.get(id)
  const present = pending === undefined ? c.has(id) : pending !== null
  if (!present) return
  writer.write({ type: 'delete', key: id })
  batch.set(id, null)
}
