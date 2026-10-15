// Adapted from Corvu Calendar. See provenance.json and LICENSE.
export function utcDate(year: number, month: number, day: number) {
  const value = new Date(0)
  value.setUTCFullYear(year, month, day)
  return value
}

const isSameDay = (a: Date | null, b: Date | null) => {
  if (!a || !b) return false
  if (a.getUTCDate() !== b.getUTCDate()) return false
  if (a.getUTCMonth() !== b.getUTCMonth()) return false
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return false
  return true
}

const isSameDayOrBefore = (a: Date | null, b: Date | null) => {
  if (!a || !b) return false
  if (isSameDay(a, b)) return true
  if (a.getTime() < b.getTime()) return true
  return false
}

const isSameDayOrAfter = (a: Date | null, b: Date | null) => {
  if (!a || !b) return false
  if (isSameDay(a, b)) return true
  if (a.getTime() > b.getTime()) return true
  return false
}

const modifyDate = (
  date: Date,
  modify: { year?: number; month?: number; day?: number },
) => {
  const newYear = date.getUTCFullYear() + (modify.year ?? 0)
  const newMonth = date.getUTCMonth() + (modify.month ?? 0)
  let newDay = date.getUTCDate() + (modify.day ?? 0)
  // Prevent day falling into the next month because the month has fewer days
  if (modify.month || modify.year) {
    newDay = Math.min(utcDate(newYear, newMonth + 1, 0).getUTCDate(), newDay)
  }

  return utcDate(newYear, newMonth, newDay)
}

const modifyFocusedDay = (
  date: Date,
  modify: { year?: number; month?: number; day?: number },
  disabled: (day: Date) => boolean,
  retry = true,
  iteration = 0,
) => {
  if (iteration > 365) return null

  const newDate = modifyDate(date, modify)
  if (!disabled(newDate)) return newDate

  if (!retry) return null

  return modifyFocusedDay(newDate, modify, disabled, retry, iteration + 1)
}

const dayIsInMonth = (
  focusedDay: Date,
  month: Date,
  numberOfMonths: number,
) => {
  const firstDay = utcDate(month.getUTCFullYear(), month.getUTCMonth(), 1)
  const lastDay = utcDate(
    month.getUTCFullYear(),
    month.getUTCMonth() + numberOfMonths,
    0,
  )
  return (
    focusedDay.getTime() >= firstDay.getTime() &&
    focusedDay.getTime() <= lastDay.getTime()
  )
}

const findAvailableDayInMonth = (
  start: Date,
  disabled: (day: Date) => boolean,
) => {
  const lastDayOfMonth = utcDate(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    0,
  )
  const month = start.getUTCMonth()

  let shift = 0
  const maxShift = Math.max(
    start.getUTCDate() - 1,
    lastDayOfMonth.getUTCDate() - start.getUTCDate(),
  )

  while (shift <= maxShift) {
    start.setUTCDate(start.getUTCDate() + shift)
    if (start.getUTCMonth() === month && !disabled(start)) return start
    start.setUTCDate(start.getUTCDate() - shift)
    if (start.getUTCMonth() === month && !disabled(start)) return start
    shift++
  }

  // Couldn't find any available day in the month, fallback to initial start date
  return start
}

export {
  isSameDay,
  isSameDayOrBefore,
  isSameDayOrAfter,
  modifyDate,
  modifyFocusedDay,
  dayIsInMonth,
  findAvailableDayInMonth,
}
