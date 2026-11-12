import { createMemo, createSignal, For, Show, onSettled } from 'solid-js'
import { Button, Checkbox, Collapsible, Input } from '@wfe/components'
import { Chart } from '@wfe/components/chart'
import type { ChartScene, ChartValue } from '@wfe/components/chart'
import {
  financialDefinition,
  financialPanels,
  marketSessions,
  comparisons,
} from './financial-data'
import './financial.css'

type Datum<T extends { readonly __datum?: unknown }> = NonNullable<T['__datum']>
type Snapshot = {
  width: number
  height: number
  points: { x: number; y: number; id: string }[]
}
export type FinancialHost = HTMLElement & {
  financialCharts?: {
    scene: (id: string) => Snapshot | undefined
    selections: () => number
  }
}

/** Application-owned recipes using the released SVG chart grammar. */
export function FinancialCharts() {
  const [revision, setRevision] = createSignal(0)
  const [empty, setEmpty] = createSignal(false)
  const [reversed, setReversed] = createSignal(false)
  const [accept, setAccept] = createSignal(true)
  const [selection, setSelection] = createSignal('No financial point selected')
  const [request, setRequest] = createSignal('No financial change requested')
  let host: FinancialHost | undefined
  let selections = 0
  const scenes = new Map<string, Snapshot>()
  onSettled(() => () => {
    if (host) delete host.financialCharts
    scenes.clear()
  })
  function change(message: string, apply: () => void) {
    setRequest(message)
    if (accept()) apply()
  }
  function remember(id: string, scene: ChartScene) {
    scenes.set(id, {
      width: scene.width,
      height: scene.height,
      points: scene.points.map((point) => ({
        x: point.x,
        y: point.y,
        id: (point.datum as { id: string }).id,
      })),
    })
  }
  return (
    <section
      class="financial-charts"
      data-financial-charts
      aria-label="Financial and comparison chart recipes"
      ref={(node) => {
        host = node
        host.financialCharts = {
          scene: (id) => scenes.get(id),
          selections: () => selections,
        }
      }}
    >
      <p>
        Simulated market and regional data. Hover to inspect a record. Focus a
        chart and use arrow keys, Enter to pin, and Escape to dismiss details.
      </p>
      <div class="financial-controls">
        <Button
          onClick={() =>
            change(`Requested financial revision ${revision() + 1}`, () =>
              setRevision((value) => value + 1),
            )
          }
        >
          Refresh financial data
        </Button>
        <Button
          onClick={() =>
            change('Requested reversed financial records', () =>
              setReversed((value) => !value),
            )
          }
        >
          Reverse financial records
        </Button>
        <Button
          onClick={() =>
            change('Requested financial data toggle', () =>
              setEmpty((value) => !value),
            )
          }
        >
          Toggle financial data
        </Button>
        <Checkbox checked={accept()} onCheckedChange={setAccept}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Accept financial changes</Checkbox.Label>
        </Checkbox>
      </div>
      <Input aria-label="Retained financial note" placeholder="Analysis note" />
      <output aria-label="Financial data revision">{revision()}</output>
      <output data-financial-request>{request()}</output>
      <output data-financial-selection>{selection()}</output>
      <div class="financial-panels">
        <For each={financialPanels}>
          {(panel) => {
            const definition = createMemo(() =>
              financialDefinition(panel.id, revision(), empty(), reversed()),
            )
            return (
              <section
                class="financial-panel"
                data-financial-panel={panel.id}
                aria-label={panel.title}
              >
                <h2>{panel.title}</h2>
                <p>{panel.description}</p>
                <Chart<
                  Datum<ReturnType<typeof definition>>,
                  ChartValue,
                  ChartValue
                >
                  definition={definition()}
                  ariaLabel={panel.title}
                  initialWidth={640}
                  height={300}
                  onRender={(context) => remember(panel.id, context.scene)}
                  onSelect={(point) => {
                    selections++
                    change(`Selected ${panel.id}`, () =>
                      setSelection(
                        point
                          ? `${panel.id}: ${point.datum.details}; source ${point.datum.source.id}`
                          : 'No financial point selected',
                      ),
                    )
                  }}
                  renderTooltipBody={(context) => (
                    <Show when={context.primaryPoint}>
                      {(point) => (
                        <div class="financial-detail">
                          <strong>{point().datum.id}</strong>
                          <p>{point().datum.details}</p>
                        </div>
                      )}
                    </Show>
                  )}
                />
                <Collapsible summary="Source records">
                  <p>
                    Chart details preserve the original record alongside the
                    refreshed presentation values.
                  </p>
                  <pre>
                    {JSON.stringify(
                      panel.id === 'candlestick' || panel.id === 'ohlc'
                        ? marketSessions
                        : comparisons,
                      null,
                      2,
                    )}
                  </pre>
                  <p>
                    {empty()
                      ? 'No data'
                      : 'Select a point to read its source record and units.'}
                  </p>
                </Collapsible>
              </section>
            )
          }}
        </For>
      </div>
    </section>
  )
}
