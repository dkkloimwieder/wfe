import { parseDate } from './date'
import { dateInputPattern, formatDateInput } from './dateFormat'
import {
  dateTimeParts,
  formatTimeInput,
  normalizeInstant,
  timeInputPattern,
} from './dateTime'
import { dateFormatter, numberFormatter } from './intlFormat'
import type { DateInputFormat } from './dateFormat'
import type { TimeInputFormat } from './dateTime'

export type ValueFormatOptions = {
  locale?: string
  dateFormat?: DateInputFormat
  timeFormat?: TimeInputFormat
  /** An explicit display zone. ValueDisplay also resolves the browser token. Defaults to UTC. */
  timeZone?: string
}

const formats = [
  'boolean-symbol',
  'boolean-text',
  'date',
  'datetime',
  'datetime-iso',
  'date-iso',
  'date-short',
  'date-long',
  'number-plain',
  'number-grouped',
  'number-decimal',
  'short-hash',
] as const
export type ValueFormat = (typeof formats)[number]
export function isValueFormat(value: unknown): value is ValueFormat {
  return typeof value === 'string' && formats.some((format) => format === value)
}

/** Format display text without changing the original value. */
export function formatDisplayValue(
  value: unknown,
  format: ValueFormat,
  options: string | ValueFormatOptions = 'en-US',
): string {
  const configuration =
    typeof options === 'string' ? { locale: options } : options
  const locale = configuration.locale ?? 'en-US'
  if (format === 'date' || format === 'datetime') {
    const pattern = dateInputPattern(configuration.dateFormat, locale)
    const timeFormat =
      format === 'datetime'
        ? timeInputPattern(configuration.timeFormat)
        : undefined
    const zone = configuration.timeZone ?? 'UTC'
    if (format === 'datetime') {
      if (zone === 'browser')
        throw new RangeError(
          'Resolve the browser timezone before calling formatDisplayValue',
        )
      dateFormatter('en-US', { timeZone: zone })
    }
    if (value == null || value === '') return ''
    if (typeof value !== 'string') return String(value)
    if (format === 'date')
      return parseDate(value) ? formatDateInput(value, pattern, locale) : value
    let parts: ReturnType<typeof dateTimeParts>
    try {
      parts = dateTimeParts(value, zone)
    } catch {
      return value
    }
    return `${formatDateInput(parts.date, pattern, locale)} ${formatTimeInput(parts, timeFormat, locale)}`
  }
  if (format === 'datetime-iso') {
    if (value == null || value === '') return ''
    if (typeof value !== 'string') return String(value)
    try {
      return normalizeInstant(value)
    } catch {
      return value
    }
  }
  if (value == null) return ''
  if (format === 'short-hash' && typeof value === 'string')
    return Array.from(value).slice(0, 8).join('')
  if (typeof value === 'boolean' && format.startsWith('boolean-'))
    return value ? 'Yes' : 'No'
  if (
    typeof value === 'string' &&
    (format === 'date-short' || format === 'date-long')
  ) {
    const date = parseDate(value)
    if (date)
      return dateFormatter(locale, {
        year: 'numeric',
        month: format === 'date-long' ? 'long' : '2-digit',
        day: format === 'date-long' ? 'numeric' : '2-digit',
        timeZone: 'UTC',
      }).format(date)
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (format === 'number-grouped')
      return numberFormatter(locale, {
        maximumSignificantDigits: 21,
      }).format(value)
    if (format === 'number-decimal')
      return numberFormatter(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
  }
  return String(value)
}
