import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, untrack } from 'solid-js'
import {
  createTable,
  createTableSelection,
  ReadOnlyTable,
  Table,
  TableColumnFilter,
  TableFilter,
  TableFormatting,
  TableGrouping,
  TableHeaderName,
  TablePagination,
  TableSort,
  TableWorkspace,
  tableMessages,
} from '@wfe/components/table'
import type { NativeTable, TableMessages } from '@wfe/components/table'
import { spanishTableMessages } from '../../examples/table-read-only/messages.es'
import { resolveMessages } from '../../packages/components/src/internal/messages'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const records = [
  { id: 'a', category: 'Open', amount: 12 },
  { id: 'b', category: 'Open', amount: 20 },
]
function model(grouping: string[] = []) {
  return createTable({
    initialState: { grouping },
    source: {
      ids: () => records.map((row) => row.id),
      get: (id) => records.find((row) => row.id === id),
    },
    columns: [
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        filterFn: (value, filter) => String(value).includes(String(filter)),
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      { id: 'amount', header: 'Amount', accessorKey: 'amount' },
    ],
  })
}

test('partial messages resolve current own values, fall back per key and preserve parameter types', () => {
  let value: Partial<TableMessages> | undefined
  const messages = resolveMessages(tableMessages, () => value)
  expect(messages.refresh).toBe('Refresh results')
  value = {
    refresh: 'Recargar',
    nextPage: undefined,
    recordCount: (count, total) => `${count} de ${total}`,
  }
  expect(messages.refresh).toBe('Recargar')
  expect(messages.nextPage).toBe('Next page')
  expect(messages.recordCount(2, 9)).toBe('2 de 9')
  value = { refresh: '' }
  expect(messages.refresh).toBe('')
  expect(messages.recordCount(2, 9)).toBe('2/9 records')
  expect(messages.pageRecordCount(2, undefined)).toBe('2')
  expect(messages.pageRecordCount(2, 9)).toBe('2/9')
  expect(messages.groupRecordsCount(1)).toBe('1 record')
  expect(messages.groupRecordsCount(2)).toBe('2 records')
  // The example must translate every key as the public contract grows.
  expect(Object.keys(spanishTableMessages).sort()).toEqual(
    Object.keys(tableMessages).sort(),
  )
})

test('ReadOnlyTable forwards reactive messages while retaining focused filter drafts, rows and pagination', () => {
  const [messages, setMessages] = createSignal<Partial<TableMessages>>()
  const next = vi.fn()
  const h = render(() => <ReadOnlyFixture />)
  function ReadOnlyFixture() {
    const table = model()
    return (
      <ReadOnlyTable
        table={table}
        messages={messages()}
        pagination={{
          hasPrevious: false,
          hasNext: true,
          onPrevious: () => {},
          onNext: next,
          totalRows: 9,
          messages: { nextPage: 'Adelante' },
        }}
      />
    )
  }
  const input = h.getByRole('textbox', { name: 'Category' }) as HTMLInputElement
  const row = h.container.querySelector('[data-row="a"]')
  const sort = h.getByRole('button', { name: 'Sort by Category' })
  const refresh = h.getByRole('button', { name: 'Refresh results' })
  const nextButton = h.getByRole('button', { name: 'Adelante' })
  fireEvent.input(input, { target: { value: 'O' } })
  input.focus()
  flush()
  setMessages(spanishTableMessages)
  flush()
  expect(h.getByRole('textbox', { name: 'Category' })).toBe(input)
  expect(input.value).toBe('O')
  expect(document.activeElement).toBe(input)
  expect(h.container.querySelector('[data-row="a"]')).toBe(row)
  expect(h.getByRole('button', { name: 'Ordenar por Category' })).toBe(sort)
  expect(h.getByRole('button', { name: 'Actualizar resultados' })).toBe(refresh)
  expect(h.getByRole('navigation', { name: 'Páginas de tabla' })).toBeTruthy()
  expect(h.getByRole('button', { name: 'Adelante' })).toBe(nextButton)
  expect(
    h.getByRole('button', { name: 'Borrar filtro de Category' }),
  ).toBeTruthy()
  expect(h.getByText('Cambios sin aplicar')).toBeTruthy()
  expect(h.getByRole('button', { name: 'Controles de tabla' })).toBeTruthy()
  fireEvent.click(nextButton)
  expect(next).toHaveBeenCalledOnce()
  setMessages({ refresh: 'Reload' })
  flush()
  expect(h.getByRole('button', { name: 'Reload' })).toBe(refresh)
  expect(h.getByRole('button', { name: 'Sort by Category' })).toBe(sort)
})

test('Table passes translated group and selection counts without rebuilding accepted groups', () => {
  const [messages, setMessages] = createSignal<Partial<TableMessages>>()
  let table!: NativeTable<(typeof records)[number]>
  let selection!: ReturnType<typeof createTableSelection>
  const h = render(() => {
    table = model(['category'])
    selection = createTableSelection({
      rows: () => ['a', 'b'],
      columns: () => ['category', 'amount'],
      getText: () => '',
    })
    return <Table table={table} messages={messages()} selection={selection} />
  })
  selection.selectAll()
  flush()
  const toggle = h.getByRole('button', { name: 'Expand category: Open' })
  const group = toggle.closest('tr')
  expect(h.getByText('2 records')).toBeTruthy()
  setMessages(spanishTableMessages)
  flush()
  expect(h.getByRole('button', { name: 'Expandir category: Open' })).toBe(
    toggle,
  )
  expect(toggle.closest('tr')).toBe(group)
  expect(h.getByText('2 registros')).toBeTruthy()
  expect(h.getByText('2 filas por 2 columnas seleccionadas')).toBeTruthy()
  expect(untrack(() => table.state.grouping)).toEqual(['category'])
})

test('grouping messages retain controls and accepted ordering', () => {
  const [messages, setMessages] = createSignal<Partial<TableMessages>>()
  const h = render(() => {
    const table = model(['category'])
    return (
      <TableGrouping
        table={table}
        messages={messages()}
        label={(id) => id}
        groupable={() => true}
      />
    )
  })
  const order = h.getByRole('button', { name: /^Order category groups/ })
  setMessages(spanishTableMessages)
  flush()
  expect(h.getByRole('button', { name: /^Ordenar grupos de category/ })).toBe(
    order,
  )
  expect(
    h.getByRole('button', { name: 'Quitar agrupación de category' }),
  ).toBeTruthy()
  expect(h.getByText('Agrupar registros')).toBeTruthy()
})

test('filter and formatting messages update choice labels without changing values', () => {
  const [messages, setMessages] = createSignal<Partial<TableMessages>>()
  const h = render(() => (
    <>
      <TableFilter
        messages={messages()}
        label="Active"
        clearLabel="Erase"
        kind="boolean"
        value="true"
        onValueChange={() => {}}
      />
      <TableColumnFilter
        messages={messages()}
        label="Price"
        clearLabel="Reset price"
        config={{ kind: 'number-range' }}
        value={{ operator: 'between', min: 2 }}
        onValueChange={() => {}}
      />
      <TableFormatting
        messages={messages()}
        columns={[{ id: 'amount', label: 'Amount', kind: 'number' }]}
        value={{ amount: 'number-plain' }}
        onValueChange={() => {}}
      />
    </>
  ))
  const minimum = h.getByRole('spinbutton', { name: 'Price minimum' })
  const format = h.getByRole('button', { name: /^Amount/ })
  setMessages(spanishTableMessages)
  flush()
  expect(h.getByRole('spinbutton', { name: 'Mínimo de Price' })).toBe(minimum)
  expect((minimum as HTMLInputElement).value).toBe('2')
  expect(h.getByRole('button', { name: /^Amount/ })).toBe(format)
  expect(format.textContent).toContain('Número simple')
  expect(
    h.getByText('Sí. Pulse Espacio para alternar Sí, No y Cualquiera.'),
  ).toBeTruthy()
})

test('explicit public labels win over messages and header editing retains its draft', () => {
  const [messages, setMessages] = createSignal<Partial<TableMessages>>()
  const renamed = vi.fn()
  const h = render(() => (
    <>
      <TableWorkspace
        messages={messages()}
        label="Custom workspace"
        controlsLabel="Custom panel"
        toggleLabel="Custom toggle"
        closeLabel="Custom close"
        controls={<span>Options</span>}
      >
        Content
      </TableWorkspace>
      <TableSort
        messages={messages()}
        label="Amount"
        accessibleLabel="Custom sort"
        sorted={false}
        onSort={() => {}}
      />
      <TablePagination
        messages={messages()}
        label="Custom pages"
        hasNext={false}
        hasPrevious={false}
        onNext={() => {}}
        onPrevious={() => {}}
      />
      <TableHeaderName
        messages={messages()}
        label="Amount"
        sorted={false}
        onSort={() => {}}
        onRename={renamed}
      />
    </>
  ))
  fireEvent.click(h.getByRole('button', { name: 'Rename Amount header' }))
  flush()
  const input = h.getByRole('textbox', {
    name: 'Header name for Amount',
  }) as HTMLInputElement
  fireEvent.input(input, { target: { value: 'Total' } })
  input.focus()
  setMessages(spanishTableMessages)
  flush()
  expect(h.getByRole('textbox', { name: 'Nombre del encabezado Amount' })).toBe(
    input,
  )
  expect(input.value).toBe('Total')
  expect(document.activeElement).toBe(input)
  expect(h.getByRole('button', { name: 'Custom toggle' })).toBeTruthy()
  expect(h.getByRole('button', { name: 'Custom sort' })).toBeTruthy()
  expect(h.getByRole('navigation', { name: 'Custom pages' })).toBeTruthy()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(renamed).toHaveBeenCalledWith('Total')
})
