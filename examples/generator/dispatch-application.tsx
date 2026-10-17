import { createSignal, onCleanup } from 'solid-js'
import { Input } from '@wfe/components'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import type {
  FormDescription,
  LayoutDescription,
  TableDescription,
} from '@wfe/generator'
import { createDispatchProvider, initialDispatch } from './dispatch-provider'
import type { DispatchValues, DispatchRow } from './dispatch-provider'

export function createDispatchApplication() {
  const provider = createDispatchProvider()
  const [values, setValues] = createSignal<DispatchValues>(initialDispatch)
  const [rejectEdits, setRejectEdits] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  const [controlsCollapsed, setControlsCollapsed] = createSignal(true)
  const [removed, setRemoved] = createSignal(false)
  const [calls, setCalls] = createSignal<string[]>([])
  const [callback, setCallback] = createSignal(
    () => () => setCalls((old) => [...old, 'first']),
  )
  const [aliases, setAliases] = createSignal<{ 'route-label'?: string }>({})
  const lifecycle = { customMounts: 0, customDisposals: 0, cleanups: 0 }
  onCleanup(() => {
    lifecycle.cleanups++
  })
  const form = createForm<DispatchValues>({
    values,
    defaults: () => initialDispatch,
    onValuesChange: (requested) => {
      if (!rejectEdits()) setValues({ ...requested })
    },
    validate: provider.validate,
    onSubmit: provider.save,
  })
  const table = createTable<DispatchRow, { unit: string }>({
    source: {
      ids: () => Object.keys(provider.rows()),
      get: (id) => provider.rows()[id]!,
    },
    columns: [
      {
        id: 'route-label',
        accessorFn: (row) => `${row.tracking} / ${row.carrier}`,
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      {
        id: 'status',
        accessorKey: 'status',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
        filterFn: (value, filter) =>
          Array.isArray(filter) ? filter.includes(value) : value === filter,
      },
      {
        id: 'fee',
        accessorKey: 'feeCents',
        meta: { unit: 'USD cents' },
        sortFn: (a, b) => Number(a) - Number(b),
      },
      { id: 'scheduled', accessorKey: 'scheduledAt' },
    ],
  })
  const MoneyField = (props: {
    id: string
    value: number | null
    onValueChange: (value: number | null) => void
    disabled: boolean
    readOnly: boolean
  }) => {
    lifecycle.customMounts++
    onCleanup(() => {
      lifecycle.customDisposals++
    })
    return (
      <Input
        id={props.id}
        value={props.value ?? ''}
        disabled={props.disabled}
        readonly={props.readOnly}
        onValueChange={(value) => {
          if (value === '') props.onValueChange(null)
          else if (Number.isFinite(Number(value)))
            props.onValueChange(Number(value))
        }}
      />
    )
  }
  const MoneyCell = (props: { value: unknown }) => (
    <>
      {typeof props.value === 'number'
        ? `$${(props.value / 100).toFixed(2)}`
        : ''}
    </>
  )
  const formDescription = () => {
    const fields = [
      {
        field: 'trackingCode',
        label: revision() ? 'Package code' : 'Tracking code',
        control: 'text',
        required: true,
        help: 'Use a PKG code',
      },
      { field: 'carrier', label: 'Carrier', control: 'select' },
      { field: 'insured', label: 'Insured', control: 'switch' },
      {
        field: 'declaredValue',
        label: 'Declared value',
        control: 'custom',
        help: 'Blank means no declared value',
      },
      {
        field: 'dispatchDate',
        label: 'Dispatch date',
        control: 'text',
        help: 'YYYY-MM-DD',
      },
    ] as const
    return {
      id: 'dispatch-editor',
      title: 'Dispatch editor',
      fields: revision() ? [...fields].reverse() : fields,
      submit: { id: 'dispatch', label: 'Dispatch' },
      actions: [
        { id: 'reset', label: 'Reset dispatch' },
        { id: 'cancel', label: 'Cancel request' },
        { id: 'inspect', label: 'Inspect package' },
      ],
    } as const satisfies FormDescription<DispatchValues>
  }
  const tableDescription = () =>
    ({
      id: 'dispatch-records',
      title: 'Dispatch queue',
      columns: {
        'route-label': { label: revision() ? 'Package route' : 'Route' },
        status: { label: 'Status' },
        fee: { label: 'Fee', renderer: 'money' },
        scheduled: { label: 'Scheduled date' },
      },
      controls: { search: false, filtering: false, grouping: false },
    }) as const satisfies TableDescription
  const layoutDescription = () =>
    ({
      id: 'dispatch-workspace',
      title: revision() ? 'Updated dispatch' : 'Dispatch workspace',
      columns: 1,
      scroll: 'content',
      navigationLabel: 'Dispatch editor navigation',
      navigation: removed()
        ? []
        : [{ id: 'dispatch-editor-panel', view: 'editor' }],
      panels: [{ id: 'dispatch-records-panel', view: 'records', fill: true }],
      actions: [
        { id: 'revise', label: 'Revise dispatch' },
        { id: 'remove', label: 'Remove dispatch editor' },
      ],
    }) as const satisfies LayoutDescription<'editor' | 'records'>
  return {
    kind: 'dispatch' as const,
    provider,
    form,
    table,
    values,
    callback,
    aliases,
    controlsCollapsed,
    setControlsCollapsed,
    calls,
    lifecycle,
    MoneyField,
    MoneyCell,
    formDescription,
    tableDescription,
    layoutDescription,
    setRejectEdits,
    replace(value: DispatchValues) {
      setValues({ ...value })
    },
    revise() {
      setRevision((old) => old + 1)
      setAliases({ 'route-label': 'Shipment route' })
      setCallback(() => () => setCalls((old) => [...old, 'updated']))
      table.setColumnOrder(['fee', 'route-label', 'scheduled', 'status'])
    },
    remove() {
      form.cancel()
      setRemoved(true)
    },
    snapshot: () => ({
      kind: 'dispatch',
      values: values(),
      phase: form.phase,
      pending: form.pending,
      errors: form.errors,
      calls: calls(),
      lifecycle: { ...lifecycle },
      provider: provider.snapshot(),
    }),
  }
}
