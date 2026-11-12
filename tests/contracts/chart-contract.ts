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

const textAsNumber: ChartDescription<Row>['x'] = {
  field: 'label',
  // @ts-expect-error Numeric axes cannot read text fields.
  scale: 'linear',
}
const numberAsDate: ChartDescription<Row>['x'] = {
  field: 'count',
  // @ts-expect-error UTC axes require Date fields.
  scale: 'utc',
}
// @ts-expect-error Numeric y values cannot read Date fields.
const dateAsValue: ChartDescription<Row>['y'] = { field: 'at' }
// @ts-expect-error Record identity cannot come from a Date field.
const dateKey: ChartDescription<Row>['key'] = 'at'
// @ts-expect-error Unsupported generated chart kind.
const unsupported: ChartDescription<Row>['kind'] = 'radar'
// @ts-expect-error Local-time generation requires an explicit future contract.
const local: ChartDescription<Row>['x'] = { field: 'at', scale: 'time' }
void [textAsNumber, numberAsDate, dateAsValue, dateKey, unsupported, local]

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

const layeredDescription = {
  id: 'layered',
  kind: 'layers',
  ariaLabel: 'Layered records',
  x: { field: 'at', scale: 'utc' },
  y: { formatter: 'axis' },
  layers: [
    { id: 'line', kind: 'line', y: { field: 'count', formatter: 'layer' } },
  ],
} as const satisfies ChartDescription<Row>
const layeredBindings: ChartViewBindings<Row, typeof layeredDescription> = {
  rows: () => rows,
  formatters: { axis: String, layer: String },
}
const incompleteLayers: ChartViewBindings<Row, typeof layeredDescription> = {
  rows: () => rows,
  // @ts-expect-error Every layer formatter is required.
  formatters: { axis: String },
}
const pieDescription = {
  id: 'pie',
  kind: 'pie',
  ariaLabel: 'Composition',
  value: { field: 'count', formatter: 'slice' },
} as const satisfies ChartDescription<Row>
const pieBindings: ChartViewBindings<Row, typeof pieDescription> = {
  rows: () => rows,
  formatters: { slice: String },
}
const badPie: Extract<ChartDescription<Row>, { kind: 'pie' }>['value'] = {
  // @ts-expect-error Pie values require numeric fields.
  field: 'label',
}
void [
  layeredDescription,
  pieDescription,
  layeredBindings,
  incompleteLayers,
  pieBindings,
  badPie,
]
