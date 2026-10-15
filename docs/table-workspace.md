# Table workspace

`ReadOnlyTable` places controls on the left and results on the right.
The controls and results scroll independently.
Expanded filters and grouping levels cannot consume the results height.
Sorting, grouping, filtering, visibility, and column movement use the existing Table engine and renderer.
The application still owns records, processing callbacks, requests, permissions, and persistence.

## Assigned height

Give the workspace a parent with an explicit height.
Inside a dashboard, use `scroll="content"` and a panel with `fill`.
The workspace fills that panel without calculating viewport offsets.
Empty results and large result sets keep the same assigned height.

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

## Control sections

Filters and Grouping start expanded.
Display columns starts collapsed.
Each heading shows its active filter count, grouping depth, or visible column count.
Collapsing a section preserves its controls and Table state.
The `controls` prop keeps its existing feature switches.

Use `actions` for application buttons.
Use `configuration` for application controls in another expandable section.
The Actions section starts expanded, and Configuration starts collapsed.
These slots do not add backend rules or persistence.

`TableWorkspace` and `TableControlSection` are public presentation components.
Use them to compose custom controls beside the shared `Table` renderer or virtual rows.
Give the result scroller the shared `table-scroll` class.
Set `--ui-table-controls-width` on an owning scope to change the panel width.
Interactive resizing and sections placed side by side remain separate work.

## Narrow screens

Below 48rem, Table controls opens a nonmodal drawer within the workspace.
A nonmodal drawer leaves the results available.
The drawer does not change the results geometry.
Close table controls and unhandled Escape return focus to the toggle.
Filter inputs keep their existing Escape behavior.
Focusing the results closes the drawer so focused content stays visible.
Resizing moves focus before its current control becomes hidden.
The same control nodes survive desktop and narrow layouts.

Applications can localize the labels through `TableWorkspace` props.
Place popup portals in the owning UI scope outside either scroller.
The dashboard shell already provides that portal root.

## Evidence

Dashboard cases cover three grouping levels, expanded controls, short windows, zero to 500 records, and independent scrolling.
Drawer cases cover keyboard focus, state preservation, and active summaries.
Hydration cases keep the server workspace and panel nodes after client attachment.
The suite runs source, built-package, and development consumers serially.
