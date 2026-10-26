import { describe, expect, test } from 'vitest'
import {
  createGanttDependencyIndex,
  createGanttIntervalIndex,
  flattenGanttRows,
  ganttDateToX,
  ganttDependencyPath,
  ganttIntervalGeometry,
  ganttXToDate,
  packGanttIntervals,
} from '../../packages/components/src/gantt/geometry'
import type {
  GanttInterval,
  GanttRange,
} from '../../packages/components/src/gantt/types'

const at = (value: number) => new Date(value)
const range = (start: number, end: number): GanttRange => ({
  start: at(start),
  end: at(end),
})
const interval = (
  id: string,
  start: number,
  end: number,
  rowId = 'a',
): GanttInterval => ({ id, rowId, label: id, ...range(start, end) })

describe('Gantt row hierarchy', () => {
  const rows = [
    { id: 'leaf', label: 'Leaf', parentId: 'child' },
    { id: 'root', label: 'Root' },
    { id: 'other', label: 'Other' },
    { id: 'child', label: 'Child', parentId: 'root' },
  ]
  test('flattens only accepted expanded descendants in stable input order', () => {
    expect(
      flattenGanttRows(rows, new Set()).map((item) => item.row.id),
    ).toEqual(['root', 'other'])
    expect(
      flattenGanttRows(rows, new Set(['root', 'child'])).map((item) => [
        item.row.id,
        item.depth,
        item.hasChildren,
      ]),
    ).toEqual([
      ['root', 0, true],
      ['child', 1, true],
      ['leaf', 2, false],
      ['other', 0, false],
    ])
    expect(rows[0]?.id).toBe('leaf')
  })
  test('rejects duplicate IDs, missing parents and hidden cycles', () => {
    expect(() => flattenGanttRows([rows[1]!, rows[1]!], new Set())).toThrow(
      'Duplicate',
    )
    expect(() => flattenGanttRows([rows[0]!], new Set())).toThrow('Unknown')
    expect(() =>
      flattenGanttRows(
        [
          { id: 'a', label: 'A', parentId: 'b' },
          { id: 'b', label: 'B', parentId: 'a' },
        ],
        new Set(),
      ),
    ).toThrow('cycle')
  })
})

describe('Gantt instant geometry', () => {
  test('clips exclusive intervals and includes milestones only inside the range', () => {
    expect(ganttIntervalGeometry(range(-10, 25), range(0, 100), 200)).toEqual({
      x: 0,
      width: 50,
      milestone: false,
      clippedStart: true,
      clippedEnd: false,
    })
    expect(ganttIntervalGeometry(range(75, 120), range(0, 100), 200)).toEqual({
      x: 150,
      width: 50,
      milestone: false,
      clippedStart: false,
      clippedEnd: true,
    })
    expect(ganttIntervalGeometry(range(-5, 0), range(0, 100), 200)).toBeNull()
    expect(
      ganttIntervalGeometry(range(100, 110), range(0, 100), 200),
    ).toBeNull()
    expect(
      ganttIntervalGeometry(range(0, 0), range(0, 100), 200)?.milestone,
    ).toBe(true)
    expect(
      ganttIntervalGeometry(range(100, 100), range(0, 100), 200),
    ).toBeNull()
  })
  test('maps instants across DST without imposing calendar or local timezone policy', () => {
    const view = {
      start: new Date('2026-03-08T00:00:00-05:00'),
      end: new Date('2026-03-09T00:00:00-04:00'),
    }
    const middle = new Date((view.start.getTime() + view.end.getTime()) / 2)
    expect(ganttDateToX(middle, view, 460)).toBe(230)
    expect(ganttXToDate(230, view, 460)).toEqual(middle)
    expect(ganttDateToX(new Date('2026-03-08T06:00:00Z'), view, 460)).toBe(20)
  })
  test('rejects invalid dates, reversed intervals and degenerate axis values', () => {
    expect(() =>
      ganttIntervalGeometry(range(10, 0), range(0, 100), 100),
    ).toThrow(RangeError)
    expect(() => ganttDateToX(at(NaN), range(0, 100), 100)).toThrow(RangeError)
    expect(() => ganttXToDate(0, range(0, 0), 100)).toThrow(RangeError)
    expect(() => ganttXToDate(Infinity, range(0, 100), 100)).toThrow(RangeError)
    expect(() => ganttDateToX(at(0), range(0, 100), 0)).toThrow(RangeError)
  })
})

describe('Gantt per-row index', () => {
  test('finds long crossings, exclusive edges and visible baselines separately', () => {
    const items = [
      interval('cross', -100, 1000),
      interval('left', 0, 10),
      interval('point', 10, 10),
      interval('right', 20, 30),
      interval('other', 10, 20, 'b'),
      { ...interval('baseline', 100, 200), baseline: range(12, 16) },
    ]
    const index = createGanttIntervalIndex(items)
    expect(index.query('a', at(10), at(20)).map((item) => item.id)).toEqual([
      'cross',
      'point',
    ])
    expect(
      index.queryBaselines('a', at(10), at(20)).map((item) => item.id),
    ).toEqual(['baseline'])
    expect(index.query('missing', at(10), at(20))).toEqual([])
    expect(index.byRow.get('b')).toEqual([items[4]])
    expect(index.byId.get('cross')).toBe(items[0])
    expect(() => createGanttIntervalIndex([items[0]!, items[0]!])).toThrow(
      'Duplicate',
    )
  })
  test('rebuilding honors new accepted dates under the same ID', () => {
    const first = createGanttIntervalIndex([interval('a', 0, 10)])
    const second = createGanttIntervalIndex([interval('a', 20, 30)])
    expect(first.query('a', at(0), at(10))).toHaveLength(1)
    expect(second.query('a', at(0), at(10))).toHaveLength(0)
    expect(second.query('a', at(20), at(30))[0]?.start).toEqual(at(20))
  })
  test('indexed queries match exhaustive intersection for mixed rows and spans', () => {
    const items = Array.from({ length: 1000 }, (_, i) =>
      interval(
        String(i),
        (i * 73) % 1000,
        ((i * 73) % 1000) + (i % 37),
        String(i % 7),
      ),
    )
    const index = createGanttIntervalIndex(items)
    for (let i = 0; i < 70; i++) {
      const start = (i * 41) % 1000,
        end = start + 25,
        row = String(i % 7)
      const expected = items
        .filter(
          (item) =>
            item.rowId === row &&
            (item.start.getTime() === item.end.getTime()
              ? item.start.getTime() >= start && item.start.getTime() < end
              : item.end.getTime() > start && item.start.getTime() < end),
        )
        .map((item) => item.id)
        .sort()
      expect(
        index
          .query(row, at(start), at(end))
          .map((item) => item.id)
          .sort(),
      ).toEqual(expected)
    }
  })
})

describe('Gantt packed lanes and connectors', () => {
  test('packs overlaps deterministically without mutating caller order', () => {
    const items = [
      interval('b', 0, 10),
      interval('a', 0, 10),
      interval('c', 10, 20),
      interval('p', 10, 10),
      interval('q', 10, 10),
    ]
    const packed = packGanttIntervals(items)
    expect(packed.map((item) => [item.interval.id, item.lane])).toEqual([
      ['a', 0],
      ['b', 1],
      ['p', 0],
      ['q', 1],
      ['c', 2],
    ])
    expect(items[0]?.id).toBe('b')
    expect(packGanttIntervals([...items].reverse())).toEqual(packed)
  })
  test('queries and clips crossing connectors with neither endpoint visible', () => {
    const rows = flattenGanttRows(
      Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        label: String(i),
      })),
      new Set(),
    )
    const intervals = createGanttIntervalIndex([
      interval('from', 0, 10, '0'),
      interval('to', 90, 100, '999'),
    ])
    const edge = { id: 'edge', from: 'from', to: 'to' }
    const index = createGanttDependencyIndex([edge], intervals, rows)
    expect(index.query(400, 410)).toEqual([edge])
    expect(index.query(1001, 1002)).toEqual([])
    expect(
      ganttDependencyPath(
        edge,
        intervals,
        index.rowIndices,
        range(0, 100),
        100,
        10,
        { x: 0, y: 4000, width: 100, height: 100 },
      ),
    ).toBe('M50,4000L50,4100')
    expect(
      ganttDependencyPath(
        edge,
        intervals,
        index.rowIndices,
        range(0, 100),
        100,
        10,
        { x: 60, y: 4000, width: 40, height: 100 },
      ),
    ).toBeNull()
    expect(
      ganttDependencyPath(
        edge,
        intervals,
        index.rowIndices,
        range(0, 100),
        100,
        10,
        { x: 0, y: 0, width: 100, height: 100 },
        new Map([
          ['from', 20],
          ['to', 80],
        ]),
      ),
    ).toBe('M10,20L50,20 M50,20L50,80 M50,80L90,80')
  })
  test.each([
    { name: 'overlapping', start: 40, sourceY: 10, targetY: 30 },
    { name: 'touching', start: 60, sourceY: 10, targetY: 30 },
    { name: 'narrow gap', start: 65, sourceY: 10, targetY: 30 },
    { name: 'reversed', start: 0, sourceY: 10, targetY: 30 },
    { name: 'upward', start: 40, sourceY: 30, targetY: 10 },
    { name: 'same lane reversed', start: 0, sourceY: 10, targetY: 10 },
  ])(
    'routes $name connections outside endpoint interiors',
    ({ start, sourceY, targetY }) => {
      const from = interval('from', 30, 60)
      const to = interval('to', start, start + 20)
      const path = ganttDependencyPath(
        { id: 'edge', from: 'from', to: 'to' },
        createGanttIntervalIndex([from, to]),
        new Map([['a', 0]]),
        range(0, 100),
        100,
        20,
        { x: -10, y: 0, width: 120, height: 60 },
        new Map([
          ['from', sourceY],
          ['to', targetY],
        ]),
      )
      const segments = [
        ...path!.matchAll(/M([^,]+),([^L]+)L([^,]+),([^ M]+)/g),
      ].map((match) => match.slice(1).map(Number))
      expect(segments).toHaveLength(5)
      expect(segments[0]).toEqual([60, sourceY, 65, sourceY])
      expect(segments.at(-1)).toEqual([start - 5, targetY, start, targetY])
      const corridor = sourceY + (targetY < sourceY ? -10 : 10)
      expect(segments[2]).toEqual([65, corridor, start - 5, corridor])
      for (const [left, right, center] of [
        [30, 60, sourceY],
        [start, start + 20, targetY],
      ]) {
        for (const [x1, y1, x2, y2] of segments) {
          const crossesInterior =
            y1 === y2
              ? y1! > center! - 4 &&
                y1! < center! + 4 &&
                Math.max(x1!, x2!) > left! &&
                Math.min(x1!, x2!) < right!
              : x1! > left! &&
                x1! < right! &&
                Math.max(y1!, y2!) > center! - 4 &&
                Math.min(y1!, y2!) < center! + 4
          expect(crossesInterior).toBe(false)
        }
      }
    },
  )
  test('clips a reversed corridor when both endpoint lanes are outside the viewport', () => {
    expect(
      ganttDependencyPath(
        { id: 'edge', from: 'from', to: 'to' },
        createGanttIntervalIndex([
          interval('from', 30, 60),
          interval('to', 0, 20),
        ]),
        new Map([['a', 0]]),
        range(0, 100),
        100,
        20,
        { x: -10, y: 40, width: 110, height: 20 },
        new Map([
          ['from', 10],
          ['to', 90],
        ]),
      ),
    ).toBe('M-5,40L-5,60')
  })
  test('omits dangling and collapsed endpoints without inventing dependencies', () => {
    const intervals = createGanttIntervalIndex([
      interval('from', 0, 10),
      interval('to', 20, 30, 'hidden'),
    ])
    const edge = { id: 'edge', from: 'from', to: 'to' }
    const index = createGanttDependencyIndex(
      [edge, { id: 'missing', from: 'unknown', to: 'to' }],
      intervals,
      flattenGanttRows([{ id: 'a', label: 'A' }], new Set()),
    )
    expect(index.query(0, 10)).toEqual([])
    expect(
      ganttDependencyPath(
        edge,
        intervals,
        index.rowIndices,
        range(0, 100),
        100,
        20,
        { x: 0, y: 0, width: 100, height: 100 },
      ),
    ).toBeNull()
  })
})

test('custom interval grouping indexes original intervals and baselines by lane', () => {
  const first = { ...interval('first', 0, 10), baseline: range(20, 30) }
  const second = interval('second', 0, 10)
  const index = createGanttIntervalIndex(
    [first, second],
    (item) => `${item.rowId}:${item.id}`,
  )
  expect(index.query('a:first', at(0), at(10))).toEqual([first])
  expect(index.query('a:second', at(0), at(10))).toEqual([second])
  expect(index.query('a', at(0), at(10))).toEqual([])
  expect(index.queryBaselines('a:first', at(20), at(30))).toEqual([first])
  expect(index.byRow.get('a:first')?.[0]).toBe(first)
  expect(index.byId.get('first')).toBe(first)
})

test('dependency queries bound lanes inside a dense resource row', () => {
  const intervals = Array.from({ length: 1000 }, (_, i) => ({
    id: String(i),
    rowId: 'resource',
    label: String(i),
    start: new Date(0),
    end: new Date(100),
  }))
  const index = createGanttIntervalIndex(intervals)
  const rows = flattenGanttRows(
    [{ id: 'resource', label: 'Resource' }],
    new Set(),
  )
  const edges = intervals
    .slice(1)
    .map((item, i) => ({ id: item.id, from: String(i), to: item.id }))
  const centers = new Map(intervals.map((item, i) => [item.id, i * 36 + 18]))
  const dependencies = createGanttDependencyIndex(edges, index, rows, centers)
  expect(dependencies.query(360, 432).map((edge) => edge.id)).toEqual([
    '10',
    '11',
    '12',
  ])
})
