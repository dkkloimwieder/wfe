import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Field, Label, HelpText, FieldError } from '@wfe/components'
import { NumberInput } from '@wfe/components/number-input'
import { parseNumberInput } from '../../packages/components/src/utils/numberInput'
afterEach(cleanup)

function mount() {
  const [value, setValue] = createSignal<number | undefined>(2)
  const [state, setState] = createSignal({
    accept: true,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    disabled: false,
    readonly: false,
    allowEmpty: true,
    required: false,
  })
  const changed = vi.fn((next: number | undefined) => {
    if (state().accept) setValue(next)
  })
  const validity = vi.fn()
  const reference = vi.fn()
  const view = render(() => (
    <form>
      <Field invalid={false}>
        <Label>Amount</Label>
        <NumberInput
          name="amount"
          value={value()}
          min={state().min}
          max={state().max}
          disabled={state().disabled}
          readonly={state().readonly}
          allowEmpty={state().allowEmpty}
          required={state().required}
          onValueChange={changed}
          onValidityChange={validity}
          ref={(node) => {
            reference(node)
          }}
        />
        <HelpText>Units</HelpText>
        <FieldError>Application error</FieldError>
      </Field>
    </form>
  ))
  const input = view.getByRole('textbox', {
    name: 'Amount',
  }) as HTMLInputElement
  const edit = (text: string) => {
    fireEvent.input(input, { target: { value: text } })
    flush()
  }
  return {
    ...view,
    input,
    value,
    setValue,
    state,
    setState,
    changed,
    validity,
    reference,
    edit,
  }
}

test.each([
  '-',
  '+',
  '.',
  '1.',
  '1e',
  '1e-',
  'NaN',
  'Infinity',
  '1e309',
  '0xff',
  '1,25',
])(
  'incomplete or invalid draft %s stays local and blocks native validation',
  (text) => {
    const h = mount()
    h.edit(text)
    expect(h.input.value).toBe(text)
    expect(h.value()).toBe(2)
    expect(h.changed).not.toHaveBeenCalled()
    expect(h.input.validity.customError).toBe(true)
    expect(h.input.getAttribute('aria-invalid')).toBe('true')
    fireEvent.blur(h.input)
    flush()
    expect(h.input.value).toBe(text)
    fireEvent.keyDown(h.input, { key: 'Escape' })
    flush()
    expect(h.input.value).toBe('2')
    expect(h.input.validity.valid).toBe(true)
  },
)

test('accepted spellings survive echoes and unrelated updates, while external values replace drafts', () => {
  const h = mount()
  for (const [text, value] of [
    ['-0.50', -0.5],
    ['.25', 0.25],
    ['1e-7', 1e-7],
    ['1e21', 1e21],
  ] as const) {
    h.edit(text)
    expect(h.value()).toBe(value)
    expect(h.input.value).toBe(text)
    expect(h.input.validity.valid).toBe(true)
  }
  h.edit('1.')
  h.setState({ ...h.state(), min: -100 })
  flush()
  expect(h.input.value).toBe('1.')
  h.setValue(7)
  flush()
  expect(h.input.value).toBe('7')
  expect(h.reference).toHaveBeenCalledTimes(1)
  expect(h.changed).toHaveBeenCalledTimes(4)
})

test('complete rejected edits restore accepted values on blur and canonical named serialization stays accepted', async () => {
  const h = mount()
  h.setState({ ...h.state(), accept: false })
  flush()
  h.edit('9.00')
  expect(h.value()).toBe(2)
  expect(new FormData(h.container.querySelector('form')!).get('amount')).toBe(
    '2',
  )
  fireEvent.blur(h.input)
  await Promise.resolve()
  flush()
  expect(h.input.value).toBe('2')
  expect(h.changed).toHaveBeenCalledTimes(1)
})

test('empty values, required constraints, bounds and locked fields have distinct semantics', () => {
  const h = mount()
  h.edit('')
  expect(h.value()).toBeUndefined()
  expect(h.input.validity.valid).toBe(true)
  h.setValue(3)
  h.setState({ ...h.state(), allowEmpty: false, min: -1, max: 4 })
  flush()
  h.edit('')
  expect(h.value()).toBe(3)
  expect(h.input.validity.valid).toBe(false)
  h.edit('-2')
  expect(h.value()).toBe(3)
  expect(h.input.validationMessage).toContain('-1')
  h.edit('4.5')
  expect(h.value()).toBe(3)
  h.edit('-0.5')
  expect(h.value()).toBe(-0.5)
  h.edit('-')
  const requests = h.changed.mock.calls.length
  for (const locked of ['disabled', 'readonly'] as const) {
    h.setState({
      ...h.state(),
      disabled: false,
      readonly: false,
      [locked]: true,
    })
    flush()
    h.edit('4')
    expect(h.value()).toBe(-0.5)
    expect(h.changed).toHaveBeenCalledTimes(requests)
    expect(h.validity).toHaveBeenLastCalledWith(true)
  }
})

test('Field metadata and refs persist, and detached inputs stop all callbacks', () => {
  const h = mount()
  expect(h.input.type).toBe('text')
  expect(h.input.inputMode).toBe('decimal')
  expect(h.input.id).toBeTruthy()
  expect(
    h.input
      .getAttribute('aria-describedby')
      ?.split(' ')
      .every((id) => document.getElementById(id)),
  ).toBe(true)
  h.edit('-')
  const before = [h.changed.mock.calls.length, h.validity.mock.calls.length]
  h.unmount()
  fireEvent.input(h.input, { target: { value: '8' } })
  fireEvent.blur(h.input)
  fireEvent.keyDown(h.input, { key: 'Escape' })
  expect([h.changed.mock.calls.length, h.validity.mock.calls.length]).toEqual(
    before,
  )
})

test('finite canonical values round trip through the decimal parser', () => {
  for (const value of [
    0,
    -0,
    1e-7,
    1e21,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    -12.5,
  ])
    expect(parseNumberInput(String(value))).toBe(value === 0 ? 0 : value)
})

test('ordinary required stays native while intrinsic empty policy remains separate', () => {
  const h = mount()
  h.setState({ ...h.state(), required: true })
  flush()
  h.edit('   ')
  expect(h.value()).toBeUndefined()
  expect(h.input.value).toBe('')
  expect(h.input.validity.valueMissing).toBe(true)
  expect(h.input.validity.customError).toBe(false)
  expect(h.validity).toHaveBeenLastCalledWith(true)
})

test('temporary blur retains numeric spelling and selection after focus restoration', async () => {
  const h = mount()
  h.input.focus()
  h.edit('2.00')
  h.input.setSelectionRange(1, 3, 'backward')
  h.input.blur()
  h.input.focus()
  await Promise.resolve()
  flush()
  expect(h.input.value).toBe('2.00')
  expect([
    h.input.selectionStart,
    h.input.selectionEnd,
    h.input.selectionDirection,
  ]).toEqual([1, 3, 'backward'])
  h.input.blur()
  await Promise.resolve()
  flush()
  expect(h.input.value).toBe('2')
})

test('disposal cancels pending blur normalization before detached callbacks run', async () => {
  const h = mount()
  const warnings = vi.spyOn(console, 'warn')
  try {
    h.edit('2.00')
    h.input.focus()
    h.input.blur()
    const before = [h.changed.mock.calls.length, h.validity.mock.calls.length]
    h.unmount()
    await Promise.resolve()
    flush()
    expect(h.input.value).toBe('2.00')
    expect([h.changed.mock.calls.length, h.validity.mock.calls.length]).toEqual(
      before,
    )
    expect(warnings.mock.calls).toEqual([])
  } finally {
    warnings.mockRestore()
  }
})
