import { remove, source, upsert } from './writer'
import type { AnyCollection, Batch } from './writer'
import type { Change } from './types'

/**
 * Apply one feed batch as one sync transaction. A deleted change removes the
 * row. Any other change inserts or replaces by the version rule: only
 * lower versions are ignored. The version of `data` is read through the
 * accessor of the collection. Each upsert id must equal `getKey(data)`.
 * A delete id is the collection key. A mismatched batch throws before writes.
 * Epic 2a `follow` calls this per batch.
 */
export function applyChanges<T extends object>(
  c: AnyCollection<T>,
  changes: Change<T>[],
): void {
  const { version, getKey } = source(c)
  for (const change of changes) {
    if (!change.deleted && change.id !== getKey(change.data))
      throw new Error('Change id must equal the collection key of its data')
  }
  const writer = source(c).writer()
  const batch: Batch = new Map()
  writer.begin()
  for (const change of changes) {
    if (change.deleted) remove(c, writer, change.id, batch)
    else upsert(c, writer, change.data, batch, version, getKey)
  }
  writer.commit()
}
