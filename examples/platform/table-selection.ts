import { createTableSelection } from '@wfe/components/table'
import type { NativeTable } from '@wfe/components/table'

/** Application presentation values. Commands and unloaded records are excluded. */
export function createPlatformTableSelection<T>(table: NativeTable<T>) {
  return createTableSelection({
    rows: () =>
      table.getDisplayKeys().flatMap((key) => {
        const item = table.getDisplayItem(key)
        return item.kind === 'row' ? [item.id] : []
      }),
    columns: () =>
      table
        .getVisibleColumns()
        .filter((column) => column.id !== 'actions')
        .map((column) => column.id),
    getText: ({ row, column }) => {
      const value = table.getValue(row, column)
      return typeof value === 'boolean'
        ? value
          ? 'Yes'
          : 'No'
        : Array.isArray(value)
          ? value.join(', ')
          : String(value ?? '')
    },
  })
}
