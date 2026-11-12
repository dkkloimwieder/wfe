# Calendar ranges

Import `RangeCalendar` and `DateRangePicker` from `@wfe/components` or `@wfe/components/calendar`.
The existing `Calendar` and `DatePicker` APIs remain available.
All calendars share one grid and navigation implementation.

`CalendarRange` contains a date-only `start` and an optional `end`.
Values use `YYYY-MM-DD` within years 0001 through 9999.
A complete range has ordered endpoints.
The first selection proposes a start. The second proposes ordered endpoints.
A selection after a complete range proposes a new start.
The application owns acceptance. Rejection preserves the accepted selection.

`numberOfMonths` accepts 1, 2, or 3. The range default is 2.
Multiple months omit duplicate outside-month buttons and share one day in the tab sequence.
Arrow keys navigate dates. Home and End navigate the week.
Page Up and Page Down navigate months. Shift changes that movement to years.
The existing month and year chooser remains available.
`locale`, `startOfWeek`, and `direction` retain their calendar behavior.
UI messages remain separate from date formatting locale.

`min`, `max`, and `isDateDisabled` block unavailable endpoint actions.
Applications decide whether an interval can contain unavailable dates.
Readonly inline calendars allow navigation and preserve selection.
Disabled calendars block navigation and selection.

`DateRangePicker` places the same calendar inside the shared Popover.
Its `label` names the trigger. Shared Field and HelpText provide state and descriptions.
An accepted complete range closes the popup and returns owned focus.
Rejected proposals keep the accepted dates and the popup open.
Readonly pickers block opening. The clear button proposes `undefined`.
Applications own required-value and interval rules.

A picker `name` submits two endpoint strings under the same key.
A partial range submits an empty end string. Disabled pickers omit both values.
The gallery route `?gallery=calendar-ranges` demonstrates inline and popup selection, rejection, locale changes, and form values.
Gallery acceptance remains a user review step.
