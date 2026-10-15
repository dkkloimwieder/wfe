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
An empty picker opens at the current UTC date unless the application supplies `initialMonth`.
It chooses that default on opening, so server and client markup stay consistent.

## Table use

The date range filter composes two instances of the shared picker.
Start and End remain optional, independent boundaries.
The application supplies inclusive comparisons for those boundaries.
The Table controls do not define timezone or server query rules.
