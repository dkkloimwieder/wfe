import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { OBSERVE, createSignal, flush } from 'solid-js'
import { Combobox, Select } from '@wfe/components'

afterEach(cleanup)
const settle = async () => {
  flush()
  await Promise.resolve()
  flush()
  await Promise.resolve()
}
const options = ['Alpha', 'Beta', 'Gamma']
type Family = 'select' | 'combobox'
function mount(family: Family, controlled = false) {
  const [value, setValue] = createSignal(['Alpha'])
  const [readonly, setReadonly] = createSignal(false)
  const [disabled, setDisabled] = createSignal(false)
  let accept = true
  const requested = vi.fn((next: string[]) => {
    if (controlled && accept) setValue(next)
  })
  const native = vi.fn((event: Event & { currentTarget: HTMLSelectElement }) =>
    Array.from(event.currentTarget.selectedOptions, (option) => option.value),
  )
  const common = {
    multiple: true as const,
    name: 'choices',
    options,
    get value() {
      return controlled ? value() : undefined
    },
    defaultValue: ['Alpha'],
    get readonly() {
      return readonly()
    },
    get disabled() {
      return disabled()
    },
    onValueChange: requested,
  }
  const h = render(() => (
    <form>
      {family === 'select' ? (
        <Select<string> {...common}>
          <Select.Trigger aria-label="Choices">
            <Select.Value<string>>
              {(state) => state.selectedOptions().join(', ')}
            </Select.Value>
          </Select.Trigger>
          <Select.HiddenSelect onChange={native} />
        </Select>
      ) : (
        <Combobox<string> {...common} defaultFilter={() => true}>
          <Combobox.Input aria-label="Choices" />
          <Combobox.HiddenSelect onChange={native} />
        </Combobox>
      )}
    </form>
  ))
  const form = h.container.querySelector('form')!
  const select = form.querySelector('select')!
  function change(keys: string[]) {
    for (const key of keys)
      expect(Array.from(select.options, (option) => option.value)).toContain(
        key,
      )
    for (const option of select.options)
      option.selected = keys.includes(option.value)
    const nativeOrder = Array.from(
      select.selectedOptions,
      (option) => option.value,
    )
    fireEvent.change(select)
    return nativeOrder
  }
  return {
    ...h,
    form,
    select,
    requested,
    native,
    value,
    setReadonly,
    setDisabled,
    change,
    reject: () => {
      accept = false
    },
    submitted: () => new FormData(form).getAll('choices'),
  }
}

test.each(['select', 'combobox'] as const)(
  '%s native multiple changes preserve every option, empty selection and reset defaults',
  async (family) => {
    const h = mount(family)
    await settle()
    h.native.mockClear()
    h.change(['Beta', 'Gamma'])
    await settle()
    expect(h.requested).toHaveBeenCalledExactlyOnceWith(['Beta', 'Gamma'])
    expect(h.submitted()).toEqual(['Beta', 'Gamma'])
    expect(h.native.mock.results[0]?.value).toEqual(['Beta', 'Gamma'])
    const calls = h.requested.mock.calls.length
    await settle()
    expect(h.requested).toHaveBeenCalledTimes(calls)
    h.requested.mockClear()
    h.change([])
    await settle()
    expect(h.requested).toHaveBeenCalledExactlyOnceWith([])
    expect(h.submitted()).toEqual([])
    fireEvent.reset(h.form)
    await settle()
    expect(h.submitted()).toEqual(['Alpha'])
    expect(h.select).toBe(h.form.querySelector('select'))
  },
)

test.each(['select', 'combobox'] as const)(
  '%s native multiple requests retain controlled acceptance and rejection',
  async (family) => {
    const h = mount(family, true)
    await settle()
    h.change(['Beta', 'Gamma'])
    await settle()
    expect(h.requested).toHaveBeenCalledExactlyOnceWith(['Beta', 'Gamma'])
    expect(h.value()).toEqual(['Beta', 'Gamma'])
    expect(h.submitted()).toEqual(['Beta', 'Gamma'])
    h.reject()
    h.requested.mockClear()
    const nativeOrder = h.change(['Alpha', 'Gamma'])
    await settle()
    expect([...nativeOrder].sort()).toEqual(['Alpha', 'Gamma'])
    expect(h.requested).toHaveBeenCalledExactlyOnceWith(nativeOrder)
    expect(h.value()).toEqual(['Beta', 'Gamma'])
    expect(h.submitted()).toEqual(['Beta', 'Gamma'])
  },
)

test.each(['select', 'combobox'] as const)(
  '%s locked native multiple changes preserve accepted options and disposal cancels queued restoration',
  async (family) => {
    const h = mount(family)
    await settle()
    h.change(['Beta', 'Gamma'])
    await settle()
    h.requested.mockClear()
    h.setReadonly(true)
    await settle()
    h.change(['Alpha'])
    await settle()
    expect(h.submitted()).toEqual(['Beta', 'Gamma'])
    expect(h.requested).not.toHaveBeenCalled()
    h.setReadonly(false)
    h.setDisabled(true)
    await settle()
    h.change(['Alpha'])
    await settle()
    expect(
      Array.from(h.select.selectedOptions, (option) => option.value),
    ).toEqual(['Beta', 'Gamma'])
    expect(h.submitted()).toEqual([])
    expect(h.requested).not.toHaveBeenCalled()
    h.setDisabled(false)
    await settle()
    h.change(['Alpha', 'Gamma'])
    h.unmount()
    const afterDispose = h.requested.mock.calls.length
    h.select.options[0]!.selected = true
    await settle()
    expect(h.requested).toHaveBeenCalledTimes(afterDispose)
    expect(h.select.options[0]!.selected).toBe(true)
  },
)

test('filtering a controlled combobox preserves its accepted native selection without overwriting uncommitted input', async () => {
  let capture = OBSERVE!.diagnostics.capture()
  const checkPhase = (phase: string) => {
    const events = capture.stop()
    capture = OBSERVE!.diagnostics.capture()
    expect(events, phase).toEqual([])
  }
  let accept = false
  const requested = vi.fn()
  let h: ReturnType<typeof render> | undefined
  let diagnostics: ReturnType<typeof capture.stop> = []
  try {
    h = render(() => {
      const [value, setValue] = createSignal<string | null>('Alpha')
      return (
        <form>
          <Combobox<string>
            name="filtered"
            defaultValue="Alpha"
            options={['Alpha', 'Beta']}
            value={value()}
            onValueChange={(next) => {
              requested(next)
              if (accept) setValue(next)
            }}
            itemComponent={(item) => (
              <Combobox.Item item={item.item}>
                <Combobox.ItemLabel>{item.item.rawValue}</Combobox.ItemLabel>
              </Combobox.Item>
            )}
          >
            <Combobox.Control>
              <Combobox.Input aria-label="Filtered choice" />
              <Combobox.Trigger>Open choices</Combobox.Trigger>
            </Combobox.Control>
            <Combobox.HiddenSelect />
            <Combobox.Portal>
              <Combobox.Content>
                <Combobox.Listbox />
              </Combobox.Content>
            </Combobox.Portal>
          </Combobox>
        </form>
      )
    })
    await settle()
    const form = h.container.querySelector('form')!
    const native = form.querySelector('select')!
    const alpha = Array.from(native.options).find(
      (option) => option.value === 'Alpha',
    )!
    const input = h.getByRole('combobox', { name: 'Filtered choice' })
    fireEvent.input(input, { target: { value: 'Be' } })
    await settle()
    expect(new FormData(form).get('filtered')).toBe('Alpha')
    expect(form.querySelector('select')).toBe(native)
    expect(
      Array.from(native.options).find((option) => option.value === 'Alpha'),
    ).toBe(alpha)
    checkPhase('filter Be while Alpha accepted')
    expect(requested).not.toHaveBeenCalled()
    expect(Array.from(native.options, (option) => option.value)).toContain(
      'Beta',
    )
    native.value = 'Beta'
    fireEvent.change(native)
    await settle()
    expect(requested).toHaveBeenCalledTimes(1)
    expect(requested).toHaveBeenLastCalledWith('Beta')
    expect(new FormData(form).get('filtered')).toBe('Alpha')
    checkPhase('reject native Beta')
    accept = true
    fireEvent.input(input, { target: { value: 'Be' } })
    await settle()
    expect(Array.from(native.options, (option) => option.value)).toContain(
      'Beta',
    )
    native.value = 'Beta'
    fireEvent.change(native)
    await settle()
    checkPhase('accept native Beta after refilter')
    expect(requested).toHaveBeenCalledTimes(2)
    expect(requested).toHaveBeenLastCalledWith('Beta')
    expect(new FormData(form).get('filtered')).toBe('Beta')
    expect(form.querySelector('select')).toBe(native)
    fireEvent.input(input, { target: { value: 'zz' } })
    await settle()
    expect(new FormData(form).get('filtered')).toBe('Beta')
    fireEvent.input(input, { target: { value: '' } })
    await settle()
    expect(new FormData(form).get('filtered')).toBe('Beta')
    checkPhase('unmatched filter and clear draft')
    fireEvent.reset(form)
    await settle()
    checkPhase('reset')
    expect(requested).toHaveBeenCalledTimes(3)
    expect(requested).toHaveBeenLastCalledWith('Alpha')
    expect(new FormData(form).get('filtered')).toBe('Alpha')
    expect(form.querySelector('select')).toBe(native)
  } finally {
    try {
      h?.unmount()
      await settle()
    } finally {
      diagnostics = capture.stop()
    }
  }
  expect(diagnostics).toEqual([])
})
