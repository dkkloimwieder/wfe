import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { OBSERVE, createSignal, flush } from 'solid-js'
import { Combobox } from '@wfe/components'

afterEach(cleanup)
const settle = async () => {
  flush()
  await Promise.resolve()
  flush()
  await Promise.resolve()
}

function mount(controlledText = false, uncontrolled = false) {
  const [value, setValue] = createSignal<string | null>('Beta')
  const [text, setText] = createSignal('Beta')
  const [label, setLabel] = createSignal('Choice')
  let accept = false
  const requested = vi.fn((next: string | null) => {
    if (accept) setValue(next)
  })
  const view = render(() => (
    <form>
      <Combobox<string>
        name="choice"
        options={['Alpha', 'Beta']}
        defaultFilter={() => true}
        defaultValue="Alpha"
        value={uncontrolled ? undefined : value()}
        onValueChange={requested}
        inputValue={controlledText ? text() : undefined}
        onInputChange={controlledText ? setText : undefined}
      >
        <Combobox.Input aria-label={label()} />
        <Combobox.HiddenSelect />
      </Combobox>
    </form>
  ))
  return {
    ...view,
    form: view.container.querySelector('form')!,
    input: view.container.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!,
    requested,
    setText,
    setLabel,
    accept: () => {
      accept = true
    },
  }
}

for (const immediate of [false, true]) {
  test(`combobox reset preserves accepted text and selection with ${immediate ? 'immediate flush' : 'normal settling'}`, async () => {
    const capture = OBSERVE!.diagnostics.capture()
    const diagnostics: ReturnType<typeof capture.stop> = []
    const h = mount()
    try {
      await settle()
      expect(h.input.value).toBe('Beta')
      h.form.reset()
      h.setLabel('After rejected reset')
      if (immediate) flush()
      await settle()
      expect(h.input.value).toBe('Beta')
      expect(new FormData(h.form).get('choice')).toBe('Beta')
      h.accept()
      h.form.reset()
      if (immediate) flush()
      await settle()
      expect(h.input.value).toBe('Alpha')
      expect(new FormData(h.form).get('choice')).toBe('Alpha')
      h.form.reset()
      h.setLabel('After unchanged reset')
      if (immediate) flush()
      await settle()
      expect(h.input.value).toBe('Alpha')
    } finally {
      h.unmount()
      await settle()
      diagnostics.push(...capture.stop())
    }
    expect(diagnostics).toEqual([])
  })
}

test('controlled combobox text survives native reset and disposed inputs stop following values', async () => {
  const capture = OBSERVE!.diagnostics.capture()
  const diagnostics: ReturnType<typeof capture.stop> = []
  const h = mount(true)
  try {
    await settle()
    fireEvent.input(h.input, { target: { value: 'Be' } })
    await settle()
    expect(h.input.value).toBe('Be')
    h.form.reset()
    h.setLabel('Controlled reset')
    flush()
    await settle()
    expect(h.input.value).toBe('Be')
    h.form.addEventListener('reset', (event) => event.preventDefault(), {
      once: true,
    })
    h.form.reset()
    flush()
    await settle()
    expect(h.input.value).toBe('Be')
    h.unmount()
    const value = h.input.value
    const defaultValue = h.input.defaultValue
    h.setText('After disposal')
    await settle()
    expect(h.input.value).toBe(value)
    expect(h.input.defaultValue).toBe(defaultValue)
  } finally {
    h.unmount()
    await settle()
    diagnostics.push(...capture.stop())
  }
  expect(diagnostics).toEqual([])
})

test('uncontrolled combobox native reset restores the declared selection default', async () => {
  const capture = OBSERVE!.diagnostics.capture()
  const diagnostics: ReturnType<typeof capture.stop> = []
  const h = mount(false, true)
  try {
    await settle()
    const select = h.form.querySelector('select')!
    fireEvent.change(select, { target: { value: 'Beta' } })
    await settle()
    expect(h.input.value).toBe('Beta')
    h.form.reset()
    flush()
    await settle()
    expect(h.input.value).toBe('Alpha')
    expect(new FormData(h.form).get('choice')).toBe('Alpha')
  } finally {
    h.unmount()
    await settle()
    diagnostics.push(...capture.stop())
  }
  expect(diagnostics).toEqual([])
})
