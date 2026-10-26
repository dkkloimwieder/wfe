// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  ActionBinding,
  ActionDescription,
  ChartAxisDescription,
  ChartDescription,
  ChartViewBindings,
  ColumnPresentation,
  CustomCellProps,
  CustomFieldProps,
  DeleteDescription,
  DeleteView,
  DeleteViewBindings,
  DetailDescription,
  DetailFieldDescription,
  DetailView,
  DetailViewBindings,
  FormChoice,
  FormDescription,
  FormFieldDescription,
  FormGroupDescription,
  FormLayoutDescription,
  FormView,
  FormViewBindings,
  GeneratorControlMessageProps,
  GeneratorControlMessages,
  GeneratorMessageProps,
  generatorMessages,
  GeneratorMessages,
  GridBindings,
  GridCellChange,
  GridColumnDescription,
  GridColumnId,
  GridDescription,
  GridRowDescription,
  GridRowId,
  GridView,
  GridViewProps,
  LayoutDescription,
  LayoutView,
  LayoutViewBindings,
  NumberControlDescription,
  PanelDescription,
  RecordKey,
  RepeatedFieldBinding,
  RepeatedFieldDescription,
  ScalarFieldDescription,
  TableDescription,
  TableView,
  TableViewBindings,
  ViewStatus,
} from '@wfe/generator'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    ActionBinding: ActionBinding
    ActionDescription: ActionDescription
    ChartAxisDescription: ChartAxisDescription<{ id: string; value: string }>
    ChartDescription: ChartDescription
    ChartViewBindings: ChartViewBindings<{ id: string; value: string }>
    ColumnPresentation: ColumnPresentation
    CustomCellProps: CustomCellProps<unknown, unknown>
    CustomFieldProps: CustomFieldProps<{ id: string; value: string }, 'value'>
    DeleteDescription: DeleteDescription
    DeleteView: typeof DeleteView
    DeleteViewBindings: DeleteViewBindings<string>
    DetailDescription: DetailDescription<{ id: string; value: string }>
    DetailFieldDescription: DetailFieldDescription<{
      id: string
      value: string
    }>
    DetailView: typeof DetailView
    DetailViewBindings: DetailViewBindings<
      { id: string; value: string },
      import('@wfe/generator').DetailDescription<{ id: string; value: string }>
    >
    FormChoice: FormChoice<unknown>
    FormDescription: FormDescription<{ id: string; value: string }>
    FormFieldDescription: FormFieldDescription<{ id: string; value: string }>
    FormGroupDescription: FormGroupDescription
    FormLayoutDescription: FormLayoutDescription
    FormView: typeof FormView
    FormViewBindings: FormViewBindings<
      { id: string; value: string },
      import('@wfe/generator').FormDescription<{ id: string; value: string }>
    >
    GeneratorControlMessageProps: GeneratorControlMessageProps
    GeneratorControlMessages: GeneratorControlMessages
    GeneratorMessageProps: GeneratorMessageProps
    generatorMessages: typeof generatorMessages
    GeneratorMessages: GeneratorMessages
    GridBindings: GridBindings
    GridCellChange: GridCellChange
    GridColumnDescription: GridColumnDescription
    GridColumnId: GridColumnId<import('@wfe/generator').GridDescription>
    GridDescription: GridDescription
    GridRowDescription: GridRowDescription
    GridRowId: GridRowId<import('@wfe/generator').GridDescription>
    GridView: typeof GridView
    GridViewProps: GridViewProps
    LayoutDescription: LayoutDescription
    LayoutView: typeof LayoutView
    LayoutViewBindings: LayoutViewBindings<
      import('@wfe/generator').LayoutDescription
    >
    NumberControlDescription: NumberControlDescription
    PanelDescription: PanelDescription
    RecordKey: RecordKey
    RepeatedFieldBinding: RepeatedFieldBinding<
      { id: string; value: string },
      unknown
    >
    RepeatedFieldDescription: RepeatedFieldDescription<{
      id: string
      value: string
    }>
    ScalarFieldDescription: ScalarFieldDescription<{
      id: string
      value: string
    }>
    TableDescription: TableDescription
    TableView: typeof TableView
    TableViewBindings: TableViewBindings<
      { id: string; value: string },
      unknown,
      import('@wfe/generator').TableDescription
    >
    ViewStatus: ViewStatus
  }>
>
