import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, untrack } from 'solid-js'
import { createTable, TableGrouping } from '@wfe/components/table'

// Headers can be presentation values. Grouping uses the caller's plain labels.
const headers = [
  { kind: 'omitted', value: undefined },
  { kind: 'text', value: 'Raw amount' },
  { kind: 'function', value: () => 'Formatted amount' },
]

afterEach(cleanup)

test.each(headers)(
  'grouping summaries use reactive caller labels for a $kind header without changing column identity',
  async ({ value: header }) => {
    const [alias, setAlias] = createSignal('Amount due')
    const [summary, setSummary] = createSignal('sum')
    const setSummaryRequest = vi.fn((id: string, value: string) => {
      if (id === 'amount') setSummary(value)
    })
    const records = [{ id: 'a', category: 'Open', amount: 12 }]
    let readState!: () => { grouping: string[]; order: string }
    const h = render(() => {
      const table = createTable({
        source: {
          ids: () => records.map(({ id }) => id),
          get: (id) => records.find((record) => record.id === id),
        },
        columns: [
          { id: 'category', accessorKey: 'category', header: 'Category' },
          { id: 'amount', accessorKey: 'amount', header },
        ],
        initialState: {
          grouping: ['category'],
          groupSorting: [{ depth: 0, id: 'amount', desc: false }],
        },
      })
      readState = () =>
        untrack(() => ({
          grouping: [...table.state.grouping],
          order: JSON.stringify(table.state.groupSorting),
        }))
      return (
        <TableGrouping
          table={table}
          label={(id) => (id === 'amount' ? alias() : 'Category')}
          groupable={(id) => id === 'category'}
          summary={(id) => (id === 'amount' ? summary() : 'none')}
          summaryChoices={(id) =>
            id === 'amount'
              ? [
                  { value: 'sum', label: 'Sum' },
                  { value: 'maximum', label: 'Maximum' },
                ]
              : [{ value: 'none', label: 'None' }]
          }
          setSummary={setSummaryRequest}
        />
      )
    })
    flush()
    const summaryControl = h.getByRole('button', {
      name: /^Amount due summary/,
    })
    const orderControl = h.getByRole('button', {
      name: /^Order Category groups/,
    })
    expect(summaryControl.textContent).toBe('Sum')
    expect(orderControl.textContent).toBe('Amount due summary: ascending')
    const before = readState()
    setAlias('Outstanding amount')
    flush()
    expect(
      h.getByRole('button', { name: /^Outstanding amount summary/ }) ===
        summaryControl,
    ).toBe(true)
    expect(orderControl.textContent).toBe(
      'Outstanding amount summary: ascending',
    )
    expect(readState()).toEqual(before)
    expect(setSummaryRequest).not.toHaveBeenCalled()

    orderControl.focus()
    fireEvent.keyDown(orderControl, { key: 'ArrowDown' })
    flush()
    const descending = await h.findByRole(
      'option',
      { name: 'Outstanding amount summary: descending' },
      { timeout: 10_000 },
    )
    descending.focus()
    fireEvent.keyDown(descending, { key: 'Enter' })
    flush()
    expect(readState()).toEqual({
      grouping: ['category'],
      order: JSON.stringify([{ depth: 0, id: 'amount', desc: true }]),
    })

    summaryControl.focus()
    fireEvent.keyDown(summaryControl, { key: 'ArrowDown' })
    flush()
    const maximum = await h.findByRole(
      'option',
      { name: 'Maximum' },
      { timeout: 10_000 },
    )
    maximum.focus()
    fireEvent.keyDown(maximum, { key: 'Enter' })
    flush()
    expect(setSummaryRequest).toHaveBeenCalledExactlyOnceWith(
      'amount',
      'maximum',
    )
    expect(summaryControl.textContent).toBe('Maximum')
    expect(readState().grouping).toEqual(['category'])
    expect(h.container.textContent).not.toContain('undefined summary')
    expect(h.container.textContent).not.toContain('Formatted amount')
  },
)
