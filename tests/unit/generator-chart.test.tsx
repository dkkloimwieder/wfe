import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { ChartView } from '@wfe/generator/chart'
import type { ChartDescription } from '@wfe/generator/chart'

type Row = { id: string; x: number; label: string; y: number | null; at: Date }
const rows: Row[] = [
  {
    id: 'a',
    x: 0,
    label: 'First',
    y: -2,
    at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'b',
    x: 1,
    label: 'Second',
    y: 3,
    at: new Date('2026-01-02T00:00:00Z'),
  },
]
const description: ChartDescription<Row> = {
  id: 'requests',
  ariaLabel: 'Generated requests',
  kind: 'line',
  key: 'id',
  x: { field: 'x', scale: 'linear' },
  y: { field: 'y' },
  height: 240,
}
afterEach(cleanup)

test.each(['line', 'area', 'bar', 'scatter'] as const)(
  'renders generated %s charts and passes the original record through selection',
  (kind) => {
    const select = vi.fn()
    const d: ChartDescription<Row> =
      kind === 'bar'
        ? { ...description, kind, x: { field: 'label', scale: 'band' } }
        : { ...description, kind }
    const h = render(() => (
      <ChartView
        description={JSON.parse(JSON.stringify(d))}
        bindings={{ rows: () => rows, onSelect: select }}
      />
    ))
    flush()
    const svg = h.getByRole('img', { name: 'Generated requests' })
    fireEvent.focusIn(svg)
    fireEvent.keyDown(svg, { key: 'ArrowRight' })
    fireEvent.keyDown(svg, { key: 'Enter' })
    flush()
    expect(rows).toContain(select.mock.calls[0]![0].datum)
    expect(svg.outerHTML).not.toContain('NaN')
  },
)

test('row, label, formatter and status changes retain the same chart host', () => {
  const [data, setData] = createSignal(rows)
  const [d, setDescription] = createSignal(description)
  const [status, setStatus] = createSignal<{
    loading?: boolean
    error?: string
  }>({})
  const [formatters, setFormatters] = createSignal({
    amount: (value: unknown) => `Count ${value}`,
  })
  const h = render(() => (
    <ChartView
      description={d()}
      bindings={{ rows: data, status, formatters: formatters() }}
    />
  ))
  flush()
  const svg = h.getByRole('img', { name: 'Generated requests' })
  const line = svg.querySelector('.ts-chart__line path')!
  const before = line.getAttribute('d')
  setData(rows.map((row) => ({ ...row, y: row.id === 'a' ? 4 : 0 })))
  setDescription({
    ...description,
    ariaLabel: 'Updated requests',
    y: { field: 'y', formatter: 'amount' },
  })
  setStatus({ loading: true })
  flush()
  expect(h.getByRole('img', { name: 'Updated requests' })).toBe(svg)
  expect(svg.querySelector('.ts-chart__line path')).toBe(line)
  expect(line.getAttribute('d')).not.toBe(before)
  expect(svg.textContent).toContain('Count')
  setFormatters({ amount: (value) => `Accepted ${value}` })
  setStatus({ error: 'Application supplied failure' })
  flush()
  expect(svg.textContent).toContain('Accepted')
  expect(h.getByRole('alert').textContent).toContain(
    'Application supplied failure',
  )
  expect(h.container.querySelector('svg')).toBe(svg)
})

test('UTC axes use binding formatters and accept null gaps and empty results', () => {
  const [data, setData] = createSignal(rows)
  const d: ChartDescription<Row> = {
    ...description,
    x: { field: 'at', scale: 'utc', formatter: 'day' },
  }
  const h = render(() => (
    <ChartView
      description={d}
      bindings={{
        rows: data,
        formatters: {
          day: (value) =>
            new Intl.DateTimeFormat('en-GB', {
              timeZone: 'UTC',
              month: 'short',
            }).format(value as Date),
        },
      }}
    />
  ))
  flush()
  const svg = h.container.querySelector('svg')!
  expect(svg.textContent).toContain('Jan')
  setData(rows.map((row) => ({ ...row, y: null })))
  flush()
  expect(h.container.querySelector('svg')).toBe(svg)
  setData([])
  flush()
  expect(h.container.querySelector('svg')).toBe(svg)
})

const invalid = [
  ['unsupported kind', { ...description, kind: 'pie' }, rows],
  ['unsupported property', { ...description, stack: true }, rows],
  [
    'missing formatter',
    { ...description, y: { field: 'y', formatter: 'missing' } },
    rows,
  ],
  [
    'inherited formatter',
    { ...description, y: { field: 'y', formatter: 'constructor' } },
    rows,
  ],
  ['local scale', { ...description, x: { field: 'at', scale: 'time' } }, rows],
  ['bar scale', { ...description, kind: 'bar' }, rows],
  ['height', { ...description, height: -1 }, rows],
  ['accessible label', { ...description, ariaLabel: '' }, rows],
  [
    'unknown field',
    { ...description, x: { field: 'missing', scale: 'linear' } },
    rows,
  ],
  ['numeric data', description, [{ ...rows[0], y: 'invalid' }]],
  [
    'date data',
    { ...description, x: { field: 'at', scale: 'utc' } },
    [{ ...rows[0], at: '2026-01-01' }],
  ],
  ['duplicate record keys', description, [rows[0], rows[0]]],
] as const
for (const [name, d, data] of invalid)
  test(`rejects ${name} before chart rendering`, () => {
    const h = render(() => (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <ChartView
          description={d as unknown as ChartDescription<Row>}
          bindings={{ rows: () => data as readonly Row[], formatters: {} }}
        />
      </Errored>
    ))
    flush()
    expect(h.getByRole('alert').textContent).toContain('Generator:')
    expect(h.container.querySelector('svg')).toBeNull()
  })

test('sparse axis values remain gaps and prototype getters retain raw record identity', () => {
  class Sample {
    constructor(
      readonly id: string,
      readonly y?: number,
    ) {}
    get x() {
      return this.id === 'a' ? 0 : 1
    }
  }
  const values = [new Sample('a'), new Sample('b', 2)]
  const select = vi.fn()
  const h = render(() => (
    <ChartView
      description={{
        id: 'sparse',
        kind: 'line',
        ariaLabel: 'Sparse values',
        key: 'id',
        x: { field: 'x', scale: 'linear' },
        y: { field: 'y' },
      }}
      bindings={{ rows: () => values, onSelect: select }}
    />
  ))
  flush()
  const svg = h.getByRole('img', { name: 'Sparse values' })
  fireEvent.focusIn(svg)
  fireEvent.keyDown(svg, { key: 'ArrowRight' })
  fireEvent.keyDown(svg, { key: 'Enter' })
  flush()
  expect(select.mock.calls[0]![0].datum).toBe(values[1])
})

test('an explicitly supplied formatter named constructor remains a valid own binding', () => {
  const h = render(() => (
    <ChartView
      description={{
        ...description,
        y: { field: 'y', formatter: 'constructor' },
      }}
      bindings={{
        rows: () => rows,
        formatters: { constructor: () => 'Own formatter' },
      }}
    />
  ))
  flush()
  expect(h.container.querySelector('svg')?.textContent).toContain(
    'Own formatter',
  )
})
