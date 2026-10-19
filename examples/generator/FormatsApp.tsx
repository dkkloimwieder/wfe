import { createMemo, createSignal, Show, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import { FormView, LayoutView, TableView } from '@wfe/generator'
import type {
  FormDescription,
  LayoutDescription,
  TableDescription,
} from '@wfe/generator'

const initial = {
  note: 'Raw note',
  code: '0123456789abcdef',
  active: true,
  day: '2024-02-29',
  instant: '2024-02-29T14:15:00Z',
}
export function createFormatsApplication() {
  const [values, setValues] = createSignal({ ...initial })
  const [revised, setRevised] = createSignal(false)
  const [visible, setVisible] = createSignal(true)
  const [controlsCollapsed, setControlsCollapsed] = createSignal(true)
  const [saved, setSaved] = createSignal<Readonly<typeof initial>>()
  let requests = 0,
    submissions = 0
  const form = createForm({
    values,
    defaults: () => initial,
    onValuesChange(next) {
      requests++
      setValues({ ...next })
    },
    validate: () => ({}),
    onSubmit(snapshot) {
      submissions++
      setSaved({ ...snapshot })
      return { ok: true }
    },
  })
  const rows = createMemo(() => [
    { id: 'first', ...values() },
    {
      id: 'second',
      note: 'Other note',
      code: 'abcdef0123456789',
      active: false,
      day: '2024-03-10',
      instant: '2024-03-10T07:30:00Z',
    },
  ])
  const table = createTable({
    source: {
      ids: () => rows().map((row) => row.id),
      get: (id) => rows().find((row) => row.id === id),
    },
    columns: [
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Code',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
        filterFn: (value, query) => value === query,
      },
      { id: 'active', accessorKey: 'active', header: 'Active' },
      { id: 'day', accessorKey: 'day', header: 'Day' },
      { id: 'instant', accessorKey: 'instant', header: 'Instant' },
    ],
  })
  const dateOptions = () => ({
    dateFormat: revised() ? 'MM/dd/yyyy' : 'dd/MM/yyyy',
    locale: 'en-GB',
  })
  const timeOptions = () => ({
    ...dateOptions(),
    timeZone: revised() ? 'America/New_York' : 'UTC',
  })
  const formDescription = () =>
    ({
      id: 'format-form',
      fields: [
        { field: 'note', control: 'text', format: 'short-hash' },
        {
          field: 'code',
          control: 'text',
          label: revised() ? 'Identifier' : undefined,
          format: 'short-hash',
          help: 'Full value available in the title',
        },
        { field: 'active', control: 'checkbox', format: 'boolean-symbol' },
        {
          field: 'day',
          control: 'text',
          format: 'date',
          formatOptions: dateOptions(),
        },
        {
          field: 'instant',
          control: 'text',
          format: 'datetime',
          formatOptions: timeOptions(),
        },
      ],
      submit: { id: 'save' },
      actions: [{ id: 'reset' }],
    }) as const satisfies FormDescription<typeof initial>
  const tableDescription = () =>
    ({
      id: 'format-table',
      title: 'Records',
      controls: { filtering: false, search: false, grouping: false },
      columns: {
        code: { format: 'short-hash' },
        active: { format: 'boolean-symbol' },
        day: { format: 'date', formatOptions: dateOptions() },
        instant: { format: 'datetime', formatOptions: timeOptions() },
      },
    }) as const satisfies TableDescription
  return {
    kind: 'formats' as const,
    form,
    table,
    visible,
    saved,
    formDescription,
    tableDescription,
    controlsCollapsed,
    setControlsCollapsed,
    aliases: () => ({ code: revised() ? 'Identifier' : 'Code' }),
    revise: () => setRevised((old) => !old),
    remove() {
      form.cancel()
      setVisible(false)
    },
    snapshot: () =>
      untrack(() => ({
        values: values(),
        rawRows: rows(),
        rowIds: table.getRowIds(),
        requests,
        submissions,
        saved: saved(),
        phase: form.phase,
      })),
  }
}
export function FormatsApp(props: {
  ready?: (app: ReturnType<typeof createFormatsApplication>) => void
}) {
  const app = createFormatsApplication()
  props.ready?.(app)
  const Editor = () => (
    <FormView
      description={app.formDescription()}
      bindings={{
        form: app.form,
        readOnly: (field) => field !== 'note',
        actions: { reset: { run: app.form.reset } },
      }}
    />
  )
  const Records = () => (
    <TableView
      description={app.tableDescription()}
      bindings={{
        table: app.table,
        headerAliases: app.aliases,
        controlsCollapsed: app.controlsCollapsed(),
        onControlsCollapsedChange: app.setControlsCollapsed,
      }}
    />
  )
  const Result = () => (
    <p data-format-result data-ui-text="system">
      {app.saved() ? 'Saved' : 'Ready'}
    </p>
  )
  return (
    <Show when={app.visible()}>
      <div class="generated-formats">
        <LayoutView
          description={
            {
              id: 'format-layout',
              title: 'Generated formats',
              footer: [{ id: 'result', view: 'result' }],
              navigation: [{ id: 'editor', title: 'Record', view: 'editor' }],
              panels: [{ id: 'records', view: 'records', fill: true }],
            } as const satisfies LayoutDescription<
              'editor' | 'records' | 'result'
            >
          }
          bindings={{
            views: { editor: Editor, records: Records, result: Result },
          }}
        />
      </div>
    </Show>
  )
}
