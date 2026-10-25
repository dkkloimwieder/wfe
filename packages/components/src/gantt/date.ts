import { fromDate, toCalendarDate } from '@internationalized/date'
import type { CalendarDate } from '@internationalized/date'
import type { GanttChange, GanttInterval, GanttRange } from './types'

function instant(value: number): Date {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()))
    throw new RangeError('Gantt date must be finite')
  return date
}

/** The closest actual zoned midnight, with ties resolved toward the later date. */
function nearestDay(value: number, timeZone: string): CalendarDate {
  const day = toCalendarDate(fromDate(instant(value), timeZone))
  const next = day.add({ days: 1 })
  const before = day.toDate(timeZone).getTime()
  const after = next.toDate(timeZone).getTime()
  return value - before < after - value ? day : next
}

/**
 * Timed edits preserve elapsed milliseconds. Date-only edits preserve calendar days
 * in the supplied zone. A keyboard can supply calendarDays instead of guessing a
 * day's elapsed duration. No dependency, working-calendar or resource policy runs.
 */
export function shiftGanttInterval(
  interval: GanttInterval,
  kind: GanttChange['kind'],
  deltaMilliseconds: number,
  timeZone: string,
  calendarDays?: number,
): GanttRange {
  const start = interval.start.getTime()
  const end = interval.end.getTime()
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    !Number.isFinite(deltaMilliseconds)
  )
    throw new RangeError(
      'Gantt dates and edit offset must be finite and ordered',
    )
  // Also validate the zone for timed edits, so one API has one zone contract.
  const first = toCalendarDate(fromDate(interval.start, timeZone))
  if (!interval.dateOnly) {
    return {
      start: instant(
        kind === 'resize-end'
          ? start
          : kind === 'resize-start'
            ? Math.min(end, start + deltaMilliseconds)
            : start + deltaMilliseconds,
      ),
      end: instant(
        kind === 'resize-start'
          ? end
          : kind === 'resize-end'
            ? Math.max(start, end + deltaMilliseconds)
            : end + deltaMilliseconds,
      ),
    }
  }
  if (calendarDays !== undefined && !Number.isSafeInteger(calendarDays))
    throw new RangeError('Gantt calendar offset must be an integer')
  const last = toCalendarDate(fromDate(interval.end, timeZone))
  const originalEdge = kind === 'resize-end' ? last : first
  const proposed =
    calendarDays === undefined
      ? nearestDay(
          originalEdge.toDate(timeZone).getTime() + deltaMilliseconds,
          timeZone,
        )
      : originalEdge.add({ days: calendarDays })
  if (kind === 'move') {
    const span =
      last.calendar.toJulianDay(last) - first.calendar.toJulianDay(first)
    return {
      start: proposed.toDate(timeZone),
      end: proposed.add({ days: span }).toDate(timeZone),
    }
  }
  if (kind === 'resize-start') {
    return {
      start: (proposed.compare(last) > 0 ? last : proposed).toDate(timeZone),
      end: last.toDate(timeZone),
    }
  }
  return {
    start: first.toDate(timeZone),
    end: (proposed.compare(first) < 0 ? first : proposed).toDate(timeZone),
  }
}
