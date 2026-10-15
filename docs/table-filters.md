# Table filters

The application declares filter controls through the `ReadOnlyTable` `filter` callback.
The callback returns a `TableFilterConfig` for each column.
Column definitions still supply `filterFn` callbacks that accept the filter values.
The components do not choose comparison rules, requests, permissions, or persistence.

## Control configuration

`text` offers Contains, Equals, Starts with, and Does not contain.
`select` accepts one choice, and `multi-select` accepts several choices.
`tags` offers Has any and Has all for records that contain several tags.
Set `exclude` on a choice control to add Is not, or Has none for tags.
The application supplies the choices and decides how these operations match records.

`number-range` provides independent Minimum and Maximum inputs.
Each boundary can stay empty, and zero remains a real boundary.
Invalid numeric drafts leave the accepted range unchanged.
Escape restores the accepted boundary value.

`boolean` provides Yes, No, and Either.
`date-range` composes the shared date picker for optional Start and End dates.
Set `empty` on text, choice, tags, or numeric controls to offer Is empty and Is not empty.
These controls preserve the difference between an empty value and zero or false.

## Controlled values

Text filters emit an object with `operator` and `value`.
Choice and tags filters emit an object with `operator` and `values`.
Numeric filters emit `{ operator: 'between', min, max }` with optional boundaries.
Empty-value filters emit `{ operator: 'empty' }` or `{ operator: 'not-empty' }`.
Clearing a filter emits `undefined`.

Boolean filters keep boolean values, and date ranges keep optional `start` and `end` strings.
The previous `filterKind` callback remains available for existing simple consumers.
The `filter` callback takes precedence when both callbacks describe a column.

The application can update filter values through its Table controller.
Controls follow those values without editing source records.
When the application changes a column type, it also replaces incompatible filter state.

## Demo behavior

The dashboard starts with eight records and eight columns.
Name and Notes demonstrate text matching.
Region demonstrates single selection, and Status demonstrates multiple selection.
Amount demonstrates numeric boundaries, zero, decimals, negative numbers, and empty values.
Tags demonstrates Any, All, None, and empty-value matching.

The demo compares text without case sensitivity.
It includes both numeric and date boundaries in the results.
It treats null, empty text, and an empty tag list as empty values.
Ordinary text, numeric, and choice comparisons exclude empty values.
Multiple choices match any selected scalar value, and no selections impose no restriction.

Filters on different columns combine through AND.
Global search includes boolean, numeric, date, and tag values through an application callback.
Grouping and sorting use application definitions for each column.
The controls scroll independently while the results keep their assigned height.

## Reuse

`TableColumnFilter` is public for custom control layouts.
Its configuration and value types are `TableColumnFilterConfig` and `TableColumnFilterValue`.
The component reuses the shared Select for both choice modes.
Calendar popups and date entry use the shared DatePicker.
Nested condition groups remain outside this first implementation.

Boolean filters use a three-state checkbox. A check means Yes, an empty box means No, and a dash means Either. Click the box or press Space to cycle through Yes, No, and Either. Clear restores Either.
