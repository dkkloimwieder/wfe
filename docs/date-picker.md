# Calendar and date picker

`Calendar` and `DatePicker` are generic components in `@wfe/components`.
They use the existing controls, popover, and shared style variables.
The calendar behavior comes from the licensed Corvu subset in `src/vendor/corvu-calendar`.
The local code uses Solid 2 and UTC arithmetic for date-only values.

## Values

Pass a valid `YYYY-MM-DD` string through `value`.
Use `undefined` for an empty value.
Handle accepted changes through `onValueChange`.
The application owns the accepted value and its persistence.

The picker keeps invalid text visible and leaves the accepted value unchanged.
Escape restores the accepted text when the calendar is closed.
The clear button removes the value and focuses the input.
Calendar selection closes the popup and returns focus to its trigger.

## Calendar behavior

Arrow keys move between days or weeks.
Home and End move to the first and last days of a week.
Page Up and Page Down move between months.
Shift with Page Up or Page Down moves between years.
Keyboard movement skips disabled dates and stops after a bounded search.

Use `min`, `max`, and `isDateDisabled` to restrict available dates.
Use `locale` for calendar labels and `startOfWeek` for the first weekday.
The standalone calendar also accepts `direction` for left-to-right or right-to-left navigation.

Provide `initialMonth` for a deterministic initial view of an empty standalone calendar.
The standalone calendar defaults to January 1970 when no initial date exists.
An empty picker opens at the current browser-local calendar date unless the application supplies `initialMonth`.
An accepted `value` takes precedence over both defaults.
This default does not convert stored `YYYY-MM-DD` values into instants or change date bounds.
It chooses that default on opening, so server and client markup stay consistent.

## Table use

The date range filter composes two instances of the shared picker.
Start and End remain optional, independent boundaries.
The application supplies inclusive comparisons for those boundaries.
The Table controls do not define timezone or server query rules.

Click the calendar heading to choose a month and enter a year. Press Escape to return to the day grid without selecting a date.

## UI messages

Calendar, DatePicker, TimePicker, and DateTimePicker accept a reactive partial `messages` object.
Their exported types are `CalendarMessages`, `DatePickerMessages`, `TimePickerMessages`, and `DateTimePickerMessages`.
The date-picker catalog includes the calendar keys.
The datetime catalog includes the date-picker and time-picker keys.
The exported `calendarMessages`, `datePickerMessages`, `timePickerMessages`, and `dateTimePickerMessages` provide English defaults.
Omitted keys fall back individually. Existing explicit `label`, `clearLabel`, and `timeLabel` props retain precedence where supported.

Messages cover navigation, keyboard help, calendar titles, clear actions, invalid input, the time label, and the pending browser-timezone notice.
Date pickers forward their messages to the nested calendar.
Time picker messages also cover the hour, minute, second, period, and apply controls.
Changing messages updates visible errors and native validation text without requesting a new value or repeating an unchanged validity callback.
Invalid drafts, focused controls, selected dates, and open calendars remain in place.
An empty translated error does not make invalid input valid; native validation uses the default error as its fallback.

Message language is separate from `locale`, `dateFormat`, `timeFormat`, and `timeZone`.
Month and weekday names, full-date accessible labels, and input patterns remain date formatting, controlled by those existing props.
The actual timezone identifier remains a value, not translated UI text.
Use the same initial messages on the server and client when hydrating. Language can change after hydration without remounting controls.
