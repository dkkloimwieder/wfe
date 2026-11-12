import { createMemo, createSignal, For, Show, onSettled } from 'solid-js'
import {
  Button,
  Checkbox,
  Collapsible,
  Input,
  ToggleGroup,
} from '@wfe/components'
import {
  Chart,
  defineChart,
  dot,
  lineY,
  rect,
  scaleLinear,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'
import type {
  ChartValue,
  ChartDefinition,
  ChartPoint,
  ChartScene,
} from '@wfe/components/chart'
import {
  createSamples,
  empiricalCdf,
  histogramDensity,
  summarizeSamples,
} from './statistics-data'
import type { Distribution, Sample } from './statistics-data'
import './statistics.css'

export const statisticsViews = [
  { value: 'box', label: 'Box summary' },
  { value: 'cdf', label: 'Empirical CDF' },
  { value: 'density', label: 'Histogram density' },
  { value: 'range', label: 'Observed range and mean' },
] as const
type View = (typeof statisticsViews)[number]['value']
type Point = {
  id: string
  group: string
  x: number
  y: number
  x1: number
  x2: number
  y1: number
  y2: number
  source: readonly Sample[]
}
const point = (
  summary: Distribution,
  id: string,
  x: number,
  y: number,
  source = summary.source,
): Point => ({
  id: `${summary.id}:${id}`,
  group: summary.id,
  x,
  y,
  x1: x,
  x2: x,
  y1: y,
  y2: y,
  source,
})

type StatisticalFocus = Exclude<
  NonNullable<ChartDefinition<Point>['focus']>,
  string | boolean
>
function serviceFocusGroup(
  points: readonly ChartPoint<Point>[],
  primary: ChartPoint<Point>,
) {
  return [
    primary,
    ...points.filter(
      (candidate) =>
        candidate !== primary && candidate.datum.group === primary.datum.group,
    ),
  ]
}
const serviceFocus: StatisticalFocus = {
  resolve(points, context) {
    let nearest: ChartPoint<Point> | undefined
    let distance = context.maxDistance
    for (const candidate of points) {
      const nextDistance = Math.hypot(
        candidate.x - context.x,
        candidate.y - context.y,
      )
      if (nextDistance < distance) {
        nearest = candidate
        distance = nextDistance
      }
    }
    return nearest ? serviceFocusGroup(points, nearest) : []
  },
  group: (points, context) => serviceFocusGroup(points, context.point),
  navigation(points) {
    const services = new Map<string, ChartPoint<Point>>()
    for (const candidate of [...points].sort(
      (left, right) => left.x - right.x || left.y - right.y,
    )) {
      if (!services.has(candidate.datum.group))
        services.set(candidate.datum.group, candidate)
    }
    return [...services.values()]
  },
}

export function Statistics() {
  let host:
    | (HTMLElement & {
        statistics?: {
          selections: () => number
          scene: () => ChartScene<Point> | undefined
        }
      })
    | undefined
  let scene: ChartScene<Point> | undefined
  let selections = 0
  onSettled(() => {
    if (host)
      host.statistics = { selections: () => selections, scene: () => scene }
    return () => {
      if (host) delete host.statistics
      scene = undefined
    }
  })
  const [view, setView] = createSignal<View>('box')
  const [revision, setRevision] = createSignal(0)
  const [empty, setEmpty] = createSignal(false)
  const [note, setNote] = createSignal('')
  const [selection, setSelection] = createSignal(
    'No statistical observation selected',
  )
  const summaries = createMemo(() =>
    summarizeSamples(empty() ? [] : createSamples(revision())),
  )
  const description = createMemo(
    () =>
      ({
        box: 'Boxes span Q1 to Q3, with a median crossbar. Whiskers end at observed values within 1.5 times the interquartile range. Dots show outliers.',
        cdf: 'The empirical cumulative distribution shows the fraction of samples at or below each value. Ties form a single vertical jump.',
        density:
          'Equal-width histogram bars show probability per millisecond. Bar areas sum to one for each service. This is not a smoothed kernel estimate.',
        range:
          'Each line spans the observed minimum to maximum. The dot shows the arithmetic mean. These are descriptive ranges, not confidence intervals.',
      })[view()],
  )
  const definition = createMemo(() => {
    const mode = view()
    const data = summaries()
    const segments = (
      summary: Distribution,
      id: string,
      values: readonly [number, number][],
    ) =>
      lineY(
        values.map(([x, y], index) => point(summary, `${id}:${index}`, x, y)),
        {
          id: `${summary.id}:${id}`,
          key: 'id',
          x: 'x',
          y: 'y',
          color: 'group',
        },
      )
    const marks = data.flatMap((summary) => {
      const x = summary.position
      if (mode === 'cdf')
        return [
          lineY(
            empiricalCdf(summary).map((row) => ({
              ...point(summary, row.id, row.x, row.y, row.source),
              id: row.id,
            })),
            {
              id: `${summary.id}:cdf`,
              strokeDasharray: [undefined, '6 3', '2 3'][summary.position],
              key: 'id',
              x: 'x',
              y: 'y',
              color: 'group',
            },
          ),
        ]
      if (mode === 'density')
        return [
          rect(
            histogramDensity(summary).map((row) => ({
              ...point(
                summary,
                row.id,
                (row.x1 + row.x2) / 2,
                row.density,
                row.source,
              ),
              x1: row.x1,
              x2: row.x2,
              y1: 0,
              y2: row.density,
            })),
            {
              id: `${summary.id}:density`,
              key: 'id',
              x1: 'x1',
              x2: 'x2',
              y1: 'y1',
              y2: 'y2',
              color: 'group',
              fillOpacity: 0.25,
              stroke: 'var(--ui-text)',
              inset: 1,
            },
          ),
        ]
      if (mode === 'range')
        return [
          segments(summary, 'range', [
            [x, summary.minimum],
            [x, summary.maximum],
          ]),
          dot([point(summary, 'mean', x, summary.mean)], {
            id: `${summary.id}:mean`,
            key: 'id',
            x: 'x',
            y: 'y',
            color: 'group',
            r: 5,
          }),
        ]
      return [
        segments(summary, 'whisker', [
          [x, summary.low],
          [x, summary.high],
        ]),
        segments(summary, 'low-cap', [
          [x - 0.15, summary.low],
          [x + 0.15, summary.low],
        ]),
        segments(summary, 'high-cap', [
          [x - 0.15, summary.high],
          [x + 0.15, summary.high],
        ]),
        rect(
          [
            {
              ...point(summary, 'box', x, summary.median),
              x1: x - 0.3,
              x2: x + 0.3,
              y1: summary.q1,
              y2: summary.q3,
            },
          ],
          {
            id: `${summary.id}:box`,
            key: 'id',
            x1: 'x1',
            x2: 'x2',
            y1: 'y1',
            y2: 'y2',
            color: 'group',
            fillOpacity: 0.3,
            stroke: 'var(--ui-text)',
          },
        ),
        segments(summary, 'median', [
          [x - 0.3, summary.median],
          [x + 0.3, summary.median],
        ]),
        dot(
          summary.outliers.map((row) =>
            point(summary, row.id, x, row.value, [row]),
          ),
          {
            id: `${summary.id}:outliers`,
            key: 'id',
            x: 'x',
            y: 'y',
            color: 'group',
            r: 4,
          },
        ),
      ]
    })
    return defineChart({
      marks,
      focus: mode === 'box' || mode === 'range' ? serviceFocus : 'nearest',
      scales: {
        x: {
          scale:
            mode === 'box' || mode === 'range'
              ? scaleLinear().domain([-0.6, 2.6])
              : scaleLinear,
          axis: {
            label:
              mode === 'box' || mode === 'range' ? 'Service' : 'Latency (ms)',
            ticks:
              mode === 'box' || mode === 'range'
                ? {
                    values: [0, 1, 2],
                    format: (value: number) =>
                      ['API', 'Workers', 'Storage'][value] ?? '',
                  }
                : { count: 5 },
          },
        },
        y: {
          scale: mode === 'cdf' ? scaleLinear().domain([0, 1]) : scaleLinear,
          axis: {
            label:
              mode === 'cdf'
                ? 'Cumulative fraction'
                : mode === 'density'
                  ? 'Density (1/ms)'
                  : 'Latency (ms)',
            ticks: { count: 5 },
          },
        },
      },
      color: {
        domain: ['API', 'Workers', 'Storage'],
        range: [
          'var(--ui-accent)',
          'var(--ui-text)',
          'color-mix(in srgb, var(--ui-accent) 55%, var(--ui-surface))',
        ],
      },
      tooltip: { use: tooltip, portal: tooltipPortal },
      margin: { left: 66, right: 20, bottom: 56, top: 20 },
    })
  })
  return (
    <section
      class="chart-statistics"
      data-chart-statistics
      ref={(node) => {
        host = node
      }}
    >
      <h2>Statistical distributions</h2>
      <ToggleGroup
        aria-label="Statistical view"
        value={view()}
        allowEmpty={false}
        items={statisticsViews}
        onValueChange={(value) => {
          const next = statisticsViews.find((item) => item.value === value)
          if (next) {
            setView(next.value)
            setSelection('No statistical observation selected')
          }
        }}
      />
      <p data-statistics-description>{description()}</p>
      <div class="chart-statistics-controls">
        <Button onClick={() => setRevision((value) => value + 1)}>
          Refresh statistical samples
        </Button>
        <Checkbox
          checked={empty()}
          onCheckedChange={(value) => setEmpty(value === true)}
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Empty statistical samples</Checkbox.Label>
        </Checkbox>
      </div>
      <Input
        aria-label="Statistical analysis note"
        value={note()}
        onInput={(event) => setNote(event.currentTarget.value)}
      />
      <Show
        when={summaries().length}
        fallback={<p role="status">No statistical samples</p>}
      >
        <Chart<Point, ChartValue, ChartValue>
          definition={definition()}
          ariaLabel="Statistical distributions"
          height={340}
          initialWidth={640}
          onRender={(value) => {
            scene = value.scene
          }}
          renderTooltipBody={(context) => (
            <div data-statistics-tooltip>
              <Show when={context.primaryPoint?.datum}>
                {(datum) => (
                  <>
                    <p>
                      {datum().group}: {datum().source.length} source samples
                    </p>
                    <dl>
                      <Show when={view() === 'box'}>
                        <dt>Median</dt>
                        <dd>
                          {
                            summaries().find((row) => row.id === datum().group)
                              ?.median
                          }{' '}
                          ms
                        </dd>
                        <dt>Middle half</dt>
                        <dd>
                          {
                            summaries().find((row) => row.id === datum().group)
                              ?.q1
                          }
                          –
                          {
                            summaries().find((row) => row.id === datum().group)
                              ?.q3
                          }{' '}
                          ms
                        </dd>
                      </Show>
                      <Show when={view() === 'cdf'}>
                        <dt>At or below</dt>
                        <dd>{datum().x} ms</dd>
                        <dt>Cumulative fraction</dt>
                        <dd>{(datum().y * 100).toFixed(1)}%</dd>
                      </Show>
                      <Show when={view() === 'density'}>
                        <dt>Interval</dt>
                        <dd>
                          {datum().x1.toFixed(1)}–{datum().x2.toFixed(1)} ms
                        </dd>
                        <dt>Density</dt>
                        <dd>{datum().y.toFixed(4)} per ms</dd>
                      </Show>
                      <Show when={view() === 'range'}>
                        <dt>Observed range</dt>
                        <dd>
                          {
                            summaries().find((row) => row.id === datum().group)
                              ?.minimum
                          }
                          –
                          {
                            summaries().find((row) => row.id === datum().group)
                              ?.maximum
                          }{' '}
                          ms
                        </dd>
                        <dt>Mean</dt>
                        <dd>
                          {summaries()
                            .find((row) => row.id === datum().group)
                            ?.mean.toFixed(1)}{' '}
                          ms
                        </dd>
                      </Show>
                    </dl>
                    <Collapsible summary="Source samples">
                      <table class="ui-table">
                        <caption>{datum().group} source samples</caption>
                        <thead>
                          <tr>
                            <th scope="col">Sample</th>
                            <th scope="col">Latency (ms)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={datum().source}>
                            {(row) => (
                              <tr>
                                <th scope="row">{row.id}</th>
                                <td>{row.value}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </Collapsible>
                  </>
                )}
              </Show>
            </div>
          )}
          onSelect={(value) => {
            selections += 1
            setSelection(
              value
                ? `${value.datum.group}: ${value.datum.source.length} source samples; first ${value.datum.source[0]?.id ?? 'none'}`
                : 'No statistical observation selected',
            )
          }}
        />
      </Show>
      <p role="status" data-statistics-selection>
        {selection()}
      </p>
      <p>
        Service keys: API, Workers, Storage. All views use the same 12 source
        samples per service.
      </p>
      <Collapsible summary="View statistical summary table">
        <div class="chart-statistics-table">
          <table class="ui-table">
            <caption>Statistical sample summaries</caption>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Count</th>
                <th scope="col">Q1</th>
                <th scope="col">Median</th>
                <th scope="col">Q3</th>
                <th scope="col">Whisker low</th>
                <th scope="col">Whisker high</th>
                <th scope="col">Outliers</th>
                <th scope="col">Excluded</th>
              </tr>
            </thead>
            <tbody>
              <For each={summaries()}>
                {(row) => (
                  <tr>
                    <th scope="row">{row.id}</th>
                    <td>{row.source.length}</td>
                    <td>{row.q1}</td>
                    <td>{row.median}</td>
                    <td>{row.q3}</td>
                    <td>{row.low}</td>
                    <td>{row.high}</td>
                    <td>{row.outliers.map((item) => item.value).join(', ')}</td>
                    <td>{row.excluded}</td>
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
