# Dashboard layout

`DashboardShell` places application content in header, navigation, and main regions.
`DashboardPanel` uses the shared Card styles.
`DashboardGrid` arranges panels in columns that fit the available width.
All three components belong to `@wfe/components` and its `layout` export.
Applications own links, routing, permissions, records, and requests.

## Composition

Import the public stylesheet before rendering the shell.
Give the shell a parent with an explicit height, or set its height directly.

```tsx
import { Button } from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import '@wfe/components/styles.css'

export function Workspace() {
  return (
    <DashboardShell
      style={{ height: '100dvh' }}
      header={<h1>Workspace</h1>}
      navigation={({ close }) => <Button onClick={close}>Records</Button>}
      mainLabel="Workspace content"
    >
      <DashboardGrid>
        <DashboardPanel>
          <h2>First panel</h2>
        </DashboardPanel>
        <DashboardPanel>
          <h2>Second panel</h2>
        </DashboardPanel>
      </DashboardGrid>
    </DashboardShell>
  )
}
```

The navigation function receives `close`, which closes its narrow panel.
The application can call this function after its own navigation action.
Omit `navigation` for a shell with one full-width main region.
The shell preserves one navigation tree across screen sizes.
Inputs and other stateful controls keep their nodes and values during resizing.
If the application removes navigation, the shell releases its old control references.

## Navigation

At widths below 48rem, Navigation opens a nonmodal panel over the main region.
A nonmodal panel keeps the page available.
The panel appears below the header and does not change the main region height.

Close and Escape inside navigation return focus to its button.
Resizing also moves focus when its current control becomes hidden.
The panel does not close automatically when an application link activates.
Use the supplied `close` callback for that policy.

The header uses a banner landmark, and the content uses a main landmark.
`navigationLabel` names the navigation landmark.
`toggleLabel` and `closeLabel` supply localized button text.
`mainLabel` optionally names the main landmark.
The default navigation state starts closed on narrow screens.
The shell owns this temporary display state.

## Scrolling and size

The default `scroll="main"` lets the main region scroll.
Use `scroll="content"` when a table or another child owns scrolling.
Set `fill` on a panel that must occupy the remaining main height.
Give its child scroller `flex: 1`, `min-height: 0`, and `overflow: auto`.
Keep fixed controls outside that scroller.

The shell fills its assigned height and reserves space for the header.
Its grid reserves the remaining height independently of the result count.
Navigation scrolls independently when its contents exceed the available height.
The shell does not set global body styles or change height when records change.

## Shared styles

Compact density remains the default.
Pass `density="comfortable"` for larger controls and spacing.
Pass `theme="dark"` for the shared dark colors.
The shell marks its scope as a portal root for shared popup controls.
Use the same density for a child virtual table and its geometry.
Applications can override CSS variables through the shell's `style` prop.
`--ui-navigation-width` defaults to 15rem.
`--ui-panel-min-width` defaults to 18rem.

The layout contract fixture covers desktop and narrow screens, focus, scrolling, state preservation, theme, density, and disposal.
It composes the shared Table and virtual renderer with 100,000 logical rows.
Only visible rows and a small buffer occupy the DOM.
The tests compare actual row height with compact and comfortable geometry.
Dialog and popup cases cover Escape order, focus restoration, live themes, resizing, and cleanup.
The qualification suite runs it against source, built-package, and development inputs.
The hydration fixture also attaches the shell to server nodes and tests navigation keyboard behavior.

## Composed example

The default dashboard preview gives the whole page to the Table workspace.
Table controls occupy the left panel, and results fill the main panel.
Application navigation and record forms occupy no space in this default view.
The `?composition=1` example uses public Table, field, checkbox, button, and layout exports.
Its application owns records, validation, submission, navigation, and replacement data.
The form adds records to an in-memory collection.
The data buttons switch between zero, two, and 500 records.
This sample uses the normal Table renderer and does not fetch pages on scroll.

In the separate composition example, the table sits beside the form and status panels.
On narrow screens, the workspace scrolls vertically and keeps the form below the table.
The table keeps its assigned height across result counts and expanded grouping controls.
Its left controls panel scrolls independently from the results.
The [Table workspace guide](table-workspace.md) describes sections, application slots, and the narrow drawer.
Its empty message stays inside its scroll area.
See [the example instructions](../examples/README.md) for the preview command.

## Organization workspace

`DashboardShell` accepts a primary `navigation` callback and an optional `context` callback.
Both callbacks receive `close`. Applications own their links, labels, active routes, and permissions.
The header spans every column. The optional footer also spans every column.
Pass `footer={null}` to reserve an empty footer. Omit `footer` to remove the band.

Both menus keep their DOM owners while CSS changes their placement.
Below 64rem, the context menu uses its header toggle.
Below 48rem, the primary menu also uses a toggle.
Only one drawer opens at a time. Escape closes the active drawer and returns focus to its toggle.
Nested controls handle Escape before the shell.

The shell owns region padding through `--ui-layout-inset`, which defaults to `--ui-cell-padding-x`.
Related controls use `--ui-gap`.
Use `ui-dashboard-menu` for a shared group of native navigation links.
Use `--ui-navigation-width` and `--ui-context-width` to set desktop menu widths.
Each menu and the main area scroll independently between the organization bands.

For `scroll="content"`, the main region has no outer padding.
A full-height table joins the workspace edges. Cards keep their own internal padding.
Table toolbar actions stay on the left for every controls placement.

## Described application shell

ShellView from `@wfe/shell` composes DashboardShell, SelectField, Breadcrumbs, and a page heading.
The application supplies accepted audience and route IDs, native hrefs, page components, and change callbacks.
The shell does not parse an address or own browser history.
Its default uses `scroll="content"`. Page components fill the main region and own any inner scrolling.
Optional context and footer props reuse this layout contract.
Use one shell frame around page content rather than nesting another DashboardShell inside it.
Read the [shell guide](../packages/shell/README.md) for controlled navigation and focus.

The [shell example](../examples/shell/README.md) combines two audiences, six routes, generated tables, and generated forms.
Its application owns browser history and retains form values across page changes.

`GridDescription` supplies independent row/column metadata for boolean cells.
Its application bindings own accepted cell values and one change callback.
The grid does not create a form contract or a table engine.
Read the [generator contract](generator-contract.md) for keyed metadata and controlled values.

`GridView` renders that metadata through shared Checkbox controls without creating another form or table coordinator.
The [grid example](../examples/grid/README.md) demonstrates 150 cells, independent scrolling, and retained input owners.
