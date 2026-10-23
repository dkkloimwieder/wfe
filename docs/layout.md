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
For an embedded shell example, set `mainAs="section"` to avoid a nested main landmark.
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
Dialog, AlertDialog, and Sheet retain the nearest containing UI scope when no explicit portal root exists.
Their shared trigger supplies its own control boundary.
Without a containing scope, the dialog uses the document body rather than its trigger.
A portal `mount` prop overrides this automatic placement.
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

StatusTile presents application-supplied values and explicit states through the existing display components.
TileRow reuses the responsive DashboardGrid. It adds no form coordinator or application controller.
Read the [tile guide](status-tiles.md) and [example](../examples/status-tiles/README.md) for read-only composition and formats.

Generated field labels default to their field keys when omitted.
Generated action and submit labels default to their operation IDs.
These presentation fallbacks preserve accepted values, callbacks, control identities, and existing table header aliases.

The generator's `/?app=formats` example places an editable note and formatted read-only fields in navigation.
Its table fills the main panel, and its footer reports the application submission state.
The shared layout controls the pane sizes and narrow-screen arrangement.

Repeated form groups compose the existing FieldGroup and FormGrid components.
Their `columns` value controls each row's scalar fields. Existing container widths determine when those fields stack.
The group span follows the surrounding form grid, and row actions use the shared form action style.

The [repeated form example](../examples/generator/RepeatedApp.tsx) uses one full-height main panel.
Its rows stack on narrow screens and retain their controls through row and child-field reorders.

## Icon sidebar

`DashboardShell` accepts controlled `navigationCollapsed` state.
Supply `onNavigationCollapsedChange` to show the click-operated divider triangle.
The triangle consumes no layout space and uses the pane fill and divider border.
Hover fills it with the accent color.
The collapse triangle sits inside the sidebar, and the expand triangle sits outside it.
The navigation callback receives `compact()` and `mobile()` alongside `close()`.
`compact()` is false in the mobile drawer, which keeps labels available.
`--ui-navigation-rail-width` sets the desktop icon width and defaults to 3.5rem.

`SidebarGroup` composes a labeled disclosure and a compact control.
The application supplies `label`, optional `icon`, `active`, `open`, `onOpenChange`, `onExpand`, and links through its `children(close)` callback.
Pass the shell's `compact()` value to the group.
With `behavior="flyout"`, the compact control opens an adjacent popup.
With `behavior="expand"`, the compact control requests an open group and calls `onExpand`.
The application expands the shell in that callback.
Without an icon, expanded groups show the label without an empty icon slot.
Compact groups show the first Unicode character of the label, with the full label as their accessible name and tooltip.
The same component supports nested groups through its children callback.

The group keeps temporary popup state separate from the controlled disclosure state.
Presentation changes transfer focus within the group unless the application moves focus elsewhere.
Links retain native browser behavior.
The application owns destinations, selection, navigation, and accepted state changes.
The gallery Appearance panel compares both behaviors.

## Entry screens

Use [EntryPanel](entry-panel.md) for a small content-sized surface centered on both axes.
It accepts application-owned content and supports viewport or container sizing.

## Context navigation

[SidebarContextSwitcher](sidebar-context-switcher.md) presents the current context, searchable sibling choices, and an optional parent action.
Place it before the existing SidebarGroup menu in the navigation callback.
Applications supply accepted contexts, available choices, and menu content.

## Embedded responsive workspaces

DashboardShell and TableWorkspace choose drawer placement from the width available
to their own root, as well as the viewport. A narrow host inside a wide page gets
the same reachable controls as a narrow page. Navigation and table controls keep
the existing 48rem threshold; context navigation keeps 64rem. These units use the
browser's initial font size, just like the existing viewport media queries, rather
than the Theme font size.

The navigation callback's `mobile()` reports drawer mode, including a narrow
embedded host. It does not identify a device type. `compact()` remains false in
drawer mode. Applications still own host width, height, navigation and records.
Changing placement keeps the pane owners, input values and scroll state. Escape
and focus return continue to use the existing toggle behavior.

Server rendering and hydration begin with the existing viewport layout. After
mounting, DashboardShell observes one root for both rails. TableWorkspace reuses
its existing observer. Hidden roots with no measurable width use viewport rules
until visible. Browsers without ResizeObserver keep viewport-only behavior;
parent-only resizes require ResizeObserver. Disposal disconnects observers and
removes media and window listeners. No polling or document-wide resize observer
is installed.
