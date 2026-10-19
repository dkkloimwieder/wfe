import type { Accessor, Component } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type {
  ValueFormat,
  ValueFormatOptions,
  DateInputFormat,
  TimeInputFormat,
  DateTimeDisambiguation,
  ButtonTone,
  FormColumns,
  FormSpan,
  ButtonVariant,
} from '@wfe/components'
import type { DashboardShellProps } from '@wfe/components/layout'
import type {
  NativeColumn,
  NativeRow,
  NativeTable,
  ReadOnlyTable,
  TableWorkspaceProps,
} from '@wfe/components/table'
import type { FormContract, FormScalar } from '@wfe/form'

export type ActionDescription = Readonly<{
  id: string
  label?: string
  variant?: ButtonVariant
  tone?: ButtonTone
}>
export type ActionBinding = Readonly<{
  run: () => void
  disabled?: Accessor<boolean>
}>
export type ViewStatus = Readonly<{ loading?: boolean; error?: string }>

type ActionIds<D> = D extends { actions: readonly ActionDescription[] }
  ? D['actions'][number]['id']
  : never
type ActionBindings<D> = [ActionIds<D>] extends [never]
  ? { actions?: never }
  : { actions: Readonly<{ [Id in ActionIds<D>]: ActionBinding }> }

type FieldKey<T> = Extract<keyof T, string>
export type DateControlDescription = {
  control: 'date'
  dateFormat?: DateInputFormat
  locale?: string
  min?: string
  max?: string
  startOfWeek?: number
}
export type DateTimeControlDescription = Omit<
  DateControlDescription,
  'control'
> & {
  control: 'datetime'
  timeFormat?: TimeInputFormat
  timeZone?: string
  disambiguation?: DateTimeDisambiguation
}
export type NumberControlDescription = {
  control: 'number'
  min?: number
  max?: number
}
type NumericControl<V> = [Exclude<V, null | undefined>] extends [number]
  ? number extends Exclude<V, null | undefined>
    ? NumberControlDescription &
        ([V] extends [number]
          ? { empty?: 'reject' }
          : | (undefined extends V ? { empty: 'undefined' } : never)
            | (null extends V ? { empty: 'null' } : never))
    : never
  : never

type BuiltInControl<V> =
  | NumericControl<V>
  | ([V] extends [string]
      ? | { control: 'select' }
        | (string extends V
            ? | { control: 'text' | 'textarea' }
              | DateControlDescription
              | DateTimeControlDescription
            : never)
      : [V] extends [boolean]
        ? boolean extends V
          ? { control: 'checkbox' | 'switch' }
          : never
        : never)

export type FormFieldDescription<
  T extends object & { [K in keyof T]: FormScalar },
> = {
  [K in FieldKey<T>]: Readonly<
    {
      field: K
      label?: string
      format?: ValueFormat
      formatOptions?: Readonly<ValueFormatOptions>
      help?: string
      required?: boolean
      span?: FormSpan
    } & (BuiltInControl<T[K]> | { control: 'custom' })
  >
}[FieldKey<T>]

export type FormGroupDescription<Key extends string = string> = Readonly<{
  id: string
  title: string
  help?: string
  columns?: FormColumns
  span?: FormSpan
  fields: readonly Key[]
}>
export type FormLayoutDescription<Key extends string = string> = Readonly<{
  columns?: FormColumns
  groups?: readonly FormGroupDescription<Key>[]
}>

export type FormDescription<T extends object & { [K in keyof T]: FormScalar }> =
  Readonly<{
    id: string
    title?: string
    fields: readonly FormFieldDescription<T>[]
    layout?: FormLayoutDescription<FieldKey<T>>
    submit?: ActionDescription
    actions?: readonly ActionDescription[]
  }>

export type FormChoice<V> = Readonly<{
  value: V
  label: string
  disabled?: boolean
}>
export type CustomFieldProps<T, K extends keyof T> = Readonly<{
  id: string
  field: K
  value: T[K]
  onValueChange: (requested: T[K]) => void
  disabled: boolean
  readOnly: boolean
}>

type FieldsOf<D> = D extends { fields: readonly (infer F)[] } ? F : never
type FieldsUsing<T, D, Control extends string> =
  Extract<FieldsOf<D>, { control: Control }> extends infer F
    ? F extends { field: infer K extends keyof T }
      ? K
      : never
    : never

type ChoiceBindings<T, D> = [FieldsUsing<T, D, 'select'>] extends [never]
  ? { choices?: never }
  : {
      choices: Readonly<{
        [K in FieldsUsing<T, D, 'select'>]: Accessor<
          readonly FormChoice<T[K]>[]
        >
      }>
    }
type CustomFieldBindings<T, D> = [FieldsUsing<T, D, 'custom'>] extends [never]
  ? { fields?: never }
  : {
      fields: Readonly<{
        [K in FieldsUsing<T, D, 'custom'>]: Component<CustomFieldProps<T, K>>
      }>
    }

export type FormViewBindings<
  T extends object & { [K in keyof T]: FormScalar },
  D extends FormDescription<T>,
> = Readonly<{
  form: FormContract<T>
  status?: Accessor<ViewStatus>
  disabled?: (field: FieldKey<T>) => boolean
  readOnly?: (field: FieldKey<T>) => boolean
}> &
  ActionBindings<D> &
  ChoiceBindings<T, D> &
  CustomFieldBindings<T, D>

export type ColumnPresentation = Readonly<{
  label?: string
  renderer?: string
  format?: ValueFormat
  formatOptions?: Readonly<ValueFormatOptions>
}>
export type TableDescription = Readonly<{
  id: string
  title?: string
  columns: Readonly<Record<string, ColumnPresentation>>
  controls?: Parameters<typeof ReadOnlyTable<unknown, unknown>>[0]['controls']
  controlsPlacement?: TableWorkspaceProps['controlsPlacement']
  actions?: readonly ActionDescription[]
}>
export type CustomCellProps<Row, Meta> = Readonly<{
  row: NativeRow<Row>
  value: unknown
  column: NativeColumn<Row, Meta>
}>
type RendererIds<D extends TableDescription> = {
  [K in keyof D['columns']]: D['columns'][K] extends {
    renderer: infer Id extends string
  }
    ? Id
    : never
}[keyof D['columns']]
type CellBindings<Row, Meta, D extends TableDescription> = [
  RendererIds<D>,
] extends [never]
  ? { cells?: never }
  : {
      cells: Readonly<{
        [Id in RendererIds<D>]: Component<CustomCellProps<Row, Meta>>
      }>
    }

export type TableViewBindings<
  Row,
  Meta,
  D extends TableDescription,
> = Readonly<{
  table: NativeTable<Row, Meta>
  headerAliases?: Accessor<
    Readonly<Partial<Record<Extract<keyof D['columns'], string>, string>>>
  >
  status?: Accessor<ViewStatus>
}> &
  Pick<
    Parameters<typeof ReadOnlyTable<Row, Meta>>[0],
    | 'selection'
    | 'width'
    | 'headerEnd'
    | 'onApplyFilters'
    | 'filter'
    | 'groupable'
    | 'columnAlignment'
    | 'onColumnAlignmentChange'
    | 'controlsResizable'
    | 'controlsSize'
    | 'onControlsSizeChange'
    | 'controlsCollapsed'
    | 'onControlsCollapsedChange'
  > &
  ActionBindings<D> &
  CellBindings<Row, Meta, D>

export type PanelDescription<ViewId extends string = string> = Readonly<{
  id: string
  view: ViewId
  title?: string
  fill?: boolean
}>
export type LayoutDescription<ViewId extends string = string> = Readonly<{
  id: string
  title?: string
  navigationLabel?: string
  contextLabel?: string
  footerLabel?: string
  scroll?: DashboardShellProps['scroll']
  columns?: 1 | 2
  panels: readonly PanelDescription<ViewId>[]
  navigation?: readonly PanelDescription<ViewId>[]
  context?: readonly PanelDescription<ViewId>[]
  footer?: readonly PanelDescription<ViewId>[]
  actions?: readonly ActionDescription[]
}>
type PanelsOf<D> =
  | (D extends { panels: readonly (infer P)[] } ? P : never)
  | (D extends { navigation: readonly (infer P)[] } ? P : never)
  | (D extends { context: readonly (infer P)[] } ? P : never)
  | (D extends { footer: readonly (infer P)[] } ? P : never)
type ViewIds<D> =
  PanelsOf<D> extends { view: infer Id extends string } ? Id : never
export type LayoutViewBindings<D extends LayoutDescription> = Readonly<{
  views: Readonly<{ [Id in ViewIds<D>]: () => JSX.Element }>
}> &
  ActionBindings<D>
