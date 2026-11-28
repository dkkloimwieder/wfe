# Tables

The native Table engine processes records and manages view state. Table components use that state to render rows and request changes.

Contents

- [Table engine capabilities](#table-engine-capabilities)
- [Table workspace](#table-workspace)
- [Table filters](#table-filters)
- [Shared value formatting](#shared-value-formatting)
- [Table selection](#table-selection)
- [Row-dependent actions](#row-dependent-actions)
- [Table development diagnostics](#table-development-diagnostics)
- [Shared Table presentation](#shared-table-presentation)
- [Zaidan and Kobalte Select review](#zaidan-and-kobalte-select-review)

## Table engine capabilities

The native Table engine reads application records and manages view state and local transformations.

### Import

Import `createTable` and `nativeAggregations` from `@wfe/components/table`. `createNativeTable` is an alias for the same factory.

### Example

```jsx
import { createTable, ReadOnlyTable } from '@wfe/components/table'

export function Records() {
  const rows = { ada: { name: 'Ada' } }
  const table = createTable({
    source: { ids: () => ['ada'], get: (id) => rows[id] },
    columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
  })
  return <ReadOnlyTable table={table} title="Records" />
}
```

### Behavior and options

#### Records and state

`source.ids()` supplies stable record IDs in source order.
`source.get(id)` returns the current record. If a record ID remains in `source.ids()`, its record must exist. A removed ID can return `undefined`.
Column `accessorKey` and `accessorFn` supply raw values. Formatting belongs to presentation.
Keep the controller stable throughout each mounted table presentation.
See [controller lifetime](#controller-lifetime) for updates and explicit remounts.

`initialState` supplies uncontrolled defaults. `state` supplies application-accepted values for individual state fields.
Matching `on…Change` callbacks receive a value or updater function.
The application decides whether to accept each request.
State includes filters, sorting, groups, visibility, column order, widths, pinning, expansion, and record selection.
Engine setters change view state or request application acceptance. They do not send network requests.

#### Processing and external data

`manualProcessing` bypasses local filtering, sorting, grouping, and aggregation. Presentation can still arrange pinned rows.
`manualFiltering`, `manualSorting`, `manualGrouping`, and `manualAggregating` bypass their corresponding transformations.
These flags preserve view state. They do not load data, paginate, or infer a server protocol.
See [manual processing](#manual-processing-and-sort-requests) for the controls supported by each presentation.

`rowProcessingPaused` holds evaluated membership, order, and group structure while cell values remain live.
The application must retain displayed records and prevent incompatible configuration changes during that interval.
`keepPinnedRows` retains pinned source records through filtering. Collapsed groups can still hide those records.

`getFacetedUniqueValues` and `getTotalValue` accept authoritative application results.
An `undefined` external result means unavailable.
The application owns completeness, caching, and remote aggregation.

#### Global search policy

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

#### Columns and groups

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

#### Two selection models

Engine `rowSelection` stores selected record IDs for application actions.
`createTableSelection` stores a rectangle for cell navigation and copying.
Neither model changes the other. Selecting a whole visual row for copying does not select that record for an application command.
See [table selection](#record-actions-and-cell-copying) for their separate responsibilities.

### Application ownership

Supply stable record IDs, accessors, comparison functions, and any controlled state. Own writes, requests, and data access.

### Gallery

Open `?gallery=table` to see the native engine under the shared table presentation.

## Table workspace

ReadOnlyTable presents a native table with a header, controls, results, and a footer.

### Import

Import `ReadOnlyTable`, `TableWorkspace`, and `TableControlSection` from `@wfe/components/table`.

### Example

```tsx
import { Button } from '@wfe/components'
import { DashboardPanel, DashboardShell } from '@wfe/components/layout'
import { ReadOnlyTable } from '@wfe/components/table'
import type { NativeTable } from '@wfe/components/table'
import '@wfe/components/styles.css'

export function Records(props: {
  table: NativeTable<{ name: string }>
  refresh: () => void
}) {
  return (
    <DashboardShell style={{ height: '100dvh' }} scroll="content">
      <DashboardPanel fill>
        <ReadOnlyTable
          table={props.table}
          title="Records"
          actions={<Button onClick={props.refresh}>Refresh</Button>}
        />
      </DashboardPanel>
    </DashboardShell>
  )
}
```

### Behavior and options

#### Controller lifetime

Create one table controller inside the Solid owner that renders it. Update records and accepted state through that controller. If the controller changes, remount Table, ReadOnlyTable, or TableView, for example with keyed Show.

#### Layout and placement

Give the workspace a definite height. Inside DashboardShell, use `scroll="content"` and a panel with `fill`. Controls and results scroll independently. The header and footer stay outside the results scroller.

Controls start on the left. Use `controlsPlacement` for a controlled position or `defaultControlsPlacement` for an initial position. The available positions are left, top, and right. Top controls wrap and use at most 35% of the workspace height at their initial size. Set `--ui-table-controls-width` or `--ui-table-controls-height` to change the default dimensions.

Set `controlsResizable` to enable the desktop separator. Size uses a percentage from 10 to 90. Use `defaultControlsSize` for local state or `controlsSize` with `onControlsSizeChange` for controlled size. Enter or a double-click collapses or reopens the pane.

Use `defaultControlsCollapsed` for local collapse state or `controlsCollapsed` with `onControlsCollapsedChange` for application control.

```tsx
import { createSignal } from 'solid-js'
import { ReadOnlyTable } from '@wfe/components/table'
import type { NativeTable } from '@wfe/components/table'

export function RecordsWithControls(props: {
  table: NativeTable<{ name: string }>
  placement: 'left' | 'top' | 'right'
}) {
  const [collapsed, setCollapsed] = createSignal(false)
  return (
    <ReadOnlyTable
      table={props.table}
      controlsPlacement={props.placement}
      controlsCollapsed={collapsed()}
      onControlsCollapsedChange={setCollapsed}
    />
  )
}
```

#### Narrow screens

A workspace below 48rem opens a drawer inside its frame. The viewport also triggers the narrow layout. The drawer keeps results available and preserves the desktop collapse choice. Escape or the close button returns focus to the toggle. Focusing results closes the drawer. The control nodes and their drafts stay mounted.

#### Control sections and slots

Filters and Grouping start open. Display columns starts closed. Section headings show applied filter, grouping, or visible-column counts. See the [filter guide](#table-filters) for staged and live criteria.

Use `toolbarActions` for actions in the header. Use `actions`, `configuration`, and `formatting` for sections in the controls pane. `headerEnabled={false}` omits the header and controls. `controlsEnabled={false}` omits the pane and toggle. `footerEnabled={false}` omits summary and pagination. Child tables default to no controls, refresh, or footer. Column headings stay available.

For custom presentation, give the results scroller the `table-scroll` class. Pass `controls`, `controlsHeader`, `resultsHeader`, `footer`, or `footerActions` as needed. Use `controlsRef` to receive the handle for opening the pane and focusing a control.

#### Manual processing and sort requests

Manual sorting keeps sort controls available and sends requests through the Table engine. Local sorting requires a column `sortFn`. Use `sortable` or `filterable` to omit individual controls. In generated tables, set the column flags.

Manual grouping or manual processing disables the grouping control and grouped rendering. Manual filtering and manual processing require `onApplyFilters` for interactive filters.

#### Columns and messages

Drag or use keyboard commands to move columns. Pointer dragging requires a `[data-column-header]` inside `.table-scroll` and starts after five pixels of movement. Use Left, Right, Home, or End on a focused heading, or use its move menu. Escape cancels a drag.

Use `columnAlignment` with `onColumnAlignmentChange` to control display alignment by column ID. The default is Left. Custom rows can pass the same map to TableRow. The shared row and column divider tokens fall back to `--ui-border`.

Pass a partial `messages` object to change owned labels and counts. Omitted values use `tableMessages` defaults. Pagination messages override table messages per key. Pass messages to components created in application slots.

#### Pagination and saved views

Use `ReadOnlyTable.pagination` for application-supplied page availability, counts, and callbacks. Supply the accepted page through the Table source. Include `totalRows` for a known total. Use `pending` to disable page and size requests while loading.

For server results, use manual processing. Handle sort and filter requests in the application. Use `clientPagination` for the rows already in the controller. It uses zero-based pages and a list of positive page sizes.

Supply `views` to show the saved views controls. Version 1 snapshots can include filters, sorting, grouping, columns, page size, and control placement. ReadOnlyTable captures table state and accepts hooks for extra criteria and formatting. For TableWorkspace, supply capture and restore callbacks. System views can be selected or used as defaults. Editing and deletion apply to user views.

Supply a `views.storage` adapter for one user's table. It provides `list`, `save`, `remove`, and `setDefault`. Removing a view also clears its default ID. The optional `subscribe` callback reports application-side changes. Each storage operation receives an AbortSignal.

`savedViews` remains available for a caller-owned choice list. If you supply `views`, the saved views controls take precedence.

### Application ownership

Supply records, columns, height, and accepted state. Own comparisons, requests, permissions, pagination data, and saved view storage.

### Gallery

Open `?gallery=table` for the workspace and saved views example. Open `?gallery=pagination` for application-owned pages.

## Table filters

Table filter controls collect column criteria and global search text.

### Import

Import `ReadOnlyTable`, `TableColumnFilter`, and `createTableFilterDraft` from `@wfe/components/table`.

### Example

```jsx
import { ReadOnlyTable } from '@wfe/components/table'

export function FilteredRecords(props) {
  return (
    <ReadOnlyTable
      table={props.table}
      filter={(column) =>
        column.id === 'amount' ? { kind: 'number-range' } : undefined
      }
    />
  )
}
```

### Behavior and options

#### Control configuration

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

#### Controlled values

Text filters emit an object with `operator` and `value`.
Choice and tags filters emit an object with `operator` and `values`.
Numeric filters emit `{ operator: 'between', min, max }` with optional boundaries.
Empty-value filters emit `{ operator: 'empty' }` or `{ operator: 'not-empty' }`.
Clearing a filter emits `undefined`.

The shared `TableFilterValue` union includes boolean values and date ranges with optional `start` and `end` strings.
False remains an active criterion. A numeric boundary of zero remains a real boundary.
The previous `filterKind` callback remains available for existing simple consumers.
The `filter` callback takes precedence when both callbacks describe a column.

The application can update filter values through its Table controller.
Controls follow those values without editing source records.
When the application changes a column type, it also replaces incompatible filter state.

#### Reuse

`TableColumnFilter` is public for custom control layouts and supports every configured filter kind.
`TableHeaderFilter` accepts the same `config`, `value`, and `onValueChange` props.
With `config` supplied, the header hosts the same control as the panel and emits the same criterion shape.
Changing placement does not translate criteria or choose server query syntax.
Text composition stays local until composition ends.
A matching trailing input marked `insertCompositionText` or `insertFromComposition` does not repeat that request.
Ordinary text input and paste remain separate requests, even when their text matches the completed composition.
Its configuration and value types are `TableColumnFilterConfig` and `TableFilterValue`.
The component reuses the shared Select for both choice modes.
Calendar popups and date entry use the shared DatePicker.

Boolean filters use a three-state checkbox. A check means Yes, an empty box means No, and a dash means Either. Click the box or press Space to cycle through Yes, No, and Either. The checkbox has no visible state text or clear button. A screen reader announces the state and cycle guidance.

#### Legacy simple controls

Without `config`, `TableHeaderFilter` retains the string-based `TableFilterProps` API.
`TableFilter` remains the simple string control for global search and existing consumers.
Its empty sentinel is `''`. Its boolean mode uses `'true'`, `'false'`, and `''`.
The `ReadOnlyTable.filterKind` fallback likewise retains simple string text, boolean values, and date ranges.
To adopt the shared criterion contract, supply `filter` on ReadOnlyTable or `config` on TableHeaderFilter and TableColumnFilter.
An explicit configuration takes precedence over the legacy kind.

For existing string state, `fromLegacyTableFilterValue(value, kind)` converts the empty sentinel to `undefined`.
The kind defaults to `text`, which produces a Contains criterion.
Use `boolean` for boolean values or `select` for a single selected value with the In operator.
`toLegacyTableFilterValue(criterion, kind)` converts only criteria the simple control can represent.
It throws for lossy conversions, including multiple selections, date ranges, numeric ranges, and other text operators.
These adapters do not interpret records or create query expressions.
The existing `TableColumnFilterValue` type remains the structured operator union.
Existing structured-control callbacks retain their narrow argument type.
The named `TableColumnFilterProps` type keeps its original structured default.
Supply its configuration type parameter for boolean, date, or dynamic criteria.
Use `TableFilterValue` for layouts that accept every kind, including boolean and date-range values.

#### Apply criteria

By default, `ReadOnlyTable` keeps column edits and global search pending until the user presses the refresh icon. One action applies both. Sorting and grouping apply immediately. The clear-all action applies empty criteria immediately and calls `onClearFilters` when supplied.

The section shows UNAPPLIED CHANGES while pending criteria differ from applied criteria. Its active count describes applied filters. Application changes to the table criteria replace the pending snapshot. Replacing records keeps the pending criteria.

`createTableFilterDraft(table)` provides the same behavior for custom control layouts. Low-level filter controls emit values. The coordinator keeps those values separate from applied table state. It calls each changed table setter once when the user applies the criteria. It does not perform requests. The application owns controlled state and data loading.

If a filter contains an invalid draft, the refresh action focuses that control and keeps the current results.

For server requests, pass `onApplyFilters` to `ReadOnlyTable`. The callback receives all column criteria and search in one `TableFilterCriteria` value. The application owns the request and updates controlled table state. The component does not call table setters when this callback is present. Custom layouts can pass the same callback through `createTableFilterDraft(table, { onApply })`.

The refresh icon applies pending criteria and requests results through one action. Set `filterMode="live"` to apply accepted criteria as they change. Live mode hides the refresh button by default. Use `refreshEnabled` to override the button visibility.
With `onApplyFilters`, pressing it also sends unchanged criteria so the application can reload the current query.
Without that callback, the action applies local criteria and stays inactive when criteria match.
For custom layouts, `draft.apply({ refresh: true })` also sends unchanged criteria to `onApply`.
Calling `draft.apply()` preserves the existing behavior and skips unchanged criteria.

#### Global search and hidden columns

Local global search defaults to visible columns.
Hiding a searchable column can therefore remove matching records from the results.
Set the engine's `globalFilterScope` to `'all'` to keep matching hidden columns.
`enableGlobalFilter: false` still excludes individual columns in either mode.
See [engine capabilities](#global-search-policy) for callbacks, supported values, and manual filtering.

### Application ownership

Choose the controls and supply column `filterFn` comparisons for local processing. For remote processing, handle `onApplyFilters`, send requests, and accept results. Own any external filters.

### Gallery

Open `?gallery=table` and choose the workspace example to see live criteria. Open `?gallery=subtables` for child tables with separate filters.

## Shared value formatting

ValueDisplay renders formatted text while preserving the original value.

### Import

Import `ValueDisplay` and `formatDisplayValue` from `@wfe/components`. Import `TableFormatting` from `@wfe/components/table`.

### Example

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

### Behavior and options

TableFormatting shows controlled choices for boolean, date, datetime, and number columns. Pass the accepted formats to ReadOnlyTable through `formatValue` and `formatSummary`.

#### Date and datetime

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
Invalid date or time patterns and invalid datetime zones raise an error.

The third argument of `formatDisplayValue` accepts `ValueFormatOptions` or the existing locale string.

Pass the same application configuration to input and read-only controls when their presentation must match.
`DateTimePicker` retains its existing browser-local default.
The read-only default stays UTC for deterministic text formatting.

#### Browser timezone and hydration

`ValueDisplay` also accepts `timeZone="browser"`.
It shares timezone resolution with `DateTimePicker`.
Before mounting or hydration completes, browser-local text stays empty.
The server never guesses the browser zone from its host.
After attachment, the component resolves the browser zone and updates its text.
Explicit zones render on both the server and client.
Date-only output ignores this property.

The pure `formatDisplayValue` helper requires an explicit zone instead of the `browser` token.
The application can resolve a browser zone and pass its IANA name to this helper.

#### Existing formats

Boolean formats show check and cross symbols or Yes and No.
Symbols expose accessible Yes and No labels.
The text helper returns Yes or No for either boolean format.
Empty values stay empty.

Existing date formats remain `date-iso`, `date-short`, and `date-long`.
They accept date-only strings and keep their existing locale behavior.
The `date` choice adds the configured numeric format.
Datetime columns offer configured date/time output or a UTC ISO timestamp.

Number formats show plain numbers, groups, two decimal places, or currency. Pass an ISO 4217 code with the `currency` format.
Two decimal places round only the displayed value.
Sorting and filtering continue to use the original number.

Reusable Intl formatters use bounded caches with at most 32 entries per formatter type.
These caches retain formatting machinery and never retain record values.

Generated table columns accept the same `format` names with optional `formatOptions`.
Custom cell renderers take precedence.
The `short-hash` format shows eight Unicode codepoints and retains the full string in its title and accessible label.
Formats leave raw sorting, filtering, grouping, and export values intact.
Native text selection copies the visible text. Application-provided table copy text keeps its existing policy.

### Application ownership

Choose display formats and locale. Supply the raw values and keep control of comparison, copying, and export policy.

### Gallery

Open `?gallery=display` for formatted values. The [date fixture](../examples/generator/DateApp.tsx) shows the TableFormatting controls with typed date and time values.

## Table selection

Table selection supports rectangular cell navigation and copying.

### Import

Import `createTableSelection` and `ReadOnlyTable` from `@wfe/components/table`.

### Example

Create the selection inside the owner that creates `table`.

```tsx
const selection = createTableSelection({
  rows: () =>
    table.getDisplayKeys().flatMap((key) => {
      const item = table.getDisplayItem(key)
      return item.kind === 'row' ? [item.id] : []
    }),
  columns: () =>
    table
      .getVisibleColumns()
      .filter((column) => column.id !== 'actions')
      .map((column) => column.id),
  getText: ({ row, column }) => String(table.getValue(row, column) ?? ''),
})
return <ReadOnlyTable table={table} selection={selection} />
```

### Behavior and options

Pass a controller to Table, ReadOnlyTable, or a generated TableView through `bindings.selection`. In ReadOnlyTable, `selection={true}` uses a built-in controller for displayed rows and columns. Its copy text comes from the raw cell values. When selection is absent, the browser handles text selection.

Drag across data cells to select a rectangle. Shift-click extends the rectangle.
Use arrow keys to move the active cell. Shift and an arrow key extend the selection.
Shift+Space selects whole rows. Control+Space selects whole columns.
Control+A selects all available cells. Escape clears the selection.
Use Command instead of Control on macOS.
Touch gestures retain scrolling and native text selection.
Inputs, links, buttons, and editable content retain their normal interaction.
Use `data-table-selection-ignore` on a custom interactive region to exclude it from selection gestures.
Header sorting, movement, renaming, and resizing keep their existing controls.

Control+C uses the normal copy event to copy tab-separated values.
The controller quotes values that contain tabs, line breaks, or quotes.
The application controls value formatting through `getText`.
For mounted cells, a native DOM range supports the browser Copy command.
Cell shading replaces the range's text highlight.
The copied rectangle comes from logical IDs, including available rows outside the virtual window.
Native editor selections and text selections outside the table retain their normal copy behavior.
If copy text is unavailable, the handler leaves the clipboard unchanged.

Pass `value` and `onChange` for application-controlled selection.
Keep each accepted range object immutable and return a new object to accept a request.
Without `value`, commands update the local selection immediately and also report through `onChange`.
The public controller provides `select`, `move`, `selectRow`, `selectColumn`, `selectAll`, `clear`, and `copyText`.

A row or column order change clears the range.
Filtering, hiding columns, and collapsing groups also clear it when the supplied ID sequences change.
Equivalent ID sequences, width changes, and record value changes preserve the range.
If a controlled application rejects clearing, the component still hides the obsolete range and prevents copying it.
The application can supply `onReveal` to scroll a virtual row into view after the accepted focus changes.
The controller paints only mounted cells and creates no extra row or cell owners.

#### Record actions and cell copying

The engine also exposes `state.rowSelection`, `setRowSelection`, and each row's `getIsSelected` and `toggleSelected` methods.
This model records selected IDs. An application can read those IDs for a command. ReadOnlyTable also accepts a separate `rowSelection` binding with `selected` and `onChange` for rendered checkboxes. Supply `bulkActions` for application actions beside the table controls.
The application decides whether hidden, filtered, or unloaded records remain eligible for that command.

For example, selecting record B for an application action can coexist with a copied cell range from record A.
Clearing the copied range leaves B selected. Clearing `rowSelection` leaves A's copied range intact.
`createTableSelection.selectRow()` selects cells for copying. It does not call a row's `toggleSelected()` method.

### Application ownership

For custom selection, supply displayed record IDs, selectable column IDs, and synchronous copy text. Omit group headings, action columns, and unloaded records. Own bulk commands, server exports, and any controlled selection state.

### Gallery

Open `?gallery=table` for cell copying or `?gallery=subtables` for separate selection in parent and child tables.

## Row-dependent actions

A row action uses the current record to decide what to show and enable.

### Import

Import `Button` and `FormActions` from `@wfe/components`. Import `CustomCellProps` from `@wfe/generator`.

### Example

```tsx
import { Show } from 'solid-js'
import { Button, FormActions } from '@wfe/components'
import type { CustomCellProps } from '@wfe/generator'

type Row = { id: string; name: string; pending: boolean; archived: boolean }

export function createRowActions(callbacks: {
  openRecord: (id: string) => void
  archiveRecord: (id: string) => void
}) {
  return function Actions(props: CustomCellProps<Row, unknown>) {
    return (
      <Show when={props.row.original}>
        {(row) => (
          <FormActions>
            <Button
              disabled={row().pending}
              aria-label={`${row().archived ? 'View' : 'Edit'} ${row().name}`}
              onClick={() => callbacks.openRecord(row().id)}
            >
              {row().archived ? 'View' : 'Edit'}
            </Button>
            <Show when={!row().archived}>
              <Button
                disabled={row().pending}
                aria-label={`Archive ${row().name}`}
                onClick={() => callbacks.archiveRecord(row().id)}
              >
                Archive
              </Button>
            </Show>
          </FormActions>
        )}
      </Show>
    )
  }
}
```

### Behavior and options

Read `props.row.original` inside JSX or a reactive accessor. Use Show to omit an unavailable action. Use `Button.disabled` to keep a visible action unavailable. The outer Show skips records that have no original row.

Create the cell component once per mounted table. Bind it through `bindings.cells.actions` and set the column renderer to `'actions'`. Set the column's `sortable` and `filterable` flags to false. A stable component keeps its button and focus when text changes.

ReadOnlyTable can also render direct controls with `renderRowActions` and a menu with `rowActions`. Table-wide actions receive application callbacks without a row.

### Application ownership

Supply action visibility, labels, callbacks, and permissions. Own record updates, requests, and focus after removing a focused action.

### Gallery

Open `?gallery=column-controls` for live rows, hidden actions, disabled buttons, and replacement callbacks.

## Table development diagnostics

The development runners report expensive Table calculations by name.

### Import

Import `createTable` from `@wfe/components/table` in a Table consumer. The diagnostic policy belongs to the example runners.

### Example

From the repository root, run a bounded editing example in development mode.

```sh
BENCH_DEVELOPMENT=1 NODE_ENV=development pnpm exec vite build --config examples/table-editing/vite.config.ts
BENCH_DEVELOPMENT=1 NODE_ENV=development BENCH_WORKLOADS=1 BENCH_SIZES=999 node examples/table-editing/run.mjs
```

### Behavior and options

A memo caches a calculation and tracks its inputs. The runners record `HUGE_FAN_IN` and `WIDE_SCOPE_DEPS` only for these named calculations.

- `createNativeFiltering.filteredIds` identifies filtering.
- `createNativeTable.sortedIds` identifies sorting.
- `createNativeGrouping.tree` identifies group membership.
- `createNativeGrouping.roots` identifies group ordering.
- `createGroupView.value` identifies aggregate values.

The shared parser also recognizes the `Computation` wording. It rejects unknown names, unrelated codes, and malformed reports. Timing under `HOT_SCOPE_TIME` is advisory on a shared host.

If the prepared WAMN inputs exist, run the separate integration diagnostic.

```sh
node examples/wamn/check-inputs.mjs
BENCH_DEVELOPMENT=1 NODE_ENV=development pnpm exec vite build --config examples/wamn/vite.config.ts
BENCH_DEVELOPMENT=1 NODE_ENV=development BENCH_WORKLOADS=1 BENCH_SIZES=1000 node examples/wamn/run.mjs
```

Run the workloads serially and choose a fresh `BENCH_OUTPUT` path.

Column resize and reorder share pointer cleanup. Both release blur, visibility, and Escape listeners, plus a scroll listener when a scroller exists. Pointer cancellation, lost capture, disabling, and owner disposal end the gesture.

### Application ownership

Choose a representative row count and report path. Own data sizing and cache policy.

### Gallery

Open `?gallery=table` to see the shared table. Use the runners above for the diagnostic workload.

## Shared Table presentation

Table and ReadOnlyTable present records from one application-owned native engine.

### Import

Import `Table` and `ReadOnlyTable` from `@wfe/components/table`.

### Example

```jsx
import { ReadOnlyTable } from '@wfe/components/table'

export function Results(props) {
  return <ReadOnlyTable table={props.table} title="Results" />
}
```

### Behavior and options

Both components share headers, cells, group rows, and row details. ReadOnlyTable adds a workspace with standard table controls. Use [Table workspace](#table-workspace) for layout and slots.

Use a stable `renderCell` callback for stateful record content. Read `cell.getValue()` inside reactive JSX. Column movement retains mounted cell owners. Hiding a column or removing a row disposes its cells.

Use `renderBody` with `VirtualRows` and `TableRow` for application-owned virtual rendering. The replacement body supplies rows, groups, and details. Use the existing `.table-scroll` element as the scroller.

### Application ownership

Create the table controller. Supply its records, columns, and callbacks. Applications own accepted values, editors, actions, comparisons, requests, and storage. The editing and analytics examples own writes and queries. See the [UI ownership contract](contracts.md#generic-ui-boundaries).

### Gallery

Open `?gallery=table` for shared presentation or `?gallery=subtables` for expandable row details.

The [editing](../examples/README.md#table-editing) and [analytics](../examples/README.md#analytics) fixtures use the same structure and cell renderer. Analytics disables local filter and search controls for full-query export.

## Zaidan and Kobalte Select review

The native dropdown fixture did not use Zaidan or Kobalte as its initial reference.
This source review identifies the additional behavior that a popup editor needs.
The original browser results covered HTML select inputs only.
The later [popup fixture](../examples/README.md#components) tests real Kobalte Select with a focused Solid 2 port.

### Behavior and options

#### WAMN controls

The review used WAMN revision `1931d925f15e3e33ef2fc4899a8a46e96f0b4125` in `~/dev/wamn`.
Its `web/ui/README.md` records copied Zaidan components from September 22, 2026.
WAMN owns those source files and has no Zaidan runtime dependency.
Its UI manifest declares `@kobalte/core ^0.13.14` and `solid-js ^1.9.15`.

`web/ui/src/components/ui/select.tsx` wraps Kobalte Select with styling and popup placement.
Kobalte supplies the interaction behavior.
A portal renders the popup outside the control in the document.
This means that focus can leave the table row while the user still edits its dropdown.

`ChoiceField` in `web/ui/src/fields.tsx` maps a scalar value to an object with `value` and `text` fields.
The displayed label and saved value remain separate.
Nullable fields add an empty choice.

`web/ui/src/record-select.tsx` uses Kobalte Combobox for record references.
It supports delayed search, another page of records, and a selected record outside the current page.
Its memo compares selected record keys to preserve typed search when record objects change.
The caller owns search and paging. This control filters no records locally.
These behaviors need separate coverage from a fixed list of choices.

#### Upstream revisions

Kobalte has a `solid2` branch at `e9d426d438b7c9ea0cc81bd1133831a20cd5fcae`, dated September 24, 2026.
Its core manifest declares `2.0.0-alpha.2`.
Its [workspace catalog](https://github.com/kobaltedev/kobalte/blob/e9d426d438b7c9ea0cc81bd1133831a20cd5fcae/pnpm-workspace.yaml) pins Solid, web, and signals to `2.0.0-rc.3`.
The original review used Solid `2.0.0-rc.13`. The current workspace pin is `2.0.4`.

Kobalte Select contains Solid 2 effects, DOM imports from `@solidjs/web`, and explicit `ownedWrite` declarations.
Its [test source](https://github.com/kobaltedev/kobalte/blob/e9d426d438b7c9ea0cc81bd1133831a20cd5fcae/packages/core/src/select/select.test.tsx) covers controlled values, disabled choices, keyboard selection, Escape, and selection through typed letters.
This review read those tests but did not run them.
The source review did not build or browser-test Kobalte with Table.
The later popup fixture supplies that isolated browser evidence.

Zaidan has a `refactor/solid-2` branch at `5ddc991f11bd2510c2cecc04bd0732f636f3168f`, dated September 9, 2026.
Its [migration PR](https://github.com/carere/zaidan/pull/501) remains open and draft.
The [manifest](https://github.com/carere/zaidan/blob/5ddc991f11bd2510c2cecc04bd0732f636f3168f/package.json) still declares Solid `^1.9.14` and Kobalte `^0.13.12`.
The [branch notes](https://github.com/carere/zaidan/blob/5ddc991f11bd2510c2cecc04bd0732f636f3168f/docs/research/solid2-wayfinder.md) describe planning work without Solid 2 support.
The [migration specification](https://github.com/carere/zaidan/issues/503) requires upstream releases and consumer installation evidence before release.

#### Table implications

The [Kobalte trigger](https://github.com/kobaltedev/kobalte/blob/e9d426d438b7c9ea0cc81bd1133831a20cd5fcae/packages/core/src/select/select-trigger.tsx) handles Enter, Space, arrow keys, and selection through typed letters.
The table must let the dropdown handle those keys before any row shortcut.
Choosing a value changes the row draft. Save commits that draft.

The [popup content](https://github.com/kobaltedev/kobalte/blob/e9d426d438b7c9ea0cc81bd1133831a20cd5fcae/packages/core/src/select/select-content.tsx) handles Escape, outside interactions, and focus restoration through `onCloseAutoFocus`.
Moving focus into the popup must preserve the draft.
Closing the popup must preserve the draft and its selected value.
Popup focus restoration and row focus restoration need coordinated browser tests.
A late close or save must not take focus from another row.

The existing controller can retain row drafts, schema rules, pending requests, and conflicts.
The dropdown can manage its open state and highlighted choice.
This division does not require another canonical record store or a Table dependency on Kobalte.
The popup fixture now exercises this integration boundary with fixed choices.

The isolated experiment tests keyboard and pointer selection, outside clicks, focus restoration, field errors, pending saves, editing locks, and disposal.
It measures resource counts and actual heaps with one Solid runtime.
The user authorized focused source repairs for this experiment.
WAMN Form/UI migration, searchable Combobox references, and broader component vendoring remain separate work.
