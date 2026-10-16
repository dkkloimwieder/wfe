# Table workspace

`ReadOnlyTable` starts with controls on the left and results on the right.
Both panes share one frame without a gap.
Control sections use dividers instead of separate cards.
The controls and results scroll independently.
The record count stays in a footer outside the results scroller.
The controls panel and the table start at the same height in left placement.
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

The application declares boolean controls through `filterKind`, for example `filterKind={(column) => column.id === 'active' ? 'boolean' : 'text'}`.
Boolean controls offer Yes, No, and Either through a three-state checkbox.
They store boolean filter values, and Either removes the filter.
The application supplies an equality `filterFn` and boolean records.
The component does not infer column types from record values.
Other columns keep their text filters.
The `filter` callback configures the full set of [filter controls](./table-filters.md).

For date columns, return `'date-range'` from `filterKind`.
The control shows separate Start and End date pickers, and either date can stay empty.
Each picker uses the shared styled calendar and supports typed `YYYY-MM-DD` values.
The filter value has optional `start` and `end` strings in `YYYY-MM-DD` format.
Clearing both dates removes the filter.
The application defines inclusive comparisons, date storage, and timezone rules in its `filterFn`.

The dashboard uses date-only records and includes both boundary dates in its results.
`TableDateFilter` and its `TableDateRange` type are public for custom control layouts.

Use `actions` for application buttons.
Use `configuration` for application controls in another expandable section.
The Actions section starts expanded, and Configuration starts collapsed.
These slots do not add backend rules or persistence.

`TableWorkspace` and `TableControlSection` are public presentation components.
Use them to compose custom controls beside the shared `Table` renderer or virtual rows.
Give the result scroller the shared `table-scroll` class.
Pass `footer` content to `TableWorkspace` for application summaries below that scroller.
Set `--ui-table-controls-width` on an owning scope to change the panel width.
Set `--ui-table-controls-height` to limit the top pane height.
The top pane uses at most 40% of the workspace height.
Interactive resizing remains separate work.

## Placement and collapse

Set `controlsPlacement="left"`, `controlsPlacement="top"`, or `controlsPlacement="right"` on `ReadOnlyTable` or `TableWorkspace`.
The dashboard preview has LEFT, TOP, and RIGHT buttons above the workspace.
Top placement stacks full-width sections in a bounded scroll area.
Filters come first, followed by Grouping and the remaining sections.
Controls inside each section run horizontally and wrap as needed.
The top pane shrinks when sections collapse and expands only to its height limit.
Narrow screens use the same drawer for either placement.

One shared header spans the controls and results panes.
The table title stays centered across the full workspace.
The square sliders icon and header actions sit at the left for Left and Top placement.
Right placement puts these controls at the right.
Use the icon to hide or show the controls.
Its tooltip shows Show controls or Hide controls, and its accessible state follows the pane.
There is no separate toolbar row.
The results reclaim the pane width in left or right placement and its height in top placement.
The control nodes and results stay mounted, so drafts and Table state survive.
An unhandled Escape from desktop controls also hides the pane.
The button receives focus before its controls become hidden.

The component owns collapse state by default.
Use `defaultControlsCollapsed` to start with a hidden pane.
For application control, pass `controlsCollapsed` and `onControlsCollapsedChange`.
The callback requests a new value. The application supplies the accepted value.
The narrow drawer keeps its own open state and preserves the desktop collapse choice.

```tsx
import { createSignal } from 'solid-js'
import { ReadOnlyTable } from '@wfe/components/table'
import type { NativeTable } from '@wfe/components/table'

export function RecordsWithControls(props: {
  table: NativeTable<{ name: string }>
  placement: 'left' | 'top' | 'right'
}) {
  const [collapsed, setCollapsed] = createSignal(false)
  return (
    <ReadOnlyTable
      table={props.table}
      controlsPlacement={props.placement}
      controlsCollapsed={collapsed()}
      onControlsCollapsedChange={setCollapsed}
    />
  )
}
```

## Narrow screens

Below 48rem, Table controls opens a nonmodal drawer within the workspace.
A nonmodal drawer leaves the results available.
The drawer does not change the results geometry.
Close table controls and unhandled Escape return focus to the toggle.
Filter inputs keep their existing Escape behavior.
Focusing the results closes the drawer so focused content stays visible.
Resizing moves focus before its current control becomes hidden.
The same control nodes survive desktop and narrow layouts.
The drawer starts below the shared header so its actions stay available.
Right placement anchors the narrow drawer to the right edge.

Applications can localize the labels through `TableWorkspace` props.
Place popup portals in the owning UI scope outside either scroller.
The dashboard shell already provides that portal root.

## Evidence

Dashboard cases cover three grouping levels, expanded controls, short windows, zero to 500 records, and independent scrolling.
Drawer cases cover keyboard focus, state preservation, and active summaries.
Hydration cases keep the server workspace and panel nodes after client attachment.
The suite runs source, built-package, and development consumers serially.

The `formatting` slot adds a FORMATTING section. The application supplies controlled `TableFormatting` choices and applies them through `formatValue`. See [Table value formatting](./table-formatting.md).

Filter and display choices use column names without Filter or Show prefixes. Boolean filters use a bare three-state checkbox. Its state text remains available to screen readers. Filters and search wait for the section's APPLY action. Display and formatting choices take effect immediately.

Drag a column heading to move its column. A movement of at least five pixels
starts the drag. The separate sort arrow has padding and does not start a drag.
Activate a heading to open its move menu. Use Left, Right, Home, or End to move
a focused heading with the keyboard. Press Escape to cancel a drag.

The optional `controlsHeader` slot supplies actions in the shared header.
ReadOnlyTable uses it for APPLY and its pending-change message.
The optional `resultsHeader` slot supplies the centered title.
These existing prop names remain available for custom compositions.
The header stays outside both scrollers and uses the same surface as the panes.
ReadOnlyTable keeps application buttons in the Actions section.

APPLY remains available when the controls collapse.
Invalid fields reopen their pane and section, then receive focus.
For custom header actions, `controlsRef` receives a `TableControlsHandle` with `focus(target?)`.
This method requests an open pane and focuses its optional descendant.
The application must accept the visibility request when it controls collapse state.
A handle from a disposed workspace does nothing.

## Column alignment and dividers

Display columns pairs each visibility control with Left, Center, and Right alignment.
Alignment changes headings, record cells, group labels, and summaries.
It does not change raw values, sorting, filtering, or export data.
Column identity keeps the choice stable after column movement or visibility changes.

`ReadOnlyTable` owns alignment locally by default.
For application control, pass `columnAlignment` and `onColumnAlignmentChange(id, alignment)`.
The map uses column IDs as keys and defaults missing keys to Left.
The callback requests a change, and the application supplies the accepted map.
`Table`, `TableRow`, and the public `TableColumnAlignments` type support custom compositions.
If you supply custom rows, pass the same map to `TableRow`.
Custom cell renderers can set `data-column-alignment` on each cell.

Shared table styles draw column dividers through headings and record cells.
Set `--ui-table-row-divider` and `--ui-table-column-divider` on the owning scope for separate colors.
Both tokens fall back to `--ui-divider`.
The dashboard review starts both at Surface 1 and offers four surface levels independently.
Black/white uses the Light neutral surfaces for these lines.
Light and Dark use their own neutral surfaces.
Pane borders keep their existing color.
