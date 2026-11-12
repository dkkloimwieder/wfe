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
  polar,
  pie,
  radialArc,
} from '@wfe/components/chart'
import type { ChartProps, ChartValue } from '@wfe/components/chart'
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
        'layers',
        'value',
        'innerRadius',
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
      ['line', 'area', 'bar', 'scatter', 'layers', 'pie'].includes(value.kind),
      'unsupported chart kind',
    )
    const axisDescription = (
      field: unknown,
      label: string,
      withField = true,
    ) => {
      object(field, label)
      keys(
        field,
        withField
          ? ['field', 'label', 'formatter', 'scale']
          : ['label', 'formatter', 'scale'],
        label,
      )
      if (withField) text(field.field, `${label} field`)
      text(field.label, `${label} label`, true)
      text(field.formatter, `${label} formatter`, true)
    }
    if (value.kind === 'pie') {
      requireValue(
        !('x' in value) && !('y' in value) && !('layers' in value),
        'pie descriptions require value only',
      )
      axisDescription(value.value, 'chart value')
      requireValue(
        !('scale' in value.value),
        'pie values do not use an axis scale',
      )
      requireValue(
        value.innerRadius === undefined ||
          (finite(value.innerRadius) &&
            value.innerRadius >= 0 &&
            value.innerRadius < 1),
        'invalid chart inner radius',
      )
    } else {
      requireValue(
        !('value' in value) && !('innerRadius' in value),
        'Cartesian descriptions do not use polar properties',
      )
      axisDescription(value.x, 'chart x axis')
      axisDescription(value.y, 'chart y axis', value.kind !== 'layers')
      requireValue(
        ['linear', 'band', 'point', 'utc'].includes(value.x.scale),
        'unsupported chart x scale',
      )
      requireValue(
        value.y.scale === undefined || value.y.scale === 'linear',
        'unsupported chart y scale',
      )
      if (value.kind === 'layers') {
        requireValue(
          Array.isArray(value.layers) && value.layers.length > 0,
          'chart layers must be a nonempty array',
        )
        for (const layer of value.layers) object(layer, 'chart layer')
        uniqueIds(
          value.layers.map((layer) => layer.id),
          'chart layer',
        )
        for (const layer of value.layers) {
          object(layer, 'chart layer')
          keys(layer, ['id', 'kind', 'y'], 'chart layer')
          requireValue(
            ['line', 'area', 'bar', 'scatter'].includes(String(layer.kind)),
            'unsupported chart layer kind',
          )
          axisDescription(layer.y, 'chart layer y axis')
          object(layer.y, 'chart layer y axis')
          requireValue(
            !('scale' in layer.y),
            'chart layers share the y axis scale',
          )
          requireValue(
            layer.kind !== 'bar' || value.x.scale === 'band',
            'generated bar charts require a band x scale',
          )
        }
      } else {
        requireValue(
          !('layers' in value),
          'single mark descriptions do not use layers',
        )
        requireValue(
          value.kind !== 'bar' || value.x.scale === 'band',
          'generated bar charts require a band x scale',
        )
      }
    }
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
    const fields =
      d.kind === 'pie'
        ? [{ axis: d.value, scale: 'linear', name: 'value' }]
        : [
            { axis: d.x, scale: d.x.scale, name: 'x' },
            ...(d.kind === 'layers'
              ? d.layers.map((layer) => ({
                  axis: layer.y,
                  scale: 'linear',
                  name: 'y',
                }))
              : [{ axis: d.y, scale: 'linear', name: 'y' }]),
          ]
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
      for (const { axis, scale, name } of fields) {
        const value = row[axis.field]
        requireValue(
          d.kind === 'pie'
            ? finite(value) && value >= 0
            : value == null ||
                (scale === 'linear'
                  ? finite(value)
                  : scale === 'utc'
                    ? date(value)
                    : typeof value === 'string' ||
                      finite(value) ||
                      date(value)),
          `invalid chart ${name} value for "${axis.field}"`,
        )
      }
    }
    for (const { axis, name } of fields)
      requireValue(
        rows.length === 0 || rows.some((row) => axis.field in row),
        `unknown chart ${name} field "${axis.field}"`,
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
    if (d.kind === 'pie') {
      const formatter = format(d.value)
      return defineChart({
        marks: [
          polar({
            id: d.id,
            scales: { angle: null, radius: null },
            marks: [
              radialArc(
                pie(rows, { value: (row) => row[d.value.field] as number }),
                {
                  id: `${d.id}-slices`,
                  key: d.key
                    ? (row) => row.source[0]![d.key!] as string | number
                    : undefined,
                  z: (row) =>
                    d.key
                      ? (row.source[0]![d.key] as string | number)
                      : row.index,
                  stroke: 'var(--ui-surface)',
                  strokeWidth: 1,
                  innerRadius: ({ radius }) => radius * (d.innerRadius ?? 0),
                },
              ),
            ],
          }),
        ],
        scales: { x: null, y: null },
        guides: false,
        theme: props.bindings.theme?.(),
        tooltip:
          d.tooltip === false
            ? undefined
            : {
                use: tooltip,
                portal: tooltipPortal,
                items: [
                  { channel: 'group', label: d.key ?? 'Record' },
                  {
                    channel: 'y',
                    label: d.value.label ?? d.value.field,
                    text: (point) =>
                      formatter
                        ? formatter(
                            point.datum.source[0]![d.value.field] as number,
                          )
                        : String(point.datum.source[0]![d.value.field]),
                  },
                ],
              },
      })
    }
    const formatX = format(d.x)
    const formatY = format(d.y)
    const layers =
      d.kind === 'layers' ? d.layers : [{ id: d.id, kind: d.kind, y: d.y }]
    const marks = layers.map((layer) => {
      // Resolve every declared formatter before rendering, even with no rows.
      format(layer.y)
      const channels = {
        id: layer.id,
        key: d.key ? (row: Row) => row[d.key!] as string | number : undefined,
        x: (row: Row) => row[d.x.field] as ChartValue | null | undefined,
        y: (row: Row) => row[layer.y.field] as number | null | undefined,
      }
      return layer.kind === 'line'
        ? lineY(rows, channels)
        : layer.kind === 'area'
          ? areaY(rows, channels)
          : layer.kind === 'bar'
            ? barY(rows, channels)
            : dot(rows, channels)
    })
    const xScale =
      d.x.scale === 'band'
        ? () => scaleBand().padding(0.15)
        : d.x.scale === 'point'
          ? scalePoint
          : d.x.scale === 'utc'
            ? scaleUtc
            : scaleLinear
    return defineChart({
      marks,
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
                ...layers.map((layer) => ({
                  channel: 'y' as const,
                  label: layer.y.label ?? d.y.label ?? layer.y.field,
                  text: (point: { markId: string; yValue: number }) => {
                    if (point.markId !== layer.id) return null
                    const formatter = format(layer.y) ?? formatY
                    return formatter
                      ? formatter(point.yValue)
                      : String(point.yValue)
                  },
                })),
              ],
            },
    })
  })
  function sourcePoint(
    point: NonNullable<Parameters<NonNullable<ChartProps<Row>['onSelect']>>[0]>,
  ) {
    if (description().kind !== 'pie') return point
    const derived = point.datum as { source?: readonly Row[] }
    const datum = derived.source?.[0]
    requireValue(datum !== undefined, 'missing chart source record')
    return { ...point, datum }
  }
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
      <Chart<Row>
        // The pie transform adds source lineage internally. Public callbacks below
        // restore the original application record before crossing this boundary.
        definition={definition() as ChartProps<Row>['definition']}
        ariaLabel={description().ariaLabel}
        height={description().height}
        aspectRatio={description().aspectRatio}
        onSelect={(point) => {
          props.bindings.onSelect?.(point ? sourcePoint(point) : null)
        }}
        onFocusChange={(point) => {
          props.bindings.onFocusChange?.(point ? sourcePoint(point) : null)
        }}
      />
    </section>
  )
}
