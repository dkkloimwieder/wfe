import { exampleSizing } from '../shared/appearance/sizing'
import { createSignal, Show, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import type { FormErrors, FormSnapshot } from '@wfe/form'
import { FormView, LayoutView } from '@wfe/generator'
import type { FormDescription, LayoutDescription } from '@wfe/generator'

type Row = {
  key: string
  name: string
  quantity: number | null
  active: boolean
}
type Values = { title: string; entries: readonly Row[] }
export type RepeatedConfiguration = {
  reject: boolean
  readOnly: boolean
  disabled: boolean
}
const initial: Values = {
  title: 'Repeated records',
  entries: [
    { key: 'first', name: 'First', quantity: 1, active: true },
    { key: 'second', name: 'Second', quantity: 2, active: false },
  ],
}
export function createRepeatedApplication() {
  const [values, setValues] = createSignal<Values>(initial)
  const [configuration, setConfiguration] = createSignal<RepeatedConfiguration>(
    { reject: false, readOnly: false, disabled: false },
  )
  const [visible, setVisible] = createSignal(true)
  const [reversed, setReversed] = createSignal(false)
  const [saved, setSaved] = createSignal<FormSnapshot<Values>>()
  let requests = 0,
    factories = 0,
    submissions = 0
  function rowErrors(
    snapshot: FormSnapshot<Values>,
    rejectSecond: boolean,
  ): FormErrors<Values> {
    const rows = Object.fromEntries(
      snapshot.entries.flatMap((row) => {
        const message = !row.name.trim()
          ? 'Enter a name'
          : rejectSecond && row.name === 'Second'
            ? 'Choose another name'
            : undefined
        return message
          ? [[row.key, { row: message, fields: { name: message } }]]
          : []
      }),
    )
    return Object.keys(rows).length ? { rows: { entries: rows } } : {}
  }
  const form = createForm<Values>({
    values,
    defaults: () => initial,
    onValuesChange(next) {
      requests++
      if (!configuration().reject) setValues(next)
    },
    validate: (snapshot) => rowErrors(snapshot, false),
    onSubmit(snapshot) {
      submissions++
      const errors = rowErrors(snapshot, true)
      if (errors.rows) return { ok: false, errors }
      setSaved(snapshot)
      return { ok: true }
    },
  })
  const fields = [
    { field: 'name', control: 'text', required: true },
    { field: 'quantity', control: 'number', empty: 'null' },
    { field: 'active', control: 'checkbox' },
  ] as const
  const description = () =>
    ({
      id: 'repeated-form',
      fields: [
        { field: 'title', control: 'text' },
        {
          field: 'entries',
          control: 'repeat',
          columns: 3,
          fields: reversed() ? [...fields].reverse() : fields,
        },
      ],
      submit: { id: 'save' },
      actions: [{ id: 'reset' }],
    }) as const satisfies FormDescription<Values>
  return {
    kind: 'repeated' as const,
    form,
    description,
    visible,
    saved,
    configuration,
    configure: (next: Partial<RepeatedConfiguration>) =>
      setConfiguration((old) => ({ ...old, ...next })),
    repeated: {
      entries: {
        rowKey: (row: Readonly<Row>) => row.key,
        createRow: (): Row => ({
          key: `added-${++factories}`,
          name: '',
          quantity: null,
          active: false,
        }),
      },
    },
    revise() {
      setReversed((old) => !old)
      setValues((old) => ({ ...old, entries: [...old.entries].reverse() }))
    },
    remove() {
      form.cancel()
      setVisible(false)
    },
    snapshot: () =>
      untrack(() => ({
        values: values(),
        errors: form.errors,
        phase: form.phase,
        requests,
        factories,
        submissions,
        saved: saved(),
      })),
  }
}
export function RepeatedApp(props: {
  ready?: (app: ReturnType<typeof createRepeatedApplication>) => void
}) {
  const app = createRepeatedApplication()
  props.ready?.(app)
  const Editor = () => (
    <>
      <p>
        This example rejects the name Second after submission. Change that row
        and save again.
      </p>
      <FormView
        description={app.description()}
        bindings={{
          form: app.form,
          repeated: app.repeated,
          readOnly: () => app.configuration().readOnly,
          disabled: () => app.configuration().disabled,
          actions: { reset: { run: app.form.reset } },
        }}
      />
    </>
  )
  const Result = () => (
    <p data-repeated-result data-ui-text="system">
      {app.saved() ? 'Saved' : 'Ready'}
    </p>
  )
  return (
    <Show when={app.visible()}>
      <div class="generated-repeated">
        <LayoutView
          style={exampleSizing}
          description={
            {
              id: 'repeated-layout',
              title: 'Repeated form',
              columns: 1,
              panels: [{ id: 'editor', view: 'editor', fill: true }],
              footer: [{ id: 'result', view: 'result' }],
            } as const satisfies LayoutDescription<'editor' | 'result'>
          }
          bindings={{ views: { editor: Editor, result: Result } }}
        />
      </div>
    </Show>
  )
}
