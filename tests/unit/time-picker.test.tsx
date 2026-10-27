import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  DateTimePicker,
  TimePicker,
  type TimePickerMessages,
} from '@wfe/components'
import { TimePickerControl } from '../../packages/components/src/components/TimePicker'

afterEach(cleanup)

async function choose(
  h: ReturnType<typeof render>,
  label: RegExp,
  value: string,
) {
  const trigger = await h.findByRole('button', { name: label })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  const option = await h.findByRole('option', { name: value })
  option.focus()
  fireEvent.keyDown(option, { key: 'Enter' })
  flush()
}

test('time drafts retain invalid input and reset rejected valid requests on blur', () => {
  const changed = vi.fn()
  const validity = vi.fn()
  const h = render(() => (
    <TimePicker
      label="Start"
      name="start"
      value="09:15"
      min="08:00"
      max="18:00"
      onValueChange={changed}
      onValidityChange={validity}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Start')
  fireEvent.input(input, { target: { value: '25:00' } })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(validity).toHaveBeenLastCalledWith(false)
  fireEvent.blur(input)
  flush()
  expect(input.value).toBe('25:00')
  expect(changed).not.toHaveBeenCalled()
  fireEvent.input(input, { target: { value: '07:59' } })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(changed).not.toHaveBeenCalled()
  fireEvent.input(input, { target: { value: '18:00' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('18:00')
  expect(validity).toHaveBeenLastCalledWith(true)
  fireEvent.blur(input)
  flush()
  expect(input.value).toBe('09:15')
  expect(
    h.container.querySelector<HTMLInputElement>('input[type="hidden"]')!.value,
  ).toBe('09:15')
  fireEvent.input(input, { target: { value: 'invalid' } })
  flush()
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(input.value).toBe('09:15')
})

test('time presentation preserves hidden seconds, and accepted clearing updates canonical submission', () => {
  const [value, setValue] = createSignal<string | undefined>('13:05:27')
  const changed = vi.fn((next: string | undefined) => setValue(next))
  const h = render(() => (
    <TimePicker
      label="Clock"
      name="clock"
      value={value()}
      timeFormat="hh:mm a"
      onValueChange={changed}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Clock')
  expect(input.value).toBe('01:05 PM')
  fireEvent.input(input, { target: { value: '12:30 AM' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('00:30:27')
  expect(value()).toBe('00:30:27')
  expect(
    h.container.querySelector<HTMLInputElement>('input[type="hidden"]')!.value,
  ).toBe('00:30:27')
  fireEvent.click(h.getByRole('button', { name: 'Clear Clock' }))
  flush()
  expect(value()).toBeUndefined()
  expect(input.value).toBe('')
  expect(document.activeElement).toBe(input)
})

test('time messages update validation without resetting drafts or republishing validity', () => {
  const [messages, setMessages] = createSignal<Partial<TimePickerMessages>>()
  const changed = vi.fn(),
    valid = vi.fn()
  const h = render(() => (
    <TimePicker
      label="Time"
      value="14:30:15"
      timeFormat="HH:mm:ss"
      messages={messages()}
      onValueChange={changed}
      onValidityChange={valid}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Time')
  fireEvent.input(input, { target: { value: '14:99:15' } })
  flush()
  input.focus()
  const calls = valid.mock.calls.length
  setMessages({
    invalidTime: (pattern) => `Hora: ${pattern}`,
    openTimePicker: () => 'Elegir hora',
  })
  flush()
  expect(input.value).toBe('14:99:15')
  expect(input.validationMessage).toBe('Hora: HH:mm:ss')
  expect(document.activeElement).toBe(input)
  expect(valid).toHaveBeenCalledTimes(calls)
  expect(h.getByRole('button', { name: 'Elegir hora' })).toBeTruthy()
  expect(changed).not.toHaveBeenCalled()
  setMessages({ invalidTime: () => '' })
  flush()
  expect(input.validity.customError).toBe(true)
})

test('time popup uses shared choices, waits for apply, preserves focus and accepted seconds', async () => {
  const [value, setValue] = createSignal<string | undefined>('09:15:42')
  const changed = vi.fn((next: string | undefined) => setValue(next))
  const h = render(() => (
    <TimePicker label="Start" value={value()} onValueChange={changed} />
  ))
  const trigger = h.getByRole('button', { name: 'Open Start time picker' })
  fireEvent.click(trigger)
  flush()
  await choose(h, /^Minute /, '30')
  expect(changed).not.toHaveBeenCalled()
  const apply = h.getByRole('button', { name: 'Apply time' })
  apply.focus()
  fireEvent.click(apply)
  flush()
  expect(changed).toHaveBeenLastCalledWith('09:30:42')
  expect(value()).toBe('09:30:42')
  await waitFor(() => expect(document.activeElement).toBe(trigger))
  expect(
    h.getByRole<HTMLInputElement>('textbox', { name: 'Start' }).value,
  ).toBe('09:30')
})

test('time popup supports seconds and localized period selection without changing a rejected owner', async () => {
  const changed = vi.fn()
  const h = render(() => (
    <TimePicker
      label="Time"
      value="12:15:10"
      timeFormat="hh:mm:ss a"
      locale="en-US"
      onValueChange={changed}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Time')
  fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true })
  flush()
  await choose(h, /^AM\/PM /, 'AM')
  await choose(h, /^Second /, '20')
  fireEvent.click(h.getByRole('button', { name: 'Apply time' }))
  flush()
  expect(changed).toHaveBeenLastCalledWith('00:15:20')
  expect(input.value).toBe('12:15:10 PM')
})

test('composed time delegates partial drafts and native errors to its owner', () => {
  const [draft, setDraft] = createSignal('')
  const reset = vi.fn(),
    changed = vi.fn()
  const h = render(() => (
    <TimePickerControl
      label="Time"
      value="12:00"
      draftValue={draft()}
      onDraftChange={setDraft}
      onValueChange={changed}
      onDraftReset={reset}
      externalValidation
      draftInvalid
      inputRef={(node) => node.setCustomValidity('Parent datetime error')}
      invalid
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Time')
  fireEvent.input(input, { target: { value: '1:' } })
  flush()
  fireEvent.blur(input)
  flush()
  expect(input.value).toBe('1:')
  expect(input.validationMessage).toBe('Parent datetime error')
  expect(input.hasAttribute('data-ui-invalid-input')).toBe(true)
  expect(changed).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(reset).toHaveBeenCalledOnce()
  expect(input.value).toBe('1:')
})

test('readonly and disabled time controls reject synthetic edits and do not open', () => {
  for (const state of [{ readonly: true }, { disabled: true }]) {
    const changed = vi.fn()
    const h = render(() => (
      <TimePicker
        label="Time"
        value="09:00"
        onValueChange={changed}
        {...state}
      />
    ))
    const input = h.getByLabelText<HTMLInputElement>('Time')
    fireEvent.input(input, { target: { value: '10:00' } })
    fireEvent.click(h.getByRole('button', { name: 'Open Time time picker' }))
    flush()
    expect(changed).not.toHaveBeenCalled()
    expect(h.queryByRole('button', { name: 'Apply time' })).toBeNull()
    h.unmount()
  }
})

test('datetime popup retains rejected DST gaps and preserves accepted hidden precision', async () => {
  const [value, setValue] = createSignal<string | undefined>(
    '2024-03-10T06:30:45.123Z',
  )
  const changed = vi.fn((next: string | undefined) => setValue(next))
  const validity = vi.fn()
  const h = render(() => (
    <DateTimePicker
      label="Appointment"
      timeLabel="Time"
      name="appointment"
      timeZone="America/New_York"
      value={value()}
      onValueChange={changed}
      onValidityChange={validity}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Time')
  const trigger = h.getByRole('button', { name: 'Open Time time picker' })
  expect(input.value).toBe('01:30')
  fireEvent.click(trigger)
  flush()
  await choose(h, /^Hour /, '02')
  const apply = h.getByRole('button', { name: 'Apply time' })
  apply.focus()
  fireEvent.click(apply)
  flush()
  expect(input.value).toBe('02:30')
  expect(input.validity.customError).toBe(true)
  expect(validity).toHaveBeenLastCalledWith(false)
  expect(changed).not.toHaveBeenCalled()
  expect(
    h.container.querySelector<HTMLInputElement>('input[name="appointment"]')!
      .value,
  ).toBe('2024-03-10T06:30:45.123Z')
  fireEvent.click(trigger)
  flush()
  await choose(h, /^Hour /, '03')
  fireEvent.click(h.getByRole('button', { name: 'Apply time' }))
  flush()
  expect(changed).toHaveBeenLastCalledWith('2024-03-10T07:30:45.123Z')
  expect(value()).toBe('2024-03-10T07:30:45.123Z')
  expect(input.value).toBe('03:30')
  expect(input.validity.customError).toBe(false)
  expect(validity).toHaveBeenLastCalledWith(true)
})
