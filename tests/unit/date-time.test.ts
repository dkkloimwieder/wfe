import { describe, expect, it } from 'vitest'
import {
  dateTimeParts,
  formatTimeInput,
  normalizeInstant,
  parseTimeInput,
  resolveDateTimeInput,
} from '../../packages/components/src/utils/dateTime'

describe('datetime input conversion', () => {
  it('requires explicit offsets and preserves millisecond precision', () => {
    expect(normalizeInstant('2024-02-29T09:15:16.123-05:00')).toBe(
      '2024-02-29T14:15:16.123Z',
    )
    expect(normalizeInstant('2024-02-29T09:15:16.123-05:30')).toBe(
      '2024-02-29T14:45:16.123Z',
    )
    expect(normalizeInstant('2024-02-29T09:15-00:30')).toBe(
      '2024-02-29T09:45:00.000Z',
    )
    expect(normalizeInstant('2024-02-29T09:15+05:45')).toBe(
      '2024-02-29T03:30:00.000Z',
    )
    expect(normalizeInstant('2024-02-29T14:15Z')).toBe(
      '2024-02-29T14:15:00.000Z',
    )
    for (const value of [
      '2024-02-29T14:15',
      '2023-02-29T14:15Z',
      '2024-01-01T25:00Z',
      '2024-01-01T24:00Z',
      '2024-01-00T00:00Z',
      '2024-01-01T00:00+24:00',
      '2024-01-01T00:00:00.1234Z',
      '0000-01-01T00:00Z',
    ])
      expect(() => normalizeInstant(value)).toThrow()
  })
  it('formats timezones with date rollover and non-hour offsets', () => {
    expect(
      dateTimeParts('2024-02-29T02:15:16.123Z', 'America/New_York'),
    ).toEqual({
      date: '2024-02-28',
      hour: 21,
      minute: 15,
      second: 16,
      millisecond: 123,
    })
    expect(dateTimeParts('2024-02-29T00:00Z', 'Asia/Kathmandu').minute).toBe(45)
    expect(() => dateTimeParts('2024-02-29T00:00Z', 'Invalid/Zone')).toThrow()
  })
  it('round trips 12 and 24 hour formats, including localized periods', () => {
    for (const locale of ['en-US', 'en-GB', 'de-DE', 'ar-EG'])
      for (const format of [
        'HH:mm',
        'HH:mm:ss',
        'hh:mm a',
        'hh:mm:ss a',
      ] as const)
        for (const hour of [0, 1, 12, 13, 23]) {
          const parts = {
            date: '2024-01-01',
            hour,
            minute: 45,
            second: 17,
            millisecond: 0,
          }
          expect(
            parseTimeInput(
              formatTimeInput(parts, format, locale),
              format,
              locale,
            ),
          ).toEqual({
            hour,
            minute: 45,
            second: format.includes(':ss') ? 17 : undefined,
          })
        }
    for (const value of ['24:00', '01:60', '1:00', '01:00x'])
      expect(parseTimeInput(value)).toBeUndefined()
    expect(parseTimeInput('00:00 AM', 'hh:mm a')).toBeUndefined()
    expect(parseTimeInput('12:00 PM', 'hh:mm a')).toEqual({
      hour: 12,
      minute: 0,
      second: undefined,
    })
  })
  it('preserves hidden seconds and milliseconds during edits', () => {
    expect(
      resolveDateTimeInput(
        '2024-02-29',
        '15:20',
        'UTC',
        'HH:mm',
        undefined,
        'reject',
        '2024-02-29T14:15:16.123Z',
      ),
    ).toBe('2024-02-29T15:20:16.123Z')
    expect(
      resolveDateTimeInput(
        '2024-02-29',
        '15:20:30',
        'UTC',
        'HH:mm:ss',
        undefined,
        'reject',
        '2024-02-29T14:15:16.123Z',
      ),
    ).toBe('2024-02-29T15:20:30.123Z')
  })
  it('rejects nonexistent times for every overlap policy', () => {
    for (const policy of ['reject', 'earlier', 'later'] as const)
      expect(
        resolveDateTimeInput(
          '2024-03-10',
          '02:30',
          'America/New_York',
          'HH:mm',
          undefined,
          policy,
        ),
      ).toBeUndefined()
  })
  it('rejects repeated times unless the application selects earlier or later', () => {
    expect(
      resolveDateTimeInput('2024-11-03', '01:30', 'America/New_York'),
    ).toBeUndefined()
    expect(
      resolveDateTimeInput(
        '2024-11-03',
        '01:30',
        'America/New_York',
        'HH:mm',
        undefined,
        'earlier',
      ),
    ).toBe('2024-11-03T05:30:00.000Z')
    expect(
      resolveDateTimeInput(
        '2024-11-03',
        '01:30',
        'America/New_York',
        'HH:mm',
        undefined,
        'later',
      ),
    ).toBe('2024-11-03T06:30:00.000Z')
    for (const accepted of [
      '2024-11-03T05:30:00.000Z',
      '2024-11-03T06:30:00.000Z',
    ])
      expect(
        resolveDateTimeInput(
          '2024-11-03',
          '01:30',
          'America/New_York',
          'HH:mm',
          undefined,
          'reject',
          accepted,
        ),
      ).toBe(accepted)
  })
})
