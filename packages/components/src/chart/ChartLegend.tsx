import { createMemo, For } from 'solid-js'
import { Button } from '../components/NativeFields'
import { styledClasses, type ClassValue } from '../internal/classes'

export type ChartLegendItem = Readonly<{
  id: string
  label: string
  color: string
  visible: boolean
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  disabled?: boolean
}>
export type ChartLegendProps = {
  label: string
  items: readonly ChartLegendItem[]
  disabled?: boolean
  class?: ClassValue
  onVisibilityChange: (id: string, visible: boolean) => void
}

/** The application accepts visibility requests and decides which data to display. */
export function ChartLegend(props: ChartLegendProps) {
  const items = createMemo(() => {
    const byId = new Map<string, ChartLegendItem>()
    for (const item of props.items) {
      if (!item.id || byId.has(item.id))
        throw new Error('ChartLegend requires unique nonempty item IDs')
      byId.set(item.id, item)
    }
    return byId
  })
  const ids = createMemo(() => [...items().keys()])
  return (
    <div
      data-ui=""
      role="group"
      aria-label={props.label}
      class={styledClasses('ui-chart-legend', props.class)}
    >
      <For each={ids()}>
        {(id) => {
          const item = () => items().get(id)!
          return (
            <Button
              class="ui-chart-legend-button"
              tone="accent"
              disabled={props.disabled || item().disabled}
              aria-pressed={item().visible ? 'true' : 'false'}
              onClick={() => {
                if (!props.disabled && !item().disabled)
                  props.onVisibilityChange(id, !item().visible)
              }}
            >
              <span
                class="ui-chart-legend-swatch"
                aria-hidden="true"
                data-line-style={item().lineStyle}
                style={{
                  background: item().lineStyle ? undefined : item().color,
                  '--ui-chart-series-color': item().color,
                  'border-block-start-style': item().lineStyle,
                }}
              />
              <span class="ui-chart-legend-label">{item().label}</span>
            </Button>
          )
        }}
      </For>
    </div>
  )
}
