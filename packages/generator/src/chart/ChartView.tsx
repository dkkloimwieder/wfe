import {
  requireObject as object,
  requireKeys as keys,
  isNonEmptyText,
} from '../guards'
import type { GeneratorMessageProps } from '../messages'
import { createMemo, Show, untrack } from 'solid-js'
import {
  Chart,
  defineChart,
  lineY,
  areaY,
  barY,
  dot,
  scaleLinear,
  scaleBand,
  scalePoint,
  scaleUtc,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'
import type { ChartValue } from '@wfe/components/chart'
import { requireValue, uniqueIds, StatusView } from '../shared'
import type { ChartDescription, ChartViewBindings } from './types'

function text(value: unknown, label: string, optional = false) {
  requireValue(
    (optional && value === undefined) || isNonEmptyText(value),
    `invalid ${label}`,
  )
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
function date(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(+value)
}

export function ChartView<
  Row extends object,
  D extends ChartDescription<Row> = ChartDescription<Row>,
>(
  props: GeneratorMessageProps & {
    description: D
    bindings: ChartViewBindings<Row, NoInfer<D>>
  },
) {
  const identity = untrack(() => {
    object(props.description, 'chart description')
    return props.description.id
  })
  const description = createMemo(() => {
    const value = props.description
    object(value, 'chart description')
    keys(
      value,
      [
        'id',
        'title',
        'ariaLabel',
        'key',
        'kind',
        'x',
        'y',
        'height',
        'aspectRatio',
        'tooltip',
      ],
      'chart',
    )
    requireValue(
      value.id === identity,
      'remount the chart view to replace its identity',
    )
    uniqueIds([value.id], 'chart')
    text(value.title, 'chart title', true)
    text(value.ariaLabel, 'chart accessible label')
    text(value.key, 'chart key field', true)
    requireValue(
      ['line', 'area', 'bar', 'scatter'].includes(value.kind),
      'unsupported chart kind',
    )
    for (const axis of ['x', 'y'] as const) {
      const field = value[axis]
      object(field, `chart ${axis} axis`)
      keys(
        field,
        ['field', 'label', 'formatter', 'scale'],
        `chart ${axis} axis`,
      )
      text(field.field, `chart ${axis} field`)
      text(field.label, `chart ${axis} label`, true)
      text(field.formatter, `chart ${axis} formatter`, true)
    }
    requireValue(
      ['linear', 'band', 'point', 'utc'].includes(value.x.scale),
      'unsupported chart x scale',
    )
    requireValue(
      value.y.scale === undefined || value.y.scale === 'linear',
      'unsupported chart y scale',
    )
    requireValue(
      value.kind !== 'bar' || value.x.scale === 'band',
      'generated bar charts require a band x scale',
    )
    for (const name of ['height', 'aspectRatio'] as const)
      requireValue(
        value[name] === undefined || (finite(value[name]) && value[name]! > 0),
        `invalid chart ${name}`,
      )
    requireValue(
      value.tooltip === undefined || typeof value.tooltip === 'boolean',
      'invalid chart tooltip flag',
    )
    return value
  })
  const definition = createMemo(() => {
    const d = description()
    const rows = props.bindings.rows()
    requireValue(Array.isArray(rows), 'chart rows must be an array')
    const rowKeys = new Set<string | number>()
    for (const row of rows) {
      object(row, 'chart row')
      if (d.key) {
        const value = row[d.key]
        requireValue(
          typeof value === 'string' || finite(value),
          'invalid chart record key',
        )
        requireValue(!rowKeys.has(value), 'duplicate chart record key')
        rowKeys.add(value)
      }
      const x = row[d.x.field]
      const y = row[d.y.field]
      requireValue(
        x == null ||
          (d.x.scale === 'linear'
            ? finite(x)
            : d.x.scale === 'utc'
              ? date(x)
              : typeof x === 'string' || finite(x) || date(x)),
        `invalid chart x value for "${d.x.field}"`,
      )
      requireValue(
        y == null || finite(y),
        `invalid chart y value for "${d.y.field}"`,
      )
    }
    for (const axis of ['x', 'y'] as const)
      requireValue(
        rows.length === 0 || rows.some((row) => d[axis].field in row),
        `unknown chart ${axis} field "${d[axis].field}"`,
      )
    const format = (axis: { formatter?: string }) => {
      if (!axis.formatter) return undefined
      const supplied:
        Readonly<Record<string, (value: ChartValue) => string>> | undefined =
        props.bindings.formatters
      const value =
        supplied && Object.hasOwn(supplied, axis.formatter)
          ? supplied[axis.formatter]
          : undefined
      requireValue(
        typeof value === 'function',
        `missing chart formatter "${axis.formatter}"`,
      )
      return value
    }
    const formatX = format(d.x)
    const formatY = format(d.y)
    const channels = {
      id: d.id,
      key: d.key ? (row: Row) => row[d.key!] as string | number : undefined,
      x: (row: Row) => row[d.x.field] as ChartValue | null | undefined,
      y: (row: Row) => row[d.y.field] as number | null | undefined,
    }
    const mark =
      d.kind === 'line'
        ? lineY(rows, channels)
        : d.kind === 'area'
          ? areaY(rows, channels)
          : d.kind === 'bar'
            ? barY(rows, channels)
            : dot(rows, channels)
    const xScale =
      d.x.scale === 'band'
        ? () => scaleBand().padding(0.15)
        : d.x.scale === 'point'
          ? scalePoint
          : d.x.scale === 'utc'
            ? scaleUtc
            : scaleLinear
    return defineChart({
      marks: [mark],
      scales: {
        x: {
          scale: xScale,
          axis: { label: d.x.label, ticks: { format: formatX } },
        },
        y: {
          scale: scaleLinear,
          axis: { label: d.y.label, ticks: { format: formatY } },
        },
      },
      theme: props.bindings.theme?.(),
      tooltip:
        d.tooltip === false
          ? undefined
          : {
              use: tooltip,
              portal: tooltipPortal,
              items: [
                {
                  channel: 'x',
                  label: d.x.label ?? d.x.field,
                  text: formatX ? (point) => formatX(point.xValue) : undefined,
                },
                {
                  channel: 'y',
                  label: d.y.label ?? d.y.field,
                  text: formatY ? (point) => formatY(point.yValue) : undefined,
                },
              ],
            },
    })
  })
  return (
    <section
      data-ui=""
      data-generator-view={description().id}
      aria-busy={props.bindings.status?.().loading ? 'true' : 'false'}
      style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: 'var(--ui-gap, 6px)',
        'min-width': 0,
      }}
    >
      <Show when={description().title}>
        {(title) => (
          <h2
            data-ui-text="system"
            style={{ margin: 0, 'font-size': 'inherit' }}
          >
            {title()}
          </h2>
        )}
      </Show>
      <StatusView messages={props.messages} status={props.bindings.status} />
      <Chart
        definition={definition()}
        ariaLabel={description().ariaLabel}
        height={description().height}
        aspectRatio={description().aspectRatio}
        onSelect={props.bindings.onSelect}
        onFocusChange={props.bindings.onFocusChange}
      />
    </section>
  )
}
