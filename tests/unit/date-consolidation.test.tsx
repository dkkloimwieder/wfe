import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Calendar, DatePicker } from '@wfe/components'
import { dateFormatter } from '../../packages/components/src/utils/intlFormat'
import {
  dateValue,
  isDateWithinBounds,
  parseDate,
} from '../../packages/components/src/utils/date'
import {
  dateTimeParts,
  normalizeInstant,
} from '../../packages/components/src/utils/dateTime'

afterEach(cleanup)

test('date-only open and inclusive bounds preserve leap days and early Gregorian years', () => {
  for (const value of [
    '0001-01-01',
    '0099-12-31',
    '2024-02-29',
    '9999-12-31',
  ]) {
    expect(dateValue(parseDate(value)!)).toBe(value)
    expect(isDateWithinBounds(value)).toBe(true)
    expect(isDateWithinBounds(value, value)).toBe(true)
    expect(isDateWithinBounds(value, undefined, value)).toBe(true)
    expect(isDateWithinBounds(value, value, value)).toBe(true)
  }
  expect(isDateWithinBounds('2024-02-28', '2024-02-29')).toBe(false)
  expect(isDateWithinBounds('2024-03-01', undefined, '2024-02-29')).toBe(false)
  expect(isDateWithinBounds('2024-02-29', '2024-03-01', '2024-02-28')).toBe(
    false,
  )
  for (const value of ['0000-01-01', '10000-01-01', '2023-02-29', 'invalid'])
    expect(parseDate(value)).toBeUndefined()
})

test('calendar locale changes relabel retained dates without changing bounds, focus or accepted values', () => {
  const [locale, setLocale] = createSignal('en-US')
  const changed = vi.fn()
  const h = render(() => (
    <Calendar
      value="2024-02-29"
      locale={locale()}
      min="2024-02-29"
      max="2024-02-29"
      onValueChange={changed}
    />
  ))
  const day = h.container.querySelector<HTMLButtonElement>(
    '[data-date="2024-02-29"]',
  )!
  const before = h.container.querySelector<HTMLButtonElement>(
    '[data-date="2024-02-28"]',
  )!
  const after = h.container.querySelector<HTMLButtonElement>(
    '[data-date="2024-03-01"]',
  )!
  expect(before.disabled).toBe(true)
  expect(after.disabled).toBe(true)
  expect(day.disabled).toBe(false)
  day.focus()
  setLocale('fr-FR')
  flush()
  expect(h.container.querySelector('[data-date="2024-02-29"]')).toBe(day)
  expect(document.activeElement).toBe(day)
  expect(day.getAttribute('aria-label')).toBe(
    new Intl.DateTimeFormat('fr-FR', {
      calendar: 'gregory',
      dateStyle: 'full',
      timeZone: 'UTC',
    }).format(parseDate('2024-02-29')),
  )
  expect(before.disabled).toBe(true)
  expect(after.disabled).toBe(true)
  expect(changed).not.toHaveBeenCalled()
})

test('typed date bounds retain validation callbacks and reject impossible input', () => {
  const changed = vi.fn()
  const validity = vi.fn()
  const h = render(() => (
    <DatePicker
      label="Bounded date"
      min="0099-02-28"
      max="0099-03-01"
      onValueChange={changed}
      onValidityChange={validity}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Bounded date')
  for (const value of ['0099-02-27', '0099-02-29', '0099-03-02']) {
    fireEvent.input(input, { target: { value } })
    flush()
    expect(input.validity.valid).toBe(false)
    expect(validity).toHaveBeenLastCalledWith(false)
  }
  expect(changed).not.toHaveBeenCalled()
  fireEvent.input(input, { target: { value: '0099-02-28' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('0099-02-28')
  expect(validity).toHaveBeenLastCalledWith(true)
})

test('instant normalization and display zones remain separate from date-only bounds', () => {
  expect(normalizeInstant('0099-01-01T00:00:00Z')).toBe(
    '0099-01-01T00:00:00.000Z',
  )
  expect(dateTimeParts('2024-03-01T00:30:00Z', 'UTC').date).toBe('2024-03-01')
  expect(dateTimeParts('2024-03-01T00:30:00Z', 'America/New_York').date).toBe(
    '2024-02-29',
  )
  expect(() => normalizeInstant('2023-02-29T00:00:00Z')).toThrow(RangeError)
  expect(() =>
    dateTimeParts('0001-01-01T00:00:00Z', 'America/New_York'),
  ).toThrow(RangeError)
})

test('formatting machinery is reused by key and evicted without retaining record data', () => {
  const options = {
    calendar: 'gregory',
    dateStyle: 'full',
    timeZone: 'UTC',
  } as const
  const retained = dateFormatter('en-US-x-retained', options)
  expect(dateFormatter('en-US-x-retained', options)).toBe(retained)
  for (let index = 0; index < 40; index++)
    dateFormatter(`en-US-x-cache${index}`, options)
  expect(dateFormatter('en-US-x-retained', options)).not.toBe(retained)
  const french = dateFormatter('fr-FR', options)
  expect(french.format(parseDate('0099-02-28'))).toBe(
    new Intl.DateTimeFormat('fr-FR', options).format(parseDate('0099-02-28')),
  )
})
