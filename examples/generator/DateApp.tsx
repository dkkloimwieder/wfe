import { createSignal, untrack } from 'solid-js'
import { Button, Field, Label, SelectField } from '@wfe/components'
import { FormView, LayoutView } from '@wfe/generator'
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
        configuration: configuration(),
        validations,
        submissions,
        requests,
        phase: form.phase,
      })),
  }
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
    title: 'Date input review',
    panels: [{ id: 'date-editor', view: 'editor' }],
    navigation: [
      { id: 'date-configuration', view: 'configuration', title: 'Display' },
    ],
  } as const satisfies LayoutDescription<'editor' | 'configuration'>
  return (
    <LayoutView
      description={layout}
      bindings={{ views: { editor: Editor, configuration: Configuration } }}
    />
  )
}
