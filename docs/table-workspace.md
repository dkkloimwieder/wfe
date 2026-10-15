# Table workspace

`ReadOnlyTable` places controls on the left and results on the right.
The controls and results scroll independently.
The record count stays in a footer outside the results scroller.
The controls panel and the table start at the same height.
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

The `formatting` slot adds a FORMATTING section. The application supplies controlled `TableFormatting` choices and applies them through `formatValue`. See [Table value formatting](./table-formatting.md).

Filter and display choices use column names without Filter or Show prefixes. Boolean filters use a bare three-state checkbox. Its state text remains available to screen readers. Filters and search wait for the section's APPLY action. Display and formatting choices take effect immediately.
