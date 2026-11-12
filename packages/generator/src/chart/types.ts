import type { Accessor } from 'solid-js'
import type { ChartProps, ChartTheme, ChartValue } from '@wfe/components/chart'
import type { ViewStatus } from '../types'

type ChartField<Row extends object, Value> = {
  [Key in Extract<keyof Row, string>]-?: unknown extends Row[Key]
    ? Key
    : NonNullable<Row[Key]> extends Value
      ? Key
      : never
}[Extract<keyof Row, string>]
export type ChartAxisDescription<
  Row extends object,
  Value = ChartValue,
> = Readonly<{
  field: ChartField<Row, Value>
  label?: string
  formatter?: string
}>
/** A record-backed Cartesian layer. Layer order is paint order. */
export type ChartLayerDescription<Row extends object> = Readonly<{
  id: string
  kind: 'line' | 'area' | 'bar' | 'scatter'
  y: ChartAxisDescription<Row, number>
}>
type ChartBaseDescription<Row extends object> = Readonly<{
  id: string
  title?: string
  ariaLabel: string
  key?: ChartField<Row, string | number>
  height?: number
  aspectRatio?: number
  tooltip?: boolean
}>
type ChartXDescription<Row extends object> =
  | (ChartAxisDescription<Row, number> & Readonly<{ scale: 'linear' }>)
  | (ChartAxisDescription<Row, Date> & Readonly<{ scale: 'utc' }>)
  | (ChartAxisDescription<Row> & Readonly<{ scale: 'band' | 'point' }>)
export type ChartDescription<Row extends object = Record<string, unknown>> =
  ChartBaseDescription<Row> &
    (
      | (Readonly<{
          y: ChartAxisDescription<Row, number> & Readonly<{ scale?: 'linear' }>
        }> &
          (
            | Readonly<{
                kind: 'bar'
                x: ChartAxisDescription<Row> & Readonly<{ scale: 'band' }>
              }>
            | Readonly<{
                kind: 'line' | 'area' | 'scatter'
                x: ChartXDescription<Row>
              }>
          ))
      | Readonly<{
          kind: 'layers'
          x: ChartXDescription<Row>
          /** Shared linear axis; layer fields provide its domain. */
          y: Readonly<{ label?: string; formatter?: string; scale?: 'linear' }>
          layers: readonly ChartLayerDescription<Row>[]
        }>
      | Readonly<{
          kind: 'pie'
          x?: never
          y?: never
          value: ChartAxisDescription<Row, number>
          /** Inner radius as a fraction of the available radius (0..1). */
          innerRadius?: number
        }>
    )
type AxisFormatter<Axis> = Axis extends { formatter?: infer Name }
  ? Extract<Name, string>
  : never
type FormatterNames<D> = D extends { kind: 'pie'; value: infer V }
  ? AxisFormatter<V>
  : D extends { x: infer X; y: infer Y }
    ? | AxisFormatter<X>
      | AxisFormatter<Y>
      | (D extends { layers: readonly (infer L)[] }
          ? L extends { y: infer Y }
            ? AxisFormatter<Y>
            : never
          : never)
    : never
type Formatter = (value: ChartValue) => string
type FormatterBindings<D> =
  string extends FormatterNames<D>
    ? { formatters?: Readonly<Record<string, Formatter>> }
    : [FormatterNames<D>] extends [never]
      ? { formatters?: Readonly<Record<string, Formatter>> }
      : { formatters: Readonly<Record<FormatterNames<D>, Formatter>> }

export type ChartViewBindings<
  Row extends object,
  D extends ChartDescription<Row> = ChartDescription<Row>,
> = Readonly<{
  rows: Accessor<readonly Row[]>
  theme?: Accessor<Partial<ChartTheme>>
  status?: Accessor<ViewStatus>
  onSelect?: ChartProps<Row>['onSelect']
  onFocusChange?: ChartProps<Row>['onFocusChange']
}> &
  Readonly<FormatterBindings<D>>
