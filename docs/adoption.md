# Adopt the components

## v0.0.8

Use Git tag `v0.0.8` for the current components and Sketchy theme.
ShellView accepts application-supplied `header` and `navigation` content.
Set `navigation={false}` to omit the navigation pane and its toggle.
Undefined overrides preserve the defaults. Custom headers leave heading focus with the application.
Navigation callbacks receive the owning dashboard controls, and accepted route changes close its drawer.
See the [shell guide](../packages/shell/README.md) for the contract and example.

Inputs and form sections support optional decoration with neutral, primary, or secondary colors.
The Sketchy theme reduces decoration rotation and taper in proportion to element size.
The gallery includes a geometry playground, wide input previews, and alternating section decoration in the Everything form.
The owned icon catalog supports selective imports from `@wfe/components/icons`.
The gallery also demonstrates form actions and row-dependent table actions.
Dependency pins remain the same as `v0.0.7`.

## v0.0.7

Git tag `v0.0.7` records the preceding components and Sketchy theme.
FormView places submit and described actions in one final row at natural button widths.
The public `FormActions` component provides the same layout for handwritten forms.
Applications can disable FormView submission through `submitDisabled` without disabling fields or other actions.
Generated actions accept application icon components and accessible icon-only presentation.

TableView columns support independent `sortable` and `filterable` boolean flags.
Set both flags to `false` on an Actions column to omit its sort button and filter input.
Direct ReadOnlyTable consumers supply `sortable(column)` and `filterable(column)` predicates.
Manual sorting keeps sort controls active and delegates requests and row order to the application.
The theme and dependency pins remain the same as `v0.0.6`.
See [the generator contract](generator-contract.md) and [form layout](form-layout.md) for usage.

## v0.0.6

Git tag `v0.0.6` records the preceding components and Sketchy theme.
This release adds `SidebarContextSwitcher` with searchable context choices, an optional parent action, and compact navigation.
Applications supply the current context, available choices, parent, selection callback, and menu.
Existing `SidebarGroup` controls provide expandable items below the switcher.
See [Sidebar context switcher](sidebar-context-switcher.md) for the API and example.

The theme and dependency pins remain the same as `v0.0.5`.
The release also corrects the gallery history test and records browser and action-disposal investigation results.

## v0.0.5

Git tag `v0.0.5` records the preceding components and Sketchy theme.
The base canvas uses surface 1, panes use surface 3, and content uses surface 2.
The theme retains the blue accent, outline buttons, dotted decoration, and flat surfaces without shadows.

Tables support application-owned pagination and header actions.
Applications can omit the title/action bar, footer, configuration controls, and refresh control.
Child tables retain their header and omit configuration controls, refresh, and the footer by default.
Explicit properties override those defaults. Applications own loading when a parent row expands.
Footer summaries show the current row count and the total when the application supplies it.

`EntryPanel` provides a centered form with shared decoration and full-width actions.
Combobox examples demonstrate starts-with, contains, and fuzzy matching through the shared search implementation.
Sidebar groups support text-only headings. Directional controls use shared triangles.

This release uses Solid `2.0.0-rc.16` with the matching runtime and compiler pins in the repository.
Platform examples include updated record state and application-owned role and permission screens.
These examples demonstrate component use and do not prescribe application behavior.

## v0.0.4

Git tag `v0.0.4` records the preceding Sketchy theme and component gallery.
This release refines borders, dots, icons, spacing, and disclosure controls, and removes surface shadows.
The gallery renders examples directly in one document with the same theme that consumers import.
Tables keep refresh available. Nested tables load through application-owned expansion and show Apply only for pending filters.
Nested tables use a left-only inset. Existing `depth` values remain accepted but produce no shadows.

## v0.0.1 additions

The integrated baseline uses Git tag `v0.0.1` and includes six additions:

- W1: Described shells with application-owned audiences, routes, and navigation.
- W2: Controlled boolean grids through GridDescription and GridView.
- W3: StatusTile and TileRow for formatted values and explicit states.
- W4: Optional field labels that default to keys, plus shared display formats.
- W5: Repeated scalar form groups with add/remove controls and per-row errors.
- W6: DetailDescription/DetailView and DeleteDescription/DeleteView for record display and confirmation.

Use `@wfe/components` from the application workspace.
The package currently remains private.
Add the workspace dependency to the application package:

```json
{ "dependencies": { "@wfe/components": "workspace:*" } }
```

Use Solid with `@solidjs/web` and the Solid Vite plugin.
Keep the runtime and compiler versions aligned with this repository.
Include Vite client types in the application TypeScript configuration to type CSS imports.
Import `@wfe/components/styles.css` once in the application entry.
Wrap the application in `Theme` for the Sketchy theme introduced in `v0.0.3`.
Use `<Theme mode="dark">` for dark mode.
Use `<Theme preset="vanilla">` for the plain alternative; omission preserves the existing default.
The gallery and consumers use the same theme implementation.
See [Theme](theme.md) for configuration and a minimal example.
Use `uiScope()` only for low-level density scopes without the Sketchy theme.
Provide the same density to fixed row geometry through `uiDensity(density).rowHeight`.
Component styles stay inside the UI scope.
Application CSS owns page height, layout, and available table space.

## Controlled values and records

A controlled value comes from application state.
A change callback requests a new value from that application.
The application can accept the request or retain the previous value.
Provide a value and callback for each controlled control.
Keep controlled and default-value modes stable for the life of the component.

This example uses public imports and application-owned records.
It supports field updates, checkbox keyboard interaction, and Table sorting.
The application HTML must contain `<div id="root"></div>`.
Place this code in the application entry that uses the Solid compiler:

```tsx
import '@wfe/components/styles.css'
import { createSignal } from 'solid-js'
import { render } from '@solidjs/web'
import { Checkbox, Field, HelpText, Input, Label, Theme } from '@wfe/components'
import { createTable, ReadOnlyTable } from '@wfe/components/table'

export function Records() {
  const [records, setRecords] = createSignal([
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Grace' },
  ])
  const [included, setIncluded] = createSignal(true)
  const name = () => records().find((record) => record.id === 'a')!.name
  const rename = (value: string) =>
    setRecords((old) =>
      old.map((record) =>
        record.id === 'a' ? { ...record, name: value } : record,
      ),
    )
  const table = createTable({
    source: {
      ids: () => records().map((record) => record.id),
      get: (id) => records().find((record) => record.id === id),
    },
    columns: [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
        filterFn: (value, filter) =>
          String(value).toLowerCase().includes(String(filter).toLowerCase()),
      },
    ],
  })
  return (
    <Theme>
      <Field controlId="record-name">
        <Label>Record name</Label>
        <Input id="record-name" value={name()} onValueChange={rename} />
        <HelpText>The application accepts or rejects this edit.</HelpText>
      </Field>
      <Checkbox checked={included()} onChange={setIncluded}>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Include record</Checkbox.Label>
      </Checkbox>
      <ReadOnlyTable table={table} title="Records" />
    </Theme>
  )
}

render(() => <Records />, document.getElementById('root')!)
```

The small example uses array lookups.
For large datasets, provide an application index that reads records by stable ID.
The table reads caller-owned records and keeps display configuration.
It does not create an editing model or persistence service.

## Public exports

The root exports styled controls, display components, Table, and density helpers.
Control subpaths include `select`, `combobox`, `fields`, `checkbox`, `switch`, and `radio-group`.
Overlay subpaths include `dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu`, and `tooltip`.
The `display` and `toast` subpaths expose status and notification components.
The `table` subpath exports Table presentation, column controls, and the native engine.
The `virtual` subpath exports the shared virtual binding and renderer.
The `events` subpath exports owned native event binding.
The `density` subpath exports density values and scope helpers.

Use package imports rather than internal source paths.
The `solid` condition supplies preserved JSX for the application's Solid compiler.
The `node` condition supplies server functions for direct Node consumers.
The local `wfe-source` condition selects source for development and hot updates.
It does not require an application alias.
For hydration, compile the same source or preserved JSX on both the server and client.
Configure Vite's client and SSR resolution conditions together.
Use the [qualified fixture configuration](../examples/hydration/vite.config.ts) as the working reference.

## Ownership and callbacks

Applications own records, permissions, validation rules, requests, caching, and persistence.
Components own presentation, focus, keyboard behavior, and generic interaction.
Input supports native `onInput` and `onValueChange(value, event)` callbacks.
Checkbox and Switch request boolean changes through `onChange`.
Select requests the chosen option through `onChange`.
Combobox separates the selected option from the input text through `onInputChange`.
The application supplies stable option keys, labels, available options, and loading state.
Dialog and other overlays request open-state changes through `onOpenChange`.
Applications decide what custom row action callbacks do.
Keep backend commands and permission rules outside component implementations.

Native Table accepts an optional `state` object with live getters for controlled display values.
Pair each controlled value with its callback, such as `onSortingChange` or `onColumnVisibilityChange`.
Table callbacks receive a replacement value or an updater function that reads the previous value.
The application must apply accepted updates to its state.
`initialState` supplies a creation snapshot for values that the table controls internally.

Local sorting and filtering require application comparison and filter functions.
For server results, preserve server order and use the manual-processing contracts.
The application owns query requests, paging, memory budgets, and export transport.
Server export receives the display labels and column order through the application callback.
The [analytics example](../examples/analytics/README.md) shows that composition.
The private `@wfe/form` package coordinates errors, submission, reset, and cancellation.
Applications own accepted values, validation rules, and requests.
Read [the form contract](form-contract.md) for public imports and lifecycle rules.
The private `@wfe/generator` package composes these components from typed descriptions and application bindings.

## Cleanup and hydration

Create components and native tables inside a Solid owner.
The rendering host releases that owner when the view closes.
The qualified fixture uses a synchronous action and flush for the current runtime's disposal contract.
Library listeners and overlay portals release with their owner.
Applications also cancel their own requests and reject stale responses.

The hydration fixture preserves server nodes for fields, checkboxes, Table cells, and buttons.
It tests parent updates, keyboard interaction, dialog focus, and disposal with an open overlay.
Repeated consumer tests mount six scopes without page navigation.
They require fresh records, cancelled requests, removed portals, and released background interaction locks.
Browser errors and accessibility warnings fail these cases.
See [qualification](qualification.md) for the commands and reports.

## Form rendering and hydration

Add `@wfe/form` as a workspace dependency when the application needs form coordination.
Import `createForm` and its types from that package.
Keep field controls and styles in `@wfe/components`.
The [form guide](form-contract.md) includes a typed application example.

Create one form inside each rendered owner and supply the same initial values on the server and client.
The package does not validate or submit during initial rendering.
Applications call `submit()` only after an explicit user action.
The server and client use the same form implementation and their own Solid runtime conditions.
The [form fixture configuration](../examples/form-contract/vite.hydration.config.ts) aligns those conditions.

Fields and toggles establish automatic label and description associations on the server and client.
Custom control IDs can follow their labels, and help text can follow its control.
Conditional descriptions release their references when they leave the view.
Caller `aria-describedby` IDs remain part of the association.
Nonlabel tags do not receive a `for` attribute.

The [hydration runner](../examples/form-contract/run-hydration.mjs) preserves the form's original controls and rejects duplicate callbacks.
It tests errors, retry, cancellation, reset, and external values after attachment.
Six mount and disposal cycles require cancelled work, inert detached controls, and fresh application state.
The host removes retained server markup after it releases the hydrated owner.
The example shares that cleanup with its normal browser entry.

## Dependencies and updates

Solid, Solid Primitives, Floating UI, and internationalized number and date helpers remain external dependencies.
The component package owns selected Kobalte sources and the virtual engine.
Application examples own their Zod validation usage.
The component runtime does not import Zod or the legacy table-core engine.
Inspect the [component manifest](../packages/components/package.json) for exact versions.
Use [the vendor procedure](../packages/components/src/vendor/kobalte/README.md) to compare originals and replay repairs.
Run `pnpm test:qualification` after a runtime or vendor change.

## Described application shell

ShellView composes the shared layout and controls from navigation metadata.
Applications supply accepted IDs, hrefs, page components, and callbacks. They own history and address parsing.
The shell requests navigation only for ordinary primary clicks. Modified clicks retain native behavior.
Accepted route changes focus the page heading. Initial rendering and hydration retain the current focus.

```tsx
import { defineShell, ShellView } from '@wfe/shell'
import type { ShellBindings } from '@wfe/shell'

const description = defineShell({
  id: 'workspace',
  title: 'Workspace',
  audiences: [{ id: 'work', label: 'Work' }],
  routes: [{ id: 'records', label: 'Records', view: 'records' }],
})

export function Workspace(props: {
  bindings: ShellBindings<typeof description>
}) {
  return (
    <ShellView
      description={description}
      bindings={props.bindings}
      style={{ height: '100dvh' }}
    />
  )
}
```

A page component receives the accepted audience and route metadata.
The shell supplies the page heading and main landmark. Pages supply their content through existing public components.
The [shell guide](../packages/shell/README.md) describes guards, page identity, and optional layout slots.

The [shell example](../examples/shell/README.md) combines two audiences, six routes, generated tables, and generated forms.
Its application owns browser history and retains form values across page changes.

`GridDescription` supplies independent row/column metadata for boolean cells.
Its application bindings own accepted cell values and one change callback.
The grid does not create a form contract or a table engine.
Read the [generator contract](generator-contract.md) for keyed metadata and controlled values.

## Controlled boolean grids

GridView uses the existing Checkbox and shared table styles.
Applications supply accepted values and decide whether to accept each request.
This one-cell example uses the same contract as a larger matrix:

```tsx
import { createSignal } from 'solid-js'
import { GridView } from '@wfe/generator'
import type { GridBindings, GridDescription } from '@wfe/generator'

export function CapabilityGrid() {
  const description = {
    id: 'capabilities',
    rows: [{ id: 'first', label: 'First record' }],
    columns: [{ id: 'read', label: 'Read' }],
  } as const satisfies GridDescription
  const [value, setValue] = createSignal(false)
  const bindings: GridBindings<typeof description> = {
    value: () => value(),
    onValueChange: (requested) => setValue(requested.value),
  }
  return <GridView description={description} bindings={bindings} />
}
```

The [grid example](../examples/grid/README.md) supplies 30 rows and five columns.
Its callbacks own accepted values. The generator owns no save or authorization policy.

StatusTile presents application-supplied values and explicit states through the existing display components.
TileRow reuses the responsive DashboardGrid. It adds no form coordinator or application controller.
Read the [tile guide](status-tiles.md) and [example](../examples/status-tiles/README.md) for read-only composition and formats.

Generated field labels default to their field keys when omitted.
Generated action and submit labels default to their operation IDs.
These presentation fallbacks preserve accepted values, callbacks, control identities, and existing table header aliases.

Generated fields and columns accept shared formats with separate display configuration.
FormView applies formats to read-only built-in fields. Editable controls retain their input configuration and raw values.
Custom fields and cell renderers retain their presentation.
FieldValue supplies a shared read-only output with field associations.
The short-hash format shows eight Unicode codepoints and exposes the full string through its title and accessible label.

Open `/?app=formats` on the generator preview for shared formats in generated forms and tables.
The example keeps the editable note intact while the application supplies formats and read-only flags.
Its server and browser cases use the same description and accepted values.

Generated forms support one-level repeated groups through the existing form contract.
Use `control: 'repeat'` with scalar child descriptions and `bindings.repeated[field]` for the application key function and row factory.
The application accepts each requested list through its value callback and supplies errors by stable row key.
Nested choices and custom fields use the repeated binding.
Row additions, removals, and edits never create a second submission callback.

The [repeated form example](../examples/generator/RepeatedApp.tsx) uses one full-height main panel.
Its rows stack on narrow screens and retain their controls through row and child-field reorders.

DetailDescription/DetailView compose one present read-only record with the shared formats, field layout, and application actions.
DeleteDescription/DeleteView compose the shared confirmation dialog for one key and one application callback.
Applications retain record ownership, deletion, asynchronous outcomes, and navigation.
See the [generator contract](generator-contract.md#record-details) and [example](../examples/generator/DetailsApp.tsx).

## Growing record lists

These pagination bindings are available in Git tag `v0.0.5`.
Use `ReadOnlyTable.pagination` or `TableViewBindings.pagination` for application-owned pages.
The application supplies accepted rows and handles page requests.
See the [pagination contract](../packages/components/src/table/README.md#controlled-pagination) and the [paged example](../examples/table-read-only/README.md).

Use `ReadOnlyTable.toolbarActions` for create or invite controls beside refresh and the controls toggle.
For generated tables, supply a stable application component through `TableViewBindings.toolbarActions`.
Use `EntryPanel` and `EntryPanelActions` from `@wfe/components/layout` for a centered entry form.
These components provide presentation. Applications retain navigation, requests, authentication, and validation rules.

## Unreleased drag and drop

Use `@wfe/components/dnd` for generic source/target scopes,
`@wfe/components/sortable` for controlled ordering, and
`@wfe/components/kanban` for board presentation. These additions are not in
v0.0.8. They use the existing shared stylesheet and Sketchy theme.

Create scopes and registrations inside Solid owners and pass reactive
options through getters. Applications retain accepted records, order,
validation, asynchronous outcomes and persistence. A completed gesture or
menu alternative emits a request; it does not prescribe application behavior.
The [drag and drop guide](drag-and-drop.md) covers refs, handles, accessibility,
preview rendering, cancellation, and the generic and board gallery examples.

## Unreleased Gantt component

The `feat/gantt` branch adds `Gantt` through `@wfe/components/gantt` and the
root component export. It supports controlled intervals, hierarchy, selection,
editing, baselines, milestones, and dependency lines. Applications retain
ownership of schedules, requests, and persistence. See the [Gantt guide](gantt.md).
This addition is not included in an existing release tag.
