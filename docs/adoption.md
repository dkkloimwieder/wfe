# Adopt the components

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
Apply `uiScope()` to the wrapper that owns the controls.
Use `uiScope('comfortable', 'dark')` for larger controls with the dark theme.
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
import {
  Checkbox,
  Field,
  HelpText,
  Input,
  Label,
  uiScope,
} from '@wfe/components'
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
    <main {...uiScope()}>
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
    </main>
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
Generators remain a separate planned package.

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
