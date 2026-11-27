import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from '@solidjs/testing-library'
import { createRoot, createSignal, flush } from 'solid-js'
import {
  ReadOnlyTable,
  TableWorkspace,
  createTable,
  type TableControlsPlacement,
  type TableView,
  type TableViewList,
  type TableViewState,
  type TableViewStorage,
} from '@wfe/components/table'
import { createTableViews } from '../../packages/components/src/table/createTableViews'

const system: TableView = {
  id: 'system',
  name: 'All records',
  state: { version: 1 },
}

function memory(data: TableViewList = { views: [] }) {
  let current = data
  const storage = {
    list: vi.fn(() => Promise.resolve(structuredClone(current))),
    save: vi.fn((view: TableView) => {
      current = {
        ...current,
        views: [...current.views.filter(({ id }) => id !== view.id), view],
      }
      return Promise.resolve()
    }),
    remove: vi.fn((id: string) => {
      current = {
        views: current.views.filter((item) => item.id !== id),
        defaultId: current.defaultId === id ? null : current.defaultId,
      }
      return Promise.resolve()
    }),
    setDefault: vi.fn((id: string | null) => {
      current = { ...current, defaultId: id }
      return Promise.resolve()
    }),
  } satisfies TableViewStorage
  return storage
}

function fixture() {
  return createTable({
    source: {
      ids: () => ['row'],
      get: () => ({ name: 'Cable', status: 'Open', day: '2026-11-20' }),
    },
    columns: [
      {
        id: 'name',
        header: 'Product',
        accessorKey: 'name',
        filterFn: () => true,
        sortFn: () => 0,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        filterFn: () => true,
        sortFn: () => 0,
      },
      { id: 'day', header: 'Day', accessorKey: 'day', filterFn: () => true },
    ],
  })
}

async function choose(trigger: HTMLElement, name: string) {
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  fireEvent.click(await within(document.body).findByRole('option', { name }))
  flush()
}

function choice(container: HTMLElement, label: string) {
  const trigger = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  )
  if (!trigger) throw new Error(`Missing select: ${label}`)
  return trigger
}
const savedPicker = (container: HTMLElement) => choice(container, 'Saved view')

const scrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
)
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => {},
  })
})
afterEach(() => {
  cleanup()
  if (scrollIntoView)
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollIntoView',
      scrollIntoView,
    )
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  vi.unstubAllGlobals()
})

test('captures and restores every table setting and discards removed fields', async () => {
  const storage = memory({
    defaultId: 'configured',
    views: [
      {
        id: 'configured',
        name: 'Configured',
        state: {
          version: 1,
          columnFilters: [
            { id: 'name', value: 'Cable' },
            {
              id: 'status',
              value: { operator: 'in', values: ['Retired', 'Open'] },
            },
            { id: 'day', value: { start: '2026-11-20', end: 'invalid' } },
            { id: 'removed', value: 'old' },
          ],
          globalFilter: 'Cab',
          sorting: [
            { id: 'removed', desc: false },
            { id: 'name', desc: true },
          ],
          grouping: ['removed', 'status'],
          groupSorting: [{ id: 'status', depth: 1, desc: true }],
          columnOrder: ['day', 'status', 'removed', 'name'],
          columnVisibility: { day: false, removed: false },
          columnSizing: { removed: 25, name: 150 },
          columnPinning: { start: ['status', 'removed'], end: ['name'] },
          columnAlignment: { name: 'right', removed: 'center' },
          pageSize: 10,
          extraFilters: { warehouse: 'North' },
          formatting: { wrap: true },
          controls: { placement: 'right', collapsed: false, size: 35 },
        },
      },
    ],
  })
  const [warehouse, setWarehouse] = createSignal('All')
  const [wrap, setWrap] = createSignal(false)
  const apply = vi.fn()
  let table!: ReturnType<typeof fixture>
  const h = render(() => {
    table = fixture()
    return (
      <ReadOnlyTable
        table={table}
        cellWrap={wrap() ? 'anywhere' : 'normal'}
        controlsResizable
        clientPagination={{ pageSizes: [5, 10] }}
        onApplyFilters={(criteria) => {
          apply(criteria)
          table.setColumnFilters(criteria.columnFilters)
          table.setGlobalFilter(criteria.globalFilter)
        }}
        filter={(column) =>
          column.id === 'status'
            ? { kind: 'select', choices: [{ value: 'Open', label: 'Open' }] }
            : column.id === 'day'
              ? { kind: 'date-range' }
              : undefined
        }
        views={{
          storage,
          systemViews: [system],
          extraFilters: {
            capture: () => ({ warehouse: warehouse() }),
            restore: (value) => {
              if (
                value &&
                typeof value === 'object' &&
                'warehouse' in value &&
                typeof value.warehouse === 'string'
              )
                setWarehouse(value.warehouse)
            },
          },
          formatting: {
            capture: () => ({ wrap: wrap() }),
            restore: (value) =>
              setWrap(
                Boolean(
                  value &&
                  typeof value === 'object' &&
                  'wrap' in value &&
                  value.wrap === true,
                ),
              ),
          },
        }}
      />
    )
  })
  const picker = savedPicker(h.container)
  await waitFor(() => expect(picker.textContent).toContain('Configured'))
  expect(table.state.columnFilters).toEqual([
    { id: 'day', value: { start: '2026-11-20', end: undefined } },
    { id: 'name', value: 'Cable' },
    { id: 'status', value: { operator: 'in', values: ['Open'] } },
  ])
  expect(table.state.globalFilter).toBe('Cab')
  expect(table.state.sorting).toEqual([{ id: 'name', desc: true }])
  expect(table.state.grouping).toEqual(['status'])
  expect(table.state.groupSorting).toEqual([
    { id: 'status', depth: 0, desc: true },
  ])
  expect(table.state.columnOrder).toEqual(['day', 'status', 'name'])
  expect(table.state.columnVisibility).toEqual({
    day: false,
    name: true,
    status: true,
  })
  expect(table.state.columnSizing).toEqual({ name: 150 })
  expect(table.state.columnPinning).toEqual({
    start: ['status'],
    end: ['name'],
  })
  expect(
    h.container
      .querySelector('th[data-column="name"]')
      ?.getAttribute('data-column-alignment'),
  ).toBe('right')
  expect(
    h.container.querySelector<HTMLTableColElement>(
      'col[data-column-width="name"]',
    )?.style.width,
  ).toBe('150px')
  expect(choice(h.container, 'Page size').textContent).toContain('10')
  expect(
    h
      .getByRole('region', { name: 'Read-only table' })
      .getAttribute('data-controls-placement'),
  ).toBe('right')
  expect(
    h
      .getByRole('button', { name: 'Table controls' })
      .getAttribute('aria-expanded'),
  ).toBe('true')
  expect(warehouse()).toBe('North')
  expect(h.getByRole('table').getAttribute('data-cell-wrap')).toBe('anywhere')
  expect(h.queryByText('Unsaved changes')).toBeNull()
  expect(apply).toHaveBeenCalledOnce()

  fireEvent.input(h.getByRole('searchbox'), {
    target: { value: 'Edited search' },
  })
  flush()
  expect(h.getByText('Unsaved changes')).toBeTruthy()
  expect(table.state.globalFilter).toBe('Cab')
  await choose(picker, 'All records')
  expect(table.state.columnFilters).toEqual([])
  expect(table.state.globalFilter).toBe('')
  expect(choice(h.container, 'Page size').textContent).toContain('5')
  expect(
    h
      .getByRole('region', { name: 'Read-only table' })
      .getAttribute('data-controls-placement'),
  ).toBe('left')
  expect(h.queryByText('Unsaved changes')).toBeNull()
  expect(warehouse()).toBe('All')

  await choose(picker, 'Configured')
  expect(table.state.globalFilter).toBe('Cab')
  expect(h.queryByText('Unsaved changes')).toBeNull()
})

test('protects system views and supports copy, save, rename, default, reset and removal', async () => {
  const storage = memory()
  const { views, current, setCurrent, dispose } = createRoot((dispose) => {
    const [current, setCurrent] = createSignal<TableViewState>({
      version: 1,
      globalFilter: '',
    })
    const views = createTableViews({
      configuration: () => ({
        storage,
        systemViews: [system],
        initialViewId: system.id,
      }),
      capture: current,
      normalize: (state) => state,
      restore: setCurrent,
    })
    return { views, current, setCurrent, dispose }
  })
  try {
    flush()
    await waitFor(() => expect(views.ready()).toBe(true))
    expect(views.locked()).toBe(true)
    setCurrent({ version: 1, globalFilter: 'Cable' })
    flush()
    expect(views.dirty()).toBe(true)
    expect(await views.save('Same', 'save')).toBe(false)
    expect(await views.save('Same', 'rename')).toBe(false)
    expect(await views.remove()).toBe(false)
    expect(storage.save).not.toHaveBeenCalled()
    expect(storage.remove).not.toHaveBeenCalled()

    expect(await views.save('My table', 'copy')).toBe(true)
    flush()
    const userId = views.selected()!.id
    expect(views.locked()).toBe(false)
    expect(views.dirty()).toBe(false)
    expect(storage.save.mock.calls[0]?.[0].state.globalFilter).toBe('Cable')
    expect(await views.changeDefault()).toBe(true)
    flush()
    expect(views.defaultId()).toBe(userId)

    setCurrent({ version: 1, globalFilter: 'Unapplied' })
    flush()
    expect(await views.save('Renamed', 'rename')).toBe(true)
    flush()
    expect(views.selected()?.name).toBe('Renamed')
    expect(views.dirty()).toBe(true)
    views.choose(userId)
    flush()
    expect(current().globalFilter).toBe('Cable')
    expect(views.dirty()).toBe(false)

    setCurrent({ version: 1, globalFilter: 'Saved changes' })
    flush()
    expect(await views.save('Renamed', 'save')).toBe(true)
    flush()
    expect(views.selected()?.state.globalFilter).toBe('Saved changes')
    expect(await views.remove()).toBe(true)
    flush()
    expect(views.defaultId()).toBeUndefined()
    expect(views.selected()).toBeUndefined()
    expect(current().globalFilter).toBe('Saved changes')
    expect(views.views().map(({ name }) => name)).toEqual(['All records'])
  } finally {
    dispose()
  }
})

test('shows storage failures and keeps selection and editable data', async () => {
  const storage = memory()
  storage.list.mockRejectedValueOnce(new Error('offline'))
  storage.save.mockRejectedValueOnce(new Error('write failed'))
  const h = render(() => (
    <TableWorkspace
      defaultControlsPlacement="top"
      views={{
        storage,
        systemViews: [system],
        initialViewId: system.id,
        capture: () => ({ version: 1 }),
        restore() {},
      }}
      controls={<span>Options</span>}
    >
      Results
    </TableWorkspace>
  ))
  const workspace = h.getByRole('region')
  expect(workspace.getAttribute('data-controls-placement')).toBe('top')
  expect((await h.findByRole('alert')).textContent).toBe(
    'Could not load saved views.',
  )
  function actions() {
    const trigger = h.getByRole('button', { name: 'View actions' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    flush()
    return within(document.body)
  }
  fireEvent.click(h.getByRole('button', { name: 'Retry loading views' }))
  flush()
  await waitFor(() =>
    expect(savedPicker(h.container).textContent).toContain('All records'),
  )
  const menu = actions()
  expect(
    (await menu.findByRole('menuitem', { name: 'Delete view' })).getAttribute(
      'aria-disabled',
    ),
  ).toBe('true')
  fireEvent.keyDown(menu.getByRole('menuitem', { name: 'Save as' }), {
    key: 'Enter',
  })
  flush()
  const dialog = within(
    await within(document.body).findByRole('dialog', { name: 'Save as' }),
  )
  fireEvent.input(dialog.getByRole('textbox', { name: 'View name' }), {
    target: { value: 'Mine' },
  })
  flush()
  fireEvent.submit(
    dialog.getByRole('button', { name: 'Save as' }).closest('form')!,
  )
  flush()
  expect((await dialog.findByRole('alert')).textContent).toBe(
    'Could not update saved views. Try again.',
  )
  expect(
    dialog.getByRole<HTMLInputElement>('textbox', { name: 'View name' }).value,
  ).toBe('Mine')
  expect(storage.save).toHaveBeenCalledOnce()
})

test('keeps the legacy picker in the Filters section and calls its callback', async () => {
  const [value, setValue] = createSignal('all')
  const change = vi.fn(setValue)
  const h = render(() => {
    const table = fixture()
    return (
      <ReadOnlyTable
        table={table}
        savedViews={{
          value: value(),
          choices: [
            { value: 'all', label: 'All' },
            { value: 'mine', label: 'Mine' },
          ],
          label: 'Legacy view',
          onChange: change,
        }}
      />
    )
  })
  const picker = choice(h.container, 'Legacy view')
  expect(picker.closest('.table-workspace-controls')).toBeTruthy()
  await choose(picker, 'Mine')
  expect(change).toHaveBeenCalledExactlyOnceWith('mine')
  expect(picker.textContent).toContain('Mine')
  expect(h.queryByRole('button', { name: 'View actions' })).toBeNull()
})

test('requests the same controlled placement changes from the selector and a saved view', async () => {
  const storage = memory()
  const [placement, setPlacement] = createSignal<TableControlsPlacement>('left')
  const onChange = vi.fn((next: TableControlsPlacement) => setPlacement(next))
  const h = render(() => (
    <TableWorkspace
      controls={<span>Options</span>}
      controlsPlacement={placement()}
      onControlsPlacementChange={onChange}
      views={{
        storage,
        systemViews: [
          system,
          {
            id: 'right',
            name: 'Right controls',
            state: { version: 1, controls: { placement: 'right' } },
          },
        ],
        initialViewId: system.id,
        capture: () => ({ version: 1 }),
        restore() {},
      }}
    >
      Results
    </TableWorkspace>
  ))
  const picker = savedPicker(h.container)
  await waitFor(() => expect(picker.textContent).toContain('All records'))
  await choose(choice(h.container, 'Controls placement'), 'Top')
  expect(onChange).toHaveBeenNthCalledWith(1, 'top')
  await choose(picker, 'Right controls')
  expect(onChange).toHaveBeenNthCalledWith(2, 'right')
  expect(h.getByRole('region').getAttribute('data-controls-placement')).toBe(
    'right',
  )
})

test('keeps the saved-view select and status badges in the toolbar', async () => {
  const storage = memory()
  const h = render(() => {
    const table = fixture()
    return (
      <ReadOnlyTable
        table={table}
        views={{ storage, systemViews: [system], initialViewId: system.id }}
      />
    )
  })
  const toolbar = h.getByRole('group', { name: 'Saved view' })
  const picker = savedPicker(h.container)
  expect(toolbar.contains(picker)).toBe(true)
  expect(picker.getAttribute('data-ui-control-decoration')).toBe('none')
  expect(
    picker.querySelector('.ui-choice-icon')?.getAttribute('aria-hidden'),
  ).toBe('true')
  const status = within(toolbar).getByRole('status')
  await waitFor(() =>
    expect(
      within(status).getByText('System view').classList.contains('ui-badge'),
    ).toBe(true),
  )
  fireEvent.input(h.getByRole('searchbox'), { target: { value: 'Cable' } })
  flush()
  const unsaved = within(status).getByText('Unsaved changes')
  expect(unsaved.classList.contains('ui-badge')).toBe(true)
  expect(unsaved.getAttribute('data-tone')).toBe('warning')
})

test('keeps a filter and its clear button together when placement changes', async () => {
  const storage = memory()
  const h = render(() => {
    const table = fixture()
    return (
      <ReadOnlyTable
        table={table}
        views={{
          storage,
          systemViews: [
            system,
            {
              id: 'top',
              name: 'Top controls',
              state: { version: 1, controls: { placement: 'top' } },
            },
          ],
          initialViewId: system.id,
        }}
      />
    )
  })
  const workspace = h.getByRole('region', { name: 'Read-only table' })
  const picker = savedPicker(h.container)
  await waitFor(() => expect(picker.textContent).toBe('All records'))
  const product = h.getByRole<HTMLInputElement>('textbox', { name: 'Product' })
  const clear = h.getByRole('button', { name: 'Clear Product filter' })
  const surface = product.closest('[data-ui-control-surface]')
  expect(surface?.contains(clear)).toBe(true)
  await choose(picker, 'Top controls')
  expect(workspace.getAttribute('data-controls-placement')).toBe('top')
  expect(h.getByRole('textbox', { name: 'Product' })).toBe(product)
  fireEvent.input(product, { target: { value: 'Cable' } })
  flush()
  expect(product.value).toBe('Cable')
  fireEvent.click(clear)
  flush()
  expect(product.value).toBe('')
  expect(document.activeElement).toBe(product)
})

test('a filter binding can normalize a retired value to null', async () => {
  const storage = memory({
    defaultId: 'saved',
    views: [
      {
        id: 'saved',
        name: 'Saved filters',
        state: { version: 1, extraFilters: 'Retired warehouse' },
      },
    ],
  })
  const [extra, setExtra] = createSignal<string | null>('North')
  const h = render(() => {
    const table = fixture()
    return (
      <ReadOnlyTable
        table={table}
        views={{
          storage,
          extraFilters: {
            capture: extra,
            normalize: (value) => (value === 'North' ? value : null),
            restore: (value) =>
              setExtra(typeof value === 'string' ? value : null),
          },
        }}
      />
    )
  })
  await waitFor(() =>
    expect(savedPicker(h.container).textContent).toBe('Saved filters'),
  )
  expect(extra()).toBeNull()
  expect(h.queryByText('Unsaved changes')).toBeNull()
})
