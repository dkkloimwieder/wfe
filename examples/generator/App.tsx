import { createSignal, onCleanup } from 'solid-js'
import { Input } from '@wfe/components'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import { FormView, TableView, LayoutView } from '@wfe/generator'
import type {
  FormDescription,
  LayoutDescription,
  TableDescription,
} from '@wfe/generator'

type Values = {
  name: string
  active: boolean
  alerts: boolean
  category: 'a' | 'b'
  notes: string
  quantity?: number
}
const initial: Values = {
  name: 'Sample record',
  active: true,
  alerts: false,
  category: 'a',
  notes: 'A note',
}

export function App(props: {
  ready?: (api: ReturnType<typeof createApplication>) => void
}) {
  const app = createApplication()
  props.ready?.(app)
  const Editor = () => (
    <FormView
      description={app.formDescription()}
      bindings={{
        form: app.form,
        choices: {
          category: () =>
            [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ] as const,
        },
        fields: { quantity: app.Quantity },
        actions: {
          reset: { run: () => app.form.reset() },
          extra: { run: app.action() },
        },
      }}
    />
  )
  const Records = () => (
    <TableView
      description={app.tableDescription()}
      bindings={{
        table: app.table,
        cells: { quantity: app.Amount },
        headerAliases: app.aliases,
      }}
    />
  )
  return (
    <LayoutView
      description={app.layoutDescription()}
      bindings={{
        views: { editor: Editor, records: Records },
        actions: { revise: { run: app.revise }, remove: { run: app.remove } },
      }}
    />
  )
}

function createApplication() {
  const [values, setValues] = createSignal<Values>(initial)
  const [row, setRow] = createSignal({ name: 'Sample record', quantity: 2 })
  const [count, setCount] = createSignal(1)
  const [fill, setFill] = createSignal(true)
  const [columns, setColumns] = createSignal<1 | 2>(2)
  const [revision, setRevision] = createSignal(0)
  const [removed, setRemoved] = createSignal(false)
  const [aliases, setAliases] = createSignal<{ quantity?: string }>({})
  const [calls, setCalls] = createSignal<number[]>([])
  const [action, setAction] = createSignal(
    () => () => setCalls((old) => [...old, 1]),
  )
  const [submitted, setSubmitted] = createSignal(0)
  const lifecycle = {
    quantityMounts: 0,
    quantityDisposals: 0,
    cellMounts: 0,
    cellDisposals: 0,
  }
  const form = createForm<Values>({
    values,
    defaults: () => initial,
    onValuesChange: setValues,
    validate: (snapshot) =>
      snapshot.name
        ? {}
        : {
            fields: {
              name: 'Name is required',
              active: 'Review active flag',
              alerts: 'Review alerts flag',
            },
          },
    onSubmit: async () => {
      await Promise.resolve()
      setSubmitted((old) => old + 1)
      return { ok: true }
    },
  })
  const table = createTable<{ name: string; quantity: number }, never>({
    source: {
      ids: () =>
        Array.from({ length: count() }, (_, index) => `record-${index}`),
      get: row,
    },
    columns: [
      { id: 'name', accessorKey: 'name' },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        sortFn: (a, b) => Number(a) - Number(b),
      },
    ],
  })
  const Quantity = (props: {
    id: string
    value: number | undefined
    onValueChange: (value: number | undefined) => void
    disabled: boolean
    readOnly: boolean
  }) => {
    lifecycle.quantityMounts++
    onCleanup(() => {
      lifecycle.quantityDisposals++
    })
    return (
      <Input
        id={props.id}
        value={props.value ?? ''}
        disabled={props.disabled}
        readonly={props.readOnly}
        onValueChange={(value) =>
          props.onValueChange(value === '' ? undefined : Number(value))
        }
      />
    )
  }
  const Amount = (props: { value: unknown }) => {
    lifecycle.cellMounts++
    onCleanup(() => {
      lifecycle.cellDisposals++
    })
    const [draft, setDraft] = createSignal('Cell draft')
    return (
      <>
        <span data-generator-amount="">{String(props.value)}</span>
        <Input
          aria-label="Cell note"
          value={draft()}
          onValueChange={setDraft}
        />
      </>
    )
  }
  const formDescription = () => {
    const fields = [
      {
        field: 'name',
        label: revision() ? 'Record name' : 'Name',
        control: 'text',
        help: 'An application-owned value',
      },
      {
        field: 'active',
        label: 'Active',
        control: 'checkbox',
        help: 'Controls record availability',
      },
      {
        field: 'alerts',
        label: 'Alerts',
        control: 'switch',
        help: 'Controls notifications',
      },
      { field: 'category', label: 'Category', control: 'select' },
      { field: 'notes', label: 'Notes', control: 'textarea' },
      { field: 'quantity', label: 'Quantity', control: 'custom' },
    ] as const
    return {
      id: 'editor',
      title: 'Editor',
      fields: revision() ? [...fields].reverse() : fields,
      submit: { id: 'save', label: 'Save' },
      actions: [
        { id: 'reset', label: 'Reset' },
        { id: 'extra', label: 'Extra' },
      ],
    } as const satisfies FormDescription<Values>
  }
  const tableDescription = () =>
    ({
      id: 'records',
      title: 'Records',
      columns: {
        name: { label: 'Name' },
        quantity: {
          label: revision() ? 'Count' : 'Quantity',
          renderer: 'quantity',
        },
      },
      controls: { filtering: false, search: false, grouping: false },
    }) as const satisfies TableDescription
  const layoutDescription = () => {
    const panels = [
      { id: 'editor-panel', view: 'editor' },
      {
        id: 'records-panel',
        view: 'records',
        fill: fill(),
      },
    ] as const
    return {
      id: 'workspace',
      title: revision() ? 'Updated workspace' : 'Generated workspace',
      columns: columns(),
      panels: removed()
        ? [panels[1]]
        : revision()
          ? [...panels].reverse()
          : panels,
      actions: [
        { id: 'revise', label: 'Revise description' },
        { id: 'remove', label: 'Remove editor' },
      ],
    } as const satisfies LayoutDescription<'editor' | 'records'>
  }
  return {
    form,
    table,
    values,
    submitted,
    calls,
    lifecycle,
    Quantity,
    Amount,
    action,
    aliases,
    setCount,
    setColumns,
    setFill,
    formDescription,
    tableDescription,
    layoutDescription,
    revise() {
      setRevision((old) => old + 1)
      setColumns(1)
      setAliases({ quantity: 'Units' })
      setAction(() => () => setCalls((old) => [...old, 2]))
      setRow({ name: 'Updated row', quantity: 7 })
      table.setColumnOrder(['quantity', 'name'])
    },
    remove() {
      setRemoved(true)
    },
    snapshot: () => ({
      values: values(),
      submitted: submitted(),
      calls: calls(),
      lifecycle: { ...lifecycle },
      pending: form.pending,
    }),
  }
}
