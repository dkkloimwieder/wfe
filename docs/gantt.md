# Gantt

Gantt displays a schedule with grouped rows, intervals, and dependencies.

Import `Gantt` and schedule types from `@wfe/components/gantt`. Import `@wfe/components/styles.css` once.

## Example

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

## Behavior and options

### Rows and intervals

Rows and intervals have stable string IDs. `parentId` connects a row to its
parent. `rowId` places an interval in a row. Multiple overlapping intervals in
one row occupy separate lanes. `expandedIds` contains row IDs. `selectedIds`
contains interval IDs. Their callbacks request replacement arrays.

Use valid `Date` objects for instants. An interval ends at its exclusive `end`.
Equal start and end values display a milestone. The visible `range` must have a
start before its end. `progress` is a fraction from 0 to 1. `baseline` supplies
comparison dates. `critical` is an application-supplied display flag.
Dependencies connect one interval's end to another interval's start.

`onChange` receives `intervalId`, `kind`, `input`, `start`, and `end`.
The kind is `move`, `resize-start`, or `resize-end`. The input is `pointer` or
`keyboard`. The callback proposes dates. Accept them by replacing the interval
array, as above. Reject them by leaving the accepted array unchanged. The
component never commits a proposed edit to the supplied records.
Omit `onChange` to make the schedule read-only, or set `readOnly` on an individual
interval. Applications own pending, failure, and rejection messages.

### Interaction and display

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

Hover or focus a bar to see its dates, time zone, progress, baseline, and editing status.
The details close during an edit and on Escape.
Read-only bars have a lock marker and neutral outline. Read-only milestones use a neutral fill.
Progress uses dots in the primary color across the completed portion of the bar.

`onRangeChange` receives a requested visible range. The caller accepts it by
updating `range`. The application can use this callback to load records. Keep request cancellation, stale responses, and cache
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

### Large datasets

The shared virtualizer mounts visible rows and a buffer. The timeline clips offscreen content and draws connectors that cross the viewport. The supplied records and their indexes still occupy memory.

Accepted edits scan the interval array. Rows with changed intervals repeat lane packing. Unchanged row heights retain virtual measurements. Give the viewport a fixed height or use `height="auto"` inside a parent with definite height.

## Application ownership

Supply accepted dates, rows, range, expansion, selection, and relationships. Own scheduling rules, working calendars, critical paths, validation, loading, and persistence. Summary intervals come from the application.

## Gallery

Open `?gallery=gantt` for an editable hierarchy, overlapping intervals, and a selectable 10,000-row fixture.
