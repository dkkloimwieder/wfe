import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Calendar, DatePicker, DateTimePicker } from '@wfe/components'
import type {
  CalendarMessages,
  DatePickerMessages,
  DateTimePickerMessages,
} from '@wfe/components'
afterEach(cleanup)

test('date message changes retain invalid drafts and focus without publishing values or validity again', () => {
  const [messages, setMessages] = createSignal<Partial<DatePickerMessages>>()
  const changed = vi.fn(),
    validity = vi.fn((valid: boolean) => valid)
  const h = render(() => (
    <DatePicker
      label="Date"
      clearLabel="Erase date"
      value="2024-02-29"
      dateFormat="dd/MM/yyyy"
      locale="en-GB"
      messages={messages()}
      onValueChange={changed}
      onValidityChange={validity}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Date')
  fireEvent.input(input, { target: { value: '31/02/2024' } })
  flush()
  input.focus()
  expect(validity).toHaveBeenLastCalledWith(false)
  const calls = validity.mock.calls.length
  setMessages({
    invalidDate: (pattern) => `Fecha inválida: ${pattern}`,
    openCalendar: (label) => `Abrir ${label}`,
    clearDate: () => 'Borrar',
  })
  flush()
  expect(h.getByLabelText('Date')).toBe(input)
  expect(input.value).toBe('31/02/2024')
  expect(document.activeElement).toBe(input)
  expect(input.validationMessage).toBe('Fecha inválida: DD/MM/YYYY')
  expect(h.getByText('Fecha inválida: DD/MM/YYYY')).toBeTruthy()
  expect(h.getByRole('button', { name: 'Erase date' })).toBeTruthy()
  expect(h.getByRole('button', { name: 'Abrir Date' })).toBeTruthy()
  expect(validity).toHaveBeenCalledTimes(calls)
  expect(changed).not.toHaveBeenCalled()
  setMessages({ invalidDate: () => '' })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(validity).toHaveBeenCalledTimes(calls)
  setMessages(undefined)
  flush()
  expect(input.validationMessage).toBe('Enter an available date as DD/MM/YYYY.')
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(input.value).toBe('29/02/2024')
  expect(validity).toHaveBeenLastCalledWith(true)
})

test('datetime messages update native errors while combined input and instant semantics remain intact', () => {
  const [messages, setMessages] =
    createSignal<Partial<DateTimePickerMessages>>()
  const changed = vi.fn(),
    validity = vi.fn((valid: boolean) => valid)
  const h = render(() => (
    <DateTimePicker
      label="Appointment"
      timeLabel="Explicit time"
      timeZone="UTC"
      value="2024-02-29T14:15:00Z"
      messages={messages()}
      onValueChange={changed}
      onValidityChange={validity}
    />
  ))
  const time = h.getByRole<HTMLInputElement>('textbox', { name: 'Appointment' })
  fireEvent.input(time, { target: { value: '2024-02-29 25:00' } })
  flush()
  time.focus()
  const calls = validity.mock.calls.length
  setMessages({
    invalidDateTime: 'Hora inválida',
    time: 'Hora',
    openDateTimePicker: () => 'Abrir calendario',
  })
  flush()
  expect(h.getByRole('textbox', { name: 'Appointment' })).toBe(time)
  expect(time.value).toBe('2024-02-29 25:00')
  expect(document.activeElement).toBe(time)
  expect(time.validationMessage).toBe('Hora inválida')
  expect(h.getByRole('button', { name: 'Abrir calendario' })).toBeTruthy()
  setMessages({ invalidDateTime: '' })
  flush()
  expect(time.validity.customError).toBe(true)
  expect(time.validationMessage).toBe(
    'Enter an available date and time in the displayed timezone.',
  )
  expect(validity).toHaveBeenCalledTimes(calls)
  expect(changed).not.toHaveBeenCalled()
  fireEvent.keyDown(time, { key: 'Escape' })
  flush()
  expect(time.value).toBe('2024-02-29 14:15')
  expect(validity).toHaveBeenLastCalledWith(true)
})

test('calendar messages retain selected days and locale formatting independently', () => {
  const [messages, setMessages] = createSignal<Partial<CalendarMessages>>()
  const changed = vi.fn()
  const h = render(() => (
    <Calendar
      label="Explicit calendar"
      locale="en-US"
      value="2024-02-29"
      min="2024-02-01"
      max="2024-02-29"
      messages={messages()}
      onValueChange={changed}
    />
  ))
  const day = h.container.querySelector<HTMLButtonElement>(
    '[data-date="2024-02-29"]',
  )!
  day.focus()
  const aria = day.getAttribute('aria-label')
  setMessages({
    nextMonth: 'Mes siguiente',
    previousMonth: 'Mes anterior',
    chooseMonthYear: 'Elegir mes',
    year: 'Año',
    keyboardHelp: 'Use las flechas.',
  })
  flush()
  expect(h.getByRole('grid', { name: 'Explicit calendar' })).toBeTruthy()
  expect(h.container.querySelector('[data-date="2024-02-29"]')).toBe(day)
  expect(document.activeElement).toBe(day)
  expect(day.getAttribute('aria-label')).toBe(aria)
  expect(aria).toContain('February')
  expect(h.getByRole('button', { name: 'Mes siguiente' })).toBeTruthy()
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(h.getByRole('button', { name: 'Elegir mes' }))
  flush()
  expect(h.getByLabelText('Año')).toBeTruthy()
  expect(h.getByRole('button', { name: 'March' })).toBeTruthy()
  expect(changed).not.toHaveBeenCalled()
})
