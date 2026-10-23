# Table presentation

Import Table presentation from `@wfe/components/table`.
These components render an application-owned native Table without creating records, transport, or an editing model.
Editing, read-only, and analytics demos use the same source.

The export contains `Table`, `TableRow`, `ReadOnlyTable`, `TableWorkspace`, and `TableControlSection`.
Column controls contain `TableSort`, `TableFilter`, `TableHeaderFilter`, `TableHeaderName`, `TableGrouping`, `TableColumnMove`, and `TableColumnResize`.
`moveColumn` returns column IDs in the requested order and retains hidden IDs.
Types contain `TableEdge`, `TableFilterProps`, and `ColumnDestination`.

## Composition

Import `@wfe/components/styles.css` explicitly and apply `uiScope()` to the owning wrapper.
Create the native Table in application code and pass it through the `table` prop.
The native engine belongs to the same package and table export.

`Table` accepts header, row, body, formatting, and edge callbacks.
The application can supply editors and action controls through these callbacks.
`ReadOnlyTable` adds sorting, filtering, search, grouping, summaries, visibility, and column ordering.
Its `controls` prop can disable individual features.
Its default workspace places expandable controls on the left and results on the right.
Both panels scroll independently within the height that the application assigns.
The `actions` and `configuration` slots accept application content inside the controls pane.
The `toolbarActions` slot accepts application controls in the persistent header.
These actions stay visible when the controls pane collapses or becomes a mobile drawer.
The [workspace guide](../../../../docs/table-workspace.md) describes sizing and the narrow controls drawer.
Neither component copies the application records.
ReadOnlyTable forwards `width` and `headerEnd` to Table.
The application can render TableColumnResize in headerEnd and pass the sum of visible column sizes as width.
The existing engine owns accepted sizing through its state contract.
The presentation does not scan records to calculate initial widths.

Column controls receive values, bounds, IDs, and callbacks.
Applications own permissions, requests, validation, save rules, export, and persistence.
Header naming changes the display label through `onRename`.
The component keeps the rename icon hidden while the editor is open.

## Source ownership

The canonical event helper lives in `../utils/nativeEvents.ts`.
It removes native listeners when the Solid owner disposes.
The library imports no example or application source.
The original example helper re-exports this implementation for existing consumers.

Optional virtual presentation is exported through `@wfe/components/virtual`.
Paging, caches, memory estimates, and server export remain application code.

## Tests

Run `pnpm check` from the repository root.
Run `pnpm test:qualification` for source, built-package, and development browser cases.
The suite also covers hydration, cleanup, vendor integrity, and import ownership.

## Shared controls

Table controls use the shared Button, Input, and Select components.
SelectField composes the same Select parts for a simple string choice.
The trigger owns the triangle and spacing. Filters do not supply another icon.
Native header popovers and pointer gestures retain their existing browser behavior and event cleanup.
Header renaming uses an uncontrolled Input draft until Enter or blur commits it.
Escape discards that draft and restores the rename button focus.

`TableChoiceEditor` renders the shared Select composition for a complete small choice list.
`TableChoiceEditorProps` defines values, labels, choices, disabled and invalid state, and callbacks.
`TableChoice` defines a string value, label, and optional disabled state.
The application can implement another editor with the same interface and pass it through its row renderer.
Opaque editor and owner IDs support DOM lookup and popup scope.
These IDs introduce no record lookup or save behavior.

TableFilter defaults to `Search values…` for search and accepts a caller `placeholder`.
TableGrouping defaults to summaries over filtered records and accepts caller `summaryHelp` content.
Its `label(id)` callback supplies grouping labels, summary field names, and summary ordering choices.
Label updates retain the selected summaries and grouping order because these values use column IDs.
Editing adapters supply any saved-record wording that their processing rules require.
Read-only and analytics controls retain generic defaults.
The application keeps editing locks, validation, revisions, stale responses, named views, actions, and server export descriptors.

SelectField accepts application-owned `choices`, `value`, and `onValueChange` props.
Each choice supplies a string value, label, and optional disabled state.
Use `label` for the accessible name and `name` for native form submission.
The `ref` points to the trigger button.
TableFilter.controlRef receives an input or trigger button, depending on its filter kind.
All editable field surfaces share hover feedback through `--ui-control-hover`, which defaults to `--ui-highlight`.

## Stateful record cells

`Table`, `TableRow`, and `ReadOnlyTable` accept `renderCell(cell)` for custom record components.
The table calls this function once for each mounted native cell owner.
The function takes a `NativeCell` and overrides `formatValue` for record cells.
Read `cell.getValue()` within reactive JSX to receive current application values.
Keep the function identity fixed while its row remains mounted.
Column reordering preserves the cell owner.
Hiding a column or removing a row disposes that owner's custom content.
Group labels and aggregate formatting keep their existing callbacks.

Table controls use a fixed pane by default. The toolbar button opens and closes it.
Set `controlsResizable={true}` only for custom controls that need adjustable space.
Table cell padding fits the configured row and control heights.
Use `--ui-table-cell-padding-y` to override vertical table padding.

## Optional framing

`ReadOnlyTable` accepts `headerEnabled`, `footerEnabled`, `controlsEnabled`, and `refreshEnabled`.
Top-level tables enable all four by default.
The header is the title and action bar, separate from column headings.
Set `headerEnabled={false}` to omit that bar and the configuration pane.
Set `footerEnabled={false}` to omit the summary and pagination controls.
Disabled regions do not construct their content.
The result rows remain mounted when these properties change.

Inside row details, child tables retain their header and column headings by default.
Their configuration pane, refresh button, and footer default to disabled.
Set each property to `true` to enable it explicitly.
The application owns requests and can load child records through the parent expansion callback.
An enabled child refresh button uses the normal refresh callback.
`TableView` forwards these properties through its bindings.
`TableWorkspace` also accepts `headerEnabled` and `footerEnabled` for custom compositions.

## Controlled pagination

`ReadOnlyTable.pagination` accepts `TablePaginationProps` from `@wfe/components/table`.
The same subpath exports `TablePagination` for a custom table footer.
Applications supply `hasPrevious`, `hasNext`, `onPrevious`, and `onNext`.
The component emits requests. It never fetches, slices rows, calculates page numbers, or resets criteria.
Supply only the accepted page through the table source.
For server-side sorting and filtering, use `manualProcessing: true` and handle criteria in the application.

Optional `pending` disables page navigation and page-size changes while the application handles a request.
It does not disable refresh or clear accepted rows.
Optional `status` announces application text, such as `Page 2 of 8` or `More records available`.
Totals and cursor formats remain application concerns.
The record count describes the current page, not an inferred total.

Optional `pageSize` supplies a positive integer `value`, unique positive integer `options`, and `onValueChange`.
The application accepts the requested size by updating `value` and the accepted rows.
The component does not select a new page or change rows while it waits.
Use live getters or reactive props for availability, status, page size, and pending state.

`TableWorkspace.footerActions` places controls beside its summary, outside the status announcement region.
Pagination uses the existing select and icon buttons and wraps within narrow footers.
The [paged mock](../../../../examples/table-read-only/README.md) demonstrates application-owned responses.

For paginated tables, supply `pagination.totalRows` with the total matching rows from the application.
The footer shows the current page row count over that total, such as `3/8`.
If the total is unknown, omit `totalRows`. The footer then shows only the current row count.
