import { createSignal, onCleanup, Show } from 'solid-js'
import { Input, NumberInput } from '@wfe/components'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import type {
  CustomCellProps,
  FormDescription,
  LayoutDescription,
  TableDescription,
} from '@wfe/generator'
import { createRecordsProvider, initialRecord } from './records-provider'
import type { RecordValues } from './records-provider'
type Values = RecordValues
const initial = initialRecord

export function createRecordsApplication(reviewCells = false) {
  const [values, setValues] = createSignal<Values>(initial)
  const provider = createRecordsProvider()
  const [fill, setFill] = createSignal(true)
  const [columns, setColumns] = createSignal<1 | 2>(2)
  const [revision, setRevision] = createSignal(0)
  const [reversed, setReversed] = createSignal(false)
  const [formColumns, setFormColumns] = createSignal<1 | 2 | 3>(2)
  const [fieldColumns, setFieldColumns] = createSignal<2 | 3>(2)
  const [removed, setRemoved] = createSignal(false)
  const [aliases, setAliases] = createSignal<{ quantity?: string }>({})
  const [calls, setCalls] = createSignal<number[]>([])
  const [action, setAction] = createSignal(
    () => () => setCalls((old) => [...old, 1]),
  )
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
    validate: provider.validate,
    onSubmit: provider.save,
  })
  const table = createTable<{ name: string; quantity: number }, never>({
    source: { ids: provider.ids, get: provider.row },
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
      <NumberInput
        id={props.id}
        value={props.value}
        disabled={props.disabled}
        readonly={props.readOnly}
        onValueChange={props.onValueChange}
      />
    )
  }
  const Amount = (
    props: CustomCellProps<{ name: string; quantity: number }, never>,
  ) => {
    lifecycle.cellMounts++
    onCleanup(() => {
      lifecycle.cellDisposals++
    })
    const [draft, setDraft] = createSignal('Cell draft')
    return (
      <>
        <span
          data-generator-amount=""
          data-row-id={props.row.id}
          data-record-name={props.row.original?.name}
        >
          {String(props.value)}
        </span>
        <Show when={reviewCells}>
          <Input
            aria-label="Cell note"
            value={draft()}
            onValueChange={setDraft}
          />
        </Show>
      </>
    )
  }
  const formDescription = () => {
    const fields = [
      {
        field: 'name',
        label: revision() ? 'Record name' : 'Name',
        control: 'text',
        span: 'full',
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
      { field: 'notes', label: 'Notes', control: 'textarea', span: 2 },
      { field: 'quantity', label: 'Quantity', control: 'custom' },
    ] as const
    return {
      id: 'editor',
      title: 'Editor',
      fields: reversed() ? [...fields].reverse() : fields,
      layout: {
        columns: formColumns(),
        groups: (reversed()
          ? ['preferences', 'record']
          : ['record', 'preferences']
        ).map((id) => ({
          id,
          title: id === 'record' ? 'Record details' : 'Preferences',
          help: id === 'record' ? 'Identity and quantity' : undefined,
          columns: fieldColumns(),
          fields: (reversed() ? [...fields].reverse() : fields)
            .filter((field) =>
              id === 'record'
                ? ['name', 'category', 'quantity'].includes(field.field)
                : ['active', 'alerts', 'notes'].includes(field.field),
            )
            .map((field) => field.field),
        })),
      },
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
        : reversed()
          ? [...panels].reverse()
          : panels,
      actions: [
        { id: 'revise', label: 'Revise description' },
        { id: 'remove', label: 'Remove editor' },
      ],
    } as const satisfies LayoutDescription<'editor' | 'records'>
  }
  return {
    kind: 'records' as const,
    provider,
    form,
    table,
    values,
    submitted: provider.submitted,
    calls,
    lifecycle,
    Quantity,
    Amount,
    action,
    aliases,
    setCount: provider.setCount,
    setColumns,
    setFill,
    setReversed,
    setFormColumns,
    setFieldColumns,
    formDescription,
    tableDescription,
    layoutDescription,
    revise() {
      setRevision((old) => old + 1)
      setReversed(true)
      setColumns(1)
      setAliases({ quantity: 'Units' })
      setAction(() => () => setCalls((old) => [...old, 2]))
      provider.setRow({ name: 'Updated row', quantity: 7 })
      table.setColumnOrder(['quantity', 'name'])
    },
    remove() {
      setRemoved(true)
    },
    snapshot: () => ({
      values: values(),
      submitted: provider.submitted(),
      calls: calls(),
      lifecycle: { ...lifecycle },
      pending: form.pending,
    }),
  }
}
