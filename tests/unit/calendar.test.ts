import { describe, expect, it } from 'vitest'
import { parseDate, dateValue } from '../../packages/components/src/utils/date'
import { modifyDate } from '../../packages/components/src/vendor/corvu-calendar/utils'
import { navigateDay } from '../../packages/components/src/vendor/corvu-calendar/navigation'

describe('date-only calendar behavior', () => {
  it('rejects impossible days and accepts leap years and boundary years', () => {
    for (const value of [
      '2023-02-29',
      '2024-02-30',
      '2024-13-01',
      '0000-01-01',
      '10000-01-01',
      '1/2/2024',
    ])
      expect(parseDate(value)).toBeUndefined()
    for (const value of [
      '0001-01-01',
      '0099-12-31',
      '2024-02-29',
      '9999-12-31',
    ])
      expect(dateValue(parseDate(value)!)).toBe(value)
  })
  it('clamps month and year changes instead of overflowing the target month', () => {
    expect(dateValue(modifyDate(parseDate('2024-02-29')!, { year: 1 }))).toBe(
      '2025-02-28',
    )
    expect(dateValue(modifyDate(parseDate('2024-01-31')!, { month: 1 }))).toBe(
      '2024-02-29',
    )
    expect(dateValue(modifyDate(parseDate('0099-12-31')!, { month: 1 }))).toBe(
      '0100-01-31',
    )
  })
  it('skips unavailable dates and stops when no reachable date is enabled', () => {
    const date = parseDate('2024-02-29')!
    const next = navigateDay(
      date,
      'ArrowRight',
      false,
      1,
      false,
      (value) => dateValue(value) === '2024-03-01',
    )
    expect(dateValue(next!)).toBe('2024-03-02')
    expect(
      navigateDay(date, 'ArrowRight', false, 1, false, () => true),
    ).toBeNull()
    expect(
      dateValue(navigateDay(date, 'ArrowLeft', false, 1, true, () => false)!),
    ).toBe('2024-03-01')
  })
})
