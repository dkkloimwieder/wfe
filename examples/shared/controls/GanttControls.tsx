import { Show, createSignal } from 'solid-js'
import { Button } from '@wfe/components'
import { Gantt } from '@wfe/components/gantt'
import type { GanttInterval } from '@wfe/components/gantt'

/** Accepted records and callbacks belong to this example application. */
export function GanttControls() {
  const [present, setPresent] = createSignal(true)
  const [selection, setSelection] = createSignal<string[]>([])
  const [requests, setRequests] = createSignal(0)
  const [activated, setActivated] = createSignal('None')
  const [intervals, setIntervals] = createSignal<GanttInterval[]>([
    {
      id: 'release',
      rowId: 'team',
      label: 'Hydrated release',
      start: new Date('2026-10-03T00:00:00Z'),
      end: new Date('2026-10-04T00:00:00Z'),
    },
  ])
  return (
    <section id="gantt-review" aria-label="Gantt hydration review">
      <Show when={present()}>
        <Gantt
          label="Hydrated schedule"
          rows={[{ id: 'team', label: 'Delivery team' }]}
          intervals={intervals()}
          range={{
            start: new Date('2026-10-01T00:00:00Z'),
            end: new Date('2026-10-08T00:00:00Z'),
          }}
          height={260}
          timeZone="UTC"
          selectedIds={selection()}
          onSelectionChange={setSelection}
          onActivate={(interval) => setActivated(interval.label)}
          onChange={(change) => {
            setRequests((value) => value + 1)
            setIntervals((current) =>
              current.map((interval) =>
                interval.id === change.intervalId
                  ? { ...interval, start: change.start, end: change.end }
                  : interval,
              ),
            )
          }}
        />
      </Show>
      <output data-gantt-selected>{selection().join(',')}</output>
      <output data-gantt-activated>{activated()}</output>
      <output data-gantt-requests>{requests()}</output>
      <output data-gantt-start>{intervals()[0]!.start.toISOString()}</output>
      <Button onClick={() => setPresent(false)}>
        Unmount hydrated schedule
      </Button>
    </section>
  )
}
