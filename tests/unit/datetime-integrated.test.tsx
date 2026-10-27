import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { DateTimePicker } from '@wfe/components'

afterEach(cleanup)

test('combined datetime input retains incomplete and DST-gap drafts without changing accepted submission', () => {
  const changed = vi.fn()
  const h = render(() => (
    <form>
      <DateTimePicker
        label="Appointment"
        name="appointment"
        value="2026-03-08T06:30:45.123Z"
        timeZone="America/New_York"
        onValueChange={changed}
      />
    </form>
  ))
  const input = h.getByRole<HTMLInputElement>('textbox', {
    name: 'Appointment',
  })
  expect(h.getAllByRole('textbox')).toHaveLength(1)
  expect(input.value).toBe('2026-03-08 01:30')
  fireEvent.input(input, { target: { value: '2026-03-08' } })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(input.hasAttribute('data-ui-invalid-input')).toBe(true)
  fireEvent.blur(input)
  flush()
  expect(input.value).toBe('2026-03-08')
  fireEvent.input(input, { target: { value: '2026-03-08 02:30' } })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(changed).not.toHaveBeenCalled()
  expect(
    new FormData(h.container.querySelector('form')!).get('appointment'),
  ).toBe('2026-03-08T06:30:45.123Z')
  fireEvent.input(input, { target: { value: '2026-03-08 03:30' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('2026-03-08T07:30:45.123Z')
  expect(input.validity.customError).toBe(false)
  fireEvent.blur(input)
  flush()
  expect(input.value).toBe('2026-03-08 01:30')
})

test('combined locale patterns, hidden precision, bounds, and application errors remain independent', () => {
  const [value, setValue] = createSignal<string | undefined>(
    '2026-10-25T13:15:27.321Z',
  )
  const changed = vi.fn((next: string | undefined) => setValue(next))
  const h = render(() => (
    <DateTimePicker
      label="Meeting"
      value={value()}
      onValueChange={changed}
      timeZone="UTC"
      dateFormat="dd MM yyyy"
      timeFormat="hh:mm a"
      locale="en-US"
      invalid
      min="2026-10-25T12:00:00Z"
      max="2026-10-25T18:00:00Z"
    />
  ))
  const input = h.getByRole<HTMLInputElement>('textbox', { name: 'Meeting' })
  expect(input.value).toBe('25 10 2026 01:15 PM')
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(input.hasAttribute('data-ui-invalid-input')).toBe(false)
  expect(input.validity.customError).toBe(false)
  fireEvent.input(input, { target: { value: '25 10 2026 11:30 AM' } })
  flush()
  expect(changed).not.toHaveBeenCalled()
  expect(input.validity.customError).toBe(true)
  fireEvent.input(input, { target: { value: '25 10 2026 02:30 PM' } })
  flush()
  expect(value()).toBe('2026-10-25T14:30:27.321Z')
  expect(input.validity.customError).toBe(false)
  fireEvent.input(input, { target: { value: 'bad' } })
  flush()
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(input.value).toBe('25 10 2026 02:30 PM')
})

test('popup date selection stages changes until Apply and Cancel discards them', async () => {
  const changed = vi.fn()
  const h = render(() => (
    <DateTimePicker
      label="Appointment"
      timeView="clock"
      value="2026-03-09T13:15:27.123Z"
      timeZone="UTC"
      onValueChange={changed}
    />
  ))
  const trigger = h.getByRole('button', {
    name: 'Open Appointment date and time picker',
  })
  fireEvent.click(trigger)
  flush()
  const day = await h.findByRole('button', { name: 'Tuesday, March 10, 2026' })
  day.focus()
  fireEvent.click(day)
  flush()
  expect(changed).not.toHaveBeenCalled()
  expect(
    h.getByRole<HTMLInputElement>('textbox', { name: 'Appointment' }).value,
  ).toBe('2026-03-09 13:15')
  fireEvent.click(h.getByRole('button', { name: 'Cancel' }))
  flush()
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(trigger)
  flush()
  fireEvent.click(
    await h.findByRole('button', { name: 'Tuesday, March 10, 2026' }),
  )
  flush()
  const apply = h.getByRole('button', { name: 'Apply date and time' })
  apply.focus()
  fireEvent.click(apply)
  flush()
  expect(changed).toHaveBeenCalledExactlyOnceWith('2026-03-10T13:15:27.123Z')
  expect(document.activeElement).toBe(trigger)
  expect(
    h.getByRole<HTMLInputElement>('textbox', { name: 'Appointment' }).value,
  ).toBe('2026-03-09 13:15')
})

test('popup cancellation and edits never publish through disabled or readonly controls', () => {
  const changed = vi.fn()
  const h = render(() => (
    <DateTimePicker
      label="Locked"
      value="2026-10-25T13:15:00Z"
      timeZone="UTC"
      readonly
      onValueChange={changed}
    />
  ))
  const input = h.getByRole<HTMLInputElement>('textbox', { name: 'Locked' })
  fireEvent.input(input, { target: { value: '2026-10-25 14:15' } })
  flush()
  fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true })
  flush()
  expect(h.queryByRole('dialog')).toBeNull()
  expect(changed).not.toHaveBeenCalled()
})

test('default columns share a popup with the calendar and never commit intermediate choices', async () => {
  const changed = vi.fn()
  const h = render(() => (
    <DateTimePicker
      label="Start"
      value="2026-10-25T13:15:27.123Z"
      timeZone="UTC"
      onValueChange={changed}
    />
  ))
  fireEvent.click(
    h.getByRole('button', { name: 'Open Start date and time picker' }),
  )
  flush()
  expect(await h.findByRole('listbox', { name: 'Hour' })).toBeTruthy()
  expect(
    h.getByRole('button', { name: 'Sunday, October 25, 2026' }),
  ).toBeTruthy()
  const hours = h.getByRole('listbox', { name: 'Hour' })
  const option = hours.querySelector<HTMLElement>(
    '[role="option"][tabindex="0"]',
  )!
  option.focus()
  fireEvent.keyDown(option, { key: 'ArrowDown' })
  flush()
  expect(changed).not.toHaveBeenCalled()
  const apply = h.getByRole('button', { name: 'Apply date and time' })
  apply.focus()
  fireEvent.click(apply)
  flush()
  expect(changed).toHaveBeenCalledExactlyOnceWith('2026-10-25T14:15:27.123Z')
})

test('staged popup rejects DST gaps and preserves accepted precision when corrected', async () => {
  const [value, setValue] = createSignal<string | undefined>(
    '2024-03-10T06:30:45.123Z',
  )
  const changed = vi.fn((next: string | undefined) => setValue(next))
  const h = render(() => (
    <form>
      <DateTimePicker
        label="Start"
        name="start"
        value={value()}
        timeZone="America/New_York"
        onValueChange={changed}
      />
    </form>
  ))
  fireEvent.click(
    h.getByRole('button', { name: 'Open Start date and time picker' }),
  )
  flush()
  const hours = await h.findByRole('listbox', { name: 'Hour' })
  fireEvent.click(hours.querySelector<HTMLElement>('[data-time-value="2"]')!)
  flush()
  expect(
    h.getByRole<HTMLButtonElement>('button', { name: 'Apply date and time' })
      .disabled,
  ).toBe(true)
  expect(changed).not.toHaveBeenCalled()
  const input = h.getByRole<HTMLInputElement>('textbox', { name: 'Start' })
  expect(input.validity.customError).toBe(false)
  expect(input.value).toBe('2024-03-10 01:30')
  expect(new FormData(h.container.querySelector('form')!).get('start')).toBe(
    '2024-03-10T06:30:45.123Z',
  )
  fireEvent.click(hours.querySelector<HTMLElement>('[data-time-value="3"]')!)
  flush()
  fireEvent.click(h.getByRole('button', { name: 'Apply date and time' }))
  flush()
  expect(value()).toBe('2024-03-10T07:30:45.123Z')
  expect(input.value).toBe('2024-03-10 03:30')
})

test('rejected valid text stays within the composite and seeds its popup until outside blur', async () => {
  const changed = vi.fn()
  const h = render(() => (
    <div>
      <DateTimePicker
        label="Start"
        value="2026-10-25T14:15:27.123Z"
        timeZone="UTC"
        onValueChange={changed}
      />
      <button type="button">Outside</button>
    </div>
  ))
  const input = h.getByRole<HTMLInputElement>('textbox', { name: 'Start' })
  input.focus()
  fireEvent.input(input, { target: { value: '2026-10-25 15:20' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('2026-10-25T15:20:27.123Z')
  const trigger = h.getByRole('button', {
    name: 'Open Start date and time picker',
  })
  trigger.focus()
  flush()
  expect(input.value).toBe('2026-10-25 15:20')
  fireEvent.click(trigger)
  flush()
  const hours = await h.findByRole('listbox', { name: 'Hour' })
  expect(
    within(hours).getByRole('option', { selected: true }).textContent,
  ).toBe('15')
  expect(
    within(h.getByRole('listbox', { name: 'Minute' })).getByRole('option', {
      selected: true,
    }).textContent,
  ).toBe('20')
  fireEvent.click(h.getByRole('button', { name: 'Monday, October 26, 2026' }))
  flush()
  fireEvent.click(h.getByRole('button', { name: 'Apply date and time' }))
  flush()
  expect(changed).toHaveBeenLastCalledWith('2026-10-26T15:20:27.123Z')
  input.focus()
  fireEvent.input(input, { target: { value: '2026-10-25 15:20' } })
  flush()
  h.getByRole('button', { name: 'Outside' }).focus()
  flush()
  expect(input.value).toBe('2026-10-25 14:15')
})

test('outside-month calendar redraw preserves the composite draft but outside focus restores it', async () => {
  const changed = vi.fn()
  const h = render(() => (
    <div>
      <DateTimePicker
        label="Start"
        value="2024-02-29T14:15:27.123Z"
        timeZone="UTC"
        onValueChange={changed}
      />
      <button type="button">Outside</button>
    </div>
  ))
  const input = h.getByRole<HTMLInputElement>('textbox', { name: 'Start' })
  input.focus()
  fireEvent.input(input, { target: { value: '2024-02-29 15:20' } })
  flush()
  const trigger = h.getByRole('button', {
    name: 'Open Start date and time picker',
  })
  trigger.focus()
  fireEvent.click(trigger)
  flush()
  const day = await h.findByRole('button', { name: 'Friday, March 1, 2024' })
  day.focus()
  // Chromium emits this null-target focusout as the calendar redraw removes
  // the old month. Dispatch before the commit so the old popup owns the event.
  fireEvent.focusOut(day, { relatedTarget: null })
  fireEvent.click(day)
  flush()
  await Promise.resolve()
  flush()
  expect(day.isConnected).toBe(false)
  expect(input.value).toBe('2024-02-29 15:20')
  const hour = within(h.getByRole('listbox', { name: 'Hour' })).getByRole(
    'option',
    { selected: true },
  )
  hour.focus()
  flush()
  expect(input.value).toBe('2024-02-29 15:20')
  h.getByRole('button', { name: 'Outside' }).focus()
  flush()
  expect(input.value).toBe('2024-02-29 14:15')
})
