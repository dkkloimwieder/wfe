import { NestedMessagesReview } from './NestedMessagesReview'
import { createMemo, createSignal, untrack } from 'solid-js'
import {
  Button,
  Field,
  Label,
  SelectField,
  ValueDisplay,
} from '@wfe/components'
import { FormView, LayoutView } from '@wfe/generator'
import {
  createTable,
  Table,
  TableFormatting,
  nativeAggregations,
} from '@wfe/components/table'
import type { ValueFormat } from '@wfe/components'
import { createForm } from '@wfe/form'
import type { DateTimePickerProps } from '@wfe/components'
import type { FormDescription, LayoutDescription } from '@wfe/generator'
export type DateDemoConfiguration = Pick<
  DateTimePickerProps,
  'dateFormat' | 'timeFormat' | 'locale' | 'timeZone' | 'disabled' | 'readonly'
> & { removeDate?: boolean; reject?: boolean; businessError?: boolean }
const initial = {
  reviewDate: '2024-02-29',
  systemTime: '2024-02-29T14:15:16.123Z',
  browserTime: '2024-02-29T14:15:16.123Z',
}
export function createDateApplication() {
  const [values, setValues] = createSignal({ ...initial })
  const [configuration, configure] = createSignal<DateDemoConfiguration>({
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    locale: 'en-GB',
    timeZone: 'UTC',
  })
  const [formats, setFormats] = createSignal<Record<string, ValueFormat>>({
    reviewDate: 'date',
    instant: 'datetime',
  })
  const rows = createMemo(() => [
    {
      id: 'appointment',
      reviewDate: values().reviewDate,
      instant: values().systemTime,
    },
    {
      id: 'other',
      reviewDate: '2024-03-10',
      instant: '2024-03-10T07:30:00.000Z',
    },
  ])
  const table = createTable({
    source: {
      ids: () => rows().map((row) => row.id),
      get: (id) => rows().find((row) => row.id === id),
    },
    columns: [
      {
        id: 'reviewDate',
        accessorKey: 'reviewDate',
        header: 'Date',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      {
        id: 'instant',
        accessorKey: 'instant',
        header: 'Timestamp',
        sortFn: (a, b) => Date.parse(String(a)) - Date.parse(String(b)),
        filterFn: (value, minimum) =>
          Date.parse(String(value)) >= Date.parse(String(minimum)),
        aggregationFn: nativeAggregations.first,
      },
    ],
  })
  const exportRows = () =>
    table.getRowIds().map((id) => ({ ...table.getRow(id).original }))
  let validations = 0,
    submissions = 0,
    requests = 0
  const form = createForm<typeof initial>({
    values,
    defaults: () => initial,
    onValuesChange(next) {
      requests++
      if (!configuration().reject) setValues({ ...next })
    },
    validate() {
      validations++
      return configuration().businessError
        ? { fields: { reviewDate: 'Application rejected this date' } }
        : {}
    },
    onSubmit() {
      submissions++
      return { ok: true }
    },
  })
  const description = () =>
    ({
      id: 'date-form',
      title: 'Dates and timezones',
      fields: [
        ...(configuration().removeDate
          ? []
          : ([
              {
                field: 'reviewDate',
                label: 'Review date',
                control: 'date',
                help: 'A calendar date without a timezone',
                dateFormat: configuration().dateFormat,
                locale: configuration().locale,
              },
            ] as const)),
        {
          field: 'systemTime',
          label: 'System appointment',
          control: 'datetime',
          help: 'Application timezone',
          dateFormat: configuration().dateFormat,
          timeFormat: configuration().timeFormat,
          locale: configuration().locale,
          timeZone: configuration().timeZone,
        },
        {
          field: 'browserTime',
          label: 'Local appointment',
          control: 'datetime',
          help: 'Browser timezone',
          dateFormat: configuration().dateFormat,
          timeFormat: configuration().timeFormat,
          locale: configuration().locale,
          timeZone: 'browser',
        },
      ],
      submit: { id: 'submit', label: 'Apply', variant: 'outline' },
      actions: [{ id: 'reset', label: 'Reset', variant: 'outline' }],
    }) as const satisfies FormDescription<typeof initial>
  const change = (next: Partial<DateDemoConfiguration>) =>
    configure((old) => ({ ...old, ...next }))
  return {
    kind: 'dates' as const,
    table,
    formats,
    setFormat: (id: string, format: ValueFormat) =>
      setFormats((old) => ({ ...old, [id]: format })),
    exportRows,
    form,
    description,
    configuration,
    configure: change,
    revise() {
      change({
        dateFormat:
          configuration().dateFormat === 'dd/MM/yyyy'
            ? 'MM/dd/yyyy'
            : 'dd/MM/yyyy',
      })
    },
    remove() {
      change({ removeDate: true })
    },
    replace: (next: typeof initial) => setValues({ ...next }),
    snapshot: () =>
      untrack(() => ({
        values: values(),
        formats: formats(),
        rawRows: rows(),
        exportRows: exportRows(),
        rowIds: table.getRowIds(),
        configuration: configuration(),
        validations,
        submissions,
        requests,
        phase: form.phase,
      })),
  }
}
function NestedMessagesPanel() {
  return <NestedMessagesReview />
}

export function DateApp(props: {
  ready?: (app: ReturnType<typeof createDateApplication>) => void
}) {
  const app = createDateApplication()
  props.ready?.(app)
  const Editor = () => (
    <FormView
      description={app.description()}
      bindings={{
        form: app.form,
        disabled: () => Boolean(app.configuration().disabled),
        readOnly: () => Boolean(app.configuration().readonly),
        actions: { reset: { run: app.form.reset } },
      }}
    />
  )
  const display = (value: unknown, column: { id: string }) => (
    <ValueDisplay
      value={value}
      format={app.formats()[column.id] ?? 'date'}
      dateFormat={app.configuration().dateFormat}
      timeFormat={app.configuration().timeFormat}
      locale={app.configuration().locale}
      timeZone={app.configuration().timeZone}
    />
  )
  const Records = () => (
    <div class="date-display-review">
      <dl>
        <dt data-ui-text="system">Date detail</dt>
        <dd data-date-display="detail-date">
          {display(app.form.values.reviewDate, { id: 'reviewDate' })}
        </dd>
        <dt data-ui-text="system">Timestamp detail</dt>
        <dd data-date-display="detail-time">
          {display(app.form.values.systemTime, { id: 'instant' })}
        </dd>
        <dt data-ui-text="system">Browser timestamp</dt>
        <dd data-date-display="browser-time">
          <ValueDisplay
            value={app.form.values.browserTime}
            format="datetime"
            timeZone="browser"
            dateFormat={app.configuration().dateFormat}
            timeFormat={app.configuration().timeFormat}
            locale={app.configuration().locale}
          />
        </dd>
        <dt data-ui-text="system">First timestamp summary</dt>
        <dd data-date-display="summary">
          {display(app.table.getTotalValue('instant'), { id: 'instant' })}
        </dd>
      </dl>
      <div class="table-scroll">
        <Table
          table={app.table}
          accessibleLabel="Date records"
          formatValue={display}
          formatSummary={display}
        />
      </div>
    </div>
  )
  const Configuration = () => (
    <div class="date-demo-configuration">
      <Field>
        <Label>Date format</Label>
        <SelectField
          label="Date format"
          choices={[
            { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
            { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
            { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
            { value: 'locale', label: 'Locale' },
          ]}
          value={app.configuration().dateFormat}
          onValueChange={(dateFormat) => app.configure({ dateFormat })}
        />
      </Field>
      <Field>
        <Label>Time format</Label>
        <SelectField
          label="Time format"
          choices={[
            { value: 'HH:mm', label: '24 hour' },
            { value: 'HH:mm:ss', label: '24 hour with seconds' },
            { value: 'hh:mm a', label: '12 hour' },
            { value: 'hh:mm:ss a', label: '12 hour with seconds' },
          ]}
          value={app.configuration().timeFormat}
          onValueChange={(timeFormat) =>
            app.configure({
              timeFormat: timeFormat as DateTimePickerProps['timeFormat'],
            })
          }
        />
      </Field>
      <Field>
        <Label>System timezone</Label>
        <SelectField
          label="System timezone"
          choices={[
            'UTC',
            'America/New_York',
            'Europe/London',
            'Asia/Kathmandu',
          ].map((value) => ({ value, label: value }))}
          value={app.configuration().timeZone}
          onValueChange={(timeZone) => app.configure({ timeZone })}
        />
      </Field>
      <TableFormatting
        columns={[
          { id: 'reviewDate', label: 'Date column', kind: 'date' },
          { id: 'instant', label: 'Timestamp column', kind: 'datetime' },
        ]}
        value={app.formats()}
        onValueChange={app.setFormat}
      />
      <Button
        variant="outline"
        onClick={() =>
          app.configure({ readonly: !app.configuration().readonly })
        }
      >
        Toggle readonly
      </Button>
      <output aria-label="Accepted dates">
        {JSON.stringify(app.form.values, null, 2)}
      </output>
    </div>
  )
  const layout = {
    id: 'date-demo',
    columns: 1,
    title: 'Date input review',
    panels: [
      { id: 'date-editor', view: 'editor' },
      {
        id: 'nested-messages',
        view: 'messages',
        title: 'Nested control messages',
      },
      { id: 'date-records', view: 'records', title: 'Read-only dates' },
    ],
    navigation: [
      { id: 'date-configuration', view: 'configuration', title: 'Display' },
    ],
  } as const satisfies LayoutDescription<
    'editor' | 'records' | 'configuration' | 'messages'
  >
  return (
    <LayoutView
      description={layout}
      bindings={{
        views: {
          editor: Editor,
          messages: NestedMessagesPanel,
          records: Records,
          configuration: Configuration,
        },
      }}
    />
  )
}
