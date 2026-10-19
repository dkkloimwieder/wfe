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
export type ChartDescription<Row extends object = Record<string, unknown>> =
  Readonly<{
    id: string
    title?: string
    ariaLabel: string
    key?: ChartField<Row, string | number>
    y: ChartAxisDescription<Row, number> & Readonly<{ scale?: 'linear' }>
    height?: number
    aspectRatio?: number
    tooltip?: boolean
  }> &
    (
      | Readonly<{
          kind: 'bar'
          x: ChartAxisDescription<Row> & Readonly<{ scale: 'band' }>
        }>
      | Readonly<{
          kind: 'line' | 'area' | 'scatter'
          x:
            | (ChartAxisDescription<Row, number> &
                Readonly<{ scale: 'linear' }>)
            | (ChartAxisDescription<Row, Date> & Readonly<{ scale: 'utc' }>)
            | (ChartAxisDescription<Row> &
                Readonly<{ scale: 'band' | 'point' }>)
        }>
    )
export type ChartViewBindings<Row extends object> = Readonly<{
  rows: Accessor<readonly Row[]>
  formatters?: Readonly<Record<string, (value: ChartValue) => string>>
  theme?: Accessor<Partial<ChartTheme>>
  status?: Accessor<ViewStatus>
  onSelect?: ChartProps<Row>['onSelect']
  onFocusChange?: ChartProps<Row>['onFocusChange']
}>
