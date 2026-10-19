import { describe, expect, it, vi } from 'vitest'
import {
  dateFormatter,
  numberFormatter,
} from '../../packages/components/src/utils/intlFormat'
import { formatDisplayValue } from '../../packages/components/src/utils/valueFormat'

describe('value formatting', () => {
  it('shortens string identifiers by codepoint without changing other scalar values', () => {
    expect(formatDisplayValue('0123456789abcdef', 'short-hash')).toBe(
      '01234567',
    )
    expect(formatDisplayValue('abc', 'short-hash')).toBe('abc')
    expect(formatDisplayValue('', 'short-hash')).toBe('')
    expect(formatDisplayValue(123456789, 'short-hash')).toBe('123456789')
    expect(formatDisplayValue(false, 'short-hash')).toBe('false')
  })
  it('preserves false, zero and empty values', () => {
    expect(formatDisplayValue(false, 'boolean-text')).toBe('No')
    expect(formatDisplayValue(true, 'boolean-symbol')).toBe('Yes')
    expect(formatDisplayValue(0, 'number-decimal')).toBe('0.00')
    expect(formatDisplayValue(null, 'number-decimal')).toBe('')
    expect(formatDisplayValue(undefined, 'boolean-symbol')).toBe('')
  })
  it('formats date-only values without changing the calendar day', () => {
    expect(formatDisplayValue('2024-02-29', 'date-short')).toBe('02/29/2024')
    expect(formatDisplayValue('2024-02-29', 'date-long')).toBe(
      'February 29, 2024',
    )
    expect(formatDisplayValue('2024-02-29', 'date-short', 'en-GB')).toBe(
      '29/02/2024',
    )
    expect(formatDisplayValue('2024-02-30', 'date-long')).toBe('2024-02-30')
    expect(formatDisplayValue('0001-01-01', 'date-iso')).toBe('0001-01-01')
  })
  it('groups and rounds only display text', () => {
    expect(formatDisplayValue(12345.678, 'number-plain')).toBe('12345.678')
    expect(formatDisplayValue(12345.678, 'number-grouped')).toBe('12,345.678')
    expect(formatDisplayValue(12345.678, 'number-decimal')).toBe('12,345.68')
    expect(formatDisplayValue(-3.25, 'number-decimal', 'de-DE')).toBe('-3,25')
    expect(formatDisplayValue(1e-25, 'number-grouped')).toBe(
      '0.0000000000000000000000001',
    )
    expect(formatDisplayValue(Infinity, 'number-grouped')).toBe('Infinity')
    expect(formatDisplayValue('123', 'number-decimal')).toBe('123')
  })
})

describe('configured date and datetime output', () => {
  it('shares date-only formats and ignores zones without moving the calendar day', () => {
    for (const timeZone of [
      'UTC',
      'America/New_York',
      'Asia/Kathmandu',
      'browser',
    ])
      expect(
        formatDisplayValue('2024-02-29', 'date', {
          dateFormat: 'dd/MM/yyyy',
          timeZone,
        }),
      ).toBe('29/02/2024')
    expect(
      formatDisplayValue('2024-02-29', 'date', {
        dateFormat: 'locale',
        locale: 'en-GB',
      }),
    ).toBe('29/02/2024')
    expect(
      formatDisplayValue('0001-01-01', 'date', { dateFormat: 'dd/MM/yyyy' }),
    ).toBe('01/01/0001')
  })
  it('formats one instant in explicit zones and defaults to deterministic UTC', () => {
    const value = '2024-02-29T02:15:16.123Z'
    expect(formatDisplayValue(value, 'datetime')).toBe('2024-02-29 02:15')
    expect(
      formatDisplayValue(value, 'datetime', {
        dateFormat: 'dd/MM/yyyy',
        timeZone: 'America/New_York',
        timeFormat: 'hh:mm:ss a',
      }),
    ).toBe('28/02/2024 09:15:16 PM')
    expect(
      formatDisplayValue(value, 'datetime', { timeZone: 'Asia/Kathmandu' }),
    ).toBe('2024-02-29 08:00')
    expect(formatDisplayValue('2024-02-29T09:15-05:30', 'datetime-iso')).toBe(
      '2024-02-29T14:45:00.000Z',
    )
  })
  it('converts existing DST instants without treating their local clock as a new input', () => {
    expect(
      formatDisplayValue('2024-03-10T06:30Z', 'datetime', {
        timeZone: 'America/New_York',
      }),
    ).toBe('2024-03-10 01:30')
    expect(
      formatDisplayValue('2024-03-10T07:30Z', 'datetime', {
        timeZone: 'America/New_York',
      }),
    ).toBe('2024-03-10 03:30')
    for (const value of ['2024-11-03T05:30Z', '2024-11-03T06:30Z'])
      expect(
        formatDisplayValue(value, 'datetime', { timeZone: 'America/New_York' }),
      ).toBe('2024-11-03 01:30')
  })
  it('preserves malformed record values but reports invalid display configuration', () => {
    for (const value of [
      '2024-02-30T00:00Z',
      '2024-01-01T00:00',
      '2024-01-01T00:00:00.1234Z',
      'unavailable',
    ])
      for (const format of ['datetime', 'datetime-iso'] as const)
        expect(formatDisplayValue(value, format)).toBe(value)
    expect(formatDisplayValue('2024-02-30', 'date')).toBe('2024-02-30')
    expect(formatDisplayValue(0, 'datetime')).toBe('0')
    expect(formatDisplayValue(null, 'datetime')).toBe('')
    expect(() =>
      formatDisplayValue('2024-01-01T00:00Z', 'datetime', {
        timeZone: 'browser',
      }),
    ).toThrow('Resolve the browser timezone')
    expect(() =>
      formatDisplayValue('invalid', 'datetime', { timeZone: 'Invalid/Zone' }),
    ).toThrow(RangeError)
    expect(() =>
      formatDisplayValue('invalid', 'date', { dateFormat: 'MMMM dd yyyy' }),
    ).toThrow(RangeError)
    expect(() =>
      formatDisplayValue('invalid', 'datetime', { timeFormat: 'bad' as never }),
    ).toThrow(RangeError)
  })
  it('keeps existing locale arguments and option objects equivalent', () => {
    for (const format of [
      'date-short',
      'date-long',
      'number-grouped',
      'number-decimal',
    ] as const)
      expect(
        formatDisplayValue(
          format.startsWith('date') ? '2024-02-29' : 12345.67,
          format,
          { locale: 'de-DE' },
        ),
      ).toBe(
        formatDisplayValue(
          format.startsWith('date') ? '2024-02-29' : 12345.67,
          format,
          'de-DE',
        ),
      )
  })
  it('reuses formatting machinery and evicts old configurations instead of retaining unlimited entries', () => {
    const date = vi.spyOn(Intl, 'DateTimeFormat')
    const number = vi.spyOn(Intl, 'NumberFormat')
    try {
      const firstDate = dateFormatter('en-US-x-display-test', {
        timeZone: 'UTC',
        year: 'numeric',
      })
      const firstNumber = numberFormatter('en-US-x-display-test', {
        maximumFractionDigits: 2,
      })
      for (let i = 0; i < 1000; i++) {
        expect(
          dateFormatter('en-US-x-display-test', {
            timeZone: 'UTC',
            year: 'numeric',
          }),
        ).toBe(firstDate)
        expect(
          numberFormatter('en-US-x-display-test', { maximumFractionDigits: 2 }),
        ).toBe(firstNumber)
      }
      expect(date).toHaveBeenCalledTimes(1)
      expect(number).toHaveBeenCalledTimes(1)
      for (let i = 0; i < 40; i++) {
        dateFormatter(`en-US-x-value-${i}`, {
          timeZone: 'UTC',
          year: 'numeric',
        })
        numberFormatter(`en-US-x-value-${i}`, { maximumFractionDigits: 2 })
      }
      expect(
        dateFormatter('en-US-x-display-test', {
          timeZone: 'UTC',
          year: 'numeric',
        }),
      ).not.toBe(firstDate)
      expect(
        numberFormatter('en-US-x-display-test', { maximumFractionDigits: 2 }),
      ).not.toBe(firstNumber)
    } finally {
      date.mockRestore()
      number.mockRestore()
    }
  })
})
