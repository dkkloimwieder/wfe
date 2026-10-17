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
