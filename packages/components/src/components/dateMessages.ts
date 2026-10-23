import { resolveMessages } from '../internal/messages'

/** UI language is independent of date formatting locale and timezone. */
export interface CalendarMessages {
  previousYear: string
  previousMonth: string
  nextYear: string
  nextMonth: string
  chooseMonthYear: string
  year: string
  keyboardHelp: string
}
export interface DatePickerMessages extends CalendarMessages {
  openCalendar: (label: string) => string
  clearDate: (label: string) => string
  calendarTitle: (label: string) => string
  invalidDate: (pattern: string) => string
}
export interface DateTimePickerMessages extends DatePickerMessages {
  time: string
  pendingTimezone: string
  invalidDateTime: string
}
export const calendarMessages: Readonly<CalendarMessages> = {
  previousYear: 'Previous year',
  previousMonth: 'Previous month',
  nextYear: 'Next year',
  nextMonth: 'Next month',
  chooseMonthYear: 'Choose month and year',
  year: 'Year',
  keyboardHelp:
    'Use arrow keys for days, Home and End for the week, and Page Up or Page Down for months. Hold Shift for years.',
}
export const datePickerMessages: Readonly<DatePickerMessages> = {
  ...calendarMessages,
  openCalendar: (label) => `Open ${label} calendar`,
  clearDate: (label) => `Clear ${label}`,
  calendarTitle: (label) => `${label} calendar`,
  invalidDate: (pattern) => `Enter an available date as ${pattern}.`,
}
export const dateTimePickerMessages: Readonly<DateTimePickerMessages> = {
  ...datePickerMessages,
  time: 'Time',
  pendingTimezone: 'Browser timezone pending',
  invalidDateTime:
    'Enter an available date and time in the displayed timezone.',
}
export const resolveCalendarMessages = (
  overrides: () => Partial<CalendarMessages> | undefined,
) => resolveMessages(calendarMessages, overrides)
export const resolveDatePickerMessages = (
  overrides: () => Partial<DatePickerMessages> | undefined,
) => resolveMessages(datePickerMessages, overrides)
export const resolveDateTimePickerMessages = (
  overrides: () => Partial<DateTimePickerMessages> | undefined,
) => resolveMessages(dateTimePickerMessages, overrides)
