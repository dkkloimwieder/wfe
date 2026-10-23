import { requireValue, requireObject, requireText, requireKeys } from './guards'
import type { GridDescription } from './gridTypes'

function object(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  requireObject(value, `grid ${label}`)
}
function text(value: unknown, label: string): asserts value is string {
  requireText(value, `grid ${label}`)
}
function keys(value: object, allowed: readonly string[], label: string) {
  requireKeys(value, allowed, `grid ${label}`)
}
function array(value: unknown, label: string) {
  requireValue(Array.isArray(value), `invalid grid ${label}`)
}

/** Metadata only. Accepted cell values and changes belong to the application. */
export function createGridModel<D extends GridDescription>(description: D) {
  object(description, 'description')
  keys(description, ['id', 'title', 'rows', 'columns'], 'description')
  text(description.id, 'ID')
  if (description.title !== undefined) text(description.title, 'title')
  array(description.rows, 'rows')
  array(description.columns, 'columns')
  const rows = new Map<string, D['rows'][number]>()
  const columns = new Map<string, D['columns'][number]>()
  for (const row of description.rows) {
    object(row, 'row')
    keys(row, ['id', 'label', 'disabled'], 'row')
    text(row.id, 'row ID')
    text(row.label, 'row label')
    requireValue(
      row.disabled === undefined || typeof row.disabled === 'boolean',
      `invalid grid row disabled flag "${row.id}"`,
    )
    requireValue(!rows.has(row.id), `duplicate grid row "${row.id}"`)
    rows.set(row.id, row)
  }
  for (const column of description.columns) {
    object(column, 'column')
    keys(column, ['id', 'label', 'readOnly'], 'column')
    text(column.id, 'column ID')
    text(column.label, 'column label')
    requireValue(
      column.readOnly === undefined || typeof column.readOnly === 'boolean',
      `invalid grid column readOnly flag "${column.id}"`,
    )
    requireValue(
      !columns.has(column.id),
      `duplicate grid column "${column.id}"`,
    )
    columns.set(column.id, column)
  }
  return { id: description.id, rows, columns }
}
