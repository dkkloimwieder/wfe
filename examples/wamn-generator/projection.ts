import type {
  FormDescription,
  LayoutDescription,
  TableDescription,
} from '@wfe/generator'
export type Values = { code: 'priority' | 'standard'; note: string }
export type Metadata = {
  operation: string
  rowId: string
  columns: readonly {
    id: string
    label: string
    type: string
    revision: boolean
  }[]
  fields: readonly { id: string; label: string }[]
  choices: readonly { value: string; label: string }[]
  title: string
  formTitle: string
  refreshLabel: string
}
const types: Record<string, string> = {
  code: 'text',
  createdAt: 'timestamptz',
  editVersion: 'int64',
  id: 'uuid',
  makerId: 'uuid',
  note: 'text',
}
export function project(metadata: Metadata) {
  const fail = (reason: string): never => {
    throw new Error(`WAMN adapter: ${reason}`)
  }
  if (metadata.operation !== 'platform-fixture:widget/query@2.1.0')
    fail('unsupported query operation')
  if (metadata.rowId !== 'id') fail('unsupported primary key')
  if (
    metadata.columns.length !== Object.keys(types).length ||
    new Set(metadata.columns.map((column) => column.id)).size !==
      metadata.columns.length
  )
    fail('columns must contain each supported identity once')
  for (const column of metadata.columns) {
    if (!Object.hasOwn(types, column.id) || types[column.id] !== column.type)
      fail(`unsupported column ${column.id}:${column.type}`)
    if (column.revision !== (column.id === 'editVersion'))
      fail(`unsupported revision mapping ${column.id}`)
  }
  if (
    metadata.fields.length !== 2 ||
    new Set(metadata.fields.map((field) => field.id)).size !== 2 ||
    metadata.fields.some((field) => field.id !== 'code' && field.id !== 'note')
  )
    fail('only flat code and note fields are supported')
  if (
    metadata.choices.length !== 2 ||
    new Set(metadata.choices.map((choice) => choice.value)).size !== 2 ||
    metadata.choices.some(
      (choice) => choice.value !== 'priority' && choice.value !== 'standard',
    )
  )
    fail('unsupported code choices')
  const choices = metadata.choices.map((choice) => ({
    ...choice,
    value: choice.value as Values['code'],
  }))
  const form = {
    id: 'widget-editor',
    title: metadata.formTitle,
    fields: metadata.fields.map((field) =>
      field.id === 'code'
        ? ({ field: 'code', label: field.label, control: 'select' } as const)
        : ({ field: 'note', label: field.label, control: 'textarea' } as const),
    ),
    submit: {
      id: 'save',
      label: 'Save widget',
      variant: 'outline',
      tone: 'accent',
    },
    actions: [
      { id: 'reset', label: 'Reset draft', variant: 'outline', tone: 'accent' },
      { id: 'cancel', label: 'Cancel', variant: 'outline', tone: 'accent' },
    ],
  } as const satisfies FormDescription<Values>
  const table = {
    id: 'widget-records',
    title: metadata.title,
    columns: Object.fromEntries(
      metadata.columns.map((column) => [column.id, { label: column.label }]),
    ),
    controls: { search: false, filtering: false, grouping: false },
  } as const satisfies TableDescription
  const layout = {
    id: 'widget-workspace',
    title: metadata.title,
    columns: 1,
    scroll: 'content',
    panels: [{ id: 'widget-records-panel', view: 'records', fill: true }],
    actions: [
      {
        id: 'refresh',
        label: metadata.refreshLabel,
        variant: 'outline',
        tone: 'accent',
      },
      { id: 'open', label: 'Open widget', variant: 'outline', tone: 'accent' },
      { id: 'edit', label: 'Edit widget', variant: 'outline', tone: 'accent' },
    ],
  } as const satisfies LayoutDescription<'records'>
  const editorLayout = {
    id: 'widget-editor-screen',
    title: metadata.formTitle,
    columns: 1,
    scroll: 'main',
    panels: [{ id: 'widget-editor-panel', view: 'editor' }],
    actions: [
      {
        id: 'back',
        label: 'Back to records',
        variant: 'outline',
        tone: 'accent',
      },
      ...layout.actions.filter((action) => action.id !== 'edit'),
    ],
  } as const satisfies LayoutDescription<'editor'>
  return {
    form,
    table,
    layout,
    editorLayout,
    choices,
    columnOrder: metadata.columns.map((column) => column.id),
  }
}
