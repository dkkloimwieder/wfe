import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
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
