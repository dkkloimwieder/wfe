import { createMemo, createSignal } from 'solid-js'
import { Button, Checkbox, Input } from '@wfe/components'
import {
  Chart,
  defineChart,
  lineY,
  ruleX,
  decorative,
  scaleUtc,
  scaleLinear,
} from '@wfe/components/chart'
import {
  createHourlyRecords,
  prepareTimeSeries,
  hour,
  exampleEnd,
} from './time-series-data'
import './time-series.css'

const day = 24 * hour
const start = exampleEnd - 30 * day
const utcDay = (value: number) => Math.floor(value / day) * day
const format = (value: Date) => value.toISOString().slice(5, 10)

/** The application owns the accepted interval and links the two charts. */
export function FocusContext() {
  const records = createHourlyRecords()
  const rows = prepareTimeSeries(records, '30d').totals
  const [range, setRange] = createSignal<readonly [number, number]>([
    exampleEnd - 7 * 24 * hour,
    exampleEnd,
  ])
  const [accept, setAccept] = createSignal(true)
  const [cursor, setCursor] = createSignal<number>()
  const [anchor, setAnchor] = createSignal<number>()
  const [status, setStatus] = createSignal(
    'Select two overview points to set the detail range.',
  )
  const detail = createMemo(() =>
    rows.filter((row) => +row.time >= range()[0] && +row.time < range()[1]),
  )
  function request(a: number, b: number) {
    setAnchor(undefined)
    // Accepted ranges use UTC midnight boundaries and an exclusive end.
    const low = Math.max(start, utcDay(a))
    const high = Math.min(exampleEnd, utcDay(b))
    if (!Number.isFinite(low) || !Number.isFinite(high) || high - low < day) {
      setStatus('Choose a range of at least one day.')
      return
    }
    setStatus(accept() ? 'Range accepted' : 'Range rejected by application')
    if (accept()) setRange([low, high])
  }
  function zoom(factor: number) {
    const [a, b] = range()
    const center = (a + b) / 2
    const span = Math.max(
      day,
      Math.min(exampleEnd - start, Math.round(((b - a) * factor) / day) * day),
    )
    const low = Math.max(
      start,
      Math.min(exampleEnd - span, Math.round((center - span / 2) / day) * day),
    )
    request(low, low + span)
  }
  function pan(direction: number) {
    const [a, b] = range()
    const shift =
      direction *
      Math.min(
        Math.max(day, Math.round((b - a) / (2 * day)) * day),
        direction < 0 ? a - start : exampleEnd - b,
      )
    request(a + shift, b + shift)
  }
  function definition(overview: boolean) {
    const selected = cursor()
    return defineChart({
      marks: [
        lineY(overview ? rows : detail(), {
          key: 'id',
          x: 'time',
          y: 'requests',
          points: true,
        }),
        ...[range()[0], range()[1]].map((value) =>
          decorative(ruleX([new Date(value)], { strokeDasharray: '4 3' })),
        ),
        ...(selected === undefined
          ? []
          : [
              decorative(
                ruleX([new Date(selected)], { stroke: 'var(--ui-text)' }),
              ),
            ]),
      ],
      scales: {
        x: {
          scale: scaleUtc().domain(
            overview
              ? [new Date(start), new Date(exampleEnd)]
              : range().map((value) => new Date(value)),
          ),
          axis: {
            label: 'Time (UTC)',
            ticks: { count: 4, format },
            tickLabels: { thin: true },
          },
        },
        y: {
          scale: scaleLinear,
          axis: { label: 'Requests', ticks: { count: 4 } },
        },
      },
      margin: { top: 16, right: 24, bottom: 48, left: 64 },
    })
  }
  const overviewDefinition = createMemo(() => definition(true))
  const detailDefinition = createMemo(() => definition(false))
  return (
    <section
      class="time-series time-series-status"
      style={{ padding: '6px', 'box-sizing': 'border-box' }}
      data-focus-context
      aria-label="Linked time-series navigation"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && anchor() !== undefined) {
          event.preventDefault()
          setAnchor(undefined)
          setStatus('Range selection canceled')
        }
      }}
    >
      <p>
        Compare the full month with a selected interval. Dashed lines mark the
        accepted range. A solid line links the selected day.
      </p>
      <div class="time-series-controls">
        <Input
          type="date"
          aria-label="Range start UTC"
          value={new Date(range()[0]).toISOString().slice(0, 10)}
          onChange={(event) => {
            request(Date.parse(event.currentTarget.value), range()[1])
            event.currentTarget.value = new Date(range()[0])
              .toISOString()
              .slice(0, 10)
          }}
        />
        <Input
          type="date"
          aria-label="Range end UTC"
          value={new Date(range()[1]).toISOString().slice(0, 10)}
          onChange={(event) => {
            request(range()[0], Date.parse(event.currentTarget.value))
            event.currentTarget.value = new Date(range()[1])
              .toISOString()
              .slice(0, 10)
          }}
        />
        <Button
          disabled={range()[1] - range()[0] <= 24 * hour}
          onClick={() => zoom(0.5)}
        >
          Zoom in
        </Button>
        <Button
          disabled={range()[1] - range()[0] >= exampleEnd - start}
          onClick={() => zoom(2)}
        >
          Zoom out
        </Button>
        <Button disabled={range()[0] <= start} onClick={() => pan(-1)}>
          Earlier
        </Button>
        <Button disabled={range()[1] >= exampleEnd} onClick={() => pan(1)}>
          Later
        </Button>
        <Button onClick={() => request(start, exampleEnd)}>Full month</Button>
        <Checkbox checked={accept()} onCheckedChange={setAccept}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Accept range changes</Checkbox.Label>
        </Checkbox>
      </div>
      <h2>Month overview</h2>
      <p>
        Select two points to brush an interval. Use arrow keys and Enter, or
        click the points. Both selected days are included. Date fields use UTC
        midnight boundaries; the end date is exclusive.
      </p>
      <Chart
        definition={overviewDefinition()}
        ariaLabel="Month overview"
        height={230}
        initialWidth={800}
        onSelect={(point) => {
          if (!point) return
          const time = +point.datum.time
          setCursor(time)
          if (anchor() === undefined) {
            setAnchor(time)
            setStatus('Range start selected. Select a second day.')
          } else {
            request(
              utcDay(Math.min(anchor()!, time)),
              utcDay(Math.max(anchor()!, time)) + day,
            )
            setAnchor(undefined)
          }
        }}
      />
      <Button
        onClick={() => {
          setAnchor(undefined)
          setStatus('Range selection canceled')
        }}
      >
        Cancel range selection
      </Button>
      <h2>Selected interval</h2>
      <Chart
        definition={detailDefinition()}
        ariaLabel="Selected time interval"
        height={300}
        initialWidth={800}
        onSelect={(point) => {
          if (point) setCursor(+point.datum.time)
        }}
      />
      <output aria-label="Range request status">{status()}</output>
      <output aria-label="Accepted range UTC">
        {new Date(range()[0]).toISOString()} to{' '}
        {new Date(range()[1]).toISOString()}
      </output>
      <output aria-label="Selected interval count">
        {detail().length} daily intervals
      </output>
      <output aria-label="Linked source detail">
        {cursor() === undefined
          ? 'No day selected'
          : `${new Date(cursor()!).toISOString().slice(0, 10)}: ${rows.find((row) => +row.time === cursor())?.requests ?? 0} requests from ${rows.find((row) => +row.time === cursor())?.source.length ?? 0} original hourly records`}
      </output>
      <Input
        aria-label="Retained navigation note"
        placeholder="Analysis note"
      />
    </section>
  )
}
