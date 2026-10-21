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
import type { FormContract, FormScalar, FormShape } from '@wfe/form'

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

export type FieldPresentation = Readonly<{
  label?: string
  format?: ValueFormat
  formatOptions?: Readonly<ValueFormatOptions>
  help?: string
  required?: boolean
  span?: FormSpan
}>

export type ScalarFieldDescription<T extends object> = {
  [K in FieldKey<T>]: T[K] extends FormScalar
    ? Readonly<
        { field: K } & FieldPresentation &
          (BuiltInControl<T[K]> | { control: 'custom' })
      >
    : never
}[FieldKey<T>]

export type RepeatedFieldDescription<Row extends object> = Readonly<{
  field: string
  control: 'repeat'
  label?: string
  help?: string
  columns?: FormColumns
  span?: FormSpan
  fields: readonly ScalarFieldDescription<Row>[]
}>
export type FormFieldDescription<T extends object & FormShape<T>> = {
  [K in FieldKey<T>]: T[K] extends readonly (infer Row)[]
    ? Row extends object
      ? Omit<RepeatedFieldDescription<Row>, 'field'> & { readonly field: K }
      : never
    : Extract<ScalarFieldDescription<T>, { field: K }>
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

export type FormDescription<T extends object & FormShape<T>> = Readonly<{
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

type RepeatedRow<
  T,
  K extends keyof T,
> = T[K] extends readonly (infer Row extends object)[] ? Row : never
export type RepeatedFieldBinding<Row extends object, D> = Readonly<{
  rowKey: (row: Readonly<Row>) => string
  createRow: () => Row
}> &
  ChoiceBindings<Row, D> &
  CustomFieldBindings<Row, D>
type RepeatedBindings<T, D> = [FieldsUsing<T, D, 'repeat'>] extends [never]
  ? { repeated?: never }
  : {
      repeated: Readonly<{
        [K in FieldsUsing<T, D, 'repeat'>]: RepeatedFieldBinding<
          RepeatedRow<T, K>,
          Extract<FieldsOf<D>, { field: K }>
        >
      }>
    }

export type FormViewBindings<
  T extends object & FormShape<T>,
  D extends FormDescription<T>,
> = Readonly<{
  form: FormContract<T>
  submitDisabled?: Accessor<boolean>
  status?: Accessor<ViewStatus>
  disabled?: (field: FieldKey<T>) => boolean
  readOnly?: (field: FieldKey<T>) => boolean
}> &
  ActionBindings<D> &
  ChoiceBindings<T, D> &
  CustomFieldBindings<T, D> &
  RepeatedBindings<T, D>

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
  /** Stable application component; remount the view to replace it. */
  toolbarActions?: Component
  headerAliases?: Accessor<
    Readonly<Partial<Record<Extract<keyof D['columns'], string>, string>>>
  >
  status?: Accessor<ViewStatus>
}> &
  Pick<
    Parameters<typeof ReadOnlyTable<Row, Meta>>[0],
    | 'pagination'
    | 'selection'
    | 'rowDetails'
    | 'width'
    | 'headerEnd'
    | 'onApplyFilters'
    | 'filter'
    | 'groupable'
    | 'columnAlignment'
    | 'onColumnAlignmentChange'
    | 'headerEnabled'
    | 'footerEnabled'
    | 'controlsEnabled'
    | 'refreshEnabled'
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

export type DetailFieldDescription<T extends object> = Readonly<{
  field: Extract<keyof T, string>
  label?: string
  help?: string
  format?: ValueFormat
  formatOptions?: Readonly<ValueFormatOptions>
  span?: FormSpan
}>
export type DetailDescription<T extends object> = Readonly<{
  id: string
  title?: string
  columns?: FormColumns
  fields: readonly DetailFieldDescription<T>[]
  actions?: readonly ActionDescription[]
}>
export type DetailViewBindings<
  T extends object,
  D extends DetailDescription<T>,
> = Readonly<{
  record: Accessor<Readonly<T>>
  status?: Accessor<ViewStatus>
}> &
  ActionBindings<D>
export type RecordKey = string | number
export type DeleteDescription = Readonly<{
  id: string
  title: string
  confirmation: string
  triggerLabel?: string
  confirmLabel?: string
  cancelLabel?: string
}>
export type DeleteViewBindings<Key extends RecordKey> = Readonly<{
  recordKey: Accessor<Key>
  onConfirm: (key: Key) => void
  disabled?: Accessor<boolean>
  status?: Accessor<ViewStatus>
}>
