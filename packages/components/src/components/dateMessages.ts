import { resolveMessages } from '../internal/messages'
import { timeClockMessages, type TimeClockMessages } from './timeClockMessages'

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
export interface TimePickerMessages extends TimeClockMessages {
  openTimePicker: (label: string) => string
  clearTime: (label: string) => string
  timePickerTitle: (label: string) => string
  invalidTime: (pattern: string) => string
  applyTime: string
}
export interface DateTimePickerMessages
  extends DatePickerMessages, TimePickerMessages {
  time: string
  openDateTimePicker: (label: string) => string
  dateTimePickerTitle: (label: string) => string
  backToDate: string
  cancelDateTime: string
  applyDateTime: string
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
export const timePickerMessages: Readonly<TimePickerMessages> = {
  openTimePicker: (label) => `Open ${label} time picker`,
  clearTime: (label) => `Clear ${label}`,
  timePickerTitle: (label) => label,
  invalidTime: (pattern) => `Enter an available time as ${pattern}.`,
  ...timeClockMessages,
  applyTime: 'Apply time',
}
export const dateTimePickerMessages: Readonly<DateTimePickerMessages> = {
  ...datePickerMessages,
  ...timePickerMessages,
  time: 'Time',
  openDateTimePicker: (label) => `Open ${label} date and time picker`,
  dateTimePickerTitle: (label) => label,
  backToDate: 'Back to date',
  cancelDateTime: 'Cancel',
  applyDateTime: 'Apply date and time',
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

export const resolveTimePickerMessages = (
  overrides: () => Partial<TimePickerMessages> | undefined,
) => resolveMessages(timePickerMessages, overrides)
