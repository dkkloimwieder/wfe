import { createMemo, createSignal, For, Show, onSettled } from 'solid-js'
import {
  Button,
  Card,
  Checkbox,
  Collapsible,
  EmptyState,
  Input,
  SelectField,
  ToggleGroup,
} from '@wfe/components'
import {
  Chart,
  ChartLegend,
  defineChart,
  rect,
  cell,
  lineY,
  areaY,
  decorative,
  ruleY,
  scaleUtc,
  scaleLinear,
  scaleBand,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'
import type {
  ChartTooltipContext,
  ChartScene,
  ChartValue,
} from '@wfe/components/chart'
import {
  createHourlyRecords,
  exampleEnd,
  hour,
  prepareTimeSeries,
  serviceNames,
  windows,
} from './time-series-data'
import type {
  Service,
  TimeBucket,
  TimePoint,
  TimeWindow,
} from './time-series-data'
import './time-series.css'

export const timeSeriesViews = [
  {
    value: 'columns',
    label: 'Stacked columns',
    description:
      'Request volume by interval, split by service. Pin a column to inspect every service and the interval total.',
  },
  {
    value: 'share',
    label: '100% stacked columns',
    description:
      'Service share within each interval. Every complete column sums to 100%. Details retain the original request counts.',
  },
  {
    value: 'grouped',
    label: 'Grouped columns',
    description:
      'Adjacent columns compare service volumes on a shared baseline.',
  },
  {
    value: 'area',
    label: 'Stacked area',
    description:
      'Filled bands show the changing service mix and total request volume.',
  },
  {
    value: 'lines',
    label: 'Multi-series lines',
    description:
      'Independent service trends use a common request axis and distinct line patterns. Missing observations break the lines.',
  },
  {
    value: 'combo',
    label: 'Columns and total line',
    description:
      'Stacked service columns share a request axis with the total line. Both encodings use the same units.',
  },
  {
    value: 'latency',
    label: 'Latency percentile band',
    description:
      'The line shows P50 latency. The shaded interval spans P50 to P95 from pooled request samples.',
  },
  {
    value: 'heatmap',
    label: 'Service/time heatmap',
    description:
      'Rows represent services and columns represent time intervals. Stronger fill means more requests.',
  },
  {
    value: 'waterfall',
    label: 'Request-change waterfall',
    description:
      'The first column starts at zero. Each floating column shows the change from the previous interval total.',
  },
  {
    value: 'indexed',
    label: 'Indexed service trends',
    description:
      'Each service starts at 100. Values show its request volume as a percentage of that first interval.',
  },
] as const
type View = (typeof timeSeriesViews)[number]['value']
const colors = [
  'var(--ui-accent)',
  'color-mix(in srgb, var(--ui-accent) 80%, var(--ui-surface))',
  'color-mix(in srgb, var(--ui-accent) 60%, var(--ui-surface))',
]
const dash = [undefined, '6 3', '2 3']
const integers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const clock = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})
const number = (value: number | null | undefined) =>
  value == null ? 'Unknown' : integers.format(value)
const milliseconds = (value: number | null | undefined) =>
  value == null ? 'Unknown' : `${number(value)} ms`
const interval = (bucket: TimeBucket) =>
  `${clock.format(bucket.start)} to ${clock.format(bucket.end)} UTC`
type DefinitionDatum<T extends { readonly __datum?: unknown }> = NonNullable<
  T['__datum']
>
type Snapshot = {
  width: number
  height: number
  points: {
    x: number
    y: number
    key: string
    bucketId: string
    service: string
  }[]
}
export type TimeSeriesHost = HTMLElement & {
  timeSeries?: { scene: () => Snapshot | undefined; selections: () => number }
}

export function TimeSeries() {
  const [view, setView] = createSignal<View>('columns')
  const [window, setWindow] = createSignal<TimeWindow>('30d')
  const [visible, setVisible] = createSignal<readonly Service[]>([
    ...serviceNames,
  ])
  const [accept, setAccept] = createSignal(true)
  const [missing, setMissing] = createSignal(false)
  const [empty, setEmpty] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  const [notes, setNotes] = createSignal<Readonly<Record<string, string>>>({})
  const [request, setRequest] = createSignal('No chart change requested')
  const [selection, setSelection] = createSignal('No interval selected')
  const [inspected, setInspected] = createSignal<string>()
  const records = createMemo(() =>
    empty() ? [] : createHourlyRecords(revision()),
  )
  const model = createMemo(() =>
    prepareTimeSeries(records(), window(), visible(), missing()),
  )
  const selectedView = createMemo(() =>
    timeSeriesViews.find((item) => item.value === view())!,
  )
  const inspectedBucket = createMemo(() =>
    model().buckets.find((bucket) => bucket.id === inspected()),
  )
  const total = createMemo(() =>
    model().buckets.reduce(
      (sum, bucket) => sum + (bucket.total?.requests ?? 0),
      0,
    ),
  )
  const legend = createMemo(() =>
    serviceNames.map((id, index) => ({
      id,
      label: id,
      color: colors[index]!,
      visible: visible().includes(id),
      lineStyle:
        view() === 'lines' || view() === 'indexed'
          ? (['solid', 'dashed', 'dotted'] as const)[index]
          : undefined,
    })),
  )
  let host: TimeSeriesHost | undefined
  let snapshot: Snapshot | undefined
  let selections = 0
  onSettled(() => () => {
    if (host) delete host.timeSeries
    snapshot = undefined
  })
  function change(label: string, apply: () => void) {
    setRequest(label)
    if (accept()) apply()
  }
  const definition = createMemo(() => {
    const mode = view()
    const config = windows[window()]
    const points = model().points
    const totals = model().totals
    const gap = model().buckets
    const visibleServices = visible()
    const start = new Date(exampleEnd - config.hours * hour)
    const end = new Date(exampleEnd)
    const formatTime = (value: Date) =>
      config.bucketHours === 24 ? shortDate.format(value) : clock.format(value)
    const common = {
      focus: 'group-x' as const,
      maxFocusDistance: Infinity,
      color: {
        domain: [...serviceNames, 'Total'],
        range: [...colors, 'var(--ui-text)'],
      },
      tooltip: {
        use: tooltip,
        portal: tooltipPortal,
        className: 'time-series-popover',
        anchor: 'group-center' as const,
      },
      margin: { top: 18, right: 48, bottom: 52, left: 64 },
    }
    const scales = {
      x: {
        scale: scaleUtc,
        domain: [start, end] as const,
        axis: {
          label: 'Time (UTC)',
          ticks: { count: 6, format: formatTime },
          tickLabels: { thin: true },
        },
      },
      y: {
        scale: scaleLinear,
        axis: {
          label:
            mode === 'share'
              ? 'Share'
              : mode === 'latency'
                ? 'Latency (ms)'
                : mode === 'indexed'
                  ? 'Index (first = 100)'
                  : 'Requests',
          ticks: {
            count: 5,
            format: (value: number) =>
              mode === 'share'
                ? `${Math.round(value * 100)}%`
                : value >= 1000
                  ? `${Math.round(value / 1000)}k`
                  : number(value),
          },
        },
      },
    }
    const columns = points.map((row) => {
      const index = visibleServices.indexOf(row.service as Service)
      const duration = row.end.getTime() - row.start.getTime()
      const width = duration / Math.max(1, visibleServices.length)
      return {
        ...row,
        start:
          mode === 'grouped'
            ? new Date(row.start.getTime() + index * width)
            : row.start,
        end:
          mode === 'grouped'
            ? new Date(row.start.getTime() + (index + 1) * width)
            : row.end,
        y1:
          mode === 'grouped'
            ? row.requests == null
              ? null
              : 0
            : mode === 'share' && row.y1 !== null
              ? row.y1 /
                (gap.find((bucket) => bucket.id === row.bucketId)?.total
                  ?.requests || 1)
              : row.y1,
        y2:
          mode === 'grouped'
            ? row.requests
            : mode === 'share' && row.y2 !== null
              ? row.y2 /
                (gap.find((bucket) => bucket.id === row.bucketId)?.total
                  ?.requests || 1)
              : row.y2,
      }
    })
    if (mode === 'heatmap')
      return defineChart({
        ...common,
        color: {
          domain: [0, 1, 2, 3],
          range: [
            'color-mix(in srgb, var(--ui-accent) 18%, var(--ui-surface))',
            ...[...colors].reverse(),
          ],
        },
        marks: [
          cell(
            points.filter((row) => row.requests !== null),
            {
              id: 'time-cells',
              key: 'id',
              x: 'time',
              y: 'service',
              color: 'intensity',
              inset: 1,
            },
          ),
        ],
        scales: {
          x: {
            scale: scaleBand,
            domain: gap.map((bucket) => bucket.time),
            axis: {
              label: 'Time (UTC)',
              ticks: { format: formatTime },
              tickLabels: { thin: true },
            },
          },
          y: {
            scale: scaleBand,
            domain: [...visibleServices],
            axis: { label: 'Service' },
          },
        },
      })
    if (mode === 'latency')
      return defineChart({
        ...common,
        scales,
        marks: [
          decorative(
            areaY(totals, {
              id: 'percentile-band',
              key: 'id',
              x: 'time',
              y1: 'p50',
              y2: 'p95',
              fillOpacity: 0.18,
            }),
          ),
          lineY(totals, {
            id: 'latency-p50',
            key: 'id',
            x: 'time',
            y: 'p50',
            points: true,
          }),
          decorative(
            lineY(totals, {
              id: 'latency-p95',
              key: 'id',
              x: 'time',
              y: 'p95',
              strokeDasharray: '5 3',
              strokeOpacity: 0.7,
            }),
          ),
        ],
      })
    if (mode === 'lines' || mode === 'indexed')
      return defineChart({
        ...common,
        scales,
        marks: [
          ...serviceNames.map((service, index) =>
            lineY(
              points.filter((row) => row.service === service),
              {
                id: `trend-${service}`,
                key: 'id',
                x: 'time',
                y: mode === 'indexed' ? 'indexed' : 'requests',
                z: 'service',
                points: true,
                strokeDasharray: dash[index],
              },
            ),
          ),
          ...(mode === 'indexed'
            ? [
                ruleY([100], {
                  id: 'index-baseline',
                  strokeDasharray: '2 3',
                  strokeOpacity: 0.5,
                }),
              ]
            : []),
        ],
      })
    if (mode === 'waterfall')
      return defineChart({
        ...common,
        scales,
        color: {
          domain: ['Increase', 'Decrease'],
          range: [colors[0]!, colors[1]!],
        },
        marks: [
          rect(
            totals.map((row, index) => ({
              ...row,
              y1: index === 0 ? 0 : (gap[index]?.previous ?? null),
              y2: row.requests,
              direction:
                gap[index]?.change != null && gap[index]!.change! < 0
                  ? 'Decrease'
                  : 'Increase',
            })),
            {
              id: 'changes',
              key: 'id',
              x: 'time',
              x1: 'start',
              x2: 'end',
              y1: 'y1',
              y2: 'y2',
              inset: 1,
              color: 'direction',
            },
          ),
        ],
      })
    if (mode === 'area')
      return defineChart({
        ...common,
        scales,
        marks: [
          areaY(points, {
            id: 'service-areas',
            key: 'id',
            x: 'time',
            y1: 'y1',
            y2: 'y2',
            z: 'service',
            fillOpacity: 0.9,
          }),
        ],
      })
    return defineChart({
      ...common,
      scales,
      marks: [
        rect(columns, {
          id: 'service-columns',
          key: 'id',
          x: 'time',
          x1: 'start',
          x2: 'end',
          y1: 'y1',
          y2: 'y2',
          z: 'service',
          inset: mode === 'grouped' ? 0.15 : 1,
        }),
        ...(mode === 'combo'
          ? [
              decorative(
                lineY(totals, {
                  id: 'total-overlay',
                  key: 'id',
                  x: 'time',
                  y: 'requests',
                  stroke: 'var(--ui-text)',
                  strokeWidth: 2,
                }),
              ),
            ]
          : []),
      ],
    })
  })
  function rendered(context: { scene: ChartScene }) {
    snapshot = {
      width: context.scene.width,
      height: context.scene.height,
      points: context.scene.points.map((point) => ({
        x: point.x,
        y: point.y,
        key: point.key,
        bucketId: (point.datum as TimePoint).bucketId,
        service: (point.datum as TimePoint).service,
      })),
    }
  }
  return (
    <section
      class="time-series"
      aria-label="Operational time-series examples"
      data-time-series
      ref={(node) => {
        host = node
        host.timeSeries = {
          scene: () => snapshot,
          selections: () => selections,
        }
      }}
    >
      <p>
        Simulated operational data, with three services and UTC intervals.
        Choose from ten views to compare volume, composition, latency, or
        relative change.
      </p>
      <div class="time-series-controls">
        <SelectField
          label="Time-series view"
          choices={timeSeriesViews}
          value={view()}
          onValueChange={(value) => {
            const next = timeSeriesViews.find((item) => item.value === value)
            if (next)
              change(`Requested ${next.label}`, () => setView(next.value))
          }}
        />
        <ToggleGroup
          aria-label="Time window"
          value={window()}
          allowEmpty={false}
          items={[
            { value: '24h', label: '24 hours' },
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
          ]}
          onValueChange={(value) => {
            if (value === '24h' || value === '7d' || value === '30d')
              change(`Requested ${value} window`, () => setWindow(value))
          }}
        />
        <Button
          onClick={() =>
            change('Requested refreshed time series', () =>
              setRevision((value) => value + 1),
            )
          }
        >
          Refresh time series
        </Button>
      </div>
      <div class="time-series-controls">
        <Checkbox checked={accept()} onCheckedChange={setAccept}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Accept time-series changes</Checkbox.Label>
        </Checkbox>
        <Checkbox
          checked={missing()}
          onCheckedChange={(value) =>
            change('Requested missing interval', () => setMissing(value))
          }
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Simulate missing interval</Checkbox.Label>
        </Checkbox>
        <Checkbox
          checked={empty()}
          onCheckedChange={(value) =>
            change('Requested empty time series', () => setEmpty(value))
          }
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Empty time series</Checkbox.Label>
        </Checkbox>
      </div>
      <ChartLegend
        label="Visible services"
        items={legend()}
        onVisibilityChange={(id, checked) =>
          change(`Requested ${id} visibility`, () =>
            setVisible((current) =>
              serviceNames.filter((service) =>
                service === id ? checked : current.includes(service),
              ),
            ),
          )
        }
      />
      <div class="time-series-summary">
        <div>
          <span>Visible requests</span>
          <output aria-label="Visible request total">{number(total())}</output>
        </div>
        <div>
          <span>Time buckets</span>
          <output aria-label="Time bucket count">
            {model().buckets.length} {windows[window()].label.toLowerCase()}{' '}
            intervals
          </output>
        </div>
        <div>
          <span>Data coverage</span>
          <output aria-label="Time-series coverage">
            {model().buckets.filter((bucket) => bucket.total !== null).length}/
            {model().buckets.length} intervals
          </output>
        </div>
      </div>
      <h2>{selectedView().label}</h2>
      <p>{selectedView().description}</p>
      <p>
        Hover to compare services. Click a mark or press Enter to pin details.
        Press Escape to dismiss them.
      </p>
      <Show when={empty() || visible().length === 0}>
        <EmptyState>
          {empty()
            ? 'No request data'
            : 'Enable a service in the legend to show its data.'}
        </EmptyState>
      </Show>
      <Chart<
        DefinitionDatum<ReturnType<typeof definition>>,
        ChartValue,
        ChartValue
      >
        definition={definition()}
        ariaLabel="Operational time series"
        height={360}
        initialWidth={800}
        onRender={rendered}
        onSelect={(point) => {
          selections++
          if (point)
            change(`Selected interval ${point.datum.bucketId}`, () =>
              setSelection(`${point.datum.bucketId} / ${point.datum.service}`),
            )
        }}
        renderTooltipBody={(context) => (
          <TimeSeriesDetail
            context={context}
            buckets={model().buckets}
            note={(id) => notes()[id] ?? ''}
            onNote={(id, value) =>
              setNotes((current) => ({ ...current, [id]: value }))
            }
            onInspect={(id) =>
              change(`Requested source interval ${id}`, () => setInspected(id))
            }
            onRefresh={() =>
              change('Requested refreshed time series', () =>
                setRevision((value) => value + 1),
              )
            }
          />
        )}
      />
      <p>
        Latency percentiles use pooled samples. A missing interval means unknown
        data and leaves a gap.
      </p>
      <Input
        aria-label="Retained time-series note"
        placeholder="Analysis note"
      />
      <div class="time-series-status">
        <span>
          Snapshot{' '}
          <output aria-label="Time-series revision">{revision()}</output>
        </span>
        <output data-time-series-request>{request()}</output>
        <output data-time-series-selection>{selection()}</output>
      </div>
      <Show when={inspectedBucket()}>
        {(bucket) => (
          <Card class="time-series-records" data-time-series-inspected>
            <h3>Inspected source interval</h3>
            <p>{interval(bucket())}</p>
            <p>
              {bucket().source.length} hourly source records. Showing the first
              six records.
            </p>
            <div class="time-series-table-scroll">
              <table class="ui-table">
                <caption>Hourly source records</caption>
                <thead>
                  <tr>
                    <th scope="col">Time (UTC)</th>
                    <th scope="col">Service</th>
                    <th scope="col">Requests</th>
                    <th scope="col">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={bucket().source.slice(0, 6)}>
                    {(row) => (
                      <tr>
                        <th scope="row">{clock.format(row.timestamp)}</th>
                        <td>{row.service}</td>
                        <td>{number(row.requests)}</td>
                        <td>{number(row.errors)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <Button onClick={() => setInspected(undefined)}>
              Clear inspected interval
            </Button>
          </Card>
        )}
      </Show>
      <Collapsible summary="View interval data table">
        <div class="time-series-table-scroll">
          <table class="ui-table">
            <caption>Time-series intervals and visible services</caption>
            <thead>
              <tr>
                <th scope="col">Interval start (UTC)</th>
                <For each={serviceNames}>
                  {(service) => <th scope="col">{service}</th>}
                </For>
                <th scope="col">Total</th>
                <th scope="col">P50</th>
                <th scope="col">P95</th>
              </tr>
            </thead>
            <tbody>
              <For each={model().buckets}>
                {(bucket) => (
                  <tr>
                    <th scope="row">{clock.format(bucket.start)}</th>
                    <For each={serviceNames}>
                      {(service) => (
                        <td>
                          {visible().includes(service)
                            ? number(
                                bucket.services.find(
                                  (row) => row.service === service,
                                )?.requests,
                              )
                            : 'Hidden'}
                        </td>
                      )}
                    </For>
                    <td>{number(bucket.total?.requests)}</td>
                    <td>{milliseconds(bucket.total?.p50)}</td>
                    <td>{milliseconds(bucket.total?.p95)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Collapsible>
    </section>
  )
}

function TimeSeriesDetail(props: {
  context: ChartTooltipContext<TimePoint, ChartValue, ChartValue>
  buckets: readonly TimeBucket[]
  note: (id: string) => string
  onNote: (id: string, value: string) => void
  onInspect: (id: string) => void
  onRefresh: () => void
}) {
  const bucket = createMemo(() =>
    props.buckets.find(
      (item) => item.id === props.context.primaryPoint?.datum.bucketId,
    ),
  )
  return (
    <Card class="time-series-detail" data-time-series-detail>
      <Show when={bucket()}>
        {(value) => (
          <>
            <h3>Interval details</h3>
            <p data-time-series-detail-interval>{interval(value())}</p>
            <table class="ui-table">
              <caption>Visible services in this interval</caption>
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Requests</th>
                  <th scope="col">Share</th>
                  <th scope="col">Errors</th>
                </tr>
              </thead>
              <tbody>
                <For each={value().services}>
                  {(service) => (
                    <tr>
                      <th scope="row">{service.service}</th>
                      <td>{number(service.requests)}</td>
                      <td>
                        {value().total?.requests
                          ? (
                              (service.requests / value().total!.requests) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                      <td>{number(service.errors)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
            <dl>
              <div>
                <dt>Visible total</dt>
                <dd data-time-series-bucket-total>
                  {number(value().total?.requests)}
                </dd>
              </div>
              <div>
                <dt>P50 / P95</dt>
                <dd>
                  {milliseconds(value().total?.p50)} /{' '}
                  {milliseconds(value().total?.p95)}
                </dd>
              </div>
              <div>
                <dt>Change from previous</dt>
                <dd>{number(value().change)}</dd>
              </div>
            </dl>
            <Show
              when={props.context.pinned}
              fallback={<p>Click or press Enter to pin this interval.</p>}
            >
              <Input
                aria-label="Bucket annotation"
                value={props.note(value().id)}
                onInput={(event) =>
                  props.onNote(value().id, event.currentTarget.value)
                }
                placeholder="Add an interval note"
              />
              <div class="time-series-controls">
                <Button onClick={() => props.onRefresh()}>
                  Refresh interval details
                </Button>
                <Button onClick={() => props.onInspect(value().id)}>
                  Inspect source records
                </Button>
                <Button onClick={() => props.context.dismiss()}>
                  Close interval details
                </Button>
              </div>
            </Show>
          </>
        )}
      </Show>
    </Card>
  )
}
