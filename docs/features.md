# Current functionality

This catalog describes the public APIs in this checkout.
Shell implementation starts from the October 19, 2026 cleanup baseline, `19bafcb`.
It distinguishes public APIs from examples and planned additions.
The package export maps and linked guides define the supported contracts.

## Packages and ownership

| Package           | Current responsibility                                                                           | Public source                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `@wfe/components` | Controls, display, layout, Table, virtualization, charts, and shared styles                      | [Root exports](../packages/components/src/index.ts) and [export map](../packages/components/package.json) |
| `@wfe/shell`      | Described audience/navigation frame, breadcrumbs, accepted-navigation focus, and metadata guards | [Shell contracts](../packages/shell/README.md)                                                            |
| `@wfe/form`       | Controlled forms with scalar fields and repeated records                                         | [Exports](../packages/form/src/index.ts)                                                                  |
| `@wfe/generator`  | Typed descriptions and bindings for form, table, layout, chart, and boolean grid views           | [Exports](../packages/generator/src/index.ts) and [chart entry](../packages/generator/src/chart/index.ts) |

All packages use Solid. They remain private at version `0.0.0`.
Applications own records, routing, permissions, requests, caching, persistence, and validation rules.
Components own presentation, generic interaction, accessibility associations, and intrinsic input validity.
The [ownership contract](contracts/UI-BOUNDARIES.md) separates these responsibilities.

## Controls and feedback

| Area                    | Implemented functionality                                                                                                          | Guide or source                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Text and fields         | `Input`, `Textarea`, `Field`, `Label`, `HelpText`, `FieldError`, `FieldSet`, and `InputGroup`                                      | [Native field exports](../packages/components/src/components/NativeFields.tsx)                                                      |
| Actions                 | `Button` and `IconButton`, outline/filled/inverted/ghost variants, neutral/accent tones                                            | [Buttons](button-variants.md)                                                                                                       |
| Choices                 | `Select`, `SelectField`, `Combobox`, `Checkbox`, `Switch`, and `RadioGroup`                                                        | [Adoption](adoption.md) and [gallery](component-gallery.md)                                                                         |
| Numbers                 | Numeric drafts, bounds, empty-value policy, controlled acceptance, and keyboard interaction                                        | [NumberInput](number-inputs.md)                                                                                                     |
| Dates                   | `Calendar` and `DatePicker`, month/year selection, bounds, clearing, and date-only values                                          | [Calendar and picker](date-picker.md)                                                                                               |
| Datetimes               | `DateTimePicker`, display patterns, UTC/IANA/browser zones, and explicit DST disambiguation                                        | [Date and datetime inputs](date-inputs.md)                                                                                          |
| Files                   | Controlled file selection, multiple files, acceptance rules, rejection details, and reset                                          | [FileInput](file-input.md)                                                                                                          |
| Floating UI             | `Dialog`, `AlertDialog`, `Sheet`, `Popover`, `DropdownMenu`, and `Tooltip`                                                         | [Root exports](../packages/components/src/index.ts) and [gallery](component-gallery.md)                                             |
| Feedback                | `Badge`, `Card`, `Separator`, `InlineAlert`, `EmptyState`, `Spinner`, `Skeleton`, `Progress`, `Toast`, `StatusTile`, and `TileRow` | [Display source](../packages/components/src/components/Display.tsx) and [Toast](../packages/components/src/components/Toast.tsx)    |
| Navigation and sections | Tabs, breadcrumbs, collapsible content, accordion, and resizable panes                                                             | [Tabs](tabs.md), [breadcrumbs](breadcrumbs.md), [collapsible](collapsible.md), [accordion](accordion.md), [resizable](resizable.md) |

SidebarContextSwitcher presents application-controlled contexts, searchable siblings, and parent navigation above the existing sidebar menu.
Read the [context switcher guide](sidebar-context-switcher.md) for ownership and keyboard behavior.

`SelectField` composes the shared Select for ordinary string choices.
`NativeSelect` remains a compatibility export for native interoperability cases.
It is not the default choice for new library views.
FileInput selects files. Applications own uploads and their results.

## Forms and generated views

`createForm` accepts application-owned values, defaults, validation, and submission callbacks.
It exposes field updates, errors, dirty and pending state, reset, cancellation, and submission outcomes.
Its values include scalars and one-level lists of scalar records.
The coordinator copies and freezes repeated snapshots and publishes typed errors for each row.
Read the [form contract](form-contract.md) for attempt identity, cancellation, and late-response behavior.

`FormView` renders described fields through the same shared controls and supplied form contract.
Its shared action row keeps submit first, followed by described actions.
Generated actions accept application icon components and accessible icon-only presentation.
Applications can disable FormView submission through the reactive `submitDisabled` binding.
Built-in controls include text, textarea, select, checkbox, switch, number, date, and datetime.
Custom field bindings cover other scalar presentations.
`FormGrid` and `FieldGroup` support grouped fields, column counts, and spans.
`FormActions` provides the same wrapping action row for handwritten forms and FormView.

`TableView` composes the supplied native table with column presentation, aliases, actions, and optional custom cell bindings.
Columns can independently omit sort and filter controls. Manual sorting keeps sort buttons active for application callbacks.
`LayoutView` composes described main panels, navigation, context, footer, and actions through existing dashboard components.
`ChartView` lives under `@wfe/generator/chart` and reuses the owned Chart engine.
Descriptions remain serializable. Runtime bindings supply records, components, choices, and callbacks.
The [generator guide](generator-contract.md) documents type constraints and runtime guards.

Table column labels are already optional, with existing column-header fallbacks.
Generated fields and actions accept omitted labels with field-key and operation-ID fallbacks.
Generated built-in read-only fields and ordinary table cells use the shared display formats.

## Tables and virtualization

The [table entry](../packages/components/src/table/index.ts) exposes one owned native engine and its presentation components.
`Table` supports composition, while `ReadOnlyTable` supplies the standard workspace.
Read-only records can still use sorting, grouping, filtering, and display controls.
Applications supply row actions, editors, comparisons, accepted state, and request callbacks.

| Capability           | Current behavior                                                                                                | Guide                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Workspace            | Full-height results, independent scrolling, pinned headers/footer, left/top/right controls, and narrow drawers  | [Workspace](table-workspace.md)                                                                   |
| Columns              | Visibility, drag/keyboard order, resizing, header aliases, alignment, and dividers                              | [Workspace](table-workspace.md)                                                                   |
| Filters              | Text, three-state boolean, date bounds, numeric bounds, select, multi-select, tags, and empty-value comparisons | [Filters](table-filters.md)                                                                       |
| Applying filters     | Draft criteria and one explicit apply/refresh request                                                           | [Filters](table-filters.md)                                                                       |
| Grouping and sorting | Column sorting, grouping, aggregate presentation, and application callbacks                                     | [Generator](generator-contract.md) and [table source](../packages/components/src/table/README.md) |
| Formatting           | Date, datetime, boolean symbols/text, and numeric display formats without changing raw data                     | [Formatting](table-formatting.md)                                                                 |
| Selection            | Row/column/cell rectangle selection, keyboard extension, and native copy behavior                               | [Selection](table-selection.md)                                                                   |
| Virtual rows         | One shared owned virtual engine with visible rows, a buffer, and bounded DOM rendering                          | [Virtual source](../packages/components/src/virtual/README.md)                                    |

Virtualization controls rendering. It does not decide how applications fetch or retain records.
Editing examples compose the same table and controls. They are not a separate public editing framework.
The [diagnostics guide](table-diagnostics.md) describes inspection and performance boundaries.

## Charts

The separate `@wfe/components/chart` entry provides line, area, horizontal/vertical bar, and scatter plots.
It includes numeric, categorical, UTC, and local-time scales, legends, tooltips, keyboard interaction, and responsive SVG rendering.
Applications supply accepted series visibility, data, display formatters, themes, and callbacks.
The default uses the selected accent. Explicit series colors and application palettes support multiple colors.
Time series use date axes on the existing plot types.

The initial generated chart description supports one mark, a numeric y axis, and linear/band/point/UTC x axes.
Generated bars require a band x axis.
The component API also supports multiple marks and local-time scales.
The [chart guide](charts.md) defines the supported scope and excludes private captured features.

## Layout, styles, and value display

`DashboardShell` provides a full-width header/footer, primary and optional context navigation, responsive drawers, and independent region scrolling.
`DashboardPanel` and `DashboardGrid` provide the shared panel frame and responsive panel placement.
`Resizable` preserves pane content while resizing and supports collapse/reopen through its separator.
Applications currently construct route menus, audience selection, breadcrumbs, page titles, and navigation focus behavior.
`@wfe/shell` composes these components from a route description and application-owned bindings.

Shared styles own density, typography, spacing, surfaces, borders, button variants, focus, and control states.
Compact and comfortable densities use the same geometry contract as virtual rows.
System text uses uppercase presentation. Record values and prose retain their supplied case.
Import `@wfe/components/styles.css` once. Read the [style guide](../packages/components/src/styles/README.md) for tokens and scope.
The review examples use Light, Blue, Surface 1 components, Surface 2 background, and no shadows.
Those review defaults do not replace every low-level library token fallback.

`ValueDisplay` and `formatDisplayValue` already support date/datetime, boolean, and numeric display formats.
Date display accepts locale, patterns, and timezone configuration where appropriate.
Boolean-symbol rendering retains an accessible Yes/No label.
`short-hash` is not implemented.

## Examples and integration boundaries

The [component gallery](component-gallery.md) supplies grouped previews, appearance controls, component states, direct links, and browser history.
The [generator example](../examples/generator/README.md) demonstrates application bindings for forms, tables, and layout.
The [chart example](../examples/charts/README.md) demonstrates plots and generated charts.

The [analytics example](../examples/analytics/README.md) adds query preview, server sorting, paged browsing, a configurable cache, and server export.
Its query adapter, cache, mock transport, and export server are example application code.
They are not a second table engine or a built-in backend client.
The default preview limit is 1,000 rows. Load all enables virtual browsing over application-supplied pages.
Export sends visible header names, column order, and sorting to the application for complete server export.

The [platform example](../examples/platform/README.md) and [WAMN adapter](../examples/wamn-generator/README.md) demonstrate application integration.
They do not add WAMN names, session logic, authorization, or backend operations to public packages.

## Ownership and maintenance

Solid, Solid Primitives, and D3 remain external dependencies.
The owned vendor subsets are Kobalte, the virtual engine, calendar helpers, the chart engine, match-sorter, and icons.
Their source directories retain exact licenses, upstream references, hashes, and local repairs.
The [adoption guide](adoption.md) and [vendor procedure](../packages/components/src/vendor/kobalte/README.md) describe these boundaries.
The [qualification guide](qualification.md) documents serial checks, browser delivery modes, hydration, cleanup, and vendor audits.

## Plan status

The [shell, grid, tiles, and labels plan](plan/wfe-shell-grid-tiles.md) records delivered and proposed APIs.
`@wfe/shell` supplies the described renderer and metadata guards. The [six-route example](../examples/shell/README.md) covers browser history, narrow drawers, and hydration.
`GridDescription` supplies keyed boolean metadata and controlled binding types.
`GridView` renders the shared checkbox matrix with read-only columns, disabled rows, stable cells, and accessible row/column names.
The [30 by 5 example](../examples/grid/README.md) covers keyboard input, controlled requests, reordering, narrow scrolling, and hydration.
`StatusTile` composes Card, Badge, and ValueDisplay for explicit ok/warning/unknown states.
`TileRow` uses the existing responsive grid. The [tile guide](status-tiles.md) and [example](../examples/status-tiles/README.md) cover formats, long text, shared appearance, and hydration.
Generated fields and columns accept shared formats, with custom components taking precedence.
Read-only fields use the shared FieldValue output. Editable controls retain their input behavior.
The [format example](../examples/generator/FormatsApp.tsx) covers all requested formats in generated forms and tables.
Repeated form groups reuse the scalar controls, with application-supplied keys and row factories.
The [repeated form example](../examples/generator/RepeatedApp.tsx) covers submitted row errors, raw snapshots, row changes, retained drafts, and hydration.
DetailView composes formatted read-only fields and application actions without a form contract.
DeleteView confirms one record key and invokes one application callback.
The [detail and delete example](../examples/generator/DetailsApp.tsx) covers both views and their focus, hydration, and cleanup behavior.
The existing layout, Checkbox, Card, and ValueDisplay APIs supply their reusable foundations.
The [execution strategy](plan/wfe-shell-execution.md) records that reuse and the remaining decisions.

Owned styled component props are available from the package root and existing component subpaths. See [styled component props](styled-component-types.md) for compatible type exports and the shared button variant, tone, and value-format contracts.

Status and display components accept [application-supplied messages](display-messages.md) for owned labels and empty values. Message updates preserve existing controls; formatting locale remains separate.

Generated forms, repeated rows, details, and tables forward [nested control messages](view-messages.md#nested-standard-controls) without replacing their standard controls. Date-filter boundary labels retain their own explicit precedence.
