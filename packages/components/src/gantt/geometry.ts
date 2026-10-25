import type {
  GanttDependency,
  GanttInterval,
  GanttRange,
  GanttRow,
} from './types'

export interface GanttFlatRow {
  row: GanttRow
  depth: number
  hasChildren: boolean
}

/** Input order determines root and sibling order. Missing parents and cycles are invalid. */
export function flattenGanttRows(
  rows: readonly GanttRow[],
  expandedIds: ReadonlySet<string>,
): GanttFlatRow[] {
  const byId = new Map<string, GanttRow>()
  const children = new Map<string | undefined, GanttRow[]>()
  for (const row of rows) {
    if (byId.has(row.id)) throw new Error(`Duplicate Gantt row id: ${row.id}`)
    byId.set(row.id, row)
    const group = children.get(row.parentId) ?? []
    group.push(row)
    children.set(row.parentId, group)
  }
  const visited = new Set<string>()
  for (const row of rows) {
    const path = new Set<string>()
    let current: GanttRow | undefined = row
    while (current && !visited.has(current.id)) {
      if (path.has(current.id))
        throw new Error(`Gantt row cycle: ${current.id}`)
      path.add(current.id)
      if (current.parentId !== undefined && !byId.has(current.parentId))
        throw new Error(`Unknown Gantt parent: ${current.parentId}`)
      current =
        current.parentId === undefined ? undefined : byId.get(current.parentId)
    }
    for (const id of path) visited.add(id)
  }
  const result: GanttFlatRow[] = []
  const stack = (children.get(undefined) ?? [])
    .map((row) => ({ row, depth: 0 }))
    .reverse()
  while (stack.length) {
    const entry = stack.pop()!
    const nested = children.get(entry.row.id) ?? []
    result.push({ ...entry, hasChildren: nested.length > 0 })
    if (expandedIds.has(entry.row.id)) {
      for (let i = nested.length - 1; i >= 0; i--)
        stack.push({ row: nested[i]!, depth: entry.depth + 1 })
    }
  }
  return result
}

function times(range: GanttRange, allowMilestone = true): [number, number] {
  const start = range.start.getTime()
  const end = range.end.getTime()
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    (!allowMilestone && end === start)
  )
    throw new RangeError('Gantt dates must be finite and ordered')
  return [start, end]
}

function positive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be positive and finite`)
}

export function ganttDateToX(
  date: Date,
  range: GanttRange,
  width: number,
): number {
  const [start, end] = times(range, false)
  positive(width, 'Gantt width')
  const value = date.getTime()
  if (!Number.isFinite(value)) throw new RangeError('Gantt date must be finite')
  return ((value - start) / (end - start)) * width
}

export function ganttXToDate(
  x: number,
  range: GanttRange,
  width: number,
): Date {
  const [start, end] = times(range, false)
  positive(width, 'Gantt width')
  if (!Number.isFinite(x)) throw new RangeError('Gantt position must be finite')
  const date = new Date(start + (x / width) * (end - start))
  if (!Number.isFinite(date.getTime()))
    throw new RangeError('Gantt date must be finite')
  return date
}

export interface GanttIntervalGeometry {
  x: number
  width: number
  milestone: boolean
  clippedStart: boolean
  clippedEnd: boolean
}

export function ganttIntervalGeometry(
  interval: GanttRange,
  range: GanttRange,
  width: number,
): GanttIntervalGeometry | null {
  const [start, end] = times(interval)
  const [low, high] = times(range, false)
  positive(width, 'Gantt width')
  const milestone = start === end
  if (milestone ? start < low || start >= high : end <= low || start >= high)
    return null
  return {
    x: ((Math.max(start, low) - low) / (high - low)) * width,
    width:
      ((Math.min(end, high) - Math.max(start, low)) / (high - low)) * width,
    milestone,
    clippedStart: start < low,
    clippedEnd: end > high,
  }
}

type Span<T> = { start: number; end: number; value: T; order: number }
type Tree<T> = {
  span: Span<T>
  maxEnd: number
  left?: Tree<T>
  right?: Tree<T>
}

function buildTree<T>(spans: Span<T>[]): Tree<T> | undefined {
  spans.sort((a, b) => a.start - b.start || a.order - b.order)
  function build(low: number, high: number): Tree<T> | undefined {
    if (low >= high) return undefined
    const middle = (low + high) >>> 1
    const span = spans[middle]!
    const left = build(low, middle)
    const right = build(middle + 1, high)
    return {
      span,
      left,
      right,
      maxEnd: Math.max(
        span.end,
        left?.maxEnd ?? -Infinity,
        right?.maxEnd ?? -Infinity,
      ),
    }
  }
  return build(0, spans.length)
}

function queryTree<T>(
  tree: Tree<T> | undefined,
  low: number,
  high: number,
  visit: (value: Span<T>) => void,
): void {
  if (!tree || tree.maxEnd < low) return
  queryTree(tree.left, low, high, visit)
  if (tree.span.start > high) return
  if (tree.span.end >= low) visit(tree.span)
  queryTree(tree.right, low, high, visit)
}

export interface GanttIntervalIndex {
  readonly byId: ReadonlyMap<string, GanttInterval>
  readonly byRow: ReadonlyMap<string, readonly GanttInterval[]>
  queryBaselines(rowId: string, start: Date, end: Date): GanttInterval[]
  query(rowId: string, start: Date, end: Date): GanttInterval[]
}

/** Rebuild when accepted interval data changes, including same-ID date updates. */
export function createGanttIntervalIndex(
  intervals: readonly GanttInterval[],
  getRowId: (interval: GanttInterval) => string = (interval) => interval.rowId,
): GanttIntervalIndex {
  const byId = new Map<string, GanttInterval>()
  const rows = new Map<string, Span<GanttInterval>[]>()
  const baselines = new Map<string, Span<GanttInterval>[]>()
  const byRow = new Map<string, GanttInterval[]>()
  intervals.forEach((interval, order) => {
    if (byId.has(interval.id))
      throw new Error(`Duplicate Gantt interval id: ${interval.id}`)
    const [start, end] = times(interval)
    const rowId = getRowId(interval)
    if (interval.baseline) {
      const [baselineStart, baselineEnd] = times(interval.baseline)
      const entries = baselines.get(rowId) ?? []
      entries.push({
        start: baselineStart,
        end: baselineEnd,
        value: interval,
        order,
      })
      baselines.set(rowId, entries)
    }
    const group = byRow.get(rowId) ?? []
    group.push(interval)
    byRow.set(rowId, group)
    byId.set(interval.id, interval)
    const spans = rows.get(rowId) ?? []
    spans.push({ start, end, value: interval, order })
    rows.set(rowId, spans)
  })
  const trees = new Map([...rows].map(([id, spans]) => [id, buildTree(spans)]))
  const baselineTrees = new Map(
    [...baselines].map(([id, spans]) => [id, buildTree(spans)]),
  )
  function query(
    trees: ReadonlyMap<string, Tree<GanttInterval> | undefined>,
    rowId: string,
    start: Date,
    end: Date,
  ) {
    const [low, high] = times({ start, end }, false)
    const result: GanttInterval[] = []
    queryTree(trees.get(rowId), low, high, (span) => {
      if (
        span.start === span.end
          ? span.start >= low && span.start < high
          : span.end > low && span.start < high
      )
        result.push(span.value)
    })
    return result
  }
  return {
    byId,
    byRow,
    query: (rowId, start, end) => query(trees, rowId, start, end),
    queryBaselines: (rowId, start, end) =>
      query(baselineTrees, rowId, start, end),
  }
}

export interface GanttDependencyIndex {
  readonly rowIndices: ReadonlyMap<string, number>
  /** Inclusive row indices (or supplied pixel positions). Crossing edges are included even with both endpoints offscreen. */
  query(firstRow: number, lastRow: number): GanttDependency[]
}

/** One indexed span per connector, independent of the number of rows it crosses. */
export function createGanttDependencyIndex(
  dependencies: readonly GanttDependency[],
  intervals: GanttIntervalIndex,
  visibleRows: readonly GanttFlatRow[],
  intervalPositions?: ReadonlyMap<string, number>,
): GanttDependencyIndex {
  const rowIndices = new Map(
    visibleRows.map((entry, index) => [entry.row.id, index]),
  )
  const ids = new Set<string>()
  const spans: Span<GanttDependency>[] = []
  dependencies.forEach((dependency, order) => {
    if (ids.has(dependency.id))
      throw new Error(`Duplicate Gantt dependency id: ${dependency.id}`)
    ids.add(dependency.id)
    const source = intervals.byId.get(dependency.from)
    const target = intervals.byId.get(dependency.to)
    const from =
      source &&
      (intervalPositions
        ? intervalPositions.get(source.id)
        : rowIndices.get(source.rowId))
    const to =
      target &&
      (intervalPositions
        ? intervalPositions.get(target.id)
        : rowIndices.get(target.rowId))
    // A filtered or collapsed endpoint has no visible row geometry.
    if (from === undefined || to === undefined) return
    if (!Number.isFinite(from) || !Number.isFinite(to))
      throw new RangeError('Gantt dependency positions must be finite')
    spans.push({
      start: Math.min(from, to),
      end: Math.max(from, to),
      value: dependency,
      order,
    })
  })
  const tree = buildTree(spans)
  return {
    rowIndices,
    query(firstRow, lastRow) {
      if (
        !Number.isFinite(firstRow) ||
        !Number.isFinite(lastRow) ||
        lastRow < firstRow
      )
        return []
      const result: GanttDependency[] = []
      queryTree(tree, firstRow, lastRow, (span) => result.push(span.value))
      return result
    },
  }
}

export interface GanttViewport {
  x: number
  y: number
  width: number
  height: number
}
type Point = { x: number; y: number }

/** Clip an orthogonal connector segment without inventing offscreen endpoints. */
function clipSegment(
  a: Point,
  b: Point,
  view: GanttViewport,
): [Point, Point] | null {
  let low = 0
  let high = 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  const bounds = [
    [-dx, a.x - view.x],
    [dx, view.x + view.width - a.x],
    [-dy, a.y - view.y],
    [dy, view.y + view.height - a.y],
  ] as const
  for (const [p, q] of bounds) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const t = q / p
    if (p < 0) low = Math.max(low, t)
    else high = Math.min(high, t)
    if (low > high) return null
  }
  if (low === high || (dx === 0 && dy === 0)) return null
  return [
    { x: a.x + low * dx, y: a.y + low * dy },
    { x: a.x + high * dx, y: a.y + high * dy },
  ]
}

export function ganttDependencyPath(
  dependency: GanttDependency,
  intervals: GanttIntervalIndex,
  rowIndices: ReadonlyMap<string, number>,
  range: GanttRange,
  width: number,
  rowHeight: number,
  viewport: GanttViewport,
  intervalCenters?: ReadonlyMap<string, number>,
): string | null {
  times(range, false)
  positive(width, 'Gantt width')
  positive(rowHeight, 'Gantt row height')
  if (
    ![viewport.x, viewport.y, viewport.width, viewport.height].every(
      Number.isFinite,
    ) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  )
    return null
  const source = intervals.byId.get(dependency.from)
  const target = intervals.byId.get(dependency.to)
  if (!source || !target) return null
  const sourceRow = rowIndices.get(source.rowId)
  const targetRow = rowIndices.get(target.rowId)
  if (sourceRow === undefined || targetRow === undefined) return null
  const a = {
    x: ganttDateToX(source.end, range, width),
    y: intervalCenters?.get(source.id) ?? (sourceRow + 0.5) * rowHeight,
  }
  const b = {
    x: ganttDateToX(target.start, range, width),
    y: intervalCenters?.get(target.id) ?? (targetRow + 0.5) * rowHeight,
  }
  const middle = (a.x + b.x) / 2
  const points = [a, { x: middle, y: a.y }, { x: middle, y: b.y }, b]
  const parts: string[] = []
  for (let i = 1; i < points.length; i++) {
    const segment = clipSegment(points[i - 1]!, points[i]!, viewport)
    if (segment)
      parts.push(
        `M${segment[0].x},${segment[0].y}L${segment[1].x},${segment[1].y}`,
      )
  }
  return parts.length ? parts.join(' ') : null
}

export interface GanttPackedInterval {
  interval: GanttInterval
  lane: number
}

/** Stable chronological packing. Each item occupies the first available ending lane. */
export function packGanttIntervals(
  intervals: readonly GanttInterval[],
): GanttPackedInterval[] {
  const ordered = intervals.map((interval) => ({
    interval,
    times: times(interval),
  }))
  ordered.sort(
    (a, b) =>
      a.times[0] - b.times[0] ||
      a.times[1] - b.times[1] ||
      (a.interval.id < b.interval.id
        ? -1
        : a.interval.id > b.interval.id
          ? 1
          : 0),
  )
  type LaneEnd = { end: number; lane: number; milestone: boolean }
  const heap: LaneEnd[] = []
  let nextLane = 0
  const result: GanttPackedInterval[] = []
  const before = (a: LaneEnd, b: LaneEnd) =>
    a.end < b.end ||
    (a.end === b.end &&
      (Number(a.milestone) < Number(b.milestone) ||
        (a.milestone === b.milestone && a.lane < b.lane)))
  for (const item of ordered) {
    const [start, end] = item.times
    let lane: number
    if (
      heap[0] &&
      (heap[0].end < start || (heap[0].end === start && !heap[0].milestone))
    ) {
      lane = heap[0].lane
      const last = heap.pop()!
      if (heap.length) {
        heap[0] = last
        let i = 0
        while (true) {
          const left = i * 2 + 1
          const right = left + 1
          let smallest = i
          if (heap[left] && before(heap[left], heap[smallest]!)) smallest = left
          if (heap[right] && before(heap[right], heap[smallest]!))
            smallest = right
          if (smallest === i) break
          const old = heap[i]!
          heap[i] = heap[smallest]!
          heap[smallest] = old
          i = smallest
        }
      }
    } else lane = nextLane++
    // Coincident milestones occupy separate lanes without adding an artificial duration.
    const entry = { end, lane, milestone: start === end }
    heap.push(entry)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >>> 1
      if (!before(entry, heap[parent]!)) break
      heap[i] = heap[parent]!
      i = parent
    }
    heap[i] = entry
    result.push({ interval: item.interval, lane })
  }
  return result
}
