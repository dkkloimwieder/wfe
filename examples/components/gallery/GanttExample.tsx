import { createMemo, createSignal, Show } from 'solid-js'
import {
  Button,
  Checkbox,
  FormActions,
  FormGrid,
  SelectField,
} from '@wfe/components'
import { Gantt } from '@wfe/components/gantt'
import type {
  GanttChange,
  GanttInterval,
  GanttRange,
} from '@wfe/components/gantt'
import {
  initialGanttRange,
  largeGanttFixture,
  smallGanttFixture,
} from './ganttFixture'

export function GanttExample() {
  const [dataset, setDataset] = createSignal('small')
  const [data, setData] = createSignal(smallGanttFixture())
  const [expanded, setExpanded] = createSignal<ReadonlyArray<string>>([
    'planning',
    'delivery',
    'verification',
  ])
  const [selected, setSelected] = createSignal<ReadonlyArray<string>>([])
  const [activeId, setActiveId] = createSignal<string>()
  const [range, setRange] = createSignal(initialGanttRange())
  const [timeZone, setTimeZone] = createSignal('UTC')
  const [readOnly, setReadOnly] = createSignal(false)
  const [reject, setReject] = createSignal(false)
  const [changes, setChanges] = createSignal(0)
  const [rangeRequests, setRangeRequests] = createSignal(0)
  const [message, setMessage] = createSignal(
    'Drag or resize an editable interval to request new dates. Double-click it to inspect details.',
  )
  const formatter = createMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone(),
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
  )
  const active = createMemo(() =>
    data().intervals.find((interval) => interval.id === activeId()),
  )
  const groups = createMemo(() => [
    ...new Set(
      data().rows.flatMap((row) => (row.parentId ? [row.parentId] : [])),
    ),
  ])

  function load(next: string) {
    if (next !== 'small' && next !== 'large') return
    const fixture = next === 'large' ? largeGanttFixture() : smallGanttFixture()
    setDataset(next)
    setData(fixture)
    setExpanded(fixture.expandedIds)
    setSelected([])
    setActiveId(undefined)
    setRange(initialGanttRange())
    setChanges(0)
    setRangeRequests(0)
    setMessage(
      `Loaded ${fixture.rows.length.toLocaleString('en-US')} rows into the example's local state.`,
    )
  }
  function change(change: GanttChange) {
    const interval = data().intervals.find(
      (interval) => interval.id === change.intervalId,
    )
    if (!interval || interval.readOnly || readOnly()) return
    setChanges((count) => count + 1)
    if (reject()) {
      setMessage(
        `Rejected ${change.kind} for ${interval.label}. Accepted dates stay unchanged.`,
      )
      return
    }
    setData((current) => ({
      ...current,
      intervals: current.intervals.map((interval) =>
        interval.id === change.intervalId
          ? {
              ...interval,
              start: new Date(change.start.getTime()),
              end: new Date(change.end.getTime()),
            }
          : interval,
      ),
    }))
    setMessage(`Accepted ${change.kind} for ${interval.label}.`)
  }
  function changeRange(next: GanttRange) {
    setRangeRequests((count) => count + 1)
    setRange(next)
    setMessage(
      `Requested window: ${formatter().format(next.start)} to ${formatter().format(next.end)}.`,
    )
  }
  function activate(interval: GanttInterval) {
    setActiveId(interval.id)
  }

  return (
    <section class="gantt-example" aria-label="Gantt example">
      <header class="gantt-example-controls">
        <FormGrid columns={2}>
          <SelectField
            label="Dataset"
            value={dataset()}
            onValueChange={load}
            choices={[
              { value: 'small', label: 'Example schedule' },
              { value: 'large', label: '10,000 rows' },
            ]}
          />
          <SelectField
            label="Display time zone"
            value={timeZone()}
            onValueChange={setTimeZone}
            choices={[
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'America/New_York' },
              { value: 'Europe/London', label: 'Europe/London' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
            ]}
          />
        </FormGrid>
        <FormActions>
          <Checkbox checked={readOnly()} onChange={setReadOnly}>
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Read only</Checkbox.Label>
          </Checkbox>
          <Checkbox checked={reject()} onChange={setReject}>
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Reject edits</Checkbox.Label>
          </Checkbox>
          <Button onClick={() => setExpanded(groups())}>Expand all</Button>
          <Button onClick={() => setExpanded([])}>Collapse all</Button>
          <Button onClick={() => load(dataset())}>Reset</Button>
          <Button onClick={() => changeRange(initialGanttRange())}>
            Initial window
          </Button>
        </FormActions>
      </header>
      <Gantt
        class="gantt-example-chart"
        rows={data().rows}
        intervals={data().intervals}
        dependencies={data().dependencies}
        range={range()}
        expandedIds={expanded()}
        onExpandedChange={setExpanded}
        selectedIds={selected()}
        onSelectionChange={setSelected}
        onActivate={activate}
        onChange={readOnly() ? undefined : change}
        onRangeChange={changeRange}
        timeZone={timeZone()}
        height="auto"
        label="Example schedule"
      />
      <footer class="gantt-example-summary">
        <output aria-live="polite">{message()}</output>
        <p>
          {data().rows.length.toLocaleString('en-US')} rows ·{' '}
          {data().intervals.length.toLocaleString('en-US')} intervals ·{' '}
          {changes()} edit requests · {rangeRequests()} window requests ·{' '}
          {selected().length} selected
        </p>
        <Show when={active()}>
          {(interval) => (
            <p>
              {interval().label}: {formatter().format(interval().start)} to{' '}
              {formatter().format(interval().end)}
            </p>
          )}
        </Show>
      </footer>
    </section>
  )
}
