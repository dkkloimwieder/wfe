# Date inputs

`DatePicker` edits a Gregorian calendar date.
Its controlled value is `YYYY-MM-DD` or `undefined` for an empty field.
The value has no timezone and does not represent an instant.
The application owns storage mapping and business validation.

`dateFormat` controls display and typed input.
The default is `yyyy-MM-dd`.
Numeric patterns contain `yyyy`, `MM`, and `dd` once each, with optional literal separators.
Each numeric part uses its stated width.
For example, `dd/MM/yyyy` shows `17/10/2026`.
Named months and non-Gregorian input calendars are outside this grammar.

`dateFormat="locale"` uses the supplied locale's numeric date order and separators.
This input uses Gregorian dates and Latin digits.
If no locale is supplied for this format, the control uses `en-US` for deterministic rendering.
Applications can supply the user's locale explicitly.
Changing format or locale updates presentation without a value callback.

Valid complete input requests a canonical date through `onValueChange`.
Incomplete or invalid text remains a local draft and does not change the accepted value.
An empty input requests `undefined`.
Blur restores the accepted display after valid input that the parent rejects.
Escape restores the accepted display and clears the local input error.
Calendar selection follows the same controlled value.

`min`, `max`, and `isDateDisabled` constrain selectable and typed dates.
The application supplies these constraints.
The control also rejects impossible dates and years outside 0001 through 9999.

The picker inherits disabled, readonly, required, and invalid states from `Field`.
It uses the shared input's label, help, error, and control registration.
A picker inside `Field` uses the external label.
A standalone picker renders its own label.
The `id` prop supports standard label integration.
The `name` prop serializes one hidden accepted ISO value, including an empty string when cleared.
Readonly fields retain this value, and disabled fields omit it.
The visible formatted input is unnamed.
Intrinsic draft errors set native input validity and notify optional `onValidityChange`.
Application-supplied errors do not change this intrinsic validity.
Readonly inputs remain focusable, but typing, calendar selection, and clearing do not request changes.

## Datetime input

`DateTimePicker` edits an instant with the shared date picker and time input.
Its controlled value requires an ISO timestamp with `Z` or an explicit offset.
For example, `2024-02-29T09:15:16.123-05:00` represents the same instant as `2024-02-29T14:15:16.123Z`.
The callback requests a normalized UTC ISO timestamp, or `undefined` when cleared.
Values support up to millisecond precision.
The application owns conversion to its storage schema.

`timeZone` defaults to `browser`.
The browser zone resolves after the control mounts or attaches to server markup.
Before that step, the visible controls stay empty and disabled.
The server never guesses the user's zone from its own host.
An explicit IANA zone, such as `America/New_York` or `UTC`, renders on the server and client.
The application supplies its system timezone through this prop.
Changing the timezone or display format does not request a value change.

`dateFormat` and `locale` follow the date-only input rules.
`timeFormat` accepts `HH:mm`, `HH:mm:ss`, `hh:mm a`, or `hh:mm:ss a`.
The default is `HH:mm`.
The 12-hour formats use the supplied locale's AM and PM text.
All numeric input uses Latin digits.
Editing a format without seconds preserves accepted seconds and milliseconds.
Editing visible seconds preserves accepted milliseconds.

The control rejects nonexistent local times during daylight-saving changes.
It also rejects repeated local times by default.
`disambiguation="earlier"` or `disambiguation="later"` selects an occurrence of a repeated time.
These modes never shift a nonexistent time to another clock time.
An unchanged accepted instant in a repeated hour retains its known offset.
`min` and `max` constrain instants and require the same offset-bearing ISO grammar.

Invalid or incomplete date and time text remains local and blocks native form submission.
Escape restores both accepted date and time displays.
A valid request that the parent rejects restores the accepted display when focus leaves the composite control.
Clearing the date clears the complete datetime.
Clearing only the time leaves an incomplete draft until the user completes or resets it.
The control inherits `Field` state and serializes one canonical named value.
Its `onValidityChange` callback reports only intrinsic input validity.

## Generated forms

`FormView` accepts `control: 'date'` and `control: 'datetime'` for string fields.
Both controls use an empty string for an empty generated field.
The application maps other storage types through its adapter or a custom field binding.
Date descriptions accept `dateFormat`, `locale`, `min`, `max`, and `startOfWeek`.
Datetime descriptions also accept `timeFormat`, `timeZone`, and `disambiguation`.
These descriptions contain data, not application callbacks.

The generated view blocks its DOM submit action while an editable date control contains an invalid draft.
It focuses that control and does not call application validation or submission.
Readonly, disabled, and removed fields release this local block.
Application validation errors remain the application's responsibility and do not prevent a retry.
A direct application call to `form.submit()` still submits accepted values.
It does not inspect drafts in a rendered view.

The [date example](../examples/generator/DateApp.tsx) shows these controls with application-owned values and callbacks.
