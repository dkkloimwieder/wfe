# Shared value formatting

`ValueDisplay` renders booleans, date-only strings, datetime strings, and numbers.
`formatDisplayValue` returns the corresponding text.
Both preserve the original value.
Tables, detail views, and summaries use the same formatter.

`TableFormatting` shows controlled format choices for application-supplied columns.
The application stores choices and supplies its formatter to `ReadOnlyTable.formatValue` and `formatSummary`.
The control does not change accessors, sorting, filtering, raw records, or export values.

## Date and datetime

The `date` format accepts a Gregorian `YYYY-MM-DD` value.
Its `dateFormat` follows the same numeric grammar as `DatePicker`.
For example, `dd/MM/yyyy` shows `29/02/2024`.
The `locale` pattern uses the supplied locale's numeric order and separators.
Date-only display never converts timezones.

The `datetime` format accepts an ISO timestamp with `Z` or an explicit offset.
It uses the same numeric date and time grammar as `DateTimePicker`.
`timeFormat` accepts `HH:mm`, `HH:mm:ss`, `hh:mm a`, and `hh:mm:ss a`.
The defaults are `yyyy-MM-dd`, `HH:mm`, and `en-US`.
Both read-only APIs default to UTC.
An explicit IANA timezone selects the application's display zone.

The `datetime-iso` format shows the normalized UTC timestamp, including milliseconds.
It does not apply display format or timezone choices.
Existing instants in repeated daylight-saving hours retain their meaning.
Display does not resolve a clock time into a new instant.
Malformed values remain visible as their original text.
Invalid format or timezone configuration raises an error.

The third argument of `formatDisplayValue` accepts `ValueFormatOptions` or the existing locale string.
The component accepts those same properties directly:

```tsx
import { ValueDisplay, formatDisplayValue } from '@wfe/components'

const display = {
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm:ss',
  locale: 'en-GB',
  timeZone: 'America/New_York',
} as const

formatDisplayValue('2024-02-29T02:15:16.123Z', 'datetime', display)
// 28/02/2024 21:15:16

export function Timestamp(props: { value: string }) {
  return <ValueDisplay value={props.value} format="datetime" {...display} />
}
```

Pass the same application configuration to input and read-only controls when their presentation must match.
`DateTimePicker` retains its existing browser-local default.
The read-only default stays UTC for deterministic text formatting.

## Browser timezone and hydration

`ValueDisplay` also accepts `timeZone="browser"`.
It shares timezone resolution with `DateTimePicker`.
Before mounting or hydration completes, browser-local text stays empty.
The server never guesses the browser zone from its host.
After attachment, the component resolves the browser zone and updates its text.
Explicit zones render on both the server and client.
Date-only output ignores this property.

The pure `formatDisplayValue` helper requires an explicit zone instead of the `browser` token.
The application can resolve a browser zone and pass its IANA name to this helper.

## Existing formats

Boolean formats show check and cross symbols or Yes and No.
Symbols expose accessible Yes and No labels.
The text helper returns Yes or No for either boolean format.
Empty values stay empty.

Existing date formats remain `date-iso`, `date-short`, and `date-long`.
They accept date-only strings and keep their existing locale behavior.
The `date` choice adds the configured numeric format.
Datetime columns offer configured date/time output or a UTC ISO timestamp.

Number formats show the original number, locale-based groups, or two decimal places.
Two decimal places round only the displayed value.
Sorting and filtering continue to use the original number.

Reusable Intl formatters use bounded caches with at most 32 entries per formatter type.
These caches retain formatting machinery and never retain record values.

The [date review example](../examples/generator/DateApp.tsx) shares one display configuration across inputs, table cells, detail values, and a summary.
Its browser tests require unchanged raw records, sorting, filtering, and exported data after format changes.
Exports remain an application decision.

Generated table columns accept the same `format` names with optional `formatOptions`.
Custom cell renderers take precedence.
The `short-hash` format shows eight Unicode codepoints and retains the full string in its title and accessible label.
Formats leave raw sorting, filtering, grouping, and export values intact.
Native text selection copies the visible text. Application-provided table copy text keeps its existing policy.
