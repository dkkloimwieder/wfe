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
