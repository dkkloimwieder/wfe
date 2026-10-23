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

Boolean filters use a three-state checkbox. A check means Yes, an empty box means No, and a dash means Either. Click the box or press Space to cycle through Yes, No, and Either. The checkbox has no visible state text or clear button. A screen reader announces the state and cycle guidance.

## Apply criteria

`ReadOnlyTable` keeps pending criteria until the user presses the refresh icon. Changes to any column filter, global search, and clear controls stay pending. One action applies the pending column criteria and search together. Sorting and grouping remain immediate.

The section shows UNAPPLIED CHANGES while pending criteria differ from applied criteria. Its active count describes applied filters. Application changes to the table criteria replace the pending snapshot. Replacing records keeps the pending criteria.

`createTableFilterDraft(table)` provides the same behavior for custom control layouts. Low-level filter controls emit values. The coordinator keeps those values separate from applied table state. It calls each changed table setter once when the user applies the criteria. It does not perform requests. The application owns controlled state and data loading.

If a filter contains an invalid draft, the refresh action focuses that control and keeps the current results.

For server requests, pass `onApplyFilters` to `ReadOnlyTable`. The callback receives all column criteria and search in one `TableFilterCriteria` value. The application owns the request and updates controlled table state. The component does not call table setters when this callback is present. Custom layouts can pass the same callback through `createTableFilterDraft(table, { onApply })`.

The refresh icon applies pending criteria and requests results through one action.
With `onApplyFilters`, pressing it also sends unchanged criteria so the application can reload the current query.
Without that callback, the action applies local criteria and stays inactive when criteria match.
For custom layouts, `draft.apply({ refresh: true })` also sends unchanged criteria to `onApply`.
Calling `draft.apply()` preserves the existing behavior and skips unchanged criteria.

## Global search and hidden columns

Local global search defaults to visible columns.
Hiding a searchable column can therefore remove matching records from the results.
Set the engine's `globalFilterScope` to `'all'` to keep matching hidden columns.
`enableGlobalFilter: false` still excludes individual columns in either mode.
See [engine capabilities](table-engine.md#global-search-policy) for callbacks, supported values, and manual filtering.
