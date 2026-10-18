import { createSignal, onCleanup } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import type { FormDescription, TableDescription } from '@wfe/generator'
import type { RecordValues } from './records-provider'
import type { RecordRoute } from './record-route'

export const workflowRecords: Readonly<Record<string, Readonly<RecordValues>>> =
  {
    'record-0': {
      name: 'Sample record',
      quantity: 2,
      active: true,
      alerts: false,
      category: 'a',
      notes: 'A note',
    },
    'record-1': {
      name: 'Second record',
      quantity: 5,
      active: false,
      alerts: true,
      category: 'b',
      notes: 'Another note',
    },
  }
export function createRecordsWorkflow(initialRoute: RecordRoute) {
  const [rows, setRows] = createSignal<Record<string, Readonly<RecordValues>>>({
    ...workflowRecords,
  })
  const [route, setRoute] = createSignal(initialRoute)
  const selected = () => {
    const current = route()
    return (current.screen === 'view' || current.screen === 'edit') &&
      Object.hasOwn(rows(), current.id)
      ? rows()[current.id]
      : undefined
  }
  const empty: RecordValues = {
    name: '',
    active: false,
    alerts: false,
    category: 'a',
    notes: '',
  }
  function defaultsFor(
    next: RecordRoute,
    available: Readonly<Record<string, Readonly<RecordValues>>>,
  ) {
    return (next.screen === 'view' || next.screen === 'edit') &&
      Object.hasOwn(available, next.id)
      ? available[next.id]!
      : empty
  }
  let defaultsRoute = initialRoute
  const [values, setValues] = createSignal<Readonly<RecordValues>>({
    ...defaultsFor(initialRoute, workflowRecords),
  })
  const [controlsCollapsed, setControlsCollapsed] = createSignal(true)
  let alive = true
  const form = createForm<RecordValues>({
    values,
    defaults: () => defaultsFor(defaultsRoute, rows()),
    onValuesChange: setValues,
    validate: (value) => ({
      fields: {
        ...(!value.name.trim() ? { name: 'Name is required' } : {}),
        ...(value.quantity !== undefined &&
        (!Number.isFinite(value.quantity) || value.quantity < 0)
          ? { quantity: 'Use a nonnegative quantity' }
          : {}),
      },
    }),
    onSubmit: async (snapshot, context) => {
      const current = route()
      if (current.screen !== 'edit' || !Object.hasOwn(rows(), current.id))
        return { ok: false, errors: { form: 'Open a record to edit it.' } }
      const id = current.id
      await Promise.resolve()
      if (alive && !context.signal.aborted && route() === current)
        setRows((old) => ({ ...old, [id]: { ...snapshot } }))
      return { ok: true }
    },
  })
  onCleanup(() => {
    alive = false
  })
  const table = createTable<RecordValues, never>({
    source: { ids: () => Object.keys(rows()), get: (id) => rows()[id] },
    columns: [
      {
        id: 'name',
        accessorKey: 'name',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        sortFn: (a, b) => Number(a ?? 0) - Number(b ?? 0),
      },
      { id: 'active', accessorKey: 'active' },
      { id: 'actions', accessorFn: () => '' },
    ],
  })
  const description = {
    id: 'record-editor',
    fields: [
      {
        field: 'name',
        label: 'Name',
        control: 'text',
        required: true,
        span: 'full',
      },
      { field: 'category', label: 'Category', control: 'select' },
      {
        field: 'quantity',
        label: 'Quantity',
        control: 'number',
        empty: 'undefined',
        min: 0,
      },
      { field: 'active', label: 'Active', control: 'checkbox' },
      { field: 'alerts', label: 'Alerts', control: 'switch' },
      { field: 'notes', label: 'Notes', control: 'textarea', span: 'full' },
    ],
    layout: {
      columns: 2,
      groups: [
        {
          id: 'identity',
          title: 'Record details',
          columns: 2,
          fields: ['name', 'category', 'quantity'],
        },
        {
          id: 'preferences',
          title: 'Preferences',
          columns: 2,
          fields: ['active', 'alerts', 'notes'],
        },
      ],
    },
    submit: { id: 'save', label: 'Save' },
    actions: [{ id: 'reset', label: 'Reset' }],
  } as const satisfies FormDescription<RecordValues>
  const tableDescription = {
    id: 'records',
    title: 'Records',
    columns: {
      name: { label: 'Name' },
      quantity: { label: 'Quantity' },
      active: { label: 'Active', renderer: 'active' },
      actions: { label: 'Actions', renderer: 'actions' },
    },
    controls: { filtering: false, search: false, grouping: false },
  } as const satisfies TableDescription
  return {
    kind: 'records-workflow' as const,
    rows,
    route,
    selected,
    values,
    form,
    table,
    description,
    tableDescription,
    controlsCollapsed,
    setControlsCollapsed,
    enter(next: RecordRoute) {
      if (!alive) return
      form.cancel()
      defaultsRoute = next
      setRoute(next)
      form.reset()
    },
    snapshot: () => ({
      route: route(),
      rows: rows(),
      values: values(),
      table: table.state,
      pending: form.pending,
    }),
  }
}
