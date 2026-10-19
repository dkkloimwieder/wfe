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
| `@wfe/form`       | Controlled scalar form coordination                                                              | [Exports](../packages/form/src/index.ts)                                                                  |
| `@wfe/generator`  | Typed descriptions and bindings for form, table, layout, and chart views                         | [Exports](../packages/generator/src/index.ts) and [chart entry](../packages/generator/src/chart/index.ts) |

All packages use Solid. They remain private at version `0.0.0`.
Applications own records, routing, permissions, requests, caching, persistence, and validation rules.
Components own presentation, generic interaction, accessibility associations, and intrinsic input validity.
The [ownership contract](contracts/UI-BOUNDARIES.md) separates these responsibilities.

## Controls and feedback

| Area                    | Implemented functionality                                                                                 | Guide or source                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Text and fields         | `Input`, `Textarea`, `Field`, `Label`, `HelpText`, `FieldError`, `FieldSet`, and `InputGroup`             | [Native field exports](../packages/components/src/components/NativeFields.tsx)                                                      |
| Actions                 | `Button` and `IconButton`, outline/filled/inverted/ghost variants, neutral/accent tones                   | [Buttons](button-variants.md)                                                                                                       |
| Choices                 | `Select`, `SelectField`, `Combobox`, `Checkbox`, `Switch`, and `RadioGroup`                               | [Adoption](adoption.md) and [gallery](component-gallery.md)                                                                         |
| Numbers                 | Numeric drafts, bounds, empty-value policy, controlled acceptance, and keyboard interaction               | [NumberInput](number-inputs.md)                                                                                                     |
| Dates                   | `Calendar` and `DatePicker`, month/year selection, bounds, clearing, and date-only values                 | [Calendar and picker](date-picker.md)                                                                                               |
| Datetimes               | `DateTimePicker`, display patterns, UTC/IANA/browser zones, and explicit DST disambiguation               | [Date and datetime inputs](date-inputs.md)                                                                                          |
| Files                   | Controlled file selection, multiple files, acceptance rules, rejection details, and reset                 | [FileInput](file-input.md)                                                                                                          |
| Floating UI             | `Dialog`, `AlertDialog`, `Sheet`, `Popover`, `DropdownMenu`, and `Tooltip`                                | [Root exports](../packages/components/src/index.ts) and [gallery](component-gallery.md)                                             |
| Feedback                | `Badge`, `Card`, `Separator`, `InlineAlert`, `EmptyState`, `Spinner`, `Skeleton`, `Progress`, and `Toast` | [Display source](../packages/components/src/components/Display.tsx) and [Toast](../packages/components/src/components/Toast.tsx)    |
| Navigation and sections | Tabs, breadcrumbs, collapsible content, accordion, and resizable panes                                    | [Tabs](tabs.md), [breadcrumbs](breadcrumbs.md), [collapsible](collapsible.md), [accordion](accordion.md), [resizable](resizable.md) |

`SelectField` composes the shared Select for ordinary string choices.
`NativeSelect` remains a compatibility export for native interoperability cases.
It is not the default choice for new library views.
FileInput selects files. Applications own uploads and their results.

## Forms and generated views

`createForm` accepts application-owned values, defaults, validation, and submission callbacks.
It exposes field updates, errors, dirty and pending state, reset, cancellation, and submission outcomes.
Its values are flat scalar records. Nested objects and collection editing are outside its current contract.
Read the [form contract](form-contract.md) for attempt identity, cancellation, and late-response behavior.

`FormView` renders described fields through the same shared controls and supplied form contract.
Built-in controls include text, textarea, select, checkbox, switch, number, date, and datetime.
Custom field bindings cover other scalar presentations.
`FormGrid` and `FieldGroup` support grouped fields, column counts, and spans.

`TableView` composes the supplied native table with column presentation, aliases, actions, and optional custom cell bindings.
`LayoutView` composes described main panels, navigation, context, footer, and actions through existing dashboard components.
`ChartView` lives under `@wfe/generator/chart` and reuses the owned Chart engine.
Descriptions remain serializable. Runtime bindings supply records, components, choices, and callbacks.
The [generator guide](generator-contract.md) documents type constraints and runtime guards.

Form field labels and action labels are currently required.
Table column labels are already optional, with existing column-header fallbacks.
The shell draft proposes optional field/action labels and built-in field display formats.
Those generator changes are not implemented yet.

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
The review examples use Light, Blue, Surface 1 components, Surface 2 background, and shadow depth 2.
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
The owned vendor subsets are Kobalte, the virtual engine, calendar helpers, and the chart engine.
Their source directories retain exact licenses, upstream references, hashes, and local repairs.
The [adoption guide](adoption.md) and [vendor procedure](../packages/components/src/vendor/kobalte/README.md) describe these boundaries.
The [qualification guide](qualification.md) documents serial checks, browser delivery modes, hydration, cleanup, and vendor audits.

## Planned additions

The [shell, grid, tiles, and labels draft](plan/wfe-shell-grid-tiles.md) is a plan, not an implemented API.
`@wfe/shell` supplies the described renderer and metadata guards. The full six-route qualification example remains in progress under W1.
`GridDescription`, `StatusTile`, and `TileRow` are not implemented.
The existing layout, Checkbox, Card, and ValueDisplay APIs supply their reusable foundations.
The [execution strategy](plan/wfe-shell-execution.md) records that reuse and the remaining decisions.
