import { createMemo, createSignal } from 'solid-js'
import { Button, Checkbox, Input } from '@wfe/components'
import { ChartView } from '@wfe/generator/chart'
import type { ChartDescription } from '@wfe/generator/chart'

type Row = { id: string; month: string; actual: number; target: number }
const initial: readonly Row[] = [
  { id: 'jan', month: 'January', actual: 24, target: 30 },
  { id: 'feb', month: 'February', actual: 35, target: 32 },
  { id: 'mar', month: 'March', actual: 29, target: 34 },
]

/** Records, accepted edits, and callback feedback belong to this application. */
export function ChartDescriptions() {
  const [revision, setRevision] = createSignal(0)
  const [empty, setEmpty] = createSignal(false)
  const [donut, setDonut] = createSignal(true)
  const [note, setNote] = createSignal('')
  const [selected, setSelected] = createSignal('No selection')
  const rows = createMemo(() =>
    empty()
      ? []
      : initial.map((row) => ({
          ...row,
          actual: row.actual + revision() * 3,
        })),
  )
  const layered: ChartDescription<Row> = {
    id: 'description-layers',
    title: 'Actual and target',
    kind: 'layers',
    ariaLabel: 'Generated monthly actual and target',
    key: 'id',
    x: { field: 'month', scale: 'band', label: 'Month' },
    y: { label: 'Requests', formatter: 'requests' },
    height: 260,
    layers: [
      {
        id: 'actual-area',
        kind: 'area',
        y: { field: 'actual', label: 'Actual' },
      },
      { id: 'actual', kind: 'bar', y: { field: 'actual', label: 'Actual' } },
      { id: 'target', kind: 'line', y: { field: 'target', label: 'Target' } },
      {
        id: 'target-points',
        kind: 'scatter',
        y: { field: 'target', label: 'Target' },
      },
    ],
  }
  const composition = createMemo(
    () =>
      ({
        id: 'description-pie',
        title: 'Monthly share',
        kind: 'pie',
        ariaLabel: 'Generated monthly share',
        key: 'id',
        value: {
          field: 'actual',
          label: 'Actual requests',
          formatter: 'requests',
        },
        innerRadius: donut() ? 0.55 : 0,
        height: 260,
      }) satisfies ChartDescription<Row>,
  )
  const bindings = {
    rows,
    formatters: { requests: (value: unknown) => `${value} requests` },
    onSelect: (point: { datum: Row; markId: string } | null) => {
      if (!point) {
        setSelected('No selection')
        return
      }
      const original = rows().find((row) => row.id === point.datum.id)
      setSelected(
        `${point.markId}: ${point.datum.month}; source identity ${point.datum === original ? 'retained' : 'lost'}`,
      )
    },
  }
  return (
    <section
      data-chart-descriptions=""
      style={{
        display: 'grid',
        'grid-template-columns': 'minmax(0, 1fr)',
        gap: 'var(--ui-gap)',
        'min-width': 0,
        'overflow-wrap': 'anywhere',
        padding: '6px',
        'box-sizing': 'border-box',
      }}
    >
      <h2>Chart descriptions</h2>
      <p>
        Ordered Cartesian layers and polar pie descriptions use the same chart
        engine. The application supplies records, accepts updates, and receives
        original records from selections.
      </p>
      <div
        style={{ display: 'flex', 'flex-wrap': 'wrap', gap: 'var(--ui-gap)' }}
      >
        <Button onClick={() => setRevision((value) => value + 1)}>
          Update description records
        </Button>
        <Checkbox checked={empty()} onCheckedChange={setEmpty}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Empty description records</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={donut()} onCheckedChange={setDonut}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Description donut</Checkbox.Label>
        </Checkbox>
      </div>
      <Input
        aria-label="Retained description note"
        value={note()}
        onInput={(event) => setNote(event.currentTarget.value)}
      />
      <p role="status">{selected()}</p>
      <ChartView description={layered} bindings={bindings} />
      <ChartView description={composition()} bindings={bindings} />
      <details>
        <summary>Description boundaries</summary>
        <p>
          Descriptions contain field names and presentation settings. Formatters
          and selection handlers are supplied in bindings. Queries, grouping,
          transforms, and persistence remain application code.
        </p>
      </details>
    </section>
  )
}
