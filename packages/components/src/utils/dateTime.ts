import { parseAbsolute, parseDateTime, toZoned } from '@internationalized/date'
import { dateFormatter } from './intlFormat'
import { parseDate, isSupportedDateYear } from './date'

export type TimeInputFormat = 'HH:mm' | 'HH:mm:ss' | 'hh:mm a' | 'hh:mm:ss a'
export type DateTimeDisambiguation = 'reject' | 'earlier' | 'later'
export type DateTimeParts = {
  date: string
  hour: number
  minute: number
  second: number
  millisecond: number
}
const pad = (value: number, width = 2) => String(value).padStart(width, '0')

export function normalizeInstant(value: string): string {
  if (
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:[.][0-9]{1,3})?)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      value,
    )
  )
    throw new RangeError(
      'Datetime value requires an ISO timestamp with Z or an offset and at most millisecond precision',
    )
  const clock = value
    .slice(11)
    .split(/Z|[+-]/)[0]!
    .split('.')[0]!
  if (
    !parseDate(value.slice(0, 10)) ||
    !parseTimeInput(clock, clock.length === 5 ? 'HH:mm' : 'HH:mm:ss')
  )
    throw new RangeError(
      'Datetime value must contain a valid Gregorian date and clock time',
    )
  // Native ISO parsing handles signed minute offsets correctly. Date 3.12.4 does not.
  const canonical = new Date(value).toISOString()
  const parsed = parseAbsolute(canonical, 'UTC')
  if (parsed.era !== 'AD' || !isSupportedDateYear(parsed.year))
    throw new RangeError('Datetime year must be between 0001 and 9999')
  return parsed.toAbsoluteString()
}

export function dateTimeParts(value: string, zone: string): DateTimeParts {
  const parsed = parseAbsolute(normalizeInstant(value), zone)
  if (parsed.era !== 'AD' || !isSupportedDateYear(parsed.year))
    throw new RangeError(
      'Displayed datetime year must be between 0001 and 9999',
    )
  return {
    date: `${pad(parsed.year, 4)}-${pad(parsed.month)}-${pad(parsed.day)}`,
    hour: parsed.hour,
    minute: parsed.minute,
    second: parsed.second,
    millisecond: parsed.millisecond,
  }
}

export function timeInputPattern(
  format: TimeInputFormat = 'HH:mm',
): TimeInputFormat {
  if (!['HH:mm', 'HH:mm:ss', 'hh:mm a', 'hh:mm:ss a'].includes(format))
    throw new RangeError('Unsupported time input format')
  return format
}
function periods(locale = 'en-US') {
  const formatter = dateFormatter(locale, {
    timeZone: 'UTC',
    hour: 'numeric',
    hour12: true,
  })
  return [0, 12].map(
    (hour) =>
      formatter
        .formatToParts(new Date(Date.UTC(2000, 0, 1, hour)))
        .find((part) => part.type === 'dayPeriod')!.value,
  )
}
export function formatTimeInput(
  parts: DateTimeParts,
  format: TimeInputFormat = 'HH:mm',
  locale?: string,
): string {
  timeInputPattern(format)
  const twelve = format.startsWith('hh')
  return `${pad(twelve ? parts.hour % 12 || 12 : parts.hour)}:${pad(parts.minute)}${format.includes(':ss') ? ':' + pad(parts.second) : ''}${twelve ? ' ' + periods(locale)[parts.hour < 12 ? 0 : 1] : ''}`
}
export function parseTimeInput(
  value: string,
  format: TimeInputFormat = 'HH:mm',
  locale?: string,
): { hour: number; minute: number; second?: number } | undefined {
  timeInputPattern(format)
  const twelve = format.startsWith('hh')
  const seconds = format.includes(':ss')
  let text = value.trim()
  let pm = false
  if (twelve) {
    const index = periods(locale).findIndex((period) =>
      text
        .toLocaleLowerCase(locale ?? 'en-US')
        .endsWith(' ' + period.toLocaleLowerCase(locale ?? 'en-US')),
    )
    if (index < 0) return
    text = text.slice(0, -(periods(locale)[index]!.length + 1))
    pm = index === 1
  }
  if (
    !(seconds ? /^[0-9]{2}:[0-9]{2}:[0-9]{2}$/ : /^[0-9]{2}:[0-9]{2}$/).test(
      text,
    )
  )
    return
  const [hour = 0, minute = 0, second] = text.split(':').map(Number)
  if (
    hour > (twelve ? 12 : 23) ||
    (twelve && hour < 1) ||
    minute > 59 ||
    (second ?? 0) > 59
  )
    return
  return { hour: twelve ? (hour % 12) + (pm ? 12 : 0) : hour, minute, second }
}

export function resolveDateTimeInput(
  date: string,
  time: string,
  zone: string,
  format: TimeInputFormat = 'HH:mm',
  locale?: string,
  disambiguation: DateTimeDisambiguation = 'reject',
  accepted?: string,
): string | undefined {
  if (!parseDate(date)) return
  const parsed = parseTimeInput(time, format, locale)
  if (!parsed) return
  const previous = accepted ? dateTimeParts(accepted, zone) : undefined
  const parts = {
    date,
    ...parsed,
    second: parsed.second ?? previous?.second ?? 0,
    millisecond: previous?.millisecond ?? 0,
  }
  if (
    previous &&
    Object.keys(parts).every(
      (key) =>
        parts[key as keyof DateTimeParts] ===
        previous[key as keyof DateTimeParts],
    )
  )
    return normalizeInstant(accepted!)
  try {
    const wall = parseDateTime(
      `${date}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${pad(parts.millisecond, 3)}`,
    )
    const zoned = toZoned(wall, zone, disambiguation)
    // A gap must never silently change the requested clock time.
    if (
      zoned.year !== wall.year ||
      zoned.month !== wall.month ||
      zoned.day !== wall.day ||
      zoned.hour !== wall.hour ||
      zoned.minute !== wall.minute
    )
      return
    return normalizeInstant(zoned.toAbsoluteString())
  } catch {
    return undefined
  }
}
