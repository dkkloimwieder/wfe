import { ChartView } from '@wfe/generator/chart'
import type { ChartDescription, ChartViewBindings } from '@wfe/generator/chart'
import { ChartLegend, scaleUtc } from '@wfe/components/chart'

type Row = {
  id: string
  label: string
  count: number
  at: Date
  nullable: number | null
}
const rows: readonly Row[] = [
  {
    id: 'a',
    label: 'First',
    count: 2,
    nullable: null,
    at: new Date('2026-01-01T00:00:00Z'),
  },
]
const description: ChartDescription<Row> = {
  id: 'history',
  kind: 'line',
  ariaLabel: 'History',
  key: 'id',
  x: { field: 'at', scale: 'utc', formatter: 'day' },
  y: { field: 'nullable' },
}
const bindings: ChartViewBindings<Row> = {
  rows: () => rows,
  formatters: { day: (value) => String(value) },
  onSelect: (point) => {
    const count: number | undefined = point?.datum.count
    void count
  },
}
void ChartView<Row>
void ChartLegend
void scaleUtc
void description
void bindings

// @ts-expect-error Numeric axes cannot read text fields.
const textAsNumber: ChartDescription<Row>['x'] = {
  field: 'label',
  scale: 'linear',
}
// @ts-expect-error UTC axes require Date fields.
const numberAsDate: ChartDescription<Row>['x'] = {
  field: 'count',
  scale: 'utc',
}
// @ts-expect-error Numeric y values cannot read Date fields.
const dateAsValue: ChartDescription<Row>['y'] = { field: 'at' }
// @ts-expect-error Record identity cannot come from a Date field.
const dateKey: ChartDescription<Row>['key'] = 'at'
// @ts-expect-error Unsupported generated chart kind.
const pie: ChartDescription<Row>['kind'] = 'pie'
// @ts-expect-error Local-time generation requires an explicit future contract.
const local: ChartDescription<Row>['x'] = { field: 'at', scale: 'time' }
void [textAsNumber, numberAsDate, dateAsValue, dateKey, pie, local]

type BarAxis = Extract<ChartDescription<Row>, { kind: 'bar' }>['x']
// @ts-expect-error Generated bar charts require a band scale.
const badBar: BarAxis = { field: 'count', scale: 'linear' }
void badBar

const namedDescription = {
  id: 'named-formatters',
  kind: 'line',
  ariaLabel: 'Named formatters',
  x: { field: 'at', scale: 'utc', formatter: 'day' },
  y: { field: 'count', formatter: 'amount' },
} as const satisfies ChartDescription<Row>
const namedBindings: ChartViewBindings<Row, typeof namedDescription> = {
  rows: () => rows,
  formatters: { day: String, amount: String },
}
// @ts-expect-error Literal descriptions require their formatter bindings.
const missingFormatters: ChartViewBindings<Row, typeof namedDescription> = {
  rows: () => rows,
}
const missingFormatter: ChartViewBindings<Row, typeof namedDescription> = {
  rows: () => rows,
  // @ts-expect-error Both axes' named formatters are required.
  formatters: { day: String },
}
const misspelledFormatter: ChartViewBindings<Row, typeof namedDescription> = {
  rows: () => rows,
  // @ts-expect-error Named formatter bindings reject misspelled keys.
  formatters: { day: String, amonut: String },
}
const broadLegacyBindings: ChartViewBindings<Row> = { rows: () => rows }
void [
  namedDescription,
  namedBindings,
  missingFormatters,
  missingFormatter,
  misspelledFormatter,
  broadLegacyBindings,
]
