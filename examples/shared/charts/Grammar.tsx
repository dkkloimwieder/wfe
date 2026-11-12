import { createMemo, createSignal, For, Show, onSettled } from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  Button,
  Checkbox,
  Collapsible,
  Input,
  ToggleGroup,
} from '@wfe/components'
import {
  Chart,
  ChartLegend,
  defineChart,
  areaY,
  lineY,
  barX,
  barY,
  rect,
  cell,
  ruleX,
  ruleY,
  text,
  decorative,
  scaleLinear,
  scaleBand,
  groupBy,
  binX,
  binY,
  stackRowsX,
  stackRowsY,
  rollingWindow,
  normalize,
  select,
  polar,
  pie,
  radialArc,
  radialArea,
  radialLine,
  radialDot,
  radialText,
  radialRule,
  radialBarRadius,
  radialBarAngle,
  radialGrid,
  angleGrid,
  curveLinearClosed,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'
import type { ChartScene, ChartValue } from '@wfe/components/chart'
import './grammar.css'

type DefinitionDatum<T extends { readonly __datum?: unknown }> = NonNullable<
  T['__datum']
>

type Family = 'layers' | 'data' | 'polar'
type SceneSnapshot = {
  width: number
  height: number
  points: readonly {
    key: string
    markId: string
    x: number
    y: number
    id: string
  }[]
}
export type GrammarHost = HTMLDivElement & {
  chartGrammar?: {
    scene: (id: string) => SceneSnapshot | undefined
    selections: () => number
  }
}
const chartTooltip = { use: tooltip, portal: tooltipPortal }
const palette = [
  'var(--ui-accent)',
  'color-mix(in srgb, var(--ui-accent) 55%, var(--ui-surface))',
  'color-mix(in srgb, var(--ui-accent) 30%, var(--ui-surface))',
]
const workloadColors = { domain: ['API', 'Jobs'], range: palette }
const sliceColors = { domain: ['API', 'Jobs', 'Storage'], range: palette }
const metricColors = {
  domain: ['Latency', 'Capacity', 'Availability', 'Throughput', 'Recovery'],
  range: palette,
}
const polarMargin = { top: 24, right: 64, bottom: 24, left: 64 }

/** Shared application fixture for the component gallery and server adoption suite. */
export function ChartGrammar(props: { family?: Family }) {
  const [accept, setAccept] = createSignal(true)
  const [revision, setRevision] = createSignal(0)
  const [reversed, setReversed] = createSignal(false)
  const [empty, setEmpty] = createSignal(false)
  const [orientation, setOrientation] = createSignal<'vertical' | 'horizontal'>(
    'vertical',
  )
  const [barMode, setBarMode] = createSignal('grouped')
  const [donut, setDonut] = createSignal(true)
  const [radialMode, setRadialMode] = createSignal('radius')
  const [rawPointer, setRawPointer] = createSignal(false)
  const [services, setServices] = createSignal({ API: true, Jobs: true })
  const [slices, setSlices] = createSignal({
    API: true,
    Jobs: true,
    Storage: true,
  })
  const [requestText, setRequestText] = createSignal(
    'No chart change requested',
  )
  const [selection, setSelection] = createSignal('No chart point selected')
  const scenes = new Map<string, SceneSnapshot>()
  let selectionCalls = 0
  let host: GrammarHost | undefined
  onSettled(() => () => {
    scenes.clear()
    if (host) delete host.chartGrammar
  })
  const active = (family: Family) => !props.family || props.family === family
  function request(label: string, apply: () => void) {
    setRequestText(label)
    if (accept()) apply()
  }
  function sourceIds(datum: unknown): string[] {
    const row = datum as { id?: unknown; source?: readonly unknown[] }
    return row.source
      ? row.source.flatMap(sourceIds)
      : [String(row.id ?? 'record')]
  }
  function selected(panel: string, datum: unknown) {
    selectionCalls++
    if (datum == null) {
      request(`Cleared ${panel} selection`, () =>
        setSelection('No chart point selected'),
      )
      return
    }
    const row = datum as { id?: unknown }
    request(`Selected ${panel}: ${String(row.id ?? 'point')}`, () =>
      setSelection(
        `${panel}: ${String(row.id ?? 'point')}; source ${sourceIds(row).join(', ')}`,
      ),
    )
  }

  function remember(id: string, context: { scene: ChartScene }) {
    scenes.set(id, {
      width: context.scene.width,
      height: context.scene.height,
      points: context.scene.points.map((point) => ({
        key: point.key,
        markId: point.markId,
        x: point.x,
        y: point.y,
        id: String((point.datum as { id?: unknown })?.id ?? 'point'),
      })),
    })
  }
  const trendRows = createMemo(() => {
    const rows = empty()
      ? []
      : [12, 18, 15, 26, 23, 31].map((value, index) => ({
          id: `day-${index + 1}`,
          day: index + 1,
          value: value + revision() * 3,
          low: value - 4 + revision() * 3,
          high: value + 5 + revision() * 3,
        }))
    return reversed() ? rows.reverse() : rows
  })
  const trend = createMemo(() => {
    const rows = trendRows()
    const average = rollingWindow(rows, {
      size: 3,
      orderBy: 'day',
      outputs: { mean: { value: 'value', reduce: 'mean' } },
    })
    const peak = select(rows, { value: 'value', select: 'max' })
    return defineChart({
      marks: [
        decorative(
          areaY(rows, {
            id: 'uncertainty',
            x: 'day',
            y1: 'low',
            y2: 'high',
            fillOpacity: 0.12,
          }),
        ),
        lineY(rows, {
          id: 'observed',
          key: 'id',
          x: 'day',
          y: 'value',
          points: true,
        }),
        decorative(
          lineY(average, {
            id: 'average',
            x: 'day',
            y: 'mean',
            strokeDasharray: '5 3',
            strokeOpacity: 0.65,
          }),
        ),
        ruleY([25], { id: 'target', strokeDasharray: '2 3' }),
        ruleX([3], { id: 'milestone', strokeOpacity: 0.35 }),
        decorative(
          text(peak, {
            id: 'peak-label',
            x: 'day',
            y: 'high',
            text: (row) => `Peak ${row.value}`,
            dy: -8,
            anchor: 'end',
          }),
        ),
      ],
      scales: {
        x: { scale: scaleLinear, axis: { label: 'Day' } },
        y: { scale: scaleLinear, axis: { label: 'Requests' }, grid: true },
      },
      tooltip: chartTooltip,
      pointerEvent: rawPointer() ? 'pointerrawupdate' : 'pointermove',
    })
  })
  const observations = createMemo(() => {
    const rows = empty()
      ? []
      : [4, 6, 7, 9, 12, 15, 16, 18, 22, 24, 27, 29].map((value, index) => ({
          id: `sample-${index}`,
          value: value + revision(),
        }))
    return reversed() ? rows.reverse() : rows
  })
  const histogram = createMemo(() => {
    const rows = observations()
    const options = {
      value: 'value' as const,
      domain: [0, 40] as const,
      thresholds: [0, 10, 20, 30, 40],
    }
    return orientation() === 'vertical'
      ? defineChart({
          marks: [
            rect(
              binX(rows, options).map((row) => ({
                ...row,
                id: `bin-${row.x1}`,
              })),
              {
                id: 'bins',
                key: 'id',
                x1: 'x1',
                x2: 'x2',
                y1: () => 0,
                y2: 'value',
                inset: 1,
              },
            ),
          ],
          scales: {
            x: { scale: scaleLinear, axis: { label: 'Latency' } },
            y: { scale: scaleLinear, axis: { label: 'Count' } },
          },
          tooltip: chartTooltip,
        })
      : defineChart({
          marks: [
            rect(
              binY(rows, options).map((row) => ({
                ...row,
                id: `bin-${row.y1}`,
              })),
              {
                id: 'bins',
                key: 'id',
                x1: () => 0,
                x2: 'value',
                y1: 'y1',
                y2: 'y2',
                inset: 1,
              },
            ),
          ],
          scales: {
            x: { scale: scaleLinear, axis: { label: 'Count' } },
            y: { scale: scaleLinear, axis: { label: 'Latency' } },
          },
          tooltip: chartTooltip,
        })
  })
  const events = createMemo(() => {
    const data = empty()
      ? []
      : ['Mon', 'Tue', 'Wed']
          .flatMap((period, index) => [
            {
              id: `${period}-api-a`,
              period,
              service: 'API' as const,
              amount: 8 + index * 4 + revision(),
            },
            {
              id: `${period}-api-b`,
              period,
              service: 'API' as const,
              amount: 4 + index,
            },
            {
              id: `${period}-jobs`,
              period,
              service: 'Jobs' as const,
              amount: 7 + index * 2,
            },
          ])
          .filter((row) => services()[row.service])
    return reversed() ? data.reverse() : data
  })
  const totals = createMemo(() =>
    groupBy(events(), {
      by: { period: 'period', service: 'service' },
      outputs: { amount: { value: 'amount', reduce: 'sum' } },
    }).map((row) => ({ ...row, id: `${row.period}-${row.service}` })),
  )
  const bars = createMemo(() => {
    const grouped = totals()
    const mode = barMode()
    const values = normalize(grouped, {
      value: 'amount',
      by: 'period',
      basis: 'sum',
      as: 'fraction',
    }).map((row) => ({
      ...row,
      measure: mode === 'percent' ? row.fraction : row.amount,
    }))
    if (mode === 'grouped') {
      return orientation() === 'vertical'
        ? defineChart({
            marks: [
              barY(values, {
                id: 'workloads',
                key: 'id',
                x: 'period',
                y: 'measure',
                z: 'service',
                layout: { type: 'group' },
              }),
            ],
            scales: { x: { scale: scaleBand }, y: { scale: scaleLinear } },
            color: workloadColors,
            theme: { palette },
            tooltip: chartTooltip,
          })
        : defineChart({
            marks: [
              barX(values, {
                id: 'workloads',
                key: 'id',
                x: 'measure',
                y: 'period',
                z: 'service',
                layout: { type: 'group' },
              }),
            ],
            scales: { x: { scale: scaleLinear }, y: { scale: scaleBand } },
            color: workloadColors,
            theme: { palette },
            tooltip: chartTooltip,
          })
    }
    if (orientation() === 'vertical') {
      const data = stackRowsY(values, {
        x: 'period',
        y: 'measure',
        z: 'service',
      })
      return defineChart({
        marks: [
          rect(data, {
            id: 'workloads',
            key: 'id',
            x: 'period',
            y1: 'y1',
            y2: 'y2',
            z: 'service',
            inset: 3,
          }),
        ],
        scales: {
          x: { scale: scaleBand },
          y: {
            scale: scaleLinear,
            axis: {
              label: mode === 'percent' ? 'Share' : 'Total',
              ticks: {
                format: (value: number) =>
                  mode === 'percent'
                    ? `${Math.round(value * 100)}%`
                    : String(value),
              },
            },
          },
        },
        color: workloadColors,
        theme: { palette },
        tooltip: chartTooltip,
      })
    }
    const data = stackRowsX(values, { x: 'measure', y: 'period', z: 'service' })
    return defineChart({
      marks: [
        rect(data, {
          id: 'workloads',
          key: 'id',
          x1: 'x1',
          x2: 'x2',
          y: 'period',
          z: 'service',
          inset: 3,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear,
          axis: {
            label: mode === 'percent' ? 'Share' : 'Total',
            ticks: {
              format: (value: number) =>
                mode === 'percent'
                  ? `${Math.round(value * 100)}%`
                  : String(value),
            },
          },
        },
        y: { scale: scaleBand },
      },
      color: workloadColors,
      theme: { palette },
      tooltip: chartTooltip,
    })
  })
  const heatRows = createMemo(() => {
    const rows = empty()
      ? []
      : ['Mon', 'Tue', 'Wed'].flatMap((period, index) =>
          ['API', 'Jobs'].map((service, serviceIndex) => ({
            id: `${period}-${service}`,
            period,
            service,
            count: 3 + index * 4 + serviceIndex + revision(),
          })),
        )
    return reversed() ? rows.reverse() : rows
  })
  const heatmap = createMemo(() =>
    defineChart({
      marks: [
        cell(heatRows(), {
          id: 'heat',
          key: 'id',
          x: 'period',
          y: 'service',
          color: (row) => String(Math.floor(row.count / 5)),
          inset: 1,
        }),
        decorative(
          text(heatRows(), {
            id: 'counts',
            x: 'period',
            y: 'service',
            text: 'count',
            fill: 'var(--ui-text)',
          }),
        ),
      ],
      scales: { x: { scale: scaleBand }, y: { scale: scaleBand } },
      color: {
        domain: ['0', '1', '2', '3'],
        range: [palette[2]!, palette[1]!, palette[0]!, palette[0]!],
      },
      theme: { palette },
      tooltip: chartTooltip,
    }),
  )
  const sliceRows = createMemo(() => {
    const rows = (
      empty()
        ? []
        : [
            { id: 'API', value: 45 + revision() * 4 },
            { id: 'Jobs', value: 30 },
            { id: 'Storage', value: 25 },
          ]
    ).filter((row) => slices()[row.id as keyof ReturnType<typeof slices>])
    return reversed() ? rows.reverse() : rows
  })
  const composition = createMemo(() => {
    const isDonut = donut()
    return defineChart({
      marks: [
        polar({
          id: 'composition',
          inset: 8,
          radiusRatio: 0.9,
          scales: { angle: null, radius: null },
          marks: [
            radialArc(pie(sliceRows(), { value: 'value', gapAngle: 0.025 }), {
              id: 'slices',
              key: 'id',
              z: 'id',
              innerRadius: ({ radius }) => (isDonut ? radius * 0.55 : 0),
              stroke: 'var(--ui-surface)',
              strokeWidth: 1,
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
      color: sliceColors,
      theme: { palette },
      tooltip: chartTooltip,
    })
  })
  const metrics = createMemo(() => {
    const rows = empty()
      ? []
      : [
          { id: 'Latency', value: 65 + revision() * 2 },
          { id: 'Capacity', value: 80 },
          { id: 'Availability', value: 95 },
          { id: 'Throughput', value: 70 },
          { id: 'Recovery', value: 75 },
        ]
    return reversed() ? rows.reverse() : rows
  })
  const radar = createMemo(() =>
    defineChart({
      margin: polarMargin,
      marks: [
        polar({
          id: 'profile',
          inset: 8,
          scales: {
            angle: { scale: scaleBand },
            radius: { scale: () => scaleLinear().domain([0, 120]) },
          },
          guides: [
            radialGrid({ values: [50, 100], shape: 'polygon' }),
            angleGrid({ labels: false }),
          ],
          marks: [
            radialRule(metrics(), {
              id: 'spokes',
              angle: 'id',
              radius1: 0,
              radius2: 100,
              strokeOpacity: 0.25,
            }),
            radialArea(metrics(), {
              id: 'profile-area',
              key: 'id',
              angle: 'id',
              radius: 'value',
              curve: curveLinearClosed,
              fillOpacity: 0.12,
            }),
            radialLine(metrics(), {
              id: 'profile-line',
              key: 'id',
              angle: 'id',
              radius: 'value',
              curve: curveLinearClosed,
            }),
            radialDot(metrics(), {
              id: 'profile-points',
              key: 'id',
              angle: 'id',
              radius: 'value',
              r: 3,
            }),
            radialText(metrics(), {
              id: 'profile-labels',
              key: 'id',
              angle: 'id',
              radius: () => 110,
              text: 'id',
              fontSize: 10,
              anchor: 'outside',
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
      tooltip: chartTooltip,
    }),
  )
  const radialBars = createMemo(() =>
    radialMode() === 'radius'
      ? defineChart({
          margin: polarMargin,
          marks: [
            polar({
              id: 'radial-bars',
              inset: 8,
              scales: {
                angle: { scale: scaleBand },
                radius: { scale: () => scaleLinear().domain([0, 100]) },
              },
              guides: [
                radialGrid({ values: [50, 100] }),
                angleGrid({ labelFontSize: 10 }),
              ],
              marks: [
                radialBarRadius(metrics(), {
                  id: 'radial-values',
                  key: 'id',
                  angle: 'id',
                  radius: 'value',
                  z: 'id',
                }),
              ],
            }),
          ],
          scales: { x: null, y: null },
          guides: false,
          color: metricColors,
          theme: { palette },
          tooltip: chartTooltip,
        })
      : defineChart({
          margin: polarMargin,
          marks: [
            polar({
              id: 'radial-bars',
              inset: 8,
              endAngle: Math.PI * 1.75,
              scales: {
                angle: { scale: () => scaleLinear().domain([0, 100]) },
                radius: { scale: scaleBand },
              },
              marks: [
                radialBarAngle(metrics(), {
                  id: 'radial-values',
                  key: 'id',
                  angle: 'value',
                  radius: 'id',
                  z: 'id',
                }),
              ],
            }),
          ],
          scales: { x: null, y: null },
          guides: false,
          color: metricColors,
          theme: { palette },
          tooltip: chartTooltip,
        }),
  )
  const serviceItems = createMemo(() =>
    (['API', 'Jobs'] as const).map((id, index) => ({
      id,
      label: id,
      color: palette[index]!,
      visible: services()[id],
    })),
  )
  const sliceItems = createMemo(() =>
    (['API', 'Jobs', 'Storage'] as const).map((id, index) => ({
      id,
      label: id,
      color: palette[index]!,
      visible: slices()[id],
    })),
  )
  return (
    <div
      class="chart-grammar"
      data-chart-grammar=""
      ref={(node) => {
        host = node
        host.chartGrammar = {
          scene: (id) => scenes.get(id),
          selections: () => selectionCalls,
        }
      }}
    >
      <div class="chart-grammar-controls">
        <Checkbox checked={accept()} onCheckedChange={setAccept}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Accept chart changes</Checkbox.Label>
        </Checkbox>
        <Button
          onClick={() =>
            request(`Requested data revision ${revision() + 1}`, () =>
              setRevision((value) => value + 1),
            )
          }
        >
          Update chart data
        </Button>
        <Button
          onClick={() =>
            request('Requested record order change', () =>
              setReversed((value) => !value),
            )
          }
        >
          Reverse chart records
        </Button>
        <Button
          onClick={() =>
            request('Requested empty chart state', () =>
              setEmpty((value) => !value),
            )
          }
        >
          Toggle chart data
        </Button>
        <Input
          aria-label="Retained chart note"
          placeholder="Keep a note while changing charts"
        />
        <output data-chart-revision aria-label="Chart data revision">
          {revision()}
        </output>
        <output data-chart-request aria-live="polite">
          {requestText()}
        </output>
        <output data-chart-selection aria-live="polite">
          {selection()}
        </output>
      </div>
      <Show when={active('layers')}>
        <GrammarPanel
          title="Layered trend"
          description="Observations, an uncertainty band, a rolling average, a target, and a peak label share one plot."
          rows={trendRows()}
        >
          <Checkbox
            checked={rawPointer()}
            onCheckedChange={(value) =>
              request('Requested pointer event mode', () =>
                setRawPointer(Boolean(value)),
              )
            }
          >
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>
              Use raw pointer events when available
            </Checkbox.Label>
          </Checkbox>
          <div data-chart-panel="layers">
            <Chart
              definition={trend()}
              ariaLabel="Layered request trend"
              height={300}
              initialWidth={640}
              onRender={(value) => remember('layers', value)}
              onSelect={(point) => selected('layers', point?.datum)}
            />
          </div>
        </GrammarPanel>
      </Show>
      <Show when={active('data')}>
        <ToggleGroup
          aria-label="Chart orientation"
          value={orientation()}
          allowEmpty={false}
          items={[
            { value: 'vertical', label: 'Vertical charts' },
            { value: 'horizontal', label: 'Horizontal charts' },
          ]}
          onValueChange={(value) => {
            if (value === 'vertical' || value === 'horizontal')
              request(`Requested ${value} charts`, () => setOrientation(value))
          }}
        />
        <GrammarPanel
          title="Binned latency"
          description="Explicit bins retain the source observations behind each count."
          rows={observations()}
        >
          <div data-chart-panel="histogram">
            <Chart<
              DefinitionDatum<ReturnType<typeof histogram>>,
              ChartValue,
              ChartValue
            >
              definition={histogram()}
              ariaLabel="Latency histogram"
              height={280}
              initialWidth={640}
              onRender={(value) => remember('histogram', value)}
              onSelect={(point) => selected('histogram', point?.datum)}
            />
          </div>
        </GrammarPanel>
        <GrammarPanel
          title="Workload totals"
          description="Group records, stack their totals, or normalize each period to a share."
          rows={events()}
        >
          <ToggleGroup
            aria-label="Bar values"
            value={barMode()}
            allowEmpty={false}
            items={[
              { value: 'grouped', label: 'Grouped' },
              { value: 'stacked', label: 'Stacked' },
              { value: 'percent', label: 'Percent' },
            ]}
            onValueChange={(value) => {
              if (value)
                request(`Requested bar mode ${value}`, () => setBarMode(value))
            }}
          />
          <ChartLegend
            label="Workload series"
            items={serviceItems()}
            onVisibilityChange={(id, visible) =>
              request(`Requested workload ${id}`, () =>
                setServices((value) => ({ ...value, [id]: visible })),
              )
            }
          />
          <div data-chart-panel="groups">
            <Chart<
              DefinitionDatum<ReturnType<typeof bars>>,
              ChartValue,
              ChartValue
            >
              definition={bars()}
              ariaLabel="Workload totals by period"
              height={280}
              initialWidth={640}
              onRender={(value) => remember('groups', value)}
              onSelect={(point) => selected('groups', point?.datum)}
            />
          </div>
        </GrammarPanel>
        <GrammarPanel
          title="Service heatmap"
          description="Categorical cells and readable labels use the same prepared records."
          rows={heatRows()}
        >
          <div data-chart-panel="heatmap">
            <Chart
              definition={heatmap()}
              ariaLabel="Service counts by day"
              height={240}
              initialWidth={640}
              onRender={(value) => remember('heatmap', value)}
              onSelect={(point) => selected('heatmap', point?.datum)}
            />
          </div>
        </GrammarPanel>
      </Show>
      <Show when={active('polar')}>
        <GrammarPanel
          title="Service composition"
          description="Select a slice or use the keyboard to inspect the source-linked totals."
          rows={sliceRows()}
        >
          <ToggleGroup
            aria-label="Composition shape"
            value={donut() ? 'donut' : 'pie'}
            allowEmpty={false}
            items={[
              { value: 'donut', label: 'Donut' },
              { value: 'pie', label: 'Pie' },
            ]}
            onValueChange={(value) => {
              if (value)
                request(`Requested ${value} shape`, () =>
                  setDonut(value === 'donut'),
                )
            }}
          />
          <ChartLegend
            label="Composition series"
            items={sliceItems()}
            onVisibilityChange={(id, visible) =>
              request(`Requested slice ${id}`, () =>
                setSlices((value) => ({ ...value, [id]: visible })),
              )
            }
          />
          <div data-chart-panel="pie">
            <Chart
              definition={composition()}
              ariaLabel="Service composition"
              height={300}
              initialWidth={640}
              onRender={(value) => remember('pie', value)}
              onSelect={(point) => selected('pie', point?.datum)}
            />
          </div>
        </GrammarPanel>
        <GrammarPanel
          title="Service profile"
          description="Radial area, line, dots, rules and labels share category and radius scales."
          rows={metrics()}
        >
          <div data-chart-panel="radar">
            <Chart
              definition={radar()}
              ariaLabel="Service capability radar"
              height={340}
              initialWidth={640}
              onRender={(value) => remember('radar', value)}
              onSelect={(point) => selected('radar', point?.datum)}
            />
          </div>
        </GrammarPanel>
        <GrammarPanel
          title="Radial measures"
          description="Compare radial length with angular extent for the same prepared values."
          rows={metrics()}
        >
          <ToggleGroup
            aria-label="Radial bar direction"
            value={radialMode()}
            allowEmpty={false}
            items={[
              { value: 'radius', label: 'Radius bars' },
              { value: 'angle', label: 'Angle bars' },
            ]}
            onValueChange={(value) => {
              if (value)
                request(`Requested radial mode ${value}`, () =>
                  setRadialMode(value),
                )
            }}
          />
          <div data-chart-panel="radial-bars">
            <Chart<
              DefinitionDatum<ReturnType<typeof radialBars>>,
              ChartValue,
              ChartValue
            >
              definition={radialBars()}
              ariaLabel="Radial service measures"
              height={300}
              initialWidth={640}
              onRender={(value) => remember('radial-bars', value)}
              onSelect={(point) => selected('radial-bars', point?.datum)}
            />
          </div>
        </GrammarPanel>
      </Show>
    </div>
  )
}

function GrammarPanel(props: {
  title: string
  description: string
  rows: readonly { id: string }[]
  children: JSX.Element
}) {
  return (
    <section class="chart-grammar-panel" aria-label={props.title}>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      {props.children}
      <Collapsible summary={`View ${props.title.toLowerCase()} records`}>
        <table class="ui-table">
          <caption>{props.title} source records</caption>
          <thead>
            <tr>
              <th scope="col">Record</th>
              <th scope="col">Values</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.rows}>
              {(row) => (
                <tr>
                  <th scope="row">{row.id}</th>
                  <td>
                    {Object.entries(row)
                      .filter(
                        ([key]) =>
                          key !== 'id' &&
                          key !== 'source' &&
                          key !== 'sourceIndexes',
                      )
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join('; ')}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Collapsible>
    </section>
  )
}
