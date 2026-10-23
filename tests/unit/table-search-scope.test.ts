import { afterEach, expect, test, vi } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { createTable, createTableSelection } from '@wfe/components/table'

const disposers: Array<() => void> = []
afterEach(() => {
  for (const dispose of disposers.splice(0).reverse()) dispose()
  flush()
})
function owned<T>(setup: () => T) {
  return createRoot((dispose) => {
    disposers.push(dispose)
    return setup()
  })
}
const records = {
  a: { name: 'Alpha', note: 'match', excluded: 'private' },
  b: { name: 'Beta', note: 'other', excluded: 'match' },
}
const columns = [
  { id: 'name', accessorKey: 'name' as const },
  { id: 'note', accessorKey: 'note' as const },
  {
    id: 'excluded',
    accessorKey: 'excluded' as const,
    enableGlobalFilter: false,
  },
  { id: 'actions' },
]
function source() {
  return {
    ids: () => ['a', 'b'],
    get: (id: string) => records[id as keyof typeof records],
  }
}

test.each([undefined, 'visible'] as const)(
  'search scope %s preserves visible-column matching',
  (scope) => {
    const table = owned(() =>
      createTable({ source: source(), columns, globalFilterScope: scope }),
    )
    table.setGlobalFilter('match')
    flush()
    expect(table.getFilteredRowIds()).toEqual(['a'])
    table.setColumnVisibility({ note: false })
    flush()
    expect(table.getFilteredRowIds()).toEqual([])
    table.setColumnVisibility({ note: true })
    flush()
    expect(table.getFilteredRowIds()).toEqual(['a'])
  },
)

test('all-column search retains hidden matches and respects per-column exclusion', () => {
  const match = vi.fn((value: unknown, query: string) =>
    String(value).includes(query),
  )
  const table = owned(() =>
    createTable({
      source: source(),
      columns,
      globalFilterScope: 'all',
      globalFilterFn: match,
      initialState: {
        globalFilter: 'match',
        columnVisibility: { note: false },
      },
    }),
  )
  expect(table.getFilteredRowIds()).toEqual(['a'])
  expect(match.mock.calls.some(([value]) => value === 'private')).toBe(false)
  expect(match.mock.calls.some(([value]) => value === undefined)).toBe(false)
  table.setColumnVisibility({ name: false, note: false, excluded: false })
  flush()
  expect(table.getFilteredRowIds()).toEqual(['a'])
  table.setGlobalFilter('private')
  flush()
  expect(table.getFilteredRowIds()).toEqual([])
})

test('reactive search scope updates membership while manual filtering retains application rows', () => {
  const [scope, setScope] = createSignal<'visible' | 'all'>('visible')
  const [manual, setManual] = createSignal(false)
  const table = owned(() =>
    createTable({
      source: source(),
      columns,
      get globalFilterScope() {
        return scope()
      },
      get manualFiltering() {
        return manual()
      },
      initialState: {
        globalFilter: 'match',
        columnVisibility: { note: false },
      },
    }),
  )
  expect(table.getFilteredRowIds()).toEqual([])
  setScope('all')
  flush()
  expect(table.getFilteredRowIds()).toEqual(['a'])
  setManual(true)
  flush()
  expect(table.getFilteredRowIds()).toEqual(['a', 'b'])
  setScope('visible')
  flush()
  expect(table.getFilteredRowIds()).toEqual(['a', 'b'])
  setManual(false)
  flush()
  expect(table.getFilteredRowIds()).toEqual([])
})

test('record selection for application actions stays independent from copied cell ranges', () => {
  const { table, selection } = owned(() => {
    const table = createTable({ source: source(), columns })
    const selection = createTableSelection({
      rows: () => table.getRowIds(),
      columns: () => ['name'],
      getText: ({ row, column }) => String(table.getValue(row, column)),
    })
    return { table, selection }
  })
  table.getRow('b').toggleSelected(true)
  selection.select({ row: 'a', column: 'name' })
  flush()
  expect(table.state.rowSelection).toEqual({ b: true })
  expect(selection.copyText()).toBe('Alpha')
  selection.clear()
  flush()
  expect(table.getRow('b').getIsSelected()).toBe(true)
  selection.select({ row: 'a', column: 'name' })
  table.setRowSelection({})
  flush()
  expect(selection.copyText()).toBe('Alpha')
})
