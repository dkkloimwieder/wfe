import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { ColorPicker, Field, Label } from '@wfe/components'

afterEach(cleanup)

test('hex drafts block submission, Escape restores value, and accepted edits submit canonical color', () => {
  const h = render(() => {
    const [color, setColor] = createSignal('#3569c8')
    return (
      <form>
        <Field>
          <Label>Accent</Label>
          <ColorPicker
            label="Accent"
            name="accent"
            value={color()}
            onValueChange={setColor}
          />
        </Field>
      </form>
    )
  })
  const input = h.getByRole<HTMLInputElement>('textbox', { name: 'Accent' })
  const submitted = () =>
    new FormData(h.container.querySelector('form')!).get('accent')
  fireEvent.input(input, { target: { value: '#ab' } })
  flush()
  expect(input.value).toBe('#ab')
  expect(input.validity.customError).toBe(true)
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(submitted()).toBe('#3569c8')
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(input.value).toBe('#3569c8')
  expect(input.validity.valid).toBe(true)
  fireEvent.input(input, { target: { value: '#AABBCC' } })
  flush()
  expect(input.value).toBe('#aabbcc')
  expect(submitted()).toBe('#aabbcc')
})

test('rejected valid requests reset on blur and external values replace drafts', () => {
  const changed = vi.fn()
  let update!: (value: string) => void
  const h = render(() => {
    const [color, setColor] = createSignal('#112233')
    update = setColor
    return <ColorPicker label="Color" value={color()} onValueChange={changed} />
  })
  const input = h.getByRole<HTMLInputElement>('textbox')
  fireEvent.input(input, { target: { value: '#445566' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('#445566')
  fireEvent.blur(input)
  flush()
  expect(input.value).toBe('#112233')
  fireEvent.input(input, { target: { value: 'bad' } })
  update('#aabbcc')
  flush()
  expect(input.value).toBe('#aabbcc')
  expect(input.validity.valid).toBe(true)
})

test('popup channels update the application-owned color', async () => {
  const h = render(() => {
    const [color, setColor] = createSignal('#112233')
    return (
      <ColorPicker label="Accent" value={color()} onValueChange={setColor} />
    )
  })
  const trigger = h.getByRole('button', { name: 'Choose Accent color' })
  trigger.focus()
  fireEvent.click(trigger)
  flush()
  const red = await h.findByRole<HTMLInputElement>('slider', { name: 'Red' })
  fireEvent.input(red, { target: { value: '255' } })
  flush()
  expect(h.getByRole<HTMLInputElement>('textbox').value).toBe('#ff2233')
})

test.each(['disabled', 'readonly'] as const)(
  '%s inherited from Field prevents edits and popup opening',
  (state) => {
    const changed = vi.fn()
    const h = render(() => (
      <Field disabled={state === 'disabled'} readonly={state === 'readonly'}>
        <ColorPicker label="Color" value="#112233" onValueChange={changed} />
      </Field>
    ))
    const input = h.getByRole<HTMLInputElement>('textbox')
    expect(state === 'disabled' ? input.disabled : input.readOnly).toBe(true)
    expect(h.getByRole<HTMLButtonElement>('button').disabled).toBe(true)
    fireEvent.input(input, { target: { value: '#ffffff' } })
    flush()
    expect(changed).not.toHaveBeenCalled()
  },
)
