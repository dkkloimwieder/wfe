# Gantt

`Gantt` displays a controlled schedule with a row hierarchy, intervals, milestones,
baselines, progress, and dependency lines. Import it from `@wfe/components/gantt`
and import `@wfe/components/styles.css` once in the application. It uses the shared
theme and row virtualizer.

```tsx
import { createSignal } from 'solid-js'
import {
  Gantt,
  type GanttChange,
  type GanttInterval,
} from '@wfe/components/gantt'
import '@wfe/components/styles.css'

export function Schedule() {
  const [intervals, setIntervals] = createSignal<GanttInterval[]>([
    {
      id: 'draft',
      rowId: 'writing',
      label: 'Draft',
      start: new Date('2026-06-01T09:00:00Z'),
      end: new Date('2026-06-03T17:00:00Z'),
      progress: 0.5,
      baseline: {
        start: new Date('2026-06-01T09:00:00Z'),
        end: new Date('2026-06-02T17:00:00Z'),
      },
    },
    {
      id: 'ready',
      rowId: 'review',
      label: 'Ready',
      start: new Date('2026-06-05T12:00:00Z'),
      end: new Date('2026-06-05T12:00:00Z'),
    },
  ])
  const [range, setRange] = createSignal({
    start: new Date('2026-06-01T00:00:00Z'),
    end: new Date('2026-06-08T00:00:00Z'),
  })
  const [expanded, setExpanded] = createSignal<string[]>(['preparation'])
  const [selected, setSelected] = createSignal<string[]>([])

  function accept(change: GanttChange) {
    setIntervals((current) =>
      current.map((interval) =>
        interval.id === change.intervalId
          ? { ...interval, start: change.start, end: change.end }
          : interval,
      ),
    )
  }

  return (
    <Gantt
      label="Preparation schedule"
      rows={[
        { id: 'preparation', label: 'Preparation' },
        { id: 'writing', label: 'Writing', parentId: 'preparation' },
        { id: 'review', label: 'Review', parentId: 'preparation' },
      ]}
      intervals={intervals()}
      dependencies={[{ id: 'draft-ready', from: 'draft', to: 'ready' }]}
      range={range()}
      onRangeChange={setRange}
      expandedIds={expanded()}
      onExpandedChange={setExpanded}
      selectedIds={selected()}
      onSelectionChange={setSelected}
      onChange={accept}
      timeZone="UTC"
      height={480}
    />
  )
}
```

## Data and ownership

Rows and intervals have stable string IDs. `parentId` connects a row to its
parent. `rowId` places an interval in a row. Multiple overlapping intervals in
one row occupy separate lanes. `expandedIds` contains row IDs. `selectedIds`
contains interval IDs. Their callbacks request replacement arrays.

Use valid `Date` objects for instants. An interval ends at its exclusive `end`.
Equal start and end values display a milestone. The visible `range` must have a
start before its end. `progress` is a fraction from 0 to 1. `baseline` supplies
comparison dates. `critical` is an application-supplied display flag.
Dependencies connect one interval's end to another interval's start.

The component does not calculate schedules, critical paths, working calendars,
or dependency constraints. It does not move related intervals when an interval
changes. The application owns these decisions, data access, validation, and
persistence. Summary intervals are supplied records, not calculated parent dates.

`onChange` receives `intervalId`, `kind`, `input`, `start`, and `end`.
The kind is `move`, `resize-start`, or `resize-end`. The input is `pointer` or
`keyboard`. The callback proposes dates. Accept them by replacing the interval
array, as above. Reject them by leaving the accepted array unchanged. The
component never commits a proposed edit to the supplied records.
Omit `onChange` to make the schedule read-only, or set `readOnly` on an individual
interval. Applications own pending, failure, and rejection messages.

## Interaction and display

Drag an editable interval to move it. Drag its start or end handle to resize it.
Focus an editable interval or resize handle, then press Space or Enter to pick it
up. Left and Right adjust the proposal. Space or Enter requests the change.
Escape cancels it. `keyboardStep` is the increment in milliseconds, with a default
of one hour for timed intervals. Set `dateOnly` on an interval to edit calendar
days instead. Each keyboard step then moves one calendar day in `timeZone`,
including days with daylight-saving transitions. Date-only endpoints represent
zoned calendar dates and proposals normalize them to zoned midnight. A milestone can move but has no duration to resize.

`onActivate` receives the interval for application-owned details. Press F2 or double-click an
interval to activate it. Enter also activates a read-only interval.
Press S to select an interval, or Shift+S to add or remove it from the selection.
Selection and activation do not open a built-in detail view.

`onRangeChange` receives a requested visible range. The caller accepts it by
updating `range`. This callback can also inform application-owned data loading;
it does not fetch records. Keep request cancellation, stale responses, and cache
policy in the application.

`timeZone` controls display and defaults to UTC. `locale` defaults to `en-US`.
Changing the display zone does not change stored instants. For timed intervals,
moving preserves elapsed duration. Set `dateOnly` for dates that follow calendar
days in `timeZone`: pointer edits snap to the nearest local midnight, and each
keyboard increment moves one calendar day. Date-only moves preserve the number
of calendar days across daylight-saving changes. Supply local-midnight instants
for date-only records. Pass the same range, data, and formatting choices for
server rendering and hydration.
`renderRow` and `renderInterval` receive the original record for custom content.

## Large datasets and the gallery

The gallery's Gantt page includes a small hierarchy and a selectable 10,000-row
fixture. It demonstrates overlapping intervals, a baseline, progress, a milestone,
dependency lines, and caller acceptance or rejection. The large fixture is built
only when selected. It is a local demonstration, not a performance guarantee.

Rows are virtualized and offscreen timeline content is culled. The supplied
records and their layout indexes still occupy memory. Virtualization does not
page data from a server or remove the cost of indexing changed data. Bound the
records supplied to the component according to the application's data size and
available memory. Use range requests to load a suitable window when necessary.
The connector SVG covers only the visible viewport, even when the schedule contains thousands of rows.
Range changes retain mounted grid markers and connectors when their identities stay the same.
An active edit updates the edited interval preview.
It does not recalculate every mounted interval.
Accepted edits still rebuild the indexes, but unchanged row heights retain virtual measurements.

The gallery uses the available screen height and the shared table header styles.
On narrow screens, the title sits above the range controls.
The controls and status sections have their own scroll limits so that the timeline remains usable.
For a flexible parent layout, pass `height="auto"` and give the parent a definite height.

Dependency work also depends on the number of connectors that cross the viewport.
If every connector crosses it, the component draws every connector. Applications
can reduce the supplied relationships when a dense graph obscures the schedule.

## Implementation references

The implementation uses WFE's existing virtualizer and drag-and-drop engine.
The Gantt geometry and components are newly authored. The research references
are the local Gantt at revision `79d95d4` and Zaidan at revision `271ffce`.
No scheduling engine or second virtualizer was copied into WFE. Dependency
connectors are visual relationships. They do not move other tasks.

Keep the scroll viewport bounded. If an application overrides the component
with a flex layout, give its parent a definite height. A viewport that grows
to the entire dataset defeats virtualization.
