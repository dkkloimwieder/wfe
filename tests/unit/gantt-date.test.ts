import { expect, test } from 'vitest'
import { shiftGanttInterval } from '../../packages/components/src/gantt/date'
import type { GanttInterval } from '../../packages/components/src/gantt/types'

const zone = 'America/New_York'
const day = 86_400_000
function interval(start: string, end: string, dateOnly = true): GanttInterval {
  return {
    id: 'record',
    rowId: 'row',
    label: 'Record',
    start: new Date(start),
    end: new Date(end),
    dateOnly,
  }
}
const iso = (result: { start: Date; end: Date }) => [
  result.start.toISOString(),
  result.end.toISOString(),
]

for (const transition of [
  {
    name: 'spring',
    start: '2026-03-07T05:00:00.000Z',
    end: '2026-03-08T05:00:00.000Z',
    nextEnd: '2026-03-09T04:00:00.000Z',
    hours: 23,
  },
  {
    name: 'fall',
    start: '2026-10-31T04:00:00.000Z',
    end: '2026-11-01T04:00:00.000Z',
    nextEnd: '2026-11-02T05:00:00.000Z',
    hours: 25,
  },
]) {
  test(`date-only keyboard and pointer moves preserve one calendar day across ${transition.name} DST`, () => {
    const source = interval(transition.start, transition.end)
    const keyboard = shiftGanttInterval(source, 'move', 0, zone, 1)
    expect(iso(keyboard)).toEqual([transition.end, transition.nextEnd])
    expect(keyboard.end.getTime() - keyboard.start.getTime()).toBe(
      transition.hours * 3_600_000,
    )
    expect(iso(shiftGanttInterval(source, 'move', day, zone))).toEqual(
      iso(keyboard),
    )
    expect(source.start.toISOString()).toBe(transition.start)
    expect(source.end.toISOString()).toBe(transition.end)
  })

  test(`date-only resize uses zoned midnight across ${transition.name} DST`, () => {
    const source = interval(transition.end, transition.end)
    expect(iso(shiftGanttInterval(source, 'resize-end', day, zone))).toEqual([
      transition.end,
      transition.nextEnd,
    ])
    expect(iso(shiftGanttInterval(source, 'resize-end', 0, zone, 1))).toEqual([
      transition.end,
      transition.nextEnd,
    ])
    const ending = interval(transition.nextEnd, transition.nextEnd)
    expect(iso(shiftGanttInterval(ending, 'resize-start', -day, zone))).toEqual(
      [transition.end, transition.nextEnd],
    )
    expect(
      iso(shiftGanttInterval(ending, 'resize-start', 0, zone, -1)),
    ).toEqual([transition.end, transition.nextEnd])
  })
}

test('pointer quantization uses the true midnight midpoint rather than a fixed 24-hour step', () => {
  const source = interval(
    '2026-03-08T05:00:00.000Z',
    '2026-03-09T04:00:00.000Z',
  )
  expect(
    shiftGanttInterval(source, 'move', 11 * 3_600_000, zone).start,
  ).toEqual(source.start)
  expect(
    shiftGanttInterval(source, 'move', 11.5 * 3_600_000, zone).start,
  ).toEqual(source.end)
  const fall = interval('2026-11-01T04:00:00.000Z', '2026-11-02T05:00:00.000Z')
  expect(shiftGanttInterval(fall, 'move', 12 * 3_600_000, zone).start).toEqual(
    fall.start,
  )
  expect(
    shiftGanttInterval(fall, 'move', 12.5 * 3_600_000, zone).start,
  ).toEqual(fall.end)
})

test('date-only milestones stay zero-duration and crossed resize edges clamp to equality', () => {
  const milestone = interval(
    '2026-03-08T05:00:00.000Z',
    '2026-03-08T05:00:00.000Z',
  )
  expect(iso(shiftGanttInterval(milestone, 'move', 0, zone, 1))).toEqual([
    '2026-03-09T04:00:00.000Z',
    '2026-03-09T04:00:00.000Z',
  ])
  const source = interval(
    '2026-03-08T05:00:00.000Z',
    '2026-03-09T04:00:00.000Z',
  )
  expect(iso(shiftGanttInterval(source, 'resize-start', 0, zone, 5))).toEqual([
    source.end.toISOString(),
    source.end.toISOString(),
  ])
  expect(iso(shiftGanttInterval(source, 'resize-end', 0, zone, -5))).toEqual([
    source.start.toISOString(),
    source.start.toISOString(),
  ])
})

test('timed movement preserves elapsed duration and ignores calendar-day hints', () => {
  const source = interval(
    '2026-03-08T05:00:00.000Z',
    '2026-03-08T06:00:00.000Z',
    false,
  )
  const moved = shiftGanttInterval(source, 'move', day, zone, 1)
  expect(iso(moved)).toEqual([
    '2026-03-09T05:00:00.000Z',
    '2026-03-09T06:00:00.000Z',
  ])
  expect(moved.end.getTime() - moved.start.getTime()).toBe(3_600_000)
  expect(iso(shiftGanttInterval(source, 'resize-start', day, zone))).toEqual([
    source.end.toISOString(),
    source.end.toISOString(),
  ])
  expect(iso(shiftGanttInterval(source, 'resize-end', -day, zone))).toEqual([
    source.start.toISOString(),
    source.start.toISOString(),
  ])
})

test('invalid dates, zones, deltas and fractional calendar days are rejected', () => {
  const source = interval(
    '2026-03-08T05:00:00.000Z',
    '2026-03-09T04:00:00.000Z',
  )
  expect(() => shiftGanttInterval(source, 'move', 0, 'Not/A_Zone')).toThrow(
    RangeError,
  )
  expect(() =>
    shiftGanttInterval({ ...source, start: new Date(NaN) }, 'move', 0, zone),
  ).toThrow(RangeError)
  expect(() =>
    shiftGanttInterval({ ...source, end: new Date(0) }, 'move', 0, zone),
  ).toThrow(RangeError)
  expect(() => shiftGanttInterval(source, 'move', Infinity, zone)).toThrow(
    RangeError,
  )
  expect(() => shiftGanttInterval(source, 'move', 0, zone, 0.5)).toThrow(
    RangeError,
  )
})
