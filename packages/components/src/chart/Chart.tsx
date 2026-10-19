import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  omit,
  untrack,
} from 'solid-js'
import { For, Portal, Show, type JSX } from '@solidjs/web'
import { chartTheme } from './theme'
import { styledClasses, type ClassValue } from '../internal/classes'
import { createChartRendererAdapter } from '../vendor/charts/charts-core/src/adapter-renderer'
import { createSvgChartRenderer } from '../vendor/charts/charts-core/src/svg-surface'
import type {
  ChartRendererHostOptions,
  ChartTooltipBodyTarget,
} from '../vendor/charts/charts-core/src/dom-types'
import type {
  ChartTooltipBodyContext,
  ChartTooltipContent,
  ChartValue,
} from '../vendor/charts/charts-core/src/types'

type TooltipTarget<
  TDatum,
  TX extends ChartValue,
  TY extends ChartValue,
> = ChartTooltipBodyTarget<TDatum, TX, TY>
export interface ChartTooltipContext<
  TDatum = unknown,
  TX extends ChartValue = ChartValue,
  TY extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TX, TY> {
  defaultBody: JSX.Element
}
export type ChartProps<
  TDatum = unknown,
  TX extends ChartValue = ChartValue,
  TY extends ChartValue = ChartValue,
> = Omit<
  ChartRendererHostOptions<TDatum, TX, TY>,
  'renderer' | 'onTooltipBodyChange'
> & {
  class?: ClassValue
  style?: JSX.CSSProperties
  renderTooltipBody?: (
    context: ChartTooltipContext<TDatum, TX, TY>,
  ) => JSX.Element
}

/** Solid owns the host and tooltip UI. The engine alone owns the SVG subtree. */
export function Chart<
  TDatum,
  TX extends ChartValue = ChartValue,
  TY extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TX, TY>) {
  const generatedId = createUniqueId()
  const prefix = `ui-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const renderer = createSvgChartRenderer<TDatum, TX, TY>()
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [target, setTarget] = createSignal<TooltipTarget<
    TDatum,
    TX,
    TY
  > | null>(null)
  let alive = true
  let mounted = false
  const notifyTooltip = (value: TooltipTarget<TDatum, TX, TY> | null) => {
    if (alive) setTarget(value)
  }
  const hostProps = omit(props, 'class', 'style', 'renderTooltipBody')
  const aspectRatio = createMemo(() =>
    typeof props.aspectRatio === 'number' &&
    Number.isFinite(props.aspectRatio) &&
    props.aspectRatio > 0
      ? props.aspectRatio
      : undefined,
  )
  function options(): ChartRendererHostOptions<TDatum, TX, TY> {
    // Snapshot inside the effect compute phase, so every host option stays reactive.
    const host = { ...hostProps }
    return {
      ...host,
      idPrefix: host.idPrefix ?? prefix,
      renderer,
      onTooltipBodyChange: props.renderTooltipBody ? notifyTooltip : undefined,
    }
  }
  const adapter = untrack(() =>
    createChartRendererAdapter(options(), { defaultTheme: chartTheme }),
  )
  const markup = untrack(() => adapter.prerender())
  createEffect(
    () => ({ container: container(), options: options() }),
    (next) => {
      if (!alive) return
      adapter.update(next.options)
      if (next.container && !mounted) {
        mounted = true
        adapter.mount(next.container)
      }
    },
  )
  onCleanup(() => {
    alive = false
    adapter.destroy()
  })
  const tooltipElement = createMemo(() => target()?.element)
  return (
    <>
      <div
        data-ui=""
        class={styledClasses('ui-chart', props.class)}
        style={{
          position: 'relative',
          width: props.width === undefined ? '100%' : `${props.width}px`,
          height:
            props.height !== undefined
              ? `${props.height}px`
              : aspectRatio()
                ? undefined
                : '320px',
          'aspect-ratio':
            props.height === undefined && aspectRatio()
              ? String(aspectRatio())
              : undefined,
          ...props.style,
        }}
      >
        <div
          ref={(node) => untrack(() => setContainer(node))}
          class="ui-chart-surface"
          style={{ width: '100%', height: '100%' }}
          innerHTML={markup}
        />
      </div>
      <Show when={props.renderTooltipBody} keyed>
        {(render) => (
          <Show when={tooltipElement()} keyed>
            {(element) => (
              <Portal mount={element}>
                <TooltipBody render={render} target={() => target()!} />
              </Portal>
            )}
          </Show>
        )}
      </Show>
    </>
  )
}

function TooltipBody<
  TDatum,
  TX extends ChartValue,
  TY extends ChartValue,
>(props: {
  render: NonNullable<ChartProps<TDatum, TX, TY>['renderTooltipBody']>
  target: () => TooltipTarget<TDatum, TX, TY>
}) {
  const defaultBody = <DefaultTooltipBody content={props.target().content} />
  const context: ChartTooltipContext<TDatum, TX, TY> = {
    get primaryPoint() {
      return props.target().primaryPoint
    },
    get points() {
      return props.target().points
    },
    get content() {
      return props.target().content
    },
    get pinned() {
      return props.target().pinned
    },
    get dismiss() {
      return props.target().dismiss
    },
    defaultBody,
  }
  return untrack(() => props.render(context))
}

function DefaultTooltipBody(props: { content: ChartTooltipContent | string }) {
  const content = createMemo(() =>
    typeof props.content === 'string' ? undefined : props.content,
  )
  return (
    <div class="ui-chart-tooltip-body">
      <Show when={content()} fallback={props.content as string}>
        {(value) => (
          <>
            <Show when={value().title}>
              <div class="ui-chart-tooltip-title">{value().title}</div>
            </Show>
            <For each={value().rows}>
              {(row) => (
                <div
                  class="ui-chart-tooltip-row"
                  data-active={row.active ? '' : undefined}
                >
                  <span
                    aria-hidden="true"
                    class="ui-chart-tooltip-swatch"
                    style={{ background: row.color }}
                  />
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              )}
            </For>
          </>
        )}
      </Show>
    </div>
  )
}
