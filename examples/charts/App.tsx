import { createMemo, createSignal, Show, untrack } from 'solid-js'
import {
  Button,
  Input,
  Card,
  EmptyState,
  InlineAlert,
  uiScope,
} from '@wfe/components'
import {
  Chart,
  ChartLegend,
  scaleUtc,
  defineChart,
  lineY,
  scaleLinear,
  tooltip,
  tooltipPortal,
  barY,
  areaY,
  dot,
  scaleBand,
} from '@wfe/components/chart'
import type { ChartProps, ChartTooltipContext } from '@wfe/components/chart'
import { ChartView } from '@wfe/generator/chart'
import type { ChartDescription } from '@wfe/generator/chart'
import { AppearanceReview } from '../shared/appearance/AppearanceReview'
import {
  appearanceStyle,
  schemes,
  accents,
} from '../shared/appearance/appearance'
import type { Depth, SurfaceLayers } from '../shared/appearance/appearance'
import '../shared/appearance/default-appearance.css'
import '../shared/appearance/style.css'
import './style.css'

type Row = { id: string; x: number; y: number }
type Context = Parameters<
  NonNullable<ChartProps<Row, number, number>['onRender']>
>[0]
export type ChartFixture = { context: () => Context | undefined }
export function App(props: {
  ready?: (api: ChartFixture) => void
  standalone?: boolean
  hidden?: boolean
}) {
  if (untrack(() => props.standalone))
    return (
      <div
        data-chart-test-host
        style={{ display: props.hidden ? 'none' : undefined, width: '100%' }}
      >
        <Chart
          definition={defineChart({
            marks: [lineY([1, 3, 2])],
            scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
          })}
          ariaLabel="Standalone chart"
          height={280}
        />
      </div>
    )
  const scope = uiScope()
  const [scheme, setScheme] = createSignal(schemes[1]!)
  const [accent, setAccent] = createSignal(accents[1]!)
  const [depth, setDepth] = createSignal<Depth>(2)
  const [layers, setLayers] = createSignal<SurfaceLayers>({
    canvas: 1,
    pane: 0,
    content: 0,
  })
  const [series, setSeries] = createSignal({ requests: true, capacity: true })
  const [rejectSeries, setRejectSeries] = createSignal(false)
  const [reverseLegend, setReverseLegend] = createSignal(false)
  const legendItems = createMemo(() => {
    const items = [
      {
        id: 'requests',
        label: 'Requests',
        lineStyle: 'solid' as const,
        color: 'var(--ui-accent)',
        visible: series().requests,
      },
      {
        id: 'capacity',
        label: 'Capacity',
        lineStyle: 'dashed' as const,
        color: 'var(--ui-accent)',
        visible: series().capacity,
      },
    ]
    return reverseLegend() ? items.reverse() : items
  })
  const [empty, setEmpty] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  const [visible, setVisible] = createSignal(true)
  const [label, setLabel] = createSignal('Requests')
  const [rich, setRich] = createSignal(true)
  let context: Context | undefined
  const spec = createMemo(() =>
    defineChart({
      marks: [
        lineY(
          empty() || !series().requests
            ? []
            : [
                { id: 'a', x: 0, y: 2 + revision() },
                { id: 'b', x: 1, y: 4 },
                { id: 'c', x: 2, y: 1 + revision() },
              ],
          { id: 'requests', x: 'x', y: 'y', key: 'id', points: true },
        ),
        lineY(
          empty() || !series().capacity
            ? []
            : [
                { id: 'capacity-a', x: 0, y: 5 },
                { id: 'capacity-b', x: 1, y: 5 },
                { id: 'capacity-c', x: 2, y: 5 },
              ],
          {
            id: 'capacity',
            x: 'x',
            y: 'y',
            key: 'id',
            strokeDasharray: '4 3',
            strokeOpacity: 0.55,
          },
        ),
      ],
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      tooltip: {
        use: tooltip,
        portal: tooltipPortal,
        className: 'chart-primary-tooltip',
      },
      maxFocusDistance: 1000,
    }),
  )
  const renderBody = (tip: ChartTooltipContext<Row, number, number>) => (
    <Card data-custom-tooltip>
      {tip.defaultBody}
      <Input aria-label="Tooltip note" />
      <Button onClick={() => tip.dismiss()}>Close</Button>
    </Card>
  )
  untrack(() => props.ready?.({ context: () => context }))
  return (
    <div
      {...scope}
      data-ui-portal-root=""
      class="chart-preview appearance-scope"
      style={{
        ...scope.style,
        ...appearanceStyle(scheme(), accent(), depth(), layers()),
        '--ui-button-color': 'var(--ui-accent)',
        '--ui-button-on-color': 'var(--ui-on-accent)',
      }}
    >
      <header>
        <h1>CHARTS</h1>
        <div class="chart-review-actions">
          <Button onClick={() => setRevision((value) => value + 1)}>
            Update data
          </Button>
          <Button onClick={() => setLabel('Updated requests')}>
            Rename chart
          </Button>
          <Button onClick={() => setVisible((value) => !value)}>
            Toggle chart
          </Button>
          <Button onClick={() => setEmpty((value) => !value)}>
            Toggle empty results
          </Button>
          <Button onClick={() => setLoading((value) => !value)}>
            Toggle loading
          </Button>
          <Button onClick={() => setRich((value) => !value)}>
            Toggle custom tooltip
          </Button>
        </div>
      </header>
      <AppearanceReview
        scheme={scheme()}
        accent={accent()}
        depth={depth()}
        layers={layers()}
        onSchemeChange={setScheme}
        onAccentChange={setAccent}
        onDepthChange={setDepth}
        onLayersChange={setLayers}
      />
      <main class="chart-review-grid">
        <section
          class="chart-review-panel"
          aria-label="Line chart panel"
          aria-busy={loading() ? 'true' : 'false'}
        >
          <h2>LINE</h2>
          <div class="chart-review-actions">
            <ChartLegend
              label="Request series"
              items={legendItems()}
              onVisibilityChange={(id, value) => {
                if (!rejectSeries())
                  setSeries((previous) => ({ ...previous, [id]: value }))
              }}
            />
            <Button
              aria-pressed={rejectSeries() ? 'true' : 'false'}
              onClick={() => setRejectSeries((value) => !value)}
            >
              Reject visibility changes
            </Button>
            <Button onClick={() => setReverseLegend((value) => !value)}>
              Reverse legend
            </Button>
          </div>
          <Show when={loading()}>
            <InlineAlert announce="polite">Loading chart data</InlineAlert>
          </Show>
          <Show when={empty()}>
            <EmptyState>No chart data</EmptyState>
          </Show>
          <Show when={visible()}>
            <Chart
              definition={spec()}
              ariaLabel={label()}
              height={280}
              initialWidth={640}
              renderTooltipBody={rich() ? renderBody : undefined}
              onRender={(value) => {
                context = value
              }}
            />
          </Show>
        </section>
        <ForCharts revision={revision()} />
      </main>
    </div>
  )
}

const utcDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
})

function ForCharts(props: { revision: number }) {
  const rows = () => [
    { label: 'Mon', value: 2 + props.revision },
    { label: 'Tue', value: 4 },
    { label: 'Wed', value: 0 },
    { label: 'Thu', value: -1 },
  ]
  const bars = createMemo(() =>
    defineChart({
      marks: [barY(rows(), { x: 'label', y: 'value' })],
      scales: {
        x: { scale: () => scaleBand().padding(0.15) },
        y: { scale: scaleLinear },
      },
      tooltip: { use: tooltip, portal: tooltipPortal },
    }),
  )
  const area = createMemo(() =>
    defineChart({
      marks: [
        areaY(
          rows().map((row, index) => ({
            ...row,
            at: new Date(Date.UTC(2026, 0, index + 1)),
          })),
          { x: 'at', y: 'value' },
        ),
      ],
      scales: {
        x: {
          scale: scaleUtc,
          axis: {
            ticks: {
              values: [1, 2, 3, 4].map(
                (day) => new Date(Date.UTC(2026, 0, day)),
              ),
              format: (value: Date) => utcDate.format(value),
            },
          },
        },
        y: { scale: scaleLinear },
      },
      tooltip: { use: tooltip, portal: tooltipPortal },
    }),
  )
  const scatter = createMemo(() =>
    defineChart({
      marks: [dot(rows(), { x: (_, context) => context.index, y: 'value' })],
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      tooltip: { use: tooltip, portal: tooltipPortal },
    }),
  )
  return (
    <>
      <section class="chart-review-panel" aria-label="Bar chart panel">
        <h2>BAR</h2>
        <Chart definition={bars()} ariaLabel="Daily requests" height={280} />
      </section>
      <section class="chart-review-panel" aria-label="Area chart panel">
        <h2>AREA</h2>
        <Chart definition={area()} ariaLabel="Request volume" height={280} />
      </section>
      <section class="chart-review-panel" aria-label="Scatter chart panel">
        <h2>SCATTER</h2>
        <Chart
          definition={scatter()}
          ariaLabel="Request observations"
          height={280}
        />
      </section>
      <section
        class="chart-review-panel chart-review-generated"
        aria-label="Generated chart panel"
      >
        <h2>GENERATED CHART</h2>
        <ChartView
          description={generatedDescription}
          bindings={{
            rows,
            formatters: { count: (value) => `${value} requests` },
          }}
        />
      </section>
    </>
  )
}

const generatedDescription: ChartDescription<{ label: string; value: number }> =
  {
    id: 'generated-requests',
    kind: 'bar',
    ariaLabel: 'Generated daily requests',
    key: 'label',
    x: { field: 'label', scale: 'band', label: 'DAY' },
    y: { field: 'value', label: 'REQUESTS', formatter: 'count' },
    height: 280,
  }
