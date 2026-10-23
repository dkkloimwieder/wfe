import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import { FormView, LayoutView, TableView } from '@wfe/generator'
import type { FormDescription } from '@wfe/generator'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
async function settle() {
  flush()
  await Promise.resolve()
  flush()
}
type Values = {
  name: string
  notes: string
  active: boolean
  enabled: boolean
  kind: string
  joined: string
  started: string
  quantity: number
}
const initial: Values = {
  name: 'Harbor',
  notes: '',
  active: true,
  enabled: false,
  kind: 'alpha',
  joined: '2026-10-19',
  started: '2026-10-19T12:00:00Z',
  quantity: 3,
}
const base = {
  id: 'labels',
  fields: [
    { field: 'name', control: 'text' },
    { field: 'notes', control: 'textarea' },
    { field: 'active', control: 'checkbox' },
    { field: 'enabled', control: 'switch' },
    { field: 'kind', control: 'select' },
    { field: 'joined', control: 'date' },
    { field: 'started', control: 'datetime' },
    { field: 'quantity', control: 'number' },
  ],
  submit: { id: 'save' },
  actions: [{ id: 'clear' }],
} as const satisfies FormDescription<Values>
function mountForm() {
  const [values, setValues] = createSignal(initial)
  const [renamed, setRenamed] = createSignal(false)
  const [bad, setBad] = createSignal<string | number | undefined>()
  const changes = vi.fn((requested: Readonly<Values>) => setValues(requested))
  const extra = vi.fn()
  const submit = vi.fn((_snapshot: Readonly<Values>) => ({ ok: true as const }))
  let form!: ReturnType<typeof createForm<Values>>
  const description = () => ({
    ...base,
    fields: base.fields.map((field) => ({
      ...field,
      label:
        bad() !== undefined
          ? (bad() as string)
          : renamed()
            ? `Label ${field.field}`
            : undefined,
    })),
    submit: { ...base.submit, label: renamed() ? 'Save changes' : undefined },
    actions: base.actions.map((action) => ({
      ...action,
      label: renamed() ? 'Clear changes' : undefined,
    })),
  })
  const h = render(() => {
    form = createForm<Values>({
      values,
      defaults: () => initial,
      onValuesChange: changes,
      validate: () => ({}),
      onSubmit: submit,
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={description()}
          bindings={{
            form,
            choices: { kind: () => [{ value: 'alpha', label: 'Alpha' }] },
            actions: { clear: { run: extra } },
          }}
        />
      </Errored>
    )
  })
  flush()
  return { ...h, values, changes, form, submit, extra, setRenamed, setBad }
}

test('omitted labels name native, choice, boolean, date and numeric controls from field keys', () => {
  const h = mountForm()
  expect(h.getByRole('textbox', { name: 'name' })).toBeTruthy()
  expect(h.getByRole('textbox', { name: 'notes' })).toBeTruthy()
  expect(h.getByRole('checkbox', { name: 'active' })).toBeTruthy()
  expect(h.getByRole('switch', { name: 'enabled' })).toBeTruthy()
  expect(h.container.querySelector('button[aria-label="kind"]')).not.toBeNull()
  for (const key of ['joined', 'started', 'quantity'])
    expect(h.getByText(key, { exact: true })).toBeTruthy()
  expect(h.getByRole('button', { name: 'save' })).toBeTruthy()
  expect(h.getByRole('button', { name: 'clear' })).toBeTruthy()
  expect(h.changes).not.toHaveBeenCalled()
  expect(h.submit).not.toHaveBeenCalled()
  expect(h.extra).not.toHaveBeenCalled()
})
test('label changes preserve inputs, focus, accepted values and application callbacks', async () => {
  const h = mountForm()
  const input = h.getByRole('textbox', {
    name: 'name',
  }) as HTMLInputElement
  input.focus()
  h.form.setValue('name', 'Edited')
  await settle()
  h.setRenamed(true)
  await settle()
  expect(h.getByRole('textbox', { name: 'Label name' })).toBe(input)
  expect(input.value).toBe('Edited')
  expect(document.activeElement).toBe(input)
  expect(h.changes).toHaveBeenCalledTimes(1)
  expect(h.values().name).toBe('Edited')
  expect(h.getByRole('button', { name: 'Save changes' })).toBeTruthy()
  h.setRenamed(false)
  await settle()
  expect(h.getByRole('textbox', { name: 'name' })).toBe(input)
  expect(h.changes).toHaveBeenCalledTimes(1)
})
test('fallback submit and action names keep their existing operations', async () => {
  const h = mountForm()
  fireEvent.click(h.getByRole('button', { name: 'clear' }))
  expect(h.extra).toHaveBeenCalledTimes(1)
  expect(h.submit).not.toHaveBeenCalled()
  await h.form.submit()
  await settle()
  expect(h.submit).toHaveBeenCalledTimes(1)
  expect(h.submit.mock.calls[0]?.[0]).toEqual(initial)
})
test.each([1, '', '  '])(
  'invalid supplied label %j remains a configuration error',
  async (label) => {
    const h = mountForm()
    h.setBad(label)
    await settle()
    expect(h.getByRole('alert').textContent).toContain('invalid label')
  },
)
test('table action labels default to operation IDs without changing column labels', () => {
  const run = vi.fn()
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ name: 'Harbor' }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <TableView
        description={
          {
            id: 'records',
            columns: { name: {} },
            actions: [{ id: 'export' }],
          } as const
        }
        bindings={{ table, actions: { export: { run } } }}
      />
    )
  })
  fireEvent.click(h.getByRole('button', { name: 'export' }))
  expect(run).toHaveBeenCalledTimes(1)
  expect(h.getByRole('columnheader')).toHaveProperty(
    'textContent',
    expect.stringContaining('name'),
  )
})
test('layout action labels use the same operation ID fallback', () => {
  const run = vi.fn()
  const h = render(() => (
    <LayoutView
      description={
        {
          id: 'summary',
          panels: [{ id: 'body', view: 'summary' }],
          actions: [{ id: 'refresh' }],
        } as const
      }
      bindings={{
        views: { summary: () => <p>Summary</p> },
        actions: { refresh: { run } },
      }}
    />
  ))
  fireEvent.click(h.getByRole('button', { name: 'refresh' }))
  expect(run).toHaveBeenCalledTimes(1)
})
