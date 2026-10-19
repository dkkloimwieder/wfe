# Generator contract

`@wfe/generator` defines typed descriptions and application bindings for forms, tables, boolean grids, dashboard layouts, and charts.
This private package exports `FormView`, `TableView`, `GridView`, and `LayoutView` through its public entry.
The chart subpath exports ChartView.
These functions compose existing components from typed descriptions and bindings.
They do not create another form coordinator or table engine.

The API creates runtime UI from descriptions and bindings.
It does not define a serialized metadata format, a source emitter, or a service client.
Applications keep their data, validation rules, requests, and persistence.
The generator supplies composition over the existing components and their styles.

## Descriptions and bindings

Descriptions contain stable identities, text, control choices, actions, and layout references.
Bindings provide existing form and table instances, callbacks, current choices, presentation values, and custom components.
Use literal descriptions with `as const satisfies` to retain field, action, renderer, and view identities in their types.
Avoid widening a description to a general interface before deriving its bindings.
That widening loses the literal names needed to require specific bindings.

Use `FormDescription<T>` and `FormViewBindings<T, D>` for one flat scalar form.
Use `TableDescription` and `TableViewBindings<Row, Meta, D>` for one table.
Use `LayoutDescription<ViewId>` and `LayoutViewBindings<D>` for a dashboard composition.
`D` is the type of the particular description.
The [compile examples](../tests/contracts/generator-contract.ts) cover two unrelated record shapes and layouts.
Missing actions, choices, custom renderers, and referenced views produce type errors.
The tests also reject incompatible field controls, choice values, aliases, and layout references.

## Forms

A field's record key is its identity.
Labels and help text do not define identity.
Field labels are optional. An omitted label defaults to the field key.
Action and submit labels are optional and default to the operation ID.
Explicit labels and existing table header-alias precedence remain unchanged.
The field list defines display order unless named groups provide that order.
Optional [form layout](form-layout.md) metadata supplies named groups, columns, and field spans.
An application supplies one existing `FormContract<T>` from `@wfe/form`.
That contract supplies accepted values, errors, pending state, reset, cancellation, and submission.
Its original application bindings still own value acceptance, defaults, validation, and submission callbacks.
The generator does not create another coordinator or copy canonical values.

Text and textarea controls require a full string type.
Select controls accept typed string choices, including string unions.
Checkbox and switch controls require a full boolean type.
A literal boolean requires a custom control because a toggle requests both values.
Select bindings supply current typed choices through accessors.
An accessor is a function that reads the current value.
Numeric fields use the shared [numeric input](number-inputs.md) through `control: 'number'`.
Optional and nullable numbers declare their empty policy explicitly. Other unsupported scalar types use custom field components.
This limit avoids adding a second numeric draft or conversion policy.
Custom field props preserve the field's value type and request changes through the existing contract.
The surrounding field supplies labels, help, errors, and accessibility associations.
Custom controls must honor the supplied DOM identity and existing Field context.

A submit description explicitly enables the form's existing submission operation.
Its label and ID remain presentation data.
The enabled submit button and native form submission call the same bound operation.
Without a submit description, the form prevents native submission.
Extra actions use application callbacks keyed by their described IDs.
Applications handle asynchronous extra actions and supply their own pending or error presentation.
Disabled and read-only bindings remain application decisions.
A required flag supplies field semantics and does not replace application validation.

## Tables

An application supplies one configured `NativeTable<Row, Meta>`.
There is no alternate generator path that accepts raw rows and creates another table.
The supplied instance owns access to application rows and the existing engine configuration.
Accessors, comparisons, filtering, grouping, and controlled updates remain on that instance.
Current column ordering and visibility remain in its existing state and callbacks.
Applications still own server operations through the existing table and refresh bindings.

The column map supplies presentation by stable column ID.
Its property order does not define column order.
Computed column IDs are arbitrary strings and do not need to match record properties.
Static labels belong to the description.
Current header aliases belong to the application binding and override those labels.
Bindings also supply optional existing filter, grouping, alignment, refresh, and collapse contracts.
The renderer passes the same table to `ReadOnlyTable` and uses its existing slots.
Custom cell bindings receive the raw value, native column, and native row.
The row supplies its stable ID and a live `original` getter for the application record.
These bindings do not change sorting or filtering data.
Applications use this context for row actions and inline editors.
The application still owns validation, permissions, requests, drafts, and save behavior.
The shared table supplies one `renderCell` slot per mounted native cell.
That slot receives the native cell with its reactive `getValue` method.
The generator uses it to preserve custom components across record changes.
Existing `formatValue` callbacks remain available for ordinary stateless formatting.
Group labels and aggregate values retain the existing table presentation in this first renderer.

The current `NativeTable` type does not encode its configured column IDs.
TypeScript cannot prove that a described column exists on that particular instance.
The renderer must report unknown column IDs at runtime before rendering.
It must also report unknown alias keys, duplicate field, action, and panel identities, and missing dynamic bindings.
The renderers report these errors with a `Generator:` prefix.
An application can use Solid `Errored` to present a rejected description.

## Layout and identity

Layout panels have stable IDs and reference view bindings by name.
The same view mechanism accepts ordinary components and generator compositions.
Main panels and optional navigation use the existing dashboard shell, grid, and panels.
Panel lists define order within their region.
Columns, scrolling, titles, and navigation labels remain presentation choices.
A main panel with `fill` makes the grid occupy the available main height.
Its record contents do not determine the panel height.
The existing child scroller handles content that exceeds this assigned space.
Without a main fill panel, the grid follows its content height.
Navigation fill does not change the main grid height.

Labels, aliases, field order, panel order, callbacks, choices, loading, and errors can change without replacing form or table ownership.
Form and table instances remain fixed for a mounted view.
Replacing either instance requires a new view identity.
Changing a field's control family or a custom component's identity also requires an explicit remount.
A layout view callback defines a component and retains its identity while its panel remains mounted.
Changing that callback requires a new panel identity.
Action callbacks can change without replacing their buttons.
Moving a panel between navigation and main content requires a new panel identity.
These boundaries keep application state separate from DOM lifetime.
The renderer tests cover these updates and dispose removed fields, cells, and panels.

## Qualification

From the repository root, run `pnpm build` before `pnpm test:contracts`.
The contract command compiles the documentation and positive and negative generator examples against the built package declarations.
Run `pnpm check` before committing.
The [public example](../examples/generator/App.tsx) composes all three views without a backend.
Its browser and hydration suites use source, distribution, and development builds.

## Independent application adapters

The generator example contains separate records and dispatch applications.
Their applications own accepted values.
Their providers own distinct records, validation rules, and save behavior.
The dispatch application computes a route column and formats cents through a custom cell.
Its nullable amount uses the generated number control with an explicit null policy and shared Field context.
The two applications use the same public views without changes to generic packages.

An adapter supplies stable field, action, column, and panel identities.
It can update labels, order, aliases, and action callbacks within those identities.
It must remount a view when it replaces the form, table, or custom component identity.
Applications must guard publication after asynchronous work with the supplied abort signal.
Providers must also guard their own disposal when used outside the form coordinator.
The coordinator rejects stale replies, but it cannot undo records already published by an application.

Removing a view disposes its mounted controls.
The application still owns any coordinator or provider created outside that view.
The dispatch removal action explicitly cancels its form before removing the editor.
Whole-application disposal aborts the coordinator and prevents provider publication.
The tests settle late replies after both operations and require unchanged records and errors.

## Focus during reordering

Keyed field and panel moves keep a retained control's focus and selection.
The renderer restores focus after a DOM move only within the view that owns that control.
A later focus move wins over restoration.
Removed, disabled, hidden, inert, or disposed controls do not regain focus.
The browser suite exercises native inputs, textareas, and custom fields in both reorder directions.

## Workspace regions

`LayoutDescription` supports `navigation`, `context`, `panels`, and `footer` regions.
All region arrays use `PanelDescription` and share one namespace for panel IDs.
Each declared view requires a binding. A panel needs a new ID to move between regions.
Context and footer views retain their local state during relabels and reorders.

An omitted footer removes its band. An empty `footer: []` reserves an empty band.
Main panels use the shared panel frame. Auxiliary regions use unframed groups so the shell owns their outer padding.
Applications own menu links and permissions. The generator owns region composition and stable view identities.

Table selection is a runtime binding through `TableViewBindings.selection`.
Descriptions stay serializable and contain no controllers or clipboard callbacks.
See [table selection](table-selection.md) for application-owned IDs and copy text.

## Described shell composition

ShellView lives in the separate `@wfe/shell` package and composes the existing dashboard frame.
Application page bindings can render FormView and TableView through their existing contracts.
Shell metadata does not create a form coordinator, table engine, router, or data client.
Use LayoutView for a described dashboard composition when a separate shell frame is not required.
Read the [shell guide](../packages/shell/README.md) for navigation bindings and page lifetime.

The [shell example](../examples/shell/README.md) combines two audiences, six routes, generated tables, and generated forms.
Its application owns browser history and retains form values across page changes.

## Boolean grid metadata

`GridDescription` describes stable row and column IDs with labels.
Rows accept an optional `disabled` flag. Columns accept an optional `readOnly` flag.
Both axes retain their declared order and can be empty.
The grid ID identifies a mounted view. Labels never define identity.

`GridBindings<D>` supplies `value(row, column)` and one `onValueChange` callback.
The getter returns the accepted boolean for that cell.
A change request contains `{ row, column, value }` with literal row and column IDs.
The application accepts or rejects each request and owns saves, validation, and permissions.
A read-only column supplies presentation metadata, not an authorization rule.
Descriptions contain no records, callbacks, transport, or permission decisions.

`GridView` renders a semantic table with shared Checkbox controls and shared table styles.
Every checkbox takes its accessible name from its row and column headers.
Read-only cells remain focusable. Disabled rows prevent interaction.
The renderer reads accepted booleans and never copies them into another cell store.
It reports malformed metadata, missing bindings, and nonboolean values with a `Generator:` error.

Row and column reordering preserves retained cell owners and focus.
Label changes update accessible names without replacing inputs.
Remount the grid to replace its description ID.
The table fills its assigned width and scrolls inside its region on narrow screens.
Set a definite parent height when the grid must fill a page.
Applications use normal Tab navigation. The grid does not add spreadsheet keyboard commands.
The [30 by 5 example](../examples/grid/README.md) demonstrates keyboard and pointer changes, controlled rejection, reordering, and hydration.
The [type contract](../tests/contracts/grid-contract.ts) rejects unknown row/column IDs and nonboolean values.

StatusTile presents application-supplied values and explicit states through the existing display components.
TileRow reuses the responsive DashboardGrid. It adds no form coordinator or application controller.
Read the [tile guide](status-tiles.md) and [example](../examples/status-tiles/README.md) for read-only composition and formats.

## Display formats

Fields and columns accept the shared `ValueFormat` names through `format`.
These include `date`, `datetime`, `boolean-symbol`, and `short-hash`.
Optional `formatOptions` supplies `locale`, `dateFormat`, `timeFormat`, and `timeZone` through the existing shared contract.
Runtime descriptions reject unknown configuration keys and nontext configuration values.
Date-only values retain their calendar day. Datetime values use the configured zone, with UTC as the default.
The `browser` zone resolves after hydration through the existing timezone helper.

TableView formats ordinary cells. A custom cell renderer takes precedence over the declared format.
FormView formats a built-in field when its application binding marks that field read-only.
Editable fields retain their controls, draft handling, and raw values.
A custom field component retains ownership of its presentation.
Input date patterns remain on the date control description. Display patterns belong to `formatOptions`.
Changing display metadata preserves editable inputs and mounted read-only outputs.
Changing between editable and read-only presentation replaces the control inside the existing field.

The shared FieldValue output retains its label, help, error, and invalid associations.
It disables implicit live announcements. Applications can request announcements through its native `aria-live` property.
The `short-hash` format shows the first eight Unicode codepoints of a string.
It does not calculate a hash or define record identity.
The full string remains available through the displayed span's title and accessible label.
Shorter strings remain complete. Missing values remain empty, and other scalar values retain their text.

Formats do not replace engine data, validation snapshots, or submission values.
Sorting, filtering, grouping, and application exports continue to use their configured raw values.
Native text selection copies the displayed text, including a shortened prefix.
An application can supply raw copy text through the existing table selection binding.
There is no separate clipboard mechanism for formatted values.

The [generated formats example](../examples/generator/FormatsApp.tsx) shows optional labels and formats in both generated views.
Open `/?app=formats` on the generator preview.
Its application supplies read-only flags and submits the original values through one callback.
Browser tests cover label and format updates, retained controls, native prefix selection, server output, hydration, narrow screens, and disposal.
