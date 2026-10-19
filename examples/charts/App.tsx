import { createMemo, createSignal, Show, untrack } from 'solid-js'
import { Button, Input } from '@wfe/components'
import {
  Chart,
  defineChart,
  lineY,
  scaleLinear,
  tooltip,
} from '@wfe/components/chart'
import type { ChartProps, ChartTooltipContext } from '@wfe/components/chart'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import './style.css'

type Row = { id: string; x: number; y: number }
type Context = Parameters<
  NonNullable<ChartProps<Row, number, number>['onRender']>
>[0]
export type ChartFixture = { context: () => Context | undefined }
export function App(props: { ready?: (api: ChartFixture) => void }) {
  const [revision, setRevision] = createSignal(0)
  const [visible, setVisible] = createSignal(true)
  const [label, setLabel] = createSignal('Requests')
  const [rich, setRich] = createSignal(true)
  let context: Context | undefined
  const spec = createMemo(() =>
    defineChart({
      marks: [
        lineY(
          [
            { id: 'a', x: 0, y: 2 + revision() },
            { id: 'b', x: 1, y: 4 },
            { id: 'c', x: 2, y: 1 + revision() },
          ],
          { id: 'requests', x: 'x', y: 'y', key: 'id', points: true },
        ),
      ],
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      tooltip,
      maxFocusDistance: 1000,
    }),
  )
  const renderBody = (tip: ChartTooltipContext<Row, number, number>) => (
    <div data-custom-tooltip>
      {tip.defaultBody}
      <Input aria-label="Tooltip note" />
      <Button onClick={() => tip.dismiss()}>Close</Button>
    </div>
  )
  untrack(() => props.ready?.({ context: () => context }))
  return (
    <DefaultAppearance class="chart-preview">
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
          <Button onClick={() => setRich((value) => !value)}>
            Toggle custom tooltip
          </Button>
        </div>
      </header>
      <main>
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
      </main>
    </DefaultAppearance>
  )
}
