import { collection, liveList, liveRows, recordWrite } from '@wfe/sync'
import type { Feed, Outbox, SyncCollection } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'

type Line = { line_id: number; row_version: number; quantity: number }

// This function is compiled against dist. The consumer does not execute it.
export function keyedRows(feed: Feed<Line, string>, queue: Outbox<number>) {
  const c: SyncCollection<Line> = collection(feed, 'all', {
    key: 'lines:all',
    getKey: (row) => row.line_id,
  })
  const explicit = collection<Line, string>(feed, 'all', {
    key: 'lines:explicit',
    getKey: (row) => row.line_id,
  })
  applyChanges(c, [
    {
      id: 42,
      row_version: 2,
      deleted: false,
      data: { line_id: 42, row_version: 2, quantity: 3 },
    },
    { id: 41, row_version: 2, deleted: true },
  ])
  const record = recordWrite(c, queue, { model: 'lines' })
  const write: Promise<void> = record.write(
    {
      operation: 'lines.update',
      request: { line_id: 42, quantity: 9 },
      request_hash: 'line-42',
      expect: { model: 'lines', id: 42 },
      append_only: false,
    },
    { line_id: 42, quantity: 9 },
  )

  // @ts-expect-error Rows without id require a key accessor.
  collection(feed, 'all', { key: 'lines:invalid' })
  // @ts-expect-error An absent accessor cannot key rows without id.
  collection(feed, 'all', { key: 'lines:invalid', getKey: undefined })
  // @ts-expect-error Explicit row types without id also require an accessor.
  collection<Line, string>(feed, 'all', { key: 'lines:invalid' })

  return { rows: liveRows(c), list: liveList(explicit), record, write }
}
