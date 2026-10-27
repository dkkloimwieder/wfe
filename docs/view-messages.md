# Messages for generated views and shells

Generated views accept a reactive partial `messages` prop with the `GeneratorMessages` type.
Import `generatorMessages` from `@wfe/generator` for the current English defaults.
Each omitted or undefined property falls back separately.
Changing messages updates text without replacing view identities, accepted values, drafts, or focused controls.

The catalog covers loading status, form-action failure, default delete and cancel labels, repeated-row actions and titles, and the grid row heading.
LayoutView also uses it for its navigation and context controls.
Explicit delete labels and layout region labels in descriptions take precedence.
Action labels, field labels, record values, application errors, and panel content remain application-owned text.
A LayoutView does not translate the application-provided views inside its panels.

TableView uses its `messages` prop for its own generated status text.
Its `bindings.messages` property forwards a partial `TableMessages` catalog to ReadOnlyTable.
Those table messages control filtering, selection, pagination, and other table-owned text.
Neither catalog changes filtering, requests, or application validation.

ShellView accepts a reactive partial `messages` prop with the `ShellMessages` type.
Import `shellMessages` from `@wfe/shell` for English defaults.
Its catalog covers Audience, Breadcrumbs, and the navigation and context controls.
Existing `audienceLabel`, navigation labels, and context labels take precedence over these defaults.
Authored route and audience labels remain application-owned values.
Custom header and navigation replacements keep their existing ownership and behavior.

Use the same initial messages on the server and client when hydrating.
Language can change after hydration without remounting the page.
Messages supply text. They do not install a translation service or change formatting locale.

The public `resolveMessages(defaults, overrides)` helper comes from `@wfe/components`.
It reads each property lazily from the current overrides accessor.
An own override property wins unless its value is null or undefined.
Otherwise, that property uses its default.
Defaults can be frozen. Resolved catalogs retain their own keys for property checks, spreads, and layered catalogs.
The helper preserves each property's type, adds no global state, and does not parse external configuration.

## Nested standard controls

FormView, DetailView, and TableView accept `controlMessages?: GeneratorControlMessages` for their standard child controls.
Import this type and `GeneratorControlMessageProps` from `@wfe/generator`.

The optional catalog keys are `datePicker`, `timePicker`, `dateTimePicker`, `numberInput`, and `valueDisplay`.
Each key accepts a partial catalog with the existing message type of its component.
These catalogs are separate from `messages`, which supplies generated status and action text.
They are also separate from `TableViewBindings.messages`, which supplies text for the table controls.

FormView forwards the appropriate catalog to direct fields and each repeated row.
Read-only formatted fields use `valueDisplay`.
DetailView forwards `valueDisplay` to FieldValue.
TableView forwards it to standard formatted cells and forwards `datePicker` to configured date filters.
The application owns custom field and cell components.
Those components receive their existing props unchanged.

FieldValue accepts `messages?: Partial<ValueDisplayMessages>` from both the package root and the fields subpath.
Its empty unformatted values also use `emptyValue`.
Nonempty raw values remain unchanged.
Formatted values continue to validate format options before applying an empty-value message.

ReadOnlyTable, TableColumnFilter, TableHeaderFilter, and TableDateFilter accept `datePickerMessages?: Partial<DatePickerMessages>`.
This prop supplies messages to both boundary pickers and their calendar controls.
Explicit boundary and clear labels take precedence over child defaults.
These explicit labels include labels from the table's own catalog.
Header filters retain their existing legacy and configured value contracts.

Language changes update existing controls.
They preserve focused drafts, accepted raw values, formatter locale, timezone, and application errors.
The components do not install a translator or shared state provider.
The date example includes a generated form with repeated rows, a detail view, and a configured table.
It demonstrates message forwarding in server and hydrated rendering.

Generated file controls remain outside the form contract because file arrays are not FormScalar values.
Use an existing custom field component to present the file UI.
The application owns its selected files, validation, and upload requests.
Supply that component's file messages directly.
