import { createSignal, untrack } from 'solid-js'
import { Button } from '@wfe/components'
import { createForm } from '@wfe/form'
import { createTable, TableHeaderFilter } from '@wfe/components/table'
import type { TableDateRange } from '@wfe/components/table'
import { FormView, DetailView, TableView } from '@wfe/generator'
import type { FormDescription, GeneratorControlMessages } from '@wfe/generator'

export function nestedMessages(french: boolean): GeneratorControlMessages {
  return {
    datePicker: {
      openCalendar: (label) => `${french ? 'Ouvrir' : 'Abrir'} ${label}`,
      nextMonth: french ? 'Mois suivant' : 'Mes siguiente',
      invalidDate: () => (french ? 'Date invalide' : 'Fecha inválida'),
      clearDate: () => 'Child clear label',
    },
    dateTimePicker: {
      openCalendar: (label) => `${french ? 'Ouvrir' : 'Abrir'} ${label}`,
      time: french ? 'Heure' : 'Hora',
      invalidDateTime: french ? 'Instant invalide' : 'Instante inválido',
    },
    numberInput: {
      minimumError: (min) => `${french ? 'Minimum' : 'Mínimo'}: ${min}`,
    },
    valueDisplay: {
      yes: french ? 'Oui' : 'Sí',
      no: french ? 'Non' : 'No',
      emptyValue: french ? 'Vide' : 'Vacío',
    },
  }
}

export function createNestedMessagesApplication() {
  const initial = {
    date: '2024-02-29',
    instant: '2024-02-29T14:15:00.000Z',
    amount: 2,
    active: true,
    blank: '',
    entries: [
      {
        key: 'first',
        date: '2024-02-29',
        instant: '2024-02-29T14:15:00.000Z',
        amount: 3,
      },
    ] as readonly {
      key: string
      date: string
      instant: string
      amount: number
    }[],
  }
  const [values, setValues] = createSignal(initial)
  const [french, setFrench] = createSignal(false)
  const [accept, setAccept] = createSignal(true)
  const [businessError, setBusinessError] = createSignal(false)
  const [requests, setRequests] = createSignal(0)
  const form = createForm<typeof initial>({
    values,
    defaults: () => initial,
    onValuesChange: (next) => {
      setRequests((count) => count + 1)
      if (accept()) setValues(next)
    },
    validate: () =>
      businessError()
        ? { fields: { date: 'Application validation detail' } }
        : {},
    onSubmit: () => ({ ok: true }),
  })
  const table = createTable({
    source: {
      ids: () => ['one'],
      get: () => ({
        active: values().active,
        blank: values().blank,
        date: values().date,
      }),
    },
    columns: [
      { id: 'active', accessorKey: 'active' },
      { id: 'blank', accessorKey: 'blank' },
      {
        id: 'date',
        accessorKey: 'date',
        filterFn: (value, filter) => {
          const range = filter as TableDateRange | undefined
          const date = String(value ?? '')
          return (
            (!range?.start || date >= range.start) &&
            (!range?.end || date <= range.end)
          )
        },
      },
    ],
  })
  const description = {
    id: 'nested-messages-form',
    fields: [
      {
        field: 'date',
        label: 'Nested date',
        control: 'date',
        dateFormat: 'dd/MM/yyyy',
      },
      {
        field: 'instant',
        label: 'Nested instant',
        control: 'datetime',
        dateFormat: 'dd/MM/yyyy',
        timeZone: 'UTC',
      },
      { field: 'amount', label: 'Nested amount', control: 'number', min: 0 },
      {
        field: 'active',
        label: 'Nested active',
        control: 'checkbox',
        format: 'boolean-text',
      },
      {
        field: 'blank',
        label: 'Nested blank',
        control: 'text',
        format: 'short-hash',
      },
      {
        field: 'entries',
        label: 'Nested entries',
        control: 'repeat',
        fields: [
          {
            field: 'date',
            label: 'Repeated date',
            control: 'date',
            dateFormat: 'dd/MM/yyyy',
          },
          {
            field: 'instant',
            label: 'Repeated instant',
            control: 'datetime',
            dateFormat: 'dd/MM/yyyy',
            timeZone: 'UTC',
          },
          {
            field: 'amount',
            label: 'Repeated amount',
            control: 'number',
            min: 0,
          },
        ],
      },
    ],
  } as const satisfies FormDescription<typeof initial>
  return {
    form,
    table,
    description,
    values,
    setFrench,
    setAccept,
    setBusinessError,
    requests,
    messages: () => nestedMessages(french()),
    initial,
  }
}

export function NestedMessagesReview(props: {
  ready?: (api: ReturnType<typeof createNestedMessagesApplication>) => void
}) {
  const app = createNestedMessagesApplication()
  untrack(() => props.ready?.(app))
  return (
    <section id="nested-messages-review">
      <Button onClick={() => app.setFrench(true)}>
        Translate nested controls
      </Button>
      <FormView
        description={app.description}
        controlMessages={app.messages()}
        bindings={{
          form: app.form,
          readOnly: (key) => key === 'active' || key === 'blank',
          repeated: {
            entries: {
              rowKey: (row) => row.key,
              createRow: () => ({ ...app.initial.entries[0]!, key: 'new' }),
            },
          },
        }}
      />
      <DetailView
        description={
          {
            id: 'nested-messages-detail',
            fields: [
              {
                field: 'active',
                label: 'Detail active',
                format: 'boolean-text',
              },
              { field: 'blank', label: 'Detail blank', format: 'short-hash' },
            ],
          } as const
        }
        controlMessages={app.messages()}
        bindings={{ record: app.values }}
      />
      <div data-nested-table>
        <TableView
          description={
            {
              id: 'nested-messages-table',
              columns: {
                active: { format: 'boolean-text', filterable: false },
                blank: { format: 'short-hash', filterable: false },
                date: { label: 'Record date' },
              },
              controls: { search: false, grouping: false, sorting: false },
            } as const
          }
          controlMessages={app.messages()}
          bindings={{
            table: app.table,
            controlsCollapsed: false,
            filter: (column) =>
              column.id === 'date' ? { kind: 'date-range' } : undefined,
          }}
        />
      </div>
      <TableHeaderFilter
        columnId="nested-header-date"
        columnLabel="Header date"
        label="Header date"
        config={{ kind: 'date-range' }}
        value={undefined}
        onValueChange={() => {}}
        datePickerMessages={app.messages().datePicker}
      />
      <output aria-label="Nested accepted values">
        {JSON.stringify(app.values())}
      </output>
      <output aria-label="Nested request count">{app.requests()}</output>
    </section>
  )
}
