import { mountChartRenderer, resolveChartRenderer } from './renderer'
import { createChartRuntime } from './runtime'
import {
  resolveChartAdapterLayout,
  resolveChartHostTabIndex,
} from './adapter-shared'
import type { ChartAdapter } from './adapter-shared'
import type { ChartRendererHost, ChartRendererHostOptions } from './dom-types'
import type { ChartRuntime, ChartRuntimeOptions, ChartValue } from './types'

export function createChartRendererAdapter<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialOptions: ChartRendererHostOptions<TDatum, TXValue, TYValue>,
  runtimeOptions: ChartRuntimeOptions = {},
): ChartAdapter<
  ChartRendererHostOptions<TDatum, TXValue, TYValue>,
  TDatum,
  TXValue,
  TYValue
> {
  let runtime: ChartRuntime<TDatum, TXValue, TYValue> | undefined =
    createChartRuntime<TDatum, TXValue, TYValue>(runtimeOptions)
  let options = initialOptions
  let host: ChartRendererHost<TDatum, TXValue, TYValue> | undefined
  const getRuntime = () =>
    (runtime ??= createChartRuntime<TDatum, TXValue, TYValue>(runtimeOptions))

  return {
    prerender() {
      const layout = resolveChartAdapterLayout(options)
      const scene = getRuntime().render(
        options.definition,
        {
          width: layout.initialWidth,
          height: layout.initialHeight,
        },
        { measureText: options.measureText },
      )
      return resolveChartRenderer(scene, options.renderer).prerender(scene, {
        ariaLabel: options.ariaLabel,
        ariaDescription: options.ariaDescription,
        className: options.className,
        tabIndex: resolveChartHostTabIndex(
          options.definition,
          options.tabIndex,
        ),
        idPrefix: options.idPrefix,
      })
    },
    mount(container) {
      if (host) {
        throw new Error('This chart adapter is already mounted.')
      }
      host = mountChartRenderer(container, options, getRuntime())
    },
    update(nextOptions) {
      options = nextOptions
      host?.update(nextOptions)
    },
    getScene() {
      return host?.getScene()
    },
    destroy() {
      if (host) {
        host.destroy()
        host = undefined
        runtime = undefined
      } else if (runtime) {
        runtime.destroy()
        runtime = undefined
      }
    },
  }
}
