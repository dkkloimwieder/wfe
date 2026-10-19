import { uiScope } from '@wfe/components'
import { render } from '@solidjs/web'
import {
  OBSERVE,
  action,
  createSignal,
  flush,
  onCleanup,
  untrack,
} from 'solid-js'
import { Table, TableRow, ReadOnlyTable } from '@wfe/components/table'
import {
  createTable,
  createTableSelection,
  nativeAggregations,
} from '@wfe/components/table'
import { VirtualRows, createTableVirtualizer } from '@wfe/components/virtual'
import type { TableSelection, TableSelectionCell } from '@wfe/components/table'
import '@wfe/components/styles.css'
import '../fixture-page.css'

type RecordData = { category: string; name: string; amount: number }
const textColumn = {
  filterFn: (value: unknown, filter: unknown) =>
    String(value ?? '')
      .toLowerCase()
      .includes(String(filter).toLowerCase()),
  sortFn: (a: unknown, b: unknown) =>
    String(a ?? '').localeCompare(String(b ?? '')),
}
const initial = [
  { id: 'a', values: { category: 'West', name: 'Desk', amount: 42 } },
  { id: 'b', values: { category: 'East', name: 'Lamp', amount: 7 } },
  { id: 'c', values: { category: 'West', name: 'Chair', amount: 12 } },
]
let failCopy = false
let currentSelection: TableSelection | undefined
let currentVirtualizer:
  ReturnType<typeof createTableVirtualizer<string>> | undefined
let readStats:
  | (() => {
      mounts: number
      unmounts: number
      cells: number
      copyReads: number
    })
  | undefined
let dispose: (() => void) | undefined
let replace: ((rows: typeof initial) => void) | undefined
let capture:
  ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']> | undefined
const events: Array<unknown> = []
// eslint-disable-next-line require-yield -- Use the qualified runtime disposal path.
const disposeRoot = action(function* () {
  dispose?.()
})
function stop() {
  disposeRoot()
  dispose = undefined
  replace = undefined
  currentSelection = undefined
  currentVirtualizer = undefined
  readStats = undefined
  flush()
}
function start(virtual = false) {
  stop()
  events.push(...(capture?.stop() ?? []))
  capture = OBSERVE?.diagnostics.capture()
  failCopy = false
  dispose = render(() => {
    const counts = { mounts: 0, unmounts: 0, cells: 0, copyReads: 0 }
    readStats = () => ({ ...counts })
    const [rows, setRows] = createSignal(
      virtual
        ? Array.from({ length: 1000 }, (_, index) => ({
            id: `r${index}`,
            values: {
              category: `Category ${index}`,
              name: `Name ${index}`,
              amount: index,
            },
          }))
        : initial,
    )
    replace = (value) => {
      setRows(value)
      flush()
    }
    const table = createTable<RecordData>({
      source: {
        ids: () => rows().map((row) => row.id),
        get: (id) => rows().find((row) => row.id === id)?.values,
      },
      columns: [
        {
          ...textColumn,
          id: 'category',
          header: 'Category',
          accessorKey: 'category',
        },
        { ...textColumn, id: 'name', header: 'Name', accessorKey: 'name' },
        {
          ...textColumn,
          id: 'amount',
          header: 'Amount',
          enableHiding: false,
          accessorKey: 'amount',
          sortFn: (a, b) => Number(a) - Number(b),
          aggregationFn: nativeAggregations.sum,
        },
      ],
    })
    let viewport: HTMLDivElement | undefined
    const virtualizer = virtual
      ? createTableVirtualizer<string>({
          mode: 'fixed',
          get count() {
            return table.getRowIds().length
          },
          rowHeight: 32,
          getItemKey: (index) => untrack(() => table.getRowIds()[index]!),
          getIndexForKey: (key) =>
            untrack(() => table.getRowIds().indexOf(key)),
          getScrollElement: () => viewport ?? null,
          get scrollMargin() {
            return viewport?.querySelector('thead')?.offsetHeight ?? 0
          },
          observeElements: () =>
            Array.from(viewport?.querySelectorAll('thead') ?? []),
        })
      : undefined
    currentVirtualizer = virtualizer
    const selection = createTableSelection({
      rows: () =>
        table.getDisplayKeys().flatMap((key) => {
          const item = table.getDisplayItem(key)
          return item.kind === 'row' ? [item.id] : []
        }),
      columns: () => table.getVisibleColumns().map((column) => column.id),
      getText: ({ row, column }) => {
        if (failCopy) throw new Error('Copy text is unavailable')
        counts.copyReads++
        return String(table.getValue(row, column) ?? '')
      },
      onReveal: (cell) => {
        virtualizer?.scrollToKey(cell.row)
      },
    })
    currentSelection = selection
    return (
      <main data-ui-portal-root="" {...uiScope()}>
        <h1>Read-only table</h1>
        {virtualizer ? (
          <div
            class="table-scroll"
            ref={(node) => {
              viewport = node
            }}
            style={{ height: '360px' }}
          >
            <Table
              table={table}
              selection={selection}
              accessibleLabel="Virtual selection"
              width={900}
              renderBody={() => (
                <VirtualRows
                  window={virtualizer}
                  layout="table"
                  columns={() => 3}
                  renderRow={(id) => {
                    counts.mounts++
                    onCleanup(() => counts.unmounts++)
                    return (
                      <TableRow
                        table={table}
                        id={id}
                        onCell={() => counts.cells++}
                      />
                    )
                  }}
                />
              )}
            />
          </div>
        ) : (
          <ReadOnlyTable table={table} selection={selection} />
        )}
      </main>
    )
  }, document.getElementById('root')!)
  flush()
}
const api = {
  start,
  stop,
  setCopyFailure: (value: boolean) => {
    failCopy = value
  },
  select: (anchor: TableSelectionCell, focus = anchor) => {
    currentSelection?.select(anchor)
    currentSelection?.select(focus, true)
    flush()
  },
  scrollTo: (id: string) => currentVirtualizer?.scrollToKey(id),
  stats: () => readStats?.(),
  replace: (rows: typeof initial) => replace?.(rows),
  diagnostics: () => {
    events.push(...(capture?.stop() ?? []))
    capture = OBSERVE?.diagnostics.capture()
    return events.splice(0)
  },
}
declare global {
  interface Window {
    readOnlyFixture: typeof api
  }
}
window.readOnlyFixture = api
start()
