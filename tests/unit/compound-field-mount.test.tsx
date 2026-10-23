import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Combobox, Field, Label, Select } from '@wfe/components'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('default-filter Combobox mounts without strict reads and retains reactive Field associations and state', () => {
  const originalWarn = console.warn.bind(console)
  const warnings = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => originalWarn(...args))
  const [id, setId] = createSignal('first')
  const [locked, setLocked] = createSignal(false)
  const request = vi.fn()
  const h = render(() => (
    <form>
      <Field
        id={id()}
        required={locked()}
        disabled={locked()}
        readonly={locked()}
        invalid={locked()}
      >
        <Label>Choice</Label>
        <Combobox<string>
          options={['Alpha', 'Beta']}
          value="Alpha"
          name="choice"
          onValueChange={request}
        >
          <Combobox.Input />
          <Combobox.Trigger aria-label="Open choices" />
          <Combobox.HiddenSelect />
        </Combobox>
      </Field>
    </form>
  ))
  flush()
  const input = h.getByRole<HTMLInputElement>('combobox', { name: 'Choice' })
  expect(input.value).toBe('Alpha')
  expect(input.id).toBe('first-control')
  expect(new FormData(h.container.querySelector('form')!).get('choice')).toBe(
    'Alpha',
  )
  setId('second')
  setLocked(true)
  flush()
  expect(h.getByRole('combobox', { name: 'Choice' })).toBe(input)
  expect(input.id).toBe('second-control')
  expect(h.getByText('Choice').getAttribute('for')).toBe(input.id)
  expect(input.disabled).toBe(true)
  expect(input.readOnly).toBe(true)
  expect(input.required).toBe(true)
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(input.value).toBe('Alpha')
  setLocked(false)
  flush()
  expect(input.disabled).toBe(false)
  expect(input.readOnly).toBe(false)
  expect(input.required).toBe(false)
  expect(request).not.toHaveBeenCalled()
  h.unmount()
  setId('disposed')
  flush()
  expect(input.id).toBe('second-control')
  expect(
    warnings.mock.calls.filter((args) =>
      args.some(
        (value) =>
          typeof value === 'string' &&
          value.includes('[STRICT_READ_UNTRACKED]'),
      ),
    ),
  ).toEqual([])
})

test('Select listbox retains explicit ID changes without strict mount reads', () => {
  const originalWarn = console.warn.bind(console)
  const warnings = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => originalWarn(...args))
  const [id, setId] = createSignal('choices-first')
  const request = vi.fn()
  const h = render(() => (
    <Field>
      <Label>Selection</Label>
      <Select<string>
        options={['Alpha', 'Beta']}
        value="Alpha"
        open
        onValueChange={request}
        itemComponent={(props) => (
          <Select.Item item={props.item}>
            <Select.ItemLabel>{props.item.rawValue}</Select.ItemLabel>
          </Select.Item>
        )}
      >
        <Select.Trigger>Alpha</Select.Trigger>
        <Select.Listbox id={id()} />
      </Select>
    </Field>
  ))
  flush()
  const list = h.getByRole('listbox')
  const trigger = h.getByRole('button', { name: 'Selection' })
  expect(trigger.getAttribute('aria-controls')).toBe('choices-first')
  expect(
    h.getByRole('option', { name: 'Alpha' }).getAttribute('aria-selected'),
  ).toBe('true')
  setId('choices-second')
  flush()
  expect(h.getByRole('listbox')).toBe(list)
  expect(list.id).toBe('choices-second')
  expect(trigger.getAttribute('aria-controls')).toBe('choices-second')
  expect(request).not.toHaveBeenCalled()
  h.unmount()
  expect(
    warnings.mock.calls.filter((args) =>
      args.some(
        (value) =>
          typeof value === 'string' &&
          value.includes('[STRICT_READ_UNTRACKED]'),
      ),
    ),
  ).toEqual([])
})
