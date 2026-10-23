import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import {
  createSignal,
  Errored,
  flush,
  onCleanup,
  Show,
  untrack,
} from 'solid-js'
import type { Accessor } from 'solid-js'
import {
  createTable,
  createTableSelection,
  ReadOnlyTable,
  Table,
} from '@wfe/components/table'
import type { TableFilterCriteria } from '@wfe/components/table'

type RecordRow = { name: string }
type Records = Record<string, RecordRow>

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

function controller(records: Accessor<Records>, criteria: string) {
  return createTable<RecordRow, never>({
    source: { ids: () => ['same'], get: (id) => records()[id] },
    columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
    manualProcessing: true,
    initialState: { globalFilter: criteria },
  })
}

type Controller = ReturnType<typeof controller>
function mount(kind: 'Table' | 'ReadOnlyTable', keyed = false) {
  const [records, setRecords] = createSignal<Records>({
    same: { name: 'First record' },
  })
  const firstApply = vi.fn<(criteria: TableFilterCriteria) => void>()
  const secondApply = vi.fn<(criteria: TableFilterCriteria) => void>()
  let first!: Controller,
    second!: Controller,
    replace!: () => void,
    selection!: ReturnType<typeof createTableSelection>
  const lifetime = { mounts: 0, disposals: 0 }
  function Presentation(props: { table: Controller }) {
    lifetime.mounts++
    onCleanup(() => lifetime.disposals++)
    const accepted = untrack(() => props.table)
    selection = createTableSelection({
      rows: () => accepted.getRowIds(),
      columns: () => ['name'],
      getText: ({ row }) => accepted.getRow(row)?.original?.name ?? '',
    })
    return kind === 'Table' ? (
      <Table table={props.table} selection={selection} />
    ) : (
      <ReadOnlyTable
        table={props.table}
        selection={selection}
        defaultControlsCollapsed={false}
        controls={{ sorting: false, grouping: false, columnReordering: false }}
        onApplyFilters={props.table === first ? firstApply : secondApply}
      />
    )
  }
  const view = render(() => {
    first = controller(records, 'first accepted')
    second = controller(
      () => ({ same: { name: 'Second record' } }),
      'second accepted',
    )
    const [current, setCurrent] = createSignal(first)
    replace = () => setCurrent(second)
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        {keyed ? (
          <Show when={current()} keyed>
            {(accepted) => <Presentation table={accepted} />}
          </Show>
        ) : (
          <Presentation table={current()} />
        )}
      </Errored>
    )
  })
  flush()
  return {
    ...view,
    first,
    second,
    firstApply,
    secondApply,
    replace,
    setRecords,
    lifetime,
    get selection() {
      return selection
    },
  }
}

for (const kind of ['Table', 'ReadOnlyTable'] as const) {
  test(`${kind} rejects a replacement controller before live controls can mix old criteria with new callbacks`, () => {
    const view = mount(kind)
    expect(view.getByRole('cell', { name: 'First record' })).toBeTruthy()
    if (kind === 'ReadOnlyTable') {
      fireEvent.input(
        view.getByRole('searchbox', { name: 'Search all columns' }),
        {
          target: { value: 'unapplied first draft' },
        },
      )
      flush()
    }
    view.replace()
    flush()
    // A silently retained view can otherwise send its first draft to the second callback.
    const refresh = view.queryByRole('button', { name: 'Refresh results' })
    if (refresh) fireEvent.click(refresh)
    flush()
    expect(view.secondApply).not.toHaveBeenCalled()
    expect(view.firstApply).not.toHaveBeenCalled()
    expect(view.getByRole('alert').textContent).toMatch(/remount.*table/i)
    expect(view.queryByRole('table')).toBeNull()
  })

  test(`${kind} retains cells, selection and drafts for updates through the same controller`, () => {
    const view = mount(kind)
    const cell = view.getByRole('cell', { name: 'First record' })
    view.selection.select({ row: 'same', column: 'name' })
    flush()
    const range = view.selection.range
    const search = view.queryByRole('searchbox', { name: 'Search all columns' })
    if (search) {
      fireEvent.input(search, { target: { value: 'retained draft' } })
      flush()
      search.focus()
    }
    view.setRecords({ same: { name: 'Updated first record' } })
    flush()
    expect(
      view.getByRole('cell', { name: 'Updated first record' }) === cell,
    ).toBe(true)
    expect(view.selection.range).toEqual(range)
    expect(view.selection.copyText()).toBe('Updated first record')
    expect(view.lifetime).toEqual({ mounts: 1, disposals: 0 })
    expect(view.queryByRole('alert')).toBeNull()
    if (search) {
      expect(
        view.getByRole('searchbox', { name: 'Search all columns' }) === search,
      ).toBe(true)
      expect(search).toHaveProperty('value', 'retained draft')
      expect(document.activeElement === search).toBe(true)
      expect(view.first.state.globalFilter).toBe('first accepted')
      fireEvent.click(view.getByRole('button', { name: 'Refresh results' }))
      flush()
      expect(view.firstApply).toHaveBeenCalledExactlyOnceWith({
        globalFilter: 'retained draft',
        columnFilters: [],
      })
      expect(view.secondApply).not.toHaveBeenCalled()
    }
  })

  test(`${kind} permits explicit keyed replacement with a fresh view owner`, () => {
    const view = mount(kind, true)
    const oldCell = view.getByRole('cell', { name: 'First record' })
    const oldSelection = view.selection
    oldSelection.select({ row: 'same', column: 'name' })
    flush()
    const search = view.queryByRole('searchbox', { name: 'Search all columns' })
    if (search) {
      fireEvent.input(search, { target: { value: 'discarded first draft' } })
      flush()
    }
    view.replace()
    flush()
    expect(view.queryByRole('alert')).toBeNull()
    expect(view.getByRole('cell', { name: 'Second record' }) !== oldCell).toBe(
      true,
    )
    expect(oldCell.isConnected).toBe(false)
    expect(view.selection !== oldSelection).toBe(true)
    expect(view.selection.range).toBeUndefined()
    expect(view.lifetime).toEqual({ mounts: 2, disposals: 1 })
    if (kind === 'ReadOnlyTable') {
      expect(
        view.getByRole('searchbox', { name: 'Search all columns' }),
      ).toHaveProperty('value', 'second accepted')
      fireEvent.click(view.getByRole('button', { name: 'Refresh results' }))
      flush()
      expect(view.secondApply).toHaveBeenCalledExactlyOnceWith({
        globalFilter: 'second accepted',
        columnFilters: [],
      })
      expect(view.firstApply).not.toHaveBeenCalled()
    }
    view.unmount()
    flush()
    expect(view.lifetime).toEqual({ mounts: 2, disposals: 2 })
  })
}
