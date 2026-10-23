import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { Errored, flush, createSignal } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import { ChartView } from '@wfe/generator/chart'
import type { ChartViewBindings as SubpathChartViewBindings } from '@wfe/generator/chart'
import { FormView, TableView } from '@wfe/generator'
import type {
  ChartDescription,
  ChartViewBindings,
  FormDescription,
} from '@wfe/generator'

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

for (const label of ['', '   ']) {
  for (const source of ['description', 'alias'] as const) {
    test(`rejects blank table ${source} label ${JSON.stringify(label)} before custom cells render`, () => {
      const cell = vi.fn(() => <span>Custom cell</span>)
      const toolbar = vi.fn(() => <span>Custom toolbar</span>)
      const h = render(() => {
        const table = createTable({
          source: { ids: () => ['a'], get: () => ({ name: 'Harbor' }) },
          columns: [{ id: 'name', accessorKey: 'name' }],
        })
        return (
          <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
            <TableView
              description={
                {
                  id: 'records',
                  columns: {
                    name: {
                      renderer: 'custom',
                      label: source === 'description' ? label : undefined,
                    },
                  },
                } as const
              }
              bindings={{
                table,
                toolbarActions: toolbar,
                cells: { custom: cell },
                headerAliases: () =>
                  source === 'alias' ? { name: label } : {},
              }}
            />
          </Errored>
        )
      })
      flush()
      expect(h.getByRole('alert').textContent).toContain('invalid label')
      expect(cell).not.toHaveBeenCalled()
      expect(toolbar).not.toHaveBeenCalled()
    })
  }
}

test('rejects invalid aliases before new cells mount in the same update', () => {
  const [ids, setIds] = createSignal(['a'])
  const [alias, setAlias] = createSignal('Accepted name')
  const cell = vi.fn(() => <span>Custom cell</span>)
  const h = render(() => {
    const table = createTable({
      source: { ids, get: (id: string) => ({ name: id }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <TableView
          description={
            {
              id: 'records',
              columns: { name: { renderer: 'custom' } },
            } as const
          }
          bindings={{
            table,
            cells: { custom: cell },
            headerAliases: () => ({ name: alias() }),
          }}
        />
      </Errored>
    )
  })
  flush()
  expect(cell).toHaveBeenCalledTimes(1)
  setAlias(' ')
  setIds(['a', 'b'])
  flush()
  expect(h.getByRole('alert').textContent).toContain('invalid label')
  expect(cell).toHaveBeenCalledTimes(1)
})

test('validates later scalar descriptors before calling an earlier custom renderer', () => {
  const custom = vi.fn(() => <span>Custom field</span>)
  const values = { first: 'a', second: 'b' }
  const description = {
    id: 'editor',
    fields: [
      { field: 'first', control: 'custom' },
      { field: 'second', control: 'text', label: ' ' },
    ],
  } as const satisfies FormDescription<typeof values>
  const h = render(() => {
    const form = createForm({
      values: () => values,
      defaults: () => values,
      onValuesChange: () => {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={description}
          bindings={{ form, fields: { first: custom } }}
        />
      </Errored>
    )
  })
  flush()
  expect(h.getByRole('alert').textContent).toContain('invalid label')
  expect(custom).not.toHaveBeenCalled()
})

test('validates repeated child descriptors before earlier custom renderers and row keys', () => {
  const custom = vi.fn(() => <span>Custom field</span>)
  const rowKey = vi.fn((row: { name: string }) => row.name)
  const values = { first: 'a', entries: [{ name: 'b' }] }
  const description = {
    id: 'editor',
    fields: [
      { field: 'first', control: 'custom' },
      {
        field: 'entries',
        control: 'repeat',
        fields: [{ field: 'name', control: 'text', label: ' ' }],
      },
    ],
  } as const satisfies FormDescription<typeof values>
  const h = render(() => {
    const form = createForm({
      values: () => values,
      defaults: () => values,
      onValuesChange: () => {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={description}
          bindings={{
            form,
            fields: { first: custom },
            repeated: {
              entries: { rowKey, createRow: () => ({ name: 'new' }) },
            },
          }}
        />
      </Errored>
    )
  })
  flush()
  expect(h.getByRole('alert').textContent).toContain('invalid label')
  expect(custom).not.toHaveBeenCalled()
  expect(rowKey).not.toHaveBeenCalled()
})

test('valid table label updates retain the custom cell and accepted alias precedence', () => {
  const [label, setLabel] = createSignal<string | undefined>()
  const [alias, setAlias] = createSignal<string | undefined>()
  const cell = vi.fn(() => <span>Custom cell</span>)
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ name: 'Harbor' }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <TableView
        description={
          {
            id: 'records',
            columns: { name: { renderer: 'custom', label: label() } },
          } as const
        }
        bindings={{
          table,
          cells: { custom: cell },
          headerAliases: () => ({ name: alias() }),
        }}
      />
    )
  })
  flush()
  const header = h.getByRole('columnheader')
  const rendered = h.getByText('Custom cell')
  expect(header.textContent).toContain('name')
  setLabel('Description name')
  flush()
  expect(header.textContent).toContain('Description name')
  setAlias('Accepted name')
  flush()
  expect(header.textContent).toContain('Accepted name')
  setLabel('Updated description')
  flush()
  expect(header.textContent).toContain('Accepted name')
  setAlias(undefined)
  flush()
  expect(header.textContent).toContain('Updated description')
  expect(h.getByRole('columnheader')).toBe(header)
  expect(h.getByText('Custom cell')).toBe(rendered)
  expect(cell).toHaveBeenCalledTimes(1)
})

function chartConsumerContracts() {
  type Row = { count: number }
  const rows: readonly Row[] = [{ count: 1 }]
  const description = {
    id: 'chart',
    kind: 'line',
    ariaLabel: 'Count',
    x: { field: 'count', scale: 'linear' },
    y: { field: 'count', formatter: 'amount' },
  } as const satisfies ChartDescription<Row>
  const bindings: ChartViewBindings<Row, typeof description> = {
    rows: () => rows,
    formatters: { amount: String },
  }
  void (
    <ChartView<Row, typeof description>
      description={description}
      bindings={bindings}
    />
  )
  const subpathBindings: SubpathChartViewBindings<Row, typeof description> =
    bindings
  const rootBindings: ChartViewBindings<Row, typeof description> =
    subpathBindings
  void rootBindings
  void (
    <ChartView<Row, typeof description>
      description={description}
      // @ts-expect-error Literal descriptions require the named formatter binding.
      bindings={{ rows: () => rows }}
    />
  )
  // Explicit one-generic consumers retain runtime validation of broad descriptions.
  void (
    <ChartView<Row> description={description} bindings={{ rows: () => rows }} />
  )
}
void chartConsumerContracts
