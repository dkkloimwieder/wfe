import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { createTable, ReadOnlyTable, Table } from '@wfe/components/table'
import type { NativeTable, NativeTableState } from '@wfe/components/table'

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
type Record = { score: number }
type Sorting = NativeTableState['sorting']
const records: { [id: string]: Record } = {
  a: { score: 3 },
  b: { score: 1 },
  c: { score: 2 },
}

for (const presentation of ['Table', 'ReadOnlyTable'] as const) {
  for (const mode of ['client', 'manualSorting', 'manualProcessing'] as const) {
    test(`${presentation} ${mode} requests sorting while the application owns accepted state`, () => {
      const [sorting, setSorting] = createSignal<Sorting>([])
      const requested: Sorting[] = []
      const compare = vi.fn((a: unknown, b: unknown) => Number(a) - Number(b))
      let table!: NativeTable<Record>
      const h = render(() => {
        table = createTable<Record>({
          source: { ids: () => ['a', 'b', 'c'], get: (id) => records[id] },
          columns: [
            {
              id: 'score',
              header: 'Score',
              accessorKey: 'score',
              sortFn: mode === 'client' ? compare : undefined,
            },
          ],
          manualSorting: mode === 'manualSorting',
          manualProcessing: mode === 'manualProcessing',
          get state() {
            return { sorting: sorting() }
          },
          onSortingChange: (update) =>
            requested.push(
              typeof update === 'function' ? update(sorting()) : update,
            ),
        })
        return presentation === 'Table' ? (
          <Table table={table} />
        ) : (
          <ReadOnlyTable
            table={table}
            controls={{ columnReordering: false }}
            controlsEnabled={false}
            refreshEnabled={false}
          />
        )
      })
      const order = () =>
        Array.from(h.container.querySelectorAll('tr[data-row]'), (row) =>
          row.getAttribute('data-row'),
        )
      const sort = h.getByRole<HTMLButtonElement>('button', {
        name: 'Sort by Score',
      })
      const heading = h.getByRole('columnheader')
      expect(sort.disabled).toBe(false)
      expect(order()).toEqual(['a', 'b', 'c'])
      sort.click()
      flush()
      expect(requested).toEqual([[{ id: 'score', desc: false }]])
      expect(table.state.sorting).toEqual([])
      expect(heading.getAttribute('aria-sort')).toBe('none')
      expect(order()).toEqual(['a', 'b', 'c'])
      setSorting([{ id: 'score', desc: false }])
      flush()
      expect(heading.getAttribute('aria-sort')).toBe('ascending')
      expect(order()).toEqual(
        mode === 'client' ? ['b', 'c', 'a'] : ['a', 'b', 'c'],
      )
      expect(h.getByRole('button', { name: 'Sort by Score' })).toBe(sort)
      sort.click()
      flush()
      expect(requested).toEqual([
        [{ id: 'score', desc: false }],
        [{ id: 'score', desc: true }],
      ])
      expect(table.state.sorting).toEqual([{ id: 'score', desc: false }])
      setSorting([{ id: 'score', desc: true }])
      flush()
      expect(heading.getAttribute('aria-sort')).toBe('descending')
      expect(order()).toEqual(
        mode === 'client' ? ['a', 'c', 'b'] : ['a', 'b', 'c'],
      )
      if (mode === 'client') expect(compare).toHaveBeenCalled()
    })
  }

  test(`${presentation} leaves client sorting disabled without a comparator`, () => {
    const requested = vi.fn()
    const h = render(() => {
      const table = createTable<Record>({
        source: { ids: () => ['a'], get: (id) => records[id] },
        columns: [{ id: 'score', header: 'Score', accessorKey: 'score' }],
        onSortingChange: requested,
      })
      return presentation === 'Table' ? (
        <Table table={table} />
      ) : (
        <ReadOnlyTable
          table={table}
          controls={{ columnReordering: false }}
          controlsEnabled={false}
          refreshEnabled={false}
        />
      )
    })
    const sort = h.getByRole<HTMLButtonElement>('button', {
      name: 'Sort by Score',
    })
    expect(sort.disabled).toBe(true)
    sort.click()
    flush()
    expect(requested).not.toHaveBeenCalled()
  })

  for (const manual of [false, true]) {
    test(`${presentation} plain action headings never request sorting in ${manual ? 'manual' : 'client'} mode`, () => {
      const requested = vi.fn()
      const h = render(() => {
        const table = createTable<Record>({
          source: { ids: () => ['a'], get: (id) => records[id] },
          columns: [{ id: 'actions', header: 'Actions', accessorKey: 'score' }],
          manualProcessing: manual,
          onSortingChange: requested,
        })
        return presentation === 'Table' ? (
          <Table table={table} header={() => <span>Actions</span>} />
        ) : (
          <ReadOnlyTable
            table={table}
            sortable={() => false}
            controls={{ columnReordering: false }}
            controlsEnabled={false}
            refreshEnabled={false}
          />
        )
      })
      expect(h.queryByRole('button', { name: 'Sort by Actions' })).toBeNull()
      h.getByRole('columnheader', { name: 'Actions' }).click()
      flush()
      expect(requested).not.toHaveBeenCalled()
    })
  }
}
