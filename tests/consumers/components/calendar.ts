// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Calendar,
  CalendarProps,
  CalendarRange,
  DatePicker,
  DatePickerProps,
  DateRangePicker,
  DateRangePickerProps,
  RangeCalendar,
  RangeCalendarProps,
} from '@wfe/components/calendar'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Calendar: typeof Calendar
    CalendarProps: CalendarProps
    CalendarRange: CalendarRange
    DatePicker: typeof DatePicker
    DatePickerProps: DatePickerProps
    DateRangePicker: typeof DateRangePicker
    DateRangePickerProps: DateRangePickerProps
    RangeCalendar: typeof RangeCalendar
    RangeCalendarProps: RangeCalendarProps
  }>
>
