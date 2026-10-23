import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, Errored } from 'solid-js'
import { NumberInput } from '@wfe/components'
import { createForm } from '@wfe/form'
import { FormView } from '@wfe/generator'
import type { FormDescription } from '@wfe/generator'
afterEach(cleanup)
function mount() {
  type Values = {
    count: number
    optional: number | undefined
    nullable: number | null
    custom: number
  }
  const [values, setValues] = createSignal<Values>({
    count: 2,
    optional: 3,
    nullable: null,
    custom: 4,
  })
  const [state, setState] = createSignal({
    disabled: false,
    readonly: false,
    removed: false,
    error: false,
  })
  let validations = 0,
    submissions = 0
  const view = render(() => {
    const form = createForm<Values>({
      values,
      defaults: values,
      onValuesChange: setValues,
      validate: () => {
        validations++
        return state().error ? { fields: { count: 'Application error' } } : {}
      },
      onSubmit: () => {
        submissions++
        return { ok: true }
      },
    })
    const Custom = (props: {
      value: number
      onValueChange: (value: number) => void
    }) => (
      <NumberInput
        value={props.value}
        allowEmpty={false}
        onValueChange={(value) => {
          if (value !== undefined) props.onValueChange(value)
        }}
      />
    )
    const description = () =>
      ({
        id: 'numbers',
        fields: [
          ...(state().removed
            ? []
            : ([
                { field: 'count', label: 'Count', control: 'number' },
              ] as const)),
          {
            field: 'optional',
            label: 'Optional',
            control: 'number',
            empty: 'undefined',
          },
          {
            field: 'nullable',
            label: 'Nullable',
            control: 'number',
            empty: 'null',
          },
          { field: 'custom', label: 'Custom', control: 'custom' },
        ],
        submit: { id: 'save', label: 'Save' },
      }) as const satisfies FormDescription<Values>
    return (
      <FormView
        description={description()}
        bindings={{
          form,
          fields: { custom: Custom },
          disabled: () => state().disabled,
          readOnly: () => state().readonly,
        }}
      />
    )
  })
  return {
    ...view,
    values,
    setValues,
    state,
    setState,
    read: () => ({ validations, submissions }),
  }
}
async function submit(h: ReturnType<typeof mount>) {
  fireEvent.submit(h.container.querySelector('form')!)
  flush()
  await Promise.resolve()
  flush()
  await Promise.resolve()
  flush()
}
function edit(h: ReturnType<typeof mount>, label: string, text: string) {
  const input = h.getByRole('textbox', { name: label })
  fireEvent.input(input, { target: { value: text } })
  flush()
  return input
}
test('numeric empty sentinels remain explicit and nonnullable blank stays local', async () => {
  const h = mount()
  edit(h, 'Optional', '')
  edit(h, 'Nullable', '7.5')
  edit(h, 'Nullable', '')
  expect(h.values().optional).toBeUndefined()
  expect(h.values().nullable).toBeNull()
  const count = edit(h, 'Count', '')
  expect(h.values().count).toBe(2)
  await submit(h)
  expect(h.read()).toEqual({ validations: 0, submissions: 0 })
  expect(document.activeElement).toBe(count)
})
test('invalid built-in and custom numeric drafts prevent stale submissions, and Escape permits retry', async () => {
  const h = mount()
  for (const label of ['Count', 'Custom']) {
    const input = edit(h, label, '1.')
    await submit(h)
    expect(h.read().submissions).toBe(label === 'Count' ? 0 : 1)
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    flush()
    await submit(h)
  }
  expect(h.read()).toEqual({ validations: 2, submissions: 2 })
})
test('disabled, readonly and removed numeric inputs do not block, while application errors permit retry', async () => {
  const h = mount()
  edit(h, 'Count', '-')
  h.setState({ ...h.state(), disabled: true })
  flush()
  await submit(h)
  h.setState({ ...h.state(), disabled: false, readonly: true })
  flush()
  await submit(h)
  h.setState({ ...h.state(), readonly: false, removed: true, error: true })
  flush()
  await submit(h)
  expect(h.read()).toEqual({ validations: 3, submissions: 2 })
  h.setState({ ...h.state(), error: false })
  flush()
  await submit(h)
  expect(h.read()).toEqual({ validations: 4, submissions: 3 })
})

test('native disabled fieldsets and foreign form associations do not block this form', async () => {
  const h = mount()
  const input = edit(h, 'Custom', '-')
  const fieldset = document.createElement('fieldset')
  fieldset.disabled = true
  input.replaceWith(fieldset)
  fieldset.append(input)
  await submit(h)
  expect(h.read().submissions).toBe(1)
  fieldset.disabled = false
  const other = document.createElement('form')
  other.id = 'other-number-form'
  h.container.append(other)
  input.setAttribute('form', other.id)
  await submit(h)
  expect(h.read().submissions).toBe(2)
})

test('runtime descriptions reject null policies even when the accepted value is finite', () => {
  const h = render(() => {
    const form = createForm<{ count: number }>({
      values: () => ({ count: 2 }),
      defaults: () => ({ count: 2 }),
      onValuesChange: () => {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    const description = {
      id: 'invalid',
      fields: [
        {
          field: 'count',
          label: 'Count',
          control: 'number',
          empty: null as unknown as 'reject',
        },
      ],
    } as const satisfies FormDescription<{ count: number }>
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView description={description} bindings={{ form }} />
      </Errored>
    )
  })
  expect(h.getByRole('alert').textContent).toContain(
    'incompatible numeric field',
  )
})
