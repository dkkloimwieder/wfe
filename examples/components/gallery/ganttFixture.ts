import type {
  GanttDependency,
  GanttInterval,
  GanttRange,
  GanttRow,
} from '@wfe/components/gantt'

export const ganttDay = 24 * 60 * 60 * 1000
const origin = Date.UTC(2026, 5, 1)
const date = (day: number) => new Date(origin + day * ganttDay)
export const initialGanttRange = (): GanttRange => ({
  start: date(-1),
  end: date(28),
})
export interface GanttFixture {
  rows: GanttRow[]
  intervals: GanttInterval[]
  dependencies: GanttDependency[]
  expandedIds: string[]
}

export function smallGanttFixture(): GanttFixture {
  return {
    rows: [
      { id: 'planning', label: 'Planning' },
      { id: 'research', label: 'Research', parentId: 'planning' },
      { id: 'design', label: 'Design', parentId: 'planning' },
      { id: 'delivery', label: 'Delivery' },
      { id: 'implementation', label: 'Implementation', parentId: 'delivery' },
      { id: 'verification', label: 'Verification', parentId: 'delivery' },
      { id: 'review', label: 'Review', parentId: 'verification' },
      { id: 'release', label: 'Release', parentId: 'delivery' },
    ],
    intervals: [
      {
        id: 'planning-summary',
        rowId: 'planning',
        label: 'Planning summary',
        start: date(0),
        end: date(9),
        progress: 0.8,
        readOnly: true,
      },
      {
        id: 'research-work',
        rowId: 'research',
        label: 'Research',
        start: date(0),
        end: date(4),
        progress: 1,
        baseline: { start: date(0), end: date(3) },
      },
      {
        id: 'design-work',
        rowId: 'design',
        label: 'Design',
        start: date(4),
        end: date(9),
        progress: 0.6,
        baseline: { start: date(3), end: date(8) },
      },
      {
        id: 'delivery-summary',
        rowId: 'delivery',
        label: 'Delivery summary',
        start: date(9),
        end: date(24),
        progress: 0.3,
        readOnly: true,
      },
      {
        id: 'implementation-work',
        rowId: 'implementation',
        label: 'Build',
        start: date(9),
        end: date(17),
        progress: 0.4,
        critical: true,
        baseline: { start: date(8), end: date(15) },
      },
      {
        id: 'implementation-review',
        rowId: 'implementation',
        label: 'Parallel review',
        start: date(13),
        end: date(18),
        progress: 0.2,
      },
      {
        id: 'verification-work',
        rowId: 'verification',
        label: 'Verification',
        start: date(18),
        end: date(22),
        progress: 0.1,
      },
      {
        id: 'review-work',
        rowId: 'review',
        label: 'Final review',
        start: date(21),
        end: date(24),
      },
      {
        id: 'release-milestone',
        rowId: 'release',
        label: 'Release milestone',
        start: date(24),
        end: date(24),
      },
    ],
    dependencies: [
      { id: 'research-design', from: 'research-work', to: 'design-work' },
      { id: 'design-build', from: 'design-work', to: 'implementation-work' },
      {
        id: 'build-verification',
        from: 'implementation-work',
        to: 'verification-work',
      },
      { id: 'review-release', from: 'review-work', to: 'release-milestone' },
    ],
    expandedIds: ['planning', 'delivery', 'verification'],
  }
}

/** Construct only when the caller selects this dataset: exactly 10,000 rows. */
export function largeGanttFixture(): GanttFixture {
  const rows: GanttRow[] = []
  const intervals: GanttInterval[] = []
  const dependencies: GanttDependency[] = []
  const expandedIds: string[] = []
  for (let group = 0; group < 100; group++) {
    const groupId = `group-${group}`
    rows.push({ id: groupId, label: `Group ${group + 1}` })
    expandedIds.push(groupId)
    intervals.push({
      id: `${groupId}-summary`,
      rowId: groupId,
      label: `Group ${group + 1} summary`,
      start: date(0),
      end: date(25),
      readOnly: true,
    })
    for (let item = 0; item < 99; item++) {
      const id = `${groupId}-item-${item}`
      const start = (item % 18) + (group % 4)
      const milestone = item === 98
      rows.push({
        id,
        parentId: groupId,
        label: `Item ${group + 1}.${item + 1}`,
      })
      intervals.push({
        id,
        rowId: id,
        label: milestone
          ? `Group ${group + 1} milestone`
          : `Work ${group + 1}.${item + 1}`,
        start: date(milestone ? 25 : start),
        end: date(milestone ? 25 : start + 1 + (item % 3)),
        progress: milestone ? undefined : (item % 5) / 4,
        baseline:
          item % 7 === 0
            ? { start: date(start - 1), end: date(start + 1) }
            : undefined,
      })
    }
    dependencies.push({
      id: `${groupId}-link`,
      from: `${groupId}-item-0`,
      to: `${groupId}-item-98`,
    })
  }
  return { rows, intervals, dependencies, expandedIds }
}
