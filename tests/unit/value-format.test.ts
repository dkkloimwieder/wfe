import { describe, expect, it } from 'vitest'
import { formatDisplayValue } from '../../packages/components/src/utils/valueFormat'

describe('value formatting', () => {
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
