import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from '@solidjs/testing-library'
import { Show, createRoot, createSignal, flush } from 'solid-js'
import { Button } from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import {
  type TableRowActionContext,
  ReadOnlyTable,
  TableWorkspace,
  createTable,
  createTableFilterDraft,
} from '@wfe/components/table'

const records = [
  { id: 'a', name: 'Adapter', quantity: 50 },
  { id: 'b', name: 'Cable', quantity: 20 },
  { id: 'c', name: 'Keyboard', quantity: 10 },
]

function model(ids = () => records.map(({ id }) => id)) {
  return createTable({
    source: { ids, get: (id) => records.find((row) => row.id === id) },
    columns: [
      {
        id: 'name',
        header: 'Product',
        accessorKey: 'name',
        filterFn: (value, filter) =>
          typeof value === 'string' &&
          typeof filter === 'string' &&
          value.toLowerCase().includes(filter.toLowerCase()),
      },
      {
        id: 'quantity',
        header: 'Quantity',
        accessorKey: 'quantity',
        sortFn: (left, right) => Number(left) - Number(right),
      },
    ],
  })
}

function rowIds(container: ParentNode) {
  return Array.from(container.querySelectorAll('tr[data-row]'), (row) =>
    row.getAttribute('data-row'),
  )
}

async function choose(trigger: HTMLElement, name: string) {
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  const options = within(document.body)
  const option = await options.findByRole('option', { name })
  fireEvent.click(option)
  flush()
}

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('workspace applies the latest delivered boxes together on the next frame', () => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
  })
  let deliver: ((entries: ResizeObserverEntry[]) => void) | undefined
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        deliver = (entries) => callback(entries, this)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  using getBounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
  const h = render(() => (
    <TableWorkspace resultsHeader="Records" controls="Filters">
      Rows
    </TableWorkspace>
  ))
  const workspace = h.container.querySelector<HTMLElement>('.table-workspace')!
  const header = workspace.querySelector('header')!
  const resize = (
    target: Element,
    width: number,
    height: number,
  ): ResizeObserverEntry => ({
    target,
    borderBoxSize: [{ inlineSize: width, blockSize: height }],
    contentBoxSize: [],
    contentRect: new DOMRect(),
    devicePixelContentBoxSize: [],
  })
  deliver?.([resize(workspace, 500, 300), resize(header, 500, 56)])
  deliver?.([resize(header, 500, 48)])
  expect(workspace.hasAttribute('data-ui-responsive-ready')).toBe(false)
  vi.advanceTimersToNextFrame()
  flush()
  expect(workspace.style.getPropertyValue('--ui-table-header-height')).toBe(
    '48px',
  )
  expect(workspace.hasAttribute('data-controls-drawer')).toBe(true)

  deliver?.([resize(workspace, 1000, 300)])
  vi.advanceTimersToNextFrame()
  flush()
  expect(workspace.hasAttribute('data-controls-drawer')).toBe(false)
  expect(workspace.style.getPropertyValue('--ui-table-header-height')).toBe(
    '48px',
  )

  deliver?.([resize(header, 1000, 34)])
  vi.advanceTimersToNextFrame()
  flush()
  expect(workspace.style.getPropertyValue('--ui-table-header-height')).toBe(
    '34px',
  )
  expect(getBounds).not.toHaveBeenCalled()

  deliver?.([resize(header, 1000, 90)])
  h.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test('custom cells track data changes without Solid development warnings', () => {
  using warnings = vi.spyOn(console, 'warn')
  const [name, setName] = createSignal('Adapter')
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: (id) => ({ id, name: name() }) },
      columns: [{ id: 'name', header: 'Product', accessorKey: 'name' }],
    })
    return (
      <ReadOnlyTable
        table={table}
        renderCell={(cell) => `Product: ${String(cell.getValue())}`}
      />
    )
  })
  expect(h.getByRole('cell').textContent).toBe('Product: Adapter')
  setName('Cable')
  flush()
  expect(warnings).not.toHaveBeenCalled()
  expect(h.getByRole('cell').textContent).toBe('Product: Cable')
})

test('widths follow column IDs and a leading control stays outside table data', () => {
  const onPin = vi.fn<(id: string) => void>()
  const h = render(() => {
    const table = model()
    return (
      <ReadOnlyTable
        table={table}
        title="Inventory"
        selection
        minWidth={480}
        columnWidths={{ name: '12rem', quantity: 65 }}
        leadingColumn={{
          label: 'Pin',
          width: 36,
          header: 'Pin item',
          cell: (row) => (
            <Button onClick={() => onPin(row.id)}>Pin row {row.id}</Button>
          ),
        }}
      />
    )
  })
  const table = h.getByRole<HTMLTableElement>('table', { name: 'Inventory' })
  expect(table.style.minWidth).toBe('480px')
  expect(h.getByRole('columnheader', { name: 'Pin' }).textContent).toBe(
    'Pin item',
  )
  expect(
    Array.from(table.querySelectorAll('col'), (column) => column.style.width),
  ).toEqual(['36px', '12rem', '65px'])
  fireEvent.click(h.getByRole('button', { name: 'Pin row a' }))
  expect(onPin).toHaveBeenCalledWith('a')
  table.focus()
  fireEvent.keyDown(table, { key: 'a', ctrlKey: true })
  flush()
  expect(table.querySelectorAll('td[data-cell-selection]')).toHaveLength(6)
  expect(
    h
      .getByRole('button', { name: 'Pin row a' })
      .closest('td')
      ?.hasAttribute('data-column'),
  ).toBe(false)
  fireEvent.click(h.getByText('Display columns'))
  flush()
  expect(h.queryByRole('checkbox', { name: 'Pin' })).toBeNull()
  fireEvent.click(h.getByRole('checkbox', { name: 'Quantity' }))
  flush()
  expect(
    Array.from(table.querySelectorAll('col'), (column) => column.style.width),
  ).toEqual(['36px', '12rem'])
  expect(h.getByRole('button', { name: 'Pin row a' })).toBeDefined()
  fireEvent.input(h.getByRole('searchbox'), { target: { value: 'Pin row' } })
  flush()
  fireEvent.click(h.getByRole('button', { name: 'Refresh results' }))
  flush()
  expect(rowIds(table)).toEqual([])
})

test('the empty result slot tracks applied filters and can clear native and external criteria', () => {
  const [sourceIds, setSourceIds] = createSignal<string[]>([])
  const [external, setExternal] = createSignal(false)
  const clear = vi.fn(() => setExternal(false))
  const h = render(() => {
    const table = model(sourceIds)
    return (
      <ReadOnlyTable
        table={table}
        filtersActive={external()}
        onClearFilters={clear}
        emptyResults={(state) => (
          <Show when={state.filtered} fallback={<p>Nothing yet</p>}>
            <Button onClick={state.clearFilters}>Reset search</Button>
          </Show>
        )}
      />
    )
  })
  expect(h.getByText('Nothing yet')).toBeDefined()
  setExternal(true)
  flush()
  const reset = h.getByRole('button', { name: 'Reset search' })
  reset.focus()
  fireEvent.click(reset)
  flush()
  expect(clear).toHaveBeenCalledTimes(1)
  expect(h.getByText('Nothing yet')).toBeDefined()
  expect(document.activeElement).toBe(h.getByRole('table'))

  setSourceIds(['a'])
  flush()
  fireEvent.input(h.getByRole('searchbox'), { target: { value: 'missing' } })
  flush()
  expect(h.getByText('Adapter')).toBeDefined()
  expect(h.queryByRole('button', { name: 'Reset search' })).toBeNull()
  fireEvent.click(h.getByRole('button', { name: 'Refresh results' }))
  flush()
  fireEvent.click(h.getByRole('button', { name: 'Reset search' }))
  flush()
  expect(clear).toHaveBeenCalledTimes(2)
  expect(h.getByText('Adapter')).toBeDefined()
})

test('wrap and fill options update the existing table and workspace markup', () => {
  const [enabled, setEnabled] = createSignal(false)
  const h = render(() => {
    const table = model()
    return (
      <ReadOnlyTable
        table={table}
        fill={enabled()}
        toolbarLayout={enabled() ? 'wrap' : undefined}
        cellWrap={enabled() ? 'anywhere' : undefined}
        columnAlignment={{ quantity: 'right' }}
      />
    )
  })
  const table = h.getByRole('table')
  const workspace = h.getByRole('region', {
    name: 'Read-only table',
  })
  const header = h
    .getByRole('button', { name: 'Sort by Quantity' })
    .closest('th')!
  expect(header.getAttribute('data-column-alignment')).toBe('right')
  expect(header.getAttribute('aria-sort')).toBe('none')
  expect(table.hasAttribute('data-cell-wrap')).toBe(false)
  expect(workspace.hasAttribute('data-table-fill')).toBe(false)
  setEnabled(true)
  flush()
  expect(table.getAttribute('data-cell-wrap')).toBe('anywhere')
  expect(workspace.getAttribute('data-toolbar-layout')).toBe('wrap')
  expect(workspace.hasAttribute('data-table-fill')).toBe(true)
  fireEvent.click(h.getByRole('button', { name: 'Sort by Quantity' }))
  flush()
  expect(header.getAttribute('aria-sort')).toBe('ascending')
  expect(rowIds(table)).toEqual(['c', 'b', 'a'])
})

test('live search and column filters apply immediately beside a saved view and extra filter', async () => {
  const [view, setView] = createSignal('all')
  const [extra, setExtra] = createSignal(false)
  const h = render(() => {
    const table = model(() => (view() === 'single' ? ['b'] : ['a', 'b', 'c']))
    return (
      <ReadOnlyTable
        table={table}
        filterMode="live"
        filterable={({ id }) => id === 'name'}
        search={{ label: 'Find inventory', placeholder: 'Product name' }}
        savedViews={{
          value: view(),
          choices: [
            { value: 'all', label: 'All items' },
            { value: 'single', label: 'One item' },
          ],
          onChange: setView,
        }}
        extraFilters={
          <Button onClick={() => setExtra(true)}>External filter</Button>
        }
        filtersActive={extra() || view() !== 'all'}
        onClearFilters={() => {
          setExtra(false)
          setView('all')
        }}
      />
    )
  })
  expect(h.queryByRole('button', { name: 'Refresh results' })).toBeNull()
  const search = h.getByRole<HTMLInputElement>('searchbox', {
    name: 'Find inventory',
  })
  expect(search.placeholder).toBe('Product name')
  fireEvent.input(search, { target: { value: 'oar' } })
  flush()
  expect(rowIds(h.container)).toEqual(['c'])
  const product = h.getByRole('textbox', { name: 'Product' })
  fireEvent.input(product, { target: { value: 'adapter' } })
  flush()
  expect(rowIds(h.container)).toEqual([])
  fireEvent.click(h.getByRole('button', { name: 'Clear filters' }))
  flush()
  expect(rowIds(h.container)).toEqual(['a', 'b', 'c'])
  await choose(h.getByRole('button', { name: /^Saved view/ }), 'One item')
  expect(rowIds(h.container)).toEqual(['b'])
  fireEvent.click(h.getByRole('button', { name: 'External filter' }))
  flush()
  expect(extra()).toBe(true)
  fireEvent.click(h.getByRole('button', { name: 'Clear filters' }))
  flush()
  expect(extra()).toBe(false)
  expect(rowIds(h.container)).toEqual(['a', 'b', 'c'])
})

test('live filter changes in one batch retain earlier edits and clear pending criteria', () => {
  const { table, filters, dispose } = createRoot((dispose) => {
    const table = model()
    return {
      table,
      filters: createTableFilterDraft(table, { live: true }),
      dispose,
    }
  })
  try {
    filters.setGlobalFilter('cable')
    filters.setValue('name', 'adapter')
    flush()
    expect(table.state.globalFilter).toBe('cable')
    expect(table.getFilteredRowIds()).toEqual([])
    filters.setGlobalFilter('keyboard')
    filters.clear()
    flush()
    expect(table.state.globalFilter).toBe('')
    expect(table.getFilteredRowIds()).toEqual(['a', 'b', 'c'])
  } finally {
    dispose()
  }
})

test('client paging slices after sort and filter, supports size changes, and clamps on source changes', async () => {
  const [ids, setIds] = createSignal(['a', 'b', 'c'])
  const h = render(() => {
    const table = model(ids)
    return (
      <ReadOnlyTable
        table={table}
        selection
        filterMode="live"
        clientPagination={{ pageSizes: [1, 2] }}
        columnAlignment={{ quantity: 'right' }}
        controls={{ columnVisibility: false, alignment: false }}
      />
    )
  })
  const table = h.getByRole('table')
  const next = h.getByRole<HTMLButtonElement>('button', { name: 'Next page' })
  const previous = h.getByRole<HTMLButtonElement>('button', {
    name: 'Previous page',
  })
  expect(h.queryByText('Display columns')).toBeNull()
  expect(
    h.getByRole('cell', { name: '50' }).getAttribute('data-column-alignment'),
  ).toBe('right')
  expect(rowIds(table)).toEqual(['a'])
  expect(previous.disabled).toBe(true)
  fireEvent.click(next)
  flush()
  expect(rowIds(table)).toEqual(['b'])
  expect(h.getByText('Page 2 of 3')).toBeDefined()
  table.focus()
  fireEvent.keyDown(table, { key: 'a', ctrlKey: true })
  flush()
  expect(h.getByText(/1 × 2 selected/)).toBeDefined()
  fireEvent.click(h.getByRole('button', { name: 'Sort by Quantity' }))
  flush()
  expect(rowIds(table)).toEqual(['c'])
  expect(h.queryByText(/1 × 2 selected/)).toBeNull()
  await choose(h.getByRole('button', { name: /^Page size/ }), '2')
  expect(rowIds(table)).toEqual(['c', 'b'])
  fireEvent.click(next)
  flush()
  expect(rowIds(table)).toEqual(['a'])
  setIds(['b', 'c'])
  flush()
  expect(rowIds(table)).toEqual(['c', 'b'])
  expect(next.disabled).toBe(true)
  fireEvent.input(h.getByRole('searchbox'), { target: { value: 'cable' } })
  flush()
  expect(rowIds(table)).toEqual(['b'])
  expect(h.getByText('Page 1 of 1')).toBeDefined()
})

test('controlled paging requests changes, survives remounts and resets on a new key', async () => {
  const [page, setPage] = createSignal(1)
  const [pageSize, setSize] = createSignal(1)
  const [resetKey, setResetKey] = createSignal('all')
  const [visible, setVisible] = createSignal(true)
  const [acceptPage, setAcceptPage] = createSignal(false)
  const onPageChange = vi.fn((next: number) => {
    if (acceptPage()) setPage(next)
  })
  const onPageSizeChange = vi.fn((size: number) => setSize(size))
  const h = render(() => {
    const table = model()
    return (
      <Show when={visible()}>
        <ReadOnlyTable
          table={table}
          clientPagination={{
            pageSizes: [1, 2],
            page: page(),
            pageSize: pageSize(),
            resetKey: resetKey(),
            onPageChange,
            onPageSizeChange,
          }}
        />
      </Show>
    )
  })
  expect(rowIds(h.container)).toEqual(['b'])
  fireEvent.click(h.getByRole('button', { name: 'Next page' }))
  flush()
  expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2)
  expect(rowIds(h.container)).toEqual(['b'])

  setAcceptPage(true)
  await choose(h.getByRole('button', { name: /^Page size/ }), '2')
  expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(2)
  expect(rowIds(h.container)).toEqual(['a', 'b'])
  fireEvent.click(h.getByRole('button', { name: 'Next page' }))
  flush()
  expect(rowIds(h.container)).toEqual(['c'])
  setVisible(false)
  flush()
  setVisible(true)
  flush()
  expect(rowIds(h.container)).toEqual(['c'])
  expect(h.getByText('Page 2 of 2')).toBeDefined()
  setResetKey('filtered')
  flush()
  expect(page()).toBe(0)
  expect(pageSize()).toBe(2)
  expect(rowIds(h.container)).toEqual(['a', 'b'])
})

test('a panel can own the heading while the workspace and table keep their accessible names', () => {
  const [visible, setVisible] = createSignal(false)
  const h = render(() => {
    const table = model()
    return (
      <DashboardPanel title="Stock" role="group">
        <ReadOnlyTable table={table} title="Stock" titleVisible={visible()} />
      </DashboardPanel>
    )
  })
  const workspace = h.getByRole('region', { name: 'Stock' })
  const table = h.getByRole('table', { name: 'Stock' })
  expect(h.getByRole('heading', { name: 'Stock' })).toBeDefined()
  expect(within(workspace).queryByText('Stock', { exact: true })).toBeNull()
  expect(
    within(workspace).getByRole('button', { name: 'Table controls' }),
  ).toBeDefined()
  setVisible(true)
  flush()
  expect(within(workspace).getByText('Stock', { exact: true })).toBeDefined()
  expect(h.getByRole('table', { name: 'Stock' })).toBe(table)
})

test('direct actions share the trailing cell with the menu and expose its live trigger', async () => {
  const contexts = new Map<string, TableRowActionContext>()
  const [ids, setIds] = createSignal(['a', 'b', 'c'])
  const direct = vi.fn<(id: string) => void>()
  const menu = vi.fn<(trigger: HTMLButtonElement | undefined) => void>()
  const h = render(() => {
    const table = model(ids)
    return (
      <ReadOnlyTable
        table={table}
        renderRowActions={(row) => (
          <Button onClick={() => direct(row.id)}>Review {row.id}</Button>
        )}
        rowActions={(row, context) => {
          contexts.set(row.id, context)
          return row.id === 'a'
            ? [
                {
                  label: 'Inspect',
                  onSelect: () => menu(context.getMenuTrigger()),
                },
              ]
            : undefined
        }}
      />
    )
  })
  const button = h.getByRole('button', { name: 'Review a' })
  const trigger = h.getByRole<HTMLButtonElement>('button', {
    name: 'Actions for row a',
  })
  expect(button.closest('td')).toBe(trigger.closest('tr')?.lastElementChild)
  expect(button.closest('td')).toBe(trigger.closest('td'))
  expect(contexts.get('b')?.getMenuTrigger()).toBeUndefined()
  fireEvent.click(button)
  expect(direct).toHaveBeenCalledExactlyOnceWith('a')
  trigger.scrollIntoView = vi.fn()
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  const action = await h.findByRole('menuitem', { name: 'Inspect' })
  action.focus()
  fireEvent.keyDown(action, { key: 'Enter' })
  flush()
  expect(menu).toHaveBeenCalledExactlyOnceWith(trigger)
  setIds(['b', 'c'])
  flush()
  expect(contexts.get('a')?.getMenuTrigger()).toBeUndefined()
})

test('grouped pages keep their headings and select-all acts on expanded rows', () => {
  const [selected, setSelected] = createSignal<Record<string, boolean>>({})
  const h = render(() => {
    const table = model()
    return (
      <ReadOnlyTable
        table={table}
        clientPagination={{ pageSizes: [1] }}
        rowSelection={{
          selected: selected(),
          onChange: setSelected,
          selectAll: 'page',
        }}
        rowActions={() => [{ label: 'Inspect', onSelect() {} }]}
        leadingColumn={{ label: 'Flag', cell: () => 'Flag' }}
        toolbarActions={
          <Button onClick={() => table.setGrouping(['name'])}>
            Group by product
          </Button>
        }
      />
    )
  })
  fireEvent.click(h.getByRole('button', { name: 'Group by product' }))
  flush()
  const page = h.getByRole<HTMLInputElement>('checkbox', {
    name: 'Select rows on this page',
  })
  expect(page.disabled).toBe(true)
  expect(h.container.querySelector('tr[data-group]')?.children).toHaveLength(5)
  fireEvent.click(h.getByRole('button', { name: 'Expand Product: Adapter' }))
  flush()
  expect(rowIds(h.container)).toEqual(['a'])
  expect(page.disabled).toBe(false)
  fireEvent.click(page)
  flush()
  expect(selected()).toEqual({ a: true })
  fireEvent.click(h.getByRole('button', { name: 'Next page' }))
  flush()
  expect(h.getByRole('button', { name: 'Expand Product: Cable' })).toBeDefined()
  expect(page.disabled).toBe(true)
  expect(selected()).toEqual({ a: true })
})

test('visibility and alignment controls can be enabled independently', async () => {
  const [visibility, setVisibility] = createSignal(false)
  const h = render(() => {
    const table = model()
    return (
      <ReadOnlyTable
        table={table}
        controls={{ columnVisibility: visibility(), alignment: !visibility() }}
      />
    )
  })
  fireEvent.click(h.getByText('Display columns', { selector: 'span' }))
  flush()
  expect(h.queryByRole('checkbox', { name: 'Quantity' })).toBeNull()
  expect(
    h.getByText('Quantity', { selector: '.column-display-option .ui-label' }),
  ).toBeDefined()
  await choose(h.getByRole('button', { name: /^Quantity alignment/ }), 'Center')
  expect(
    h.getByRole('cell', { name: '50' }).getAttribute('data-column-alignment'),
  ).toBe('center')
  setVisibility(true)
  flush()
  expect(h.queryByRole('button', { name: /^Quantity alignment/ })).toBeNull()
  fireEvent.click(h.getByRole('checkbox', { name: 'Quantity' }))
  flush()
  expect(h.queryByRole('cell', { name: '50' })).toBeNull()
})

test('row commands and selection use the current page and retain selection on other pages', async () => {
  const [selected, setSelected] = createSignal<Record<string, boolean>>({})
  const onAction = vi.fn<(id: string) => void>()
  const h = render(() => {
    const table = model()
    return (
      <ReadOnlyTable
        table={table}
        clientPagination={{ pageSizes: [2] }}
        rowSelection={{
          selected: selected(),
          onChange: setSelected,
          selectAll: 'page',
        }}
        rowActions={(row) => [
          { label: 'Inspect', onSelect: () => onAction(row.id) },
          {
            label: 'Unavailable',
            disabled: true,
            onSelect: () => onAction('disabled'),
          },
        ]}
        bulkActions={
          <Button onClick={() => setSelected({})}>Review selected</Button>
        }
      />
    )
  })
  const selectPage = h.getByRole<HTMLInputElement>('checkbox', {
    name: 'Select rows on this page',
  })
  expect(h.queryByRole('button', { name: 'Review selected' })).toBeNull()
  fireEvent.click(h.getByRole('checkbox', { name: 'Select row a' }))
  flush()
  expect(selected()).toEqual({ a: true })
  expect(selectPage.indeterminate).toBe(true)
  expect(h.getByRole('button', { name: 'Review selected' })).toBeDefined()
  fireEvent.click(selectPage)
  flush()
  expect(selected()).toEqual({ a: true, b: true })
  expect(selectPage.checked).toBe(true)
  fireEvent.click(h.getByRole('button', { name: 'Next page' }))
  flush()
  expect(selectPage.checked).toBe(false)
  fireEvent.click(selectPage)
  flush()
  expect(selected()).toEqual({ a: true, b: true, c: true })
  const trigger = h.getByRole('button', { name: 'Actions for row c' })
  trigger.scrollIntoView = () => {}
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  const action = await h.findByRole('menuitem', { name: 'Inspect' })
  expect(
    h
      .getByRole('menuitem', { name: 'Unavailable' })
      .getAttribute('aria-disabled'),
  ).toBe('true')
  action.focus()
  fireEvent.keyDown(action, { key: 'Enter' })
  flush()
  expect(onAction).toHaveBeenCalledExactlyOnceWith('c')
  await waitFor(() => expect(h.queryByRole('menu')).toBeNull())
  fireEvent.click(selectPage)
  flush()
  expect(selected()).toEqual({ a: true, b: true })
  fireEvent.click(h.getByRole('button', { name: 'Previous page' }))
  flush()
  fireEvent.click(selectPage)
  flush()
  expect(selected()).toEqual({})
  expect(h.queryByRole('button', { name: 'Review selected' })).toBeNull()
  fireEvent.click(selectPage)
  flush()
  const bulk = h.getByRole('button', { name: 'Review selected' })
  bulk.focus()
  fireEvent.click(bulk)
  flush()
  expect(selected()).toEqual({})
  expect(document.activeElement).toBe(h.getByRole('table'))
})
