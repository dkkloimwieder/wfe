import { remove, source, upsert } from './writer'
import type { AnyCollection, Batch } from './writer'
import type { Change, Row } from './types'

/**
 * Apply one feed batch as one sync transaction. A deleted change removes the
 * row. Any other change inserts or updates by the version rule: equal or
 * lower versions are ignored. The version of `data` is read through the
 * accessor of the collection. Epic 2a `follow` calls this per batch.
 */
export function applyChanges<T extends Row>(
  c: AnyCollection<T>,
  changes: Change<T>[],
): void {
  const { version } = source(c)
  const writer = source(c).writer()
  const batch: Batch = new Map()
  writer.begin()
  for (const change of changes) {
    if (change.deleted) remove(c, writer, change.id, batch)
    else upsert(c, writer, change.data, batch, version)
  }
  writer.commit()
}
