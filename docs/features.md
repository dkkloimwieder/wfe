# Current functionality

The five private packages use Solid. Applications own records, routing, permissions, validation rules, requests, caching, and persistence. The packages own presentation and generic interaction. See the [UI ownership contract](contracts.md#generic-ui-boundaries).

| Package                                        | Public functionality                                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [Components](../packages/components/README.md) | Controls, Table, virtual rows, charts, diagrams, Gantt, layout, themes, icons, and drag and drop.                    |
| [Form](forms.md#form-contract)                 | Controlled scalar values and repeated rows, errors, submission, reset, and cancellation.                             |
| [Generator](generator.md#generator-contract)   | Typed descriptions and application bindings for forms, tables, layouts, grids, record details, deletion, and charts. |
| [Shell](../packages/shell/README.md)           | Described audiences and routes, navigation, page headings, and focus after accepted navigation.                      |
| [Sync](../packages/sync/README.md)             | Collection feeds, Solid projections, offline writes, and service worker helpers.                                     |

## Controls and navigation

| Area                                                                                | Public functionality                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fields                                                                              | Input, Textarea, Field, Label, HelpText, FieldError, FieldSet, and InputGroup.                                                                                         |
| [Buttons](buttons.md#buttons)                                                       | Button, IconButton, and ButtonLink share variants and tones.                                                                                                           |
| [Choices](inputs.md#combobox-matching)                                              | Select, SelectField, Combobox, Checkbox, Switch, and RadioGroup. NativeSelect provides native form interoperability.                                                   |
| [Numbers](inputs.md#numeric-inputs)                                                 | Controlled numeric drafts, optional bounds, and empty-value policy.                                                                                                    |
| [Date and time](inputs.md#date-and-time-inputs)                                     | DatePicker, TimePicker, TimeClock, and DateTimePicker. Calendar and [range controls](inputs.md#calendar-ranges) accept date-only values.                               |
| [Files](inputs.md#file-selection) and [colors](inputs.md#color-picker)              | Controlled file selection and rejection feedback. Hex entry and red, green, and blue sliders for opaque colors.                                                        |
| [Sliders](inputs.md#sliders-and-ranges) and [toggles](inputs.md#toggles-and-groups) | Controlled scalar and range values, toggle buttons, and single or multiple selections.                                                                                 |
| Overlays                                                                            | Dialog, AlertDialog, Sheet, Popover, DropdownMenu, Tooltip, and [ContextMenu](navigation.md#context-menus).                                                            |
| [Commands](navigation.md#commands-and-search)                                       | Searchable actions, native links, a modal palette, and a keyboard shortcut helper.                                                                                     |
| [Display](display.md#status-and-display-messages)                                   | Card, Badge, Separator, InlineAlert, EmptyState, Spinner, Skeleton, Progress, Toast, Meter, SummaryList, and [status tiles](display.md#status-tiles).                  |
| Navigation                                                                          | [Tabs](navigation.md#tabs), [breadcrumbs](navigation.md#breadcrumbs), StepList, Tree, SidebarLink, and the [context switcher](navigation.md#sidebar-context-switcher). |
| Disclosure                                                                          | [Collapsible](layout.md#collapsible), CollapsibleSection, [Accordion](layout.md#accordion), and [resizable panes](layout.md#resizable-panes).                          |

## Forms and generated views

`createForm` coordinates accepted values, validation callbacks, errors, attempts, reset, and cancellation. Repeated records use stable row keys and support per-row errors.

`FormView` renders standard fields and custom bindings. `FormGrid`, `FieldGroup`, and `FormActions` share [form layout](forms.md#form-layout) with handwritten views. Generated fields and actions have label fallbacks. Read-only fields can use the same formats as table cells.

`TableView` takes an application-owned native table. `LayoutView` arranges panels and dashboard regions. `GridView` renders a controlled checkbox matrix. `DetailView` presents one record, and `DeleteView` confirms one application deletion request.

`ChartView` renders marks from the chart subpath. Descriptions support single marks, ordered Cartesian layers, and pie or donut charts. The application supplies records, formatters, and callbacks. See the [chart guide](charts.md#generated-views).

## Tables and visualization

| Area                                                         | Public functionality                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [Native Table](tables.md#table-engine-capabilities)          | Caller-owned records, local or manual processing, sorting, filtering, grouping, pinning, and column state.            |
| [Table workspace](tables.md#table-workspace)                 | Independent scrolling, resizable controls, narrow drawers, pagination, filters, column alignment, and saved views.    |
| [Table selection](tables.md#table-selection)                 | Rectangular cell selection and copying. Row selection stores IDs for application actions.                             |
| [Display formatting](tables.md#shared-value-formatting)      | Date, datetime, numeric, boolean, and short-hash formats preserve raw values.                                         |
| [Virtual rows](../packages/components/src/virtual/README.md) | One shared engine renders the visible rows and a buffer.                                                              |
| [Charts](charts.md#charts)                                   | Responsive SVG plots, layered and polar marks, data transforms, controlled legends, and tooltips.                     |
| [Diagrams](diagrams.md)                                      | Read-only workflow and relationship graphs with manual or automatic layout, pan, zoom, fit, and controlled selection. |
| [Gantt](gantt.md)                                            | A controlled schedule with a row hierarchy, milestones, dependencies, and interval edits.                             |
| [Drag and drop](drag-and-drop.md#drag-and-drop)              | Generic drag scopes, controlled sorting, feedback, previews, and Kanban presentation.                                 |

## Layout and theme

[Dashboard layout](layout.md#dashboard-layout) supplies panels, grids, navigation regions, and responsive drawers. ActivityList presents activity items. [EntryPanel](layout.md#entrypanel) centers a short form or entry screen.

[Theme](theme.md#themes) selects Sketchy, Vanilla, or Laser. Shared styles define density, spacing, typography, surfaces, and focus. Import `@wfe/components/styles.css` once. Use the [icon catalog](buttons.md#icons) for selective imports.

## Examples

The [gallery](../examples/README.md#gallery-controls) provides component recipes, appearance controls, and direct links. The [example index](../examples/README.md) lists previews and browser commands.

The [analytics fixture](../examples/README.md#analytics) combines a paged query, a cache, and server export. The [platform fixture](../examples/README.md#platform) and [WAMN adapter](../examples/README.md#wamn-generator) demonstrate application integration.
