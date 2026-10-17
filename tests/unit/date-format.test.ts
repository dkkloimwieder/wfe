import { describe, expect, it } from 'vitest'
import {
  dateInputPattern,
  formatDateInput,
  parseDateInput,
} from '../../packages/components/src/utils/dateFormat'

describe('date input formats', () => {
  it('round trips Gregorian dates without a timezone conversion', () => {
    for (const value of [
      '0001-01-01',
      '0099-12-31',
      '2024-02-29',
      '9999-12-31',
    ])
      for (const format of [
        'yyyy-MM-dd',
        'dd/MM/yyyy',
        'MM/dd/yyyy',
        'dd.MM.yyyy',
        'yyyyMMdd',
        'yyyy[MM](dd)',
      ])
        expect(parseDateInput(formatDateInput(value, format), format)).toBe(
          value,
        )
    expect(formatDateInput('2026-10-17', 'dd/MM/yyyy')).toBe('17/10/2026')
    expect(formatDateInput('2026-10-17', 'MM/dd/yyyy')).toBe('10/17/2026')
  })
  it('uses locale date order with explicit Gregorian numeric input', () => {
    expect(formatDateInput('2026-10-17', 'locale', 'en-US')).toBe('10/17/2026')
    expect(formatDateInput('2026-10-17', 'locale', 'en-GB')).toBe('17/10/2026')
    for (const locale of ['en-US', 'en-GB', 'de-DE', 'ar-EG', 'ja-JP']) {
      const text = formatDateInput('2026-10-17', 'locale', locale)
      expect(parseDateInput(text, 'locale', locale)).toBe('2026-10-17')
    }
  })
  it('rejects partial, impossible, and ambiguous input without guessing order', () => {
    for (const value of [
      '02/30/2024',
      '13/01/2024',
      '2/29/2024',
      '02/29/24',
      '02/29/2024x',
    ])
      expect(parseDateInput(value, 'MM/dd/yyyy')).toBeUndefined()
    expect(parseDateInput('2024x04x05', 'yyyy.MM.dd')).toBeUndefined()
    expect(parseDateInput('04/05/2024', 'MM/dd/yyyy')).toBe('2024-04-05')
    expect(parseDateInput('04/05/2024', 'dd/MM/yyyy')).toBe('2024-05-04')
    expect(formatDateInput(undefined, 'dd/MM/yyyy')).toBe('')
  })
  it('rejects unsupported patterns and invalid controlled dates explicitly', () => {
    for (const format of [
      '',
      'YYYY-MM-DD',
      'yyyy-MM',
      'yyyy-MM-MM-dd',
      'MMMM dd yyyy',
    ])
      expect(() => dateInputPattern(format)).toThrow(RangeError)
    expect(() => formatDateInput('2023-02-29')).toThrow(RangeError)
  })
})
