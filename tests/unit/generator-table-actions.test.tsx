import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { createTable } from '@wfe/components/table'
import type { NativeTable } from '@wfe/components/table'
import { TableView } from '@wfe/generator'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
test('empty and absent actions omit their section; live add/remove retains table state and nodes', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  const [enabled, setEnabled] = createSignal(false)
  let table!: NativeTable<{ name: string }, never>
  let calls = 0
  const h = render(() => {
    table = createTable<{ name: string }, never>({
      source: { ids: () => ['a'], get: () => ({ name: 'Ada' }) },
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          sortFn: (a, b) => String(a).localeCompare(String(b)),
        },
      ],
    })
    return (
      <TableView
        description={{
          id: 'actions',
          columns: { name: { label: 'Name' } },
          actions: enabled()
            ? ([{ id: 'refresh', label: 'Refresh' }] as const)
            : [],
        }}
        bindings={{
          table,
          actions: {
            refresh: {
              run: () => {
                calls++
              },
            },
          },
        }}
      />
    )
  })
  const summaries = () =>
    [...h.container.querySelectorAll('summary')].filter(
      (node) => node.textContent?.trim() === 'Actions',
    )
  const node = h.container.querySelector('table')
  expect(summaries()).toHaveLength(0)
  table.setSorting([{ id: 'name', desc: true }])
  flush()
  setEnabled(true)
  flush()
  expect(summaries()).toHaveLength(1)
  fireEvent.click(h.getByRole('button', { name: 'Refresh', exact: true }))
  expect(calls).toBe(1)
  setEnabled(false)
  flush()
  expect(summaries()).toHaveLength(0)
  expect(h.queryByRole('button', { name: 'Refresh', exact: true })).toBeNull()
  expect(h.container.querySelector('table')).toBe(node)
  expect(table.state.sorting).toEqual([{ id: 'name', desc: true }])
  const absent = render(() => {
    const plain = createTable<{ name: string }, never>({
      source: { ids: () => [], get: () => undefined },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <TableView
        description={{ id: 'absent', columns: { name: { label: 'Name' } } }}
        bindings={{ table: plain }}
      />
    )
  })
  expect(
    [...absent.container.querySelectorAll('summary')].some(
      (item) => item.textContent?.trim() === 'Actions',
    ),
  ).toBe(false)
})
