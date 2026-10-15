import { createRoot, createSignal, flush } from 'solid-js'
import { expect, test, vi } from 'vitest'
import { createTable, createTableFilterDraft } from '@wfe/components/table'

const records = {
  a: { name: 'Ada', active: true, amount: 0 },
  b: { name: 'Bob', active: false, amount: 0 },
  c: { name: 'Cid', active: false, amount: 3 },
}
const source = {
  ids: () => Object.keys(records),
  get: (id: string) => records[id as keyof typeof records],
}

test('pending criteria do not scan records and one apply commits all criteria, including false and zero', () => {
  const h = createRoot((dispose) => {
    const match = vi.fn((value: unknown, filter: unknown) => value === filter)
    const columnsChanged = vi.fn()
    const searchChanged = vi.fn()
    const table = createTable({
      source,
      columns: [
        { id: 'name', accessorKey: 'name' },
        { id: 'active', accessorKey: 'active', filterFn: match },
        { id: 'amount', accessorKey: 'amount', filterFn: match },
      ],
      onColumnFiltersChange: columnsChanged,
      onGlobalFilterChange: searchChanged,
    })
    return {
      dispose,
      table,
      draft: createTableFilterDraft(table),
      match,
      columnsChanged,
      searchChanged,
    }
  })
  try {
    expect(h.table.getRowIds()).toEqual(['a', 'b', 'c'])
    h.draft.setValue('active', false)
    h.draft.setValue('amount', 0)
    h.draft.setGlobalFilter('Bob')
    flush()
    expect(h.draft.changed).toBe(true)
    expect(h.draft.getValue('active')).toBe(false)
    expect(h.draft.getValue('amount')).toBe(0)
    expect(h.table.getRowIds()).toEqual(['a', 'b', 'c'])
    expect(h.match).not.toHaveBeenCalled()
    expect(h.columnsChanged).not.toHaveBeenCalled()
    expect(h.searchChanged).not.toHaveBeenCalled()
    h.draft.apply()
    flush()
    expect(h.table.getRowIds()).toEqual(['b'])
    expect(h.draft.changed).toBe(false)
    expect(h.columnsChanged).toHaveBeenCalledTimes(1)
    expect(h.searchChanged).toHaveBeenCalledTimes(1)
    h.draft.apply()
    flush()
    expect(h.columnsChanged).toHaveBeenCalledTimes(1)
    expect(h.searchChanged).toHaveBeenCalledTimes(1)
    h.draft.setValue('active', undefined)
    h.draft.setValue('amount', undefined)
    h.draft.setGlobalFilter('')
    flush()
    expect(h.table.getRowIds()).toEqual(['b'])
    h.draft.apply()
    flush()
    expect(h.table.getRowIds()).toEqual(['a', 'b', 'c'])
  } finally {
    h.dispose()
    flush()
  }
})

test('equivalent criteria restore the clean state and application updates replace pending criteria', () => {
  const h = createRoot((dispose) => {
    const table = createTable({
      source,
      columns: [{ id: 'amount', accessorKey: 'amount' }],
      initialState: {
        columnFilters: [
          { id: 'amount', value: { operator: 'between', min: 0, max: 3 } },
        ],
      },
    })
    return { dispose, table, draft: createTableFilterDraft(table) }
  })
  try {
    h.draft.setValue('amount', { operator: 'between', min: 0, max: 4 })
    flush()
    expect(h.draft.changed).toBe(true)
    h.draft.setValue('amount', { operator: 'between', min: 0, max: 3 })
    flush()
    expect(h.draft.changed).toBe(false)
    h.draft.setGlobalFilter('pending')
    flush()
    h.table.setGlobalFilter('application')
    flush()
    expect(h.draft.globalFilter).toBe('application')
    expect(h.draft.changed).toBe(false)
    h.table.setColumnFilters([
      { id: 'amount', value: { operator: 'in', values: ['Open'] } },
    ])
    flush()
    h.draft.setValue('amount', { operator: 'in', values: ['Open'] })
    flush()
    expect(h.draft.changed).toBe(false)
  } finally {
    h.dispose()
    flush()
  }
})

test('controlled rejection preserves the pending criteria until the application accepts them', () => {
  const h = createRoot((dispose) => {
    const [filters, setFilters] = createSignal<
      Array<{ id: string; value: unknown }>
    >([])
    let accept = false
    const callback = vi.fn(
      (
        value: Parameters<
          ReturnType<typeof createTable>['setColumnFilters']
        >[0],
      ) => {
        if (accept)
          setFilters((old) =>
            typeof value === 'function' ? value(old) : value,
          )
      },
    )
    const table = createTable({
      source,
      columns: [
        {
          id: 'active',
          accessorKey: 'active',
          filterFn: (value, filter) => value === filter,
        },
      ],
      state: {
        get columnFilters() {
          return filters()
        },
      },
      onColumnFiltersChange: callback,
    })
    return {
      dispose,
      table,
      draft: createTableFilterDraft(table),
      callback,
      accept: () => {
        accept = true
      },
    }
  })
  try {
    h.draft.setValue('active', false)
    flush()
    h.draft.apply()
    flush()
    expect(h.table.getRowIds()).toEqual(['a', 'b', 'c'])
    expect(h.draft.changed).toBe(true)
    expect(h.draft.getValue('active')).toBe(false)
    h.accept()
    h.draft.apply()
    flush()
    expect(h.table.getRowIds()).toEqual(['b', 'c'])
    expect(h.draft.changed).toBe(false)
    expect(h.callback).toHaveBeenCalledTimes(2)
  } finally {
    h.dispose()
    flush()
  }
})

test('an application callback receives one complete request and owns table state', () => {
  const h = createRoot((dispose) => {
    const table = createTable({
      source,
      columns: [{ id: 'active', accessorKey: 'active' }],
      manualFiltering: true,
    })
    const apply = vi.fn()
    return {
      dispose,
      table,
      apply,
      draft: createTableFilterDraft(table, { onApply: apply }),
    }
  })
  try {
    h.draft.setValue('active', false)
    h.draft.setGlobalFilter('Bob')
    flush()
    expect(h.apply).not.toHaveBeenCalled()
    h.draft.apply()
    flush()
    expect(h.apply).toHaveBeenCalledExactlyOnceWith({
      columnFilters: [{ id: 'active', value: false }],
      globalFilter: 'Bob',
    })
    expect(h.table.state.columnFilters).toEqual([])
    expect(h.draft.changed).toBe(true)
    h.table.setColumnFilters([{ id: 'active', value: false }])
    h.table.setGlobalFilter('Bob')
    flush()
    expect(h.draft.changed).toBe(false)
    h.draft.apply()
    expect(h.apply).toHaveBeenCalledTimes(1)
  } finally {
    h.dispose()
    flush()
  }
})
