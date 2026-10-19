import { GridView } from '@wfe/generator'
import type {
  GridDescription,
  GridBindings,
  GridCellChange,
  GridViewProps,
} from '@wfe/generator'
const description = {
  id: 'capabilities',
  rows: [
    { id: 'reader', label: 'Reader' },
    { id: 'editor', label: 'Editor', disabled: true },
  ],
  columns: [
    { id: 'view', label: 'View', readOnly: true },
    { id: 'change', label: 'Change' },
  ],
} as const satisfies GridDescription
const bindings: GridBindings<typeof description> = {
  value: (row, column) => {
    const r: 'reader' | 'editor' = row
    const c: 'view' | 'change' = column
    return r === 'editor' && c === 'change'
  },
  onValueChange: (requested) => {
    const r: 'reader' | 'editor' = requested.row
    const c: 'view' | 'change' = requested.column
    const v: boolean = requested.value
    void [r, c, v]
  },
}
const props: GridViewProps<typeof description> = { description, bindings }
void props
bindings.value('reader', 'view')
// @ts-expect-error Unknown row IDs cannot request values.
bindings.value('missing', 'view')
// @ts-expect-error Unknown column IDs cannot request values.
bindings.value('reader', 'missing')
// @ts-expect-error Requests contain boolean values.
bindings.onValueChange({ row: 'editor', column: 'change', value: 'yes' })
const bad: GridCellChange<typeof description> = {
  // @ts-expect-error Requests cannot name unknown row IDs.
  row: 'missing',
  column: 'view',
  value: true,
}
void bad
// @ts-expect-error A value getter alone cannot supply changes.
const incomplete: GridBindings<typeof description> = { value: () => false }
void incomplete

GridView(props)
