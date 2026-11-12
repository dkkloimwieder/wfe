import { parseDate } from '../utils/date'
export type CalendarRange = Readonly<{ start: string; end?: string }>
export function calendarRangeValue(value: CalendarRange | undefined) {
  if (
    value &&
    (!parseDate(value.start) ||
      (value.end !== undefined &&
        (!parseDate(value.end) || value.end < value.start)))
  )
    throw new RangeError('Calendar ranges require ordered date-only values')
  return value
}
export function selectCalendarRange(
  current: CalendarRange | undefined,
  day: string,
): CalendarRange {
  if (!current || current.end !== undefined) return { start: day }
  return day < current.start
    ? { start: day, end: current.start }
    : { start: current.start, end: day }
}
