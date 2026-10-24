import { createSignal, untrack } from 'solid-js'
import { TableView } from '@wfe/generator'
import { createTable, createTableSelection } from '@wfe/components/table'

/** The example application owns records, expansion, and child table state. */
export function SubTables(props: { initiallyExpanded?: boolean } = {}) {
  const records = [
    { id: 'alpha', name: 'Collection A', count: 2 },
    { id: 'beta', name: 'Collection B', count: 0 },
  ]
  const items = [
    { id: 'one', name: 'First item', status: 'Open' },
    { id: 'two', name: 'Second item', status: 'Closed' },
  ]
  const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(
    new Set(untrack(() => props.initiallyExpanded) ? ['alpha'] : []),
  )
  const text = {
    sortFn: (a: unknown, b: unknown) => String(a).localeCompare(String(b)),
  }
  const parent = createTable({
    source: {
      ids: () => records.map((r) => r.id),
      get: (id) => records.find((r) => r.id === id),
    },
    columns: [
      { ...text, id: 'name', accessorKey: 'name', header: 'Name' },
      { id: 'count', accessorKey: 'count', header: 'Items' },
    ],
  })
  const children = new Map(
    records.map((record) => {
      const rows = record.id === 'alpha' ? items : []
      const table = createTable({
        source: {
          ids: () => rows.map((r) => r.id),
          get: (id) => rows.find((r) => r.id === id),
        },
        columns: [
          { ...text, id: 'name', accessorKey: 'name', header: 'Name' },
          { ...text, id: 'status', accessorKey: 'status', header: 'Status' },
        ],
      })
      const selection = createTableSelection({
        rows: () =>
          table.getDisplayKeys().flatMap((key) => {
            const item = table.getDisplayItem(key)
            return item.kind === 'row' ? [item.id] : []
          }),
        columns: () => table.getVisibleColumns().map((c) => c.id),
        getText: ({ row, column }) => String(table.getValue(row, column) ?? ''),
      })
      const [collapsed, setCollapsed] = createSignal(true)
      return [
        record.id,
        {
          table,
          selection,
          get controlsCollapsed() {
            return collapsed()
          },
          onControlsCollapsedChange: setCollapsed,
        },
      ] as const
    }),
  )
  const [controlsCollapsed, setControlsCollapsed] = createSignal(true)
  const selection = createTableSelection({
    rows: () =>
      parent.getDisplayKeys().flatMap((key) => {
        const item = parent.getDisplayItem(key)
        return item.kind === 'row' ? [item.id] : []
      }),
    columns: () => parent.getVisibleColumns().map((c) => c.id),
    getText: ({ row, column }) => String(parent.getValue(row, column) ?? ''),
  })
  const render = (id: string) => (
    <TableView
      description={{
        id: `items-${id}`,
        title: 'Items',
        columns: { name: {}, status: {} },
      }}
      bindings={{ ...children.get(id)! }}
    />
  )
  return (
    <div
      class="gallery-table"
      style={{ display: 'flex', 'flex-direction': 'column' }}
    >
      <TableView
        description={{
          id: 'collections',
          title: 'Collections',
          columns: { name: {}, count: {} },
        }}
        bindings={{
          table: parent,
          selection,
          controlsCollapsed: controlsCollapsed(),
          onControlsCollapsedChange: setControlsCollapsed,
          rowDetails: {
            expanded: (id) => expanded().has(id),
            onExpandedChange: (id, open) =>
              setExpanded((current) => {
                const next = new Set(current)
                if (open) next.add(id)
                else next.delete(id)
                return next
              }),
            label: (id, open) =>
              `${open ? 'Collapse' : 'Expand'} ${records.find((r) => r.id === id)!.name}`,
            render,
          },
        }}
      />
    </div>
  )
}
