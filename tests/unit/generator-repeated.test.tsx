import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { createForm } from '@wfe/form'
import type { FormErrors, FormSnapshot } from '@wfe/form'
import { Input } from '@wfe/components'
import { FormView } from '@wfe/generator'
import type { FormDescription, CustomFieldProps } from '@wfe/generator'

interface Row {
  key: string
  name: string
  quantity: number | null
  active: boolean
}
interface Values {
  title: string
  entries: readonly Row[]
}
const initial: Values = {
  title: 'List',
  entries: [
    { key: 'a', name: 'First', quantity: 1, active: true },
    { key: 'b', name: 'Second', quantity: 2, active: false },
  ],
}
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
const settle = async () => {
  flush()
  await Promise.resolve()
  flush()
}
function mount() {
  const [values, setValues] = createSignal<Readonly<Values>>(initial)
  const [disabled, setDisabled] = createSignal(false)
  const [readOnly, setReadOnly] = createSignal(false)
  const [reversedFields, setReversedFields] = createSignal(false)
  let reject = false,
    next = 0,
    errors: FormErrors<Values> = {}
  const change = vi.fn((value: Readonly<Values>) => {
    if (!reject) setValues(value)
  })
  const factory = vi.fn((): Row => ({
    key: `added-${++next}`,
    name: '',
    quantity: null,
    active: false,
  }))
  const submit = vi.fn((_snapshot: FormSnapshot<Values>) => ({
    ok: true as const,
  }))
  let form!: ReturnType<typeof createForm<Values>>
  const children = [
    { field: 'name', control: 'text', help: 'Row name' },
    { field: 'quantity', control: 'number', empty: 'null' },
    { field: 'active', control: 'checkbox' },
  ] as const
  const h = render(() => {
    form = createForm<Values>({
      values,
      defaults: () => initial,
      onValuesChange: change,
      validate: () => errors,
      onSubmit: submit,
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={
            {
              id: 'repeated',
              fields: [
                { field: 'title', control: 'text' },
                {
                  field: 'entries',
                  control: 'repeat',
                  columns: 2,
                  help: 'Repeated values',
                  fields: reversedFields() ? [...children].reverse() : children,
                },
              ],
              submit: { id: 'save' },
            } as const satisfies FormDescription<Values>
          }
          bindings={{
            form,
            disabled,
            readOnly,
            repeated: {
              entries: { rowKey: (row) => row.key, createRow: factory },
            },
          }}
        />
      </Errored>
    )
  })
  flush()
  const row = (key: string) =>
    h.container.querySelector<HTMLElement>(`[data-generator-row="${key}"]`)!
  return {
    ...h,
    row,
    form,
    values,
    setValues,
    change,
    factory,
    submit,
    setDisabled,
    setReadOnly,
    setReversedFields,
    reject: (value: boolean) => {
      reject = value
    },
    errors: (next: FormErrors<Values>) => {
      errors = next
    },
  }
}
test('repeated records reuse named scalar controls and row fieldsets without initial requests', () => {
  const h = mount()
  expect(h.getByRole('group', { name: 'entries', exact: true })).toBeTruthy()
  expect(
    within(h.row('a')).getByRole('textbox', { name: 'name' }),
  ).toHaveProperty('value', 'First')
  expect(
    within(h.row('b')).getByRole('checkbox', { name: 'active' }),
  ).toHaveProperty('checked', false)
  expect(h.getAllByRole('button', { name: /Remove entries row/ })).toHaveLength(
    2,
  )
  expect(h.factory).not.toHaveBeenCalled()
  expect(h.change).not.toHaveBeenCalled()
})
test('add, row edit and remove use the existing accepted-value request path', async () => {
  const h = mount()
  fireEvent.click(h.getByRole('button', { name: 'Add row' }))
  await settle()
  expect(h.factory).toHaveBeenCalledTimes(1)
  expect(h.values().entries).toHaveLength(3)
  const input = within(h.row('added-1')).getByRole('textbox', { name: 'name' })
  fireEvent.input(input, { target: { value: 'Third' } })
  await settle()
  expect(h.values().entries.at(-1)?.name).toBe('Third')
  fireEvent.click(
    within(h.row('a')).getByRole('button', { name: /Remove entries row/ }),
  )
  await settle()
  expect(h.values().entries.map((row) => row.key)).toEqual(['b', 'added-1'])
  expect(h.change).toHaveBeenCalledTimes(3)
  expect(h.submit).not.toHaveBeenCalled()
})
test('rejected add, edit and removal leave rows and retained controls unchanged', async () => {
  const h = mount()
  h.reject(true)
  const input = within(h.row('a')).getByRole('textbox', { name: 'name' })
  fireEvent.click(h.getByRole('button', { name: 'Add row' }))
  fireEvent.input(input, { target: { value: 'Rejected' } })
  fireEvent.click(
    within(h.row('a')).getByRole('button', { name: /Remove entries row/ }),
  )
  await settle()
  expect(h.values()).toEqual(initial)
  expect(within(h.row('a')).getByRole('textbox', { name: 'name' })).toBe(input)
  expect(input).toHaveProperty('value', 'First')
  expect(h.change).toHaveBeenCalledTimes(3)
})
test('row and field reorder retain a focused numeric draft and edits resolve the latest key', async () => {
  const h = mount()
  const quantity = within(h.row('a')).getByRole('textbox', {
    name: 'quantity',
  }) as HTMLInputElement
  quantity.focus()
  fireEvent.input(quantity, { target: { value: '-' } })
  h.setValues({ ...initial, entries: [...initial.entries].reverse() })
  h.setReversedFields(true)
  await settle()
  expect(within(h.row('a')).getByRole('textbox', { name: 'quantity' })).toBe(
    quantity,
  )
  expect(document.activeElement).toBe(quantity)
  expect(quantity.value).toBe('-')
  fireEvent.input(quantity, { target: { value: '9' } })
  await settle()
  expect(h.values().entries.map((row) => [row.key, row.quantity])).toEqual([
    ['b', 2],
    ['a', 9],
  ])
})
test('inserting a row before a retained row preserves its control and focus', async () => {
  const h = mount()
  const input = within(h.row('b')).getByRole('textbox', { name: 'name' })
  input.focus()
  h.setValues({
    ...initial,
    entries: [{ ...initial.entries[0]!, key: 'new' }, ...initial.entries],
  })
  await settle()
  expect(within(h.row('b')).getByRole('textbox', { name: 'name' })).toBe(input)
  expect(document.activeElement).toBe(input)
})
test('row messages follow stable keys and retain scalar error/help associations', async () => {
  const h = mount()
  h.setValues({ ...initial, entries: [...initial.entries].reverse() })
  await settle()
  h.errors({
    fields: { entries: 'Review entries' },
    rows: {
      entries: {
        a: {
          fields: { name: 'Enter a different name' },
          row: 'Review first record',
        },
      },
    },
  })
  expect(await h.form.submit()).toEqual({ status: 'invalid' })
  await settle()
  const input = within(h.row('a')).getByRole('textbox', { name: 'name' })
  expect(input.getAttribute('aria-invalid')).toBe('true')
  const messages = input
    .getAttribute('aria-describedby')!
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
  expect(messages).toContain('Row name')
  expect(messages).toContain('Enter a different name')
  expect(h.row('a').getAttribute('aria-invalid')).toBe('true')
  expect(
    document.getElementById(h.row('a').getAttribute('aria-describedby')!)
      ?.textContent,
  ).toBe('Review first record')
  expect(within(h.row('b')).queryByText('Enter a different name')).toBeNull()
  expect(h.submit).not.toHaveBeenCalled()
})
test.each(['disabled', 'readOnly'] as const)(
  '%s groups prevent factories and row change callbacks',
  async (lock) => {
    const h = mount()
    if (lock === 'disabled') h.setDisabled(true)
    else h.setReadOnly(true)
    await settle()
    const add = h.getByRole('button', { name: 'Add row' }) as HTMLButtonElement
    expect(add.disabled).toBe(true)
    fireEvent.click(add)
    fireEvent.click(
      within(h.row('a')).getByRole('button', { name: /Remove entries row/ }),
    )
    fireEvent.input(within(h.row('a')).getByRole('textbox', { name: 'name' }), {
      target: { value: 'Blocked' },
    })
    await settle()
    expect(h.factory).not.toHaveBeenCalled()
    expect(h.change).not.toHaveBeenCalled()
  },
)
test('duplicate row keys reject the description instead of merging owners', async () => {
  const h = mount()
  h.setValues({
    ...initial,
    entries: [initial.entries[0]!, { ...initial.entries[1]!, key: 'a' }],
  })
  await settle()
  expect(h.getByRole('alert').textContent).toContain('duplicate repeated row')
})
test('removed input and action handlers cannot alter a remaining row', async () => {
  const h = mount()
  const input = within(h.row('a')).getByRole('textbox', { name: 'name' })
  const remove = within(h.row('a')).getByRole('button', {
    name: /Remove entries row/,
  })
  h.setValues({ ...initial, entries: [initial.entries[1]!] })
  await settle()
  fireEvent.input(input, { target: { value: 'Detached' } })
  fireEvent.click(remove)
  expect(h.change).not.toHaveBeenCalled()
  expect(h.values().entries[0]?.key).toBe('b')
})
test('adding focuses an accepted new row and removing it restores the add action', async () => {
  const h = mount()
  const add = h.getByRole('button', { name: 'Add row' })
  add.focus()
  fireEvent.click(add)
  await settle()
  const input = within(h.row('added-1')).getByRole('textbox', { name: 'name' })
  expect(document.activeElement).toBe(input)
  const remove = within(h.row('added-1')).getByRole('button', {
    name: /Remove entries row/,
  })
  remove.focus()
  fireEvent.click(remove)
  await settle()
  expect(document.activeElement).toBe(add)
})
test('form submission keeps raw repeated values and calls the application once', async () => {
  const h = mount()
  fireEvent.submit(h.container.querySelector('form')!)
  await settle()
  expect(h.submit).toHaveBeenCalledTimes(1)
  expect(h.submit.mock.calls[0]?.[0]).toEqual(initial)
})

test('nested numeric drafts block the existing form submission path and focus the invalid control', async () => {
  const h = mount()
  const quantity = within(h.row('a')).getByRole('textbox', { name: 'quantity' })
  fireEvent.input(quantity, { target: { value: '-' } })
  await settle()
  fireEvent.submit(h.container.querySelector('form')!)
  await settle()
  expect(h.submit).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(quantity)
})

test.each(['', '  '])('blank row key %j rejects the group', async (key) => {
  const h = mount()
  h.setValues({ ...initial, entries: [{ ...initial.entries[0]!, key }] })
  await settle()
  expect(h.getByRole('alert').textContent).toContain(
    'repeated row identity is empty',
  )
})
test('special application keys produce unique associated control IDs', async () => {
  const h = mount()
  h.setValues({
    ...initial,
    entries: [
      { ...initial.entries[0]!, key: 'constructor' },
      { ...initial.entries[1]!, key: '\ud800:/#' },
    ],
  })
  await settle()
  const names = h.getAllByRole('textbox', {
    name: 'name',
  }) as HTMLInputElement[]
  expect(names).toHaveLength(2)
  expect(new Set(names.map((input) => input.id)).size).toBe(2)
  for (const input of names) expect(input.labels?.[0]?.htmlFor).toBe(input.id)
  expect(h.queryByRole('alert')).toBeNull()
})
test('nested choices and custom fields use their repeated binding and current row key', async () => {
  interface ChoiceRow {
    key: string
    mode: 'alpha' | 'beta'
    amount: number
  }
  interface ChoiceValues {
    entries: readonly ChoiceRow[]
  }
  const [values, setValues] = createSignal<Readonly<ChoiceValues>>({
    entries: [
      { key: 'a', mode: 'alpha', amount: 1 },
      { key: 'b', mode: 'beta', amount: 2 },
    ],
  })
  const retained: Array<(amount: number) => void> = []
  const Custom = (props: CustomFieldProps<ChoiceRow, 'amount'>) => {
    retained.push(props.onValueChange)
    return (
      <Input
        id={props.id}
        value={String(props.value)}
        onValueChange={(value) => props.onValueChange(Number(value))}
      />
    )
  }
  const h = render(() => {
    const form = createForm<ChoiceValues>({
      values,
      defaults: values,
      onValuesChange: setValues,
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <FormView
        description={
          {
            id: 'nested-bindings',
            fields: [
              {
                field: 'entries',
                control: 'repeat',
                fields: [
                  { field: 'mode', control: 'select' },
                  { field: 'amount', control: 'custom' },
                ],
              },
            ],
          } as const
        }
        bindings={{
          form,
          repeated: {
            entries: {
              rowKey: (row) => row.key,
              createRow: () => ({ key: 'new', mode: 'alpha', amount: 0 }),
              choices: {
                mode: () => [
                  { value: 'alpha', label: 'Alpha' },
                  { value: 'beta', label: 'Beta' },
                ],
              },
              fields: { amount: Custom },
            },
          },
        }}
      />
    )
  })
  flush()
  const first = h.container.querySelector<HTMLElement>(
    '[data-generator-row="a"]',
  )!
  const input = within(first).getByRole('textbox', { name: 'amount' })
  expect(
    within(first).getByRole('button', { name: /^mode/ }).textContent,
  ).toContain('Alpha')
  setValues({ entries: [...values().entries].reverse() })
  await settle()
  fireEvent.input(input, { target: { value: '7' } })
  await settle()
  expect(values().entries.map((row) => [row.key, row.amount])).toEqual([
    ['b', 2],
    ['a', 7],
  ])
  setValues({ entries: [values().entries[0]!] })
  await settle()
  retained[0]!(9)
  await settle()
  expect(values().entries).toEqual([{ key: 'b', mode: 'beta', amount: 2 }])
})

test.each(['hidden', 'inert', 'aria-hidden', 'style'])(
  'queued add focus respects a parent that becomes %s',
  async (kind) => {
    const h = mount()
    const add = h.getByRole('button', { name: 'Add row' })
    add.focus()
    fireEvent.click(add)
    if (kind === 'style') h.container.style.display = 'none'
    else h.container.setAttribute(kind, kind === 'aria-hidden' ? 'true' : '')
    await settle()
    const input = h.row('added-1').querySelector('input')
    expect(document.activeElement).not.toBe(input)
  },
)
test('queued add focus preserves an intervening focus change', async () => {
  const h = mount()
  const other = document.createElement('button')
  document.body.append(other)
  try {
    const add = h.getByRole('button', { name: 'Add row' })
    add.focus()
    fireEvent.click(add)
    other.focus()
    await settle()
    expect(document.activeElement).toBe(other)
  } finally {
    other.remove()
  }
})
test('queued add focus becomes inert when its view is disposed', async () => {
  const h = mount()
  const add = h.getByRole('button', { name: 'Add row' })
  add.focus()
  fireEvent.click(add)
  h.unmount()
  await settle()
  expect(h.container.querySelector('form')).toBeNull()
  expect(document.activeElement).toBe(document.body)
})

test.each(['custom', 'select'] as const)(
  'scalar %s bindings reject inherited entries for special field keys',
  (control) => {
    const initial = { constructor: 'alpha' }
    const inherited = Object.create({
      constructor:
        control === 'custom'
          ? () => <span>Inherited component</span>
          : () => [{ value: 'alpha', label: 'Alpha' }],
    })
    const h = render(() => {
      const form = createForm({
        values: () => initial,
        defaults: () => initial,
        onValuesChange() {},
        validate: () => ({}),
        onSubmit: () => ({ ok: true }),
      })
      return (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <FormView
            description={{
              id: 'inherited',
              fields: [{ field: 'constructor', control }],
            }}
            bindings={{
              form,
              ...(control === 'custom'
                ? { fields: inherited }
                : { choices: inherited }),
            }}
          />
        </Errored>
      )
    })
    expect(h.getByRole('alert').textContent).toContain(
      control === 'custom' ? 'missing custom field' : 'missing choices',
    )
  },
)
test('repeated bindings reject inherited group entries', () => {
  const initial = { constructor: [{ key: 'first', name: 'Name' }] }
  const inherited = Object.create({
    constructor: {
      rowKey: (row: { key: string }) => row.key,
      createRow: () => ({ key: 'next', name: '' }),
    },
  })
  const h = render(() => {
    const form = createForm({
      values: () => initial,
      defaults: () => initial,
      onValuesChange() {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={
            {
              id: 'inherited-group',
              fields: [
                {
                  field: 'constructor',
                  control: 'repeat',
                  fields: [{ field: 'name', control: 'text' }],
                },
              ],
            } as const
          }
          bindings={{ form, repeated: inherited }}
        />
      </Errored>
    )
  })
  expect(h.getByRole('alert').textContent).toContain('missing repeated binding')
})
