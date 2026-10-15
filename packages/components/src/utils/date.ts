import { utcDate } from '../vendor/corvu-calendar/utils'

/** Parse a date-only value without a browser-local timezone conversion. */
export function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return
  const date = utcDate(year, month - 1, day)
  if (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
    return date
  return undefined
}
export function dateValue(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}
