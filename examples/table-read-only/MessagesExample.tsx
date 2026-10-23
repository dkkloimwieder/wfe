import { createSignal } from 'solid-js'
import { Button } from '@wfe/components'
import {
  createTable,
  createTableSelection,
  ReadOnlyTable,
  TableFormatting,
  TableHeaderName,
  TableColumnResize,
  TableHeaderFilter,
} from '@wfe/components/table'
import type { ValueFormat } from '@wfe/components'
import { spanishTableMessages } from './messages.es'

/** Language changes update text while the controller, drafts and DOM stay mounted. */
export function MessagesExample() {
  const [spanish, setSpanish] = createSignal(true)
  const messages = () => (spanish() ? spanishTableMessages : undefined)
  const records = [
    { id: 'a', name: 'Lámpara', amount: 12 },
    { id: 'b', name: 'Mesa', amount: 45 },
  ]
  const table = createTable({
    source: {
      ids: () => records.map((row) => row.id),
      get: (id) => records.find((row) => row.id === id),
    },
    columns: [
      {
        id: 'name',
        header: 'Artículo',
        accessorKey: 'name',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
        filterFn: (value, filter) => String(value).includes(String(filter)),
      },
      {
        id: 'amount',
        header: 'Importe',
        accessorKey: 'amount',
        sortFn: (a, b) => Number(a) - Number(b),
      },
    ],
  })
  const selection = createTableSelection({
    rows: () => table.getRowIds(),
    columns: () => table.getVisibleColumns().map((column) => column.id),
    getText: ({ row, column }) => String(table.getValue(row, column) ?? ''),
  })
  const [format, setFormat] = createSignal<ValueFormat>('number-plain')
  const [alias, setAlias] = createSignal('Importe')
  const [width, setWidth] = createSignal(160)
  const [filter, setFilter] = createSignal('')
  return (
    <>
      <Button onClick={() => setSpanish((value) => !value)}>
        English / Español
      </Button>
      <ReadOnlyTable
        table={table}
        messages={messages()}
        selection={selection}
        pagination={{
          hasPrevious: false,
          hasNext: true,
          onPrevious: () => {},
          onNext: () => {},
          totalRows: 20,
          pageSize: { value: 2, options: [2, 5], onValueChange: () => {} },
        }}
        formatting={
          <TableFormatting
            messages={messages()}
            columns={[{ id: 'amount', label: 'Importe', kind: 'number' }]}
            value={{ amount: format() }}
            onValueChange={(_, value) => setFormat(value)}
          />
        }
        configuration={
          <>
            <TableHeaderName
              messages={messages()}
              label={alias()}
              sorted={false}
              onSort={() => {}}
              onRename={setAlias}
            />
            <TableColumnResize
              messages={messages()}
              label={alias()}
              size={width()}
              min={80}
              max={400}
              onSizeChange={setWidth}
            />
            <TableHeaderFilter
              messages={messages()}
              columnId="name"
              columnLabel="Artículo"
              label="Artículo"
              clearLabel={spanish() ? 'Borrar artículo' : 'Clear item'}
              value={filter()}
              onValueChange={setFilter}
            />
          </>
        }
      />
    </>
  )
}
