import { parseDate } from './date'

export type ValueFormat =
  | 'boolean-symbol'
  | 'boolean-text'
  | 'date-iso'
  | 'date-short'
  | 'date-long'
  | 'number-plain'
  | 'number-grouped'
  | 'number-decimal'

/** Format display text without changing the original value. */
export function formatDisplayValue(
  value: unknown,
  format: ValueFormat,
  locale = 'en-US',
): string {
  if (value == null) return ''
  if (typeof value === 'boolean' && format.startsWith('boolean-'))
    return value ? 'Yes' : 'No'
  if (
    typeof value === 'string' &&
    (format === 'date-short' || format === 'date-long')
  ) {
    const date = parseDate(value)
    if (date)
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: format === 'date-long' ? 'long' : '2-digit',
        day: format === 'date-long' ? 'numeric' : '2-digit',
        timeZone: 'UTC',
      }).format(date)
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (format === 'number-grouped')
      return new Intl.NumberFormat(locale, {
        maximumSignificantDigits: 21,
      }).format(value)
    if (format === 'number-decimal')
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
  }
  return String(value)
}
