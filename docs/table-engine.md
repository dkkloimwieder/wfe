# Table engine capabilities

Import `createTable` and engine types from `@wfe/components/table`.
`createNativeTable` is a compatibility name for the same factory.
`nativeAggregations` contains the supplied aggregation functions.
The engine owns view state and local transformations. Applications own records and all writes.

## Records and state

`source.ids()` supplies stable record IDs in source order.
`source.get(id)` returns the current record, or `undefined` when unavailable.
Column `accessorKey` and `accessorFn` supply raw values. Formatting belongs to presentation.
Keep the controller stable throughout each mounted table presentation.
See [controller lifetime](table-workspace.md#controller-lifetime) for updates and explicit remounts.

`initialState` supplies uncontrolled defaults. `state` supplies application-accepted values for individual state fields.
Matching `on…Change` callbacks receive a value or updater function.
The application decides whether to accept each request.
State includes filters, sorting, groups, visibility, column order, widths, pinning, expansion, and record selection.
Engine setters change view state or request application acceptance. They do not send network requests.

## Processing and external data

`manualProcessing` bypasses every local data transformation.
`manualFiltering`, `manualSorting`, `manualGrouping`, and `manualAggregating` bypass their corresponding transformations.
These flags preserve view state. They do not load data, paginate, or infer a server protocol.
See [manual processing](table-workspace.md#manual-processing-and-sort-requests) for the controls supported by each presentation.

`rowProcessingPaused` holds evaluated membership, order, and group structure while cell values remain live.
The application must retain displayed records and prevent incompatible configuration changes during that interval.
`keepPinnedRows` retains pinned source records through filtering. Collapsed groups can still hide those records.

`getFacetedUniqueValues` and `getTotalValue` accept authoritative application results.
An `undefined` external result means unavailable, not zero.
The application owns completeness, caching, and remote aggregation.

## Global search policy

`globalFilterScope` defaults to `'visible'` for compatibility.
In that mode, hiding a column removes its values from global search and can change matching records.
Set `globalFilterScope: 'all'` to search eligible columns regardless of visibility.
Column `enableGlobalFilter: false` excludes a column in both modes.
Columns without an accessor do not participate.
This controls local matching only. Visibility is not an authorization boundary.

`globalFilterFn(value, query, column)` supplies application-defined matching.
Without that callback, global search matches strings, numbers, and bigints by case-insensitive substring.
The engine trims the query. Empty queries impose no global search condition.
Column filters combine with global search and retain their application-defined `filterFn` behavior.
Manual filtering returns supplied rows without applying either local predicate.

For example, an application can hide a Notes column while retaining its matches with the `'all'` policy.
It can independently exclude an Actions column through `enableGlobalFilter: false`.
Applications with remote search send their own criteria and supply the accepted results.

## Columns and groups

`filterFn` owns column comparisons. `sortFn` owns value ordering.
`sortMissing` controls missing-value placement independently of ascending or descending order.
`getGroupingValue` supplies scalar group keys.
`aggregationFn` receives values and ordered boundary accessors. `aggregationEquals` can retain equivalent structured results.
`getUniqueValues` supplies a record's facet values.
`enableFilterValueReuse` opts deterministic accessors into reuse within one filter match, not across records or transformations.

`getSourceIds`, `getFilteredRowIds`, and `getRowIds` expose source, filtered, and ordered records.
`getDisplayKeys` includes records and group headings in presentation order.
Use `getDisplayItem` to distinguish them. Do not decode display keys in application code.
`getRow`, `getColumn`, and `getGroup` provide handles without copying records.
Create row and group views within the Solid owner that renders them.

## Two selection models

Engine `rowSelection` stores selected record IDs for application actions.
`createTableSelection` stores a rectangle for cell navigation and copying.
Neither model changes the other. Selecting a whole visual row for copying does not select that record for an application command.
See [table selection](table-selection.md#record-actions-and-cell-copying) for their separate responsibilities.
