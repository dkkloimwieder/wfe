export type Point = { x: number; y: number }
export type Rectangle = {
  left: number
  right: number
  top: number
  bottom: number
}
export type Port = Point & { side: 'left' | 'right' | 'top' | 'bottom' }

export const routeClearance = 8
const laneWidth = 10
const bendCost = 24
const directions = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
}

export function outset(box: Rectangle, padding: number): Rectangle {
  return {
    left: box.left - padding,
    right: box.right + padding,
    top: box.top - padding,
    bottom: box.bottom + padding,
  }
}

export function pointBounds(points: readonly Point[]): Rectangle {
  const box = {
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity,
  }
  for (const { x, y } of points) {
    box.left = Math.min(box.left, x)
    box.right = Math.max(box.right, x)
    box.top = Math.min(box.top, y)
    box.bottom = Math.max(box.bottom, y)
  }
  return box
}

export function overlaps(a: Rectangle, b: Rectangle) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

export function crosses(a: Point, b: Point, box: Rectangle) {
  if (!overlaps(pointBounds([a, b]), box)) return false
  // Clip the segment against both open coordinate intervals.
  let first = 0
  let last = 1
  for (const [start, end, min, max] of [
    [a.x, b.x, box.left, box.right],
    [a.y, b.y, box.top, box.bottom],
  ] as const) {
    if (start === end) continue
    const enter = (min - start) / (end - start)
    const exit = (max - start) / (end - start)
    first = Math.max(first, Math.min(enter, exit))
    last = Math.min(last, Math.max(enter, exit))
  }
  return first < last
}

function same(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y
}

export function distance(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function compact(points: readonly Point[]) {
  const corners: Point[] = []
  for (const point of points) {
    const a = corners.at(-2)
    const b = corners.at(-1)
    if (b && same(b, point)) continue
    if (
      a &&
      b &&
      ((a.x === b.x && b.x === point.x && (b.y - a.y) * (point.y - b.y) >= 0) ||
        (a.y === b.y && b.y === point.y && (b.x - a.x) * (point.x - b.x) >= 0))
    )
      corners.pop()
    corners.push(point)
  }
  return corners
}

function lead(port: Port, length: number): Point {
  const direction = directions[port.side]
  return { x: port.x + direction.x * length, y: port.y + direction.y * length }
}

type Span = { from: number; to: number }
type Lanes = Map<number, Span[]>

function lane(a: Point, b: Point, horizontal: Lanes, vertical: Lanes) {
  if (a.y === b.y)
    return {
      map: horizontal,
      key: a.y,
      from: Math.min(a.x, b.x),
      to: Math.max(a.x, b.x),
    }
  if (a.x === b.x)
    return {
      map: vertical,
      key: a.x,
      from: Math.min(a.y, b.y),
      to: Math.max(a.y, b.y),
    }
  return undefined
}

function tracks(boundaries: number[], terminals: number[]) {
  const sides = [...new Set(boundaries)].sort((a, b) => a - b)
  const values = new Set([...sides, ...terminals])
  sides.forEach((side, i) => {
    const next = sides[i + 1]
    if (next !== undefined && next - side > 2 * laneWidth) {
      values.add(side + laneWidth)
      values.add(next - laneWidth)
    }
  })
  values.add(sides[0]! - laneWidth)
  values.add(sides.at(-1)! + laneWidth)
  return [...values].sort((a, b) => a - b)
}

type Visit = { state: number; cost: number; estimate: number }

function precedes(a: Visit, b: Visit) {
  return (
    a.estimate < b.estimate || (a.estimate === b.estimate && a.cost > b.cost)
  )
}
class Frontier {
  private visits: Visit[] = []

  push(visit: Visit) {
    const visits = this.visits
    let index = visits.length
    visits.push(visit)
    while (index > 0) {
      const parent = (index - 1) >>> 1
      if (!precedes(visit, visits[parent]!)) break
      visits[index] = visits[parent]!
      index = parent
    }
    visits[index] = visit
  }

  pop() {
    const visits = this.visits
    const first = visits[0]
    const last = visits.pop()
    if (!last || !visits.length) return first
    let index = 0
    while (index * 2 + 1 < visits.length) {
      let child = index * 2 + 1
      if (visits[child + 1] && precedes(visits[child + 1]!, visits[child]!))
        child++
      if (!precedes(visits[child]!, last)) break
      visits[index] = visits[child]!
      index = child
    }
    visits[index] = last
    return first
  }
}

function routeGrid(boxes: readonly Rectangle[], terminals: readonly Point[]) {
  const xs = tracks(
    boxes.flatMap((b) => [b.left, b.right]),
    terminals.map((p) => p.x),
  )
  const ys = tracks(
    boxes.flatMap((b) => [b.top, b.bottom]),
    terminals.map((p) => p.y),
  )
  // Store blocked intervals by row and column. Only materialize states reached by A*.
  return {
    xs,
    ys,
    rows: ys.map((y) => boxes.filter((b) => b.top < y && y < b.bottom)),
    columns: xs.map((x) => boxes.filter((b) => b.left < x && x < b.right)),
  }
}

/** One router per graph. Edge order breaks lane ties and makes results reproducible. */
export function createRouter(
  boxes: readonly Rectangle[],
  ports: readonly Port[],
) {
  const padded = boxes.map((box) => outset(box, routeClearance))
  const horizontal: Lanes = new Map()
  const vertical: Lanes = new Map()
  const congestion = (a: Point, b: Point) => {
    const span = lane(a, b, horizontal, vertical)
    let occupied = 0
    if (span)
      for (const used of span.map.get(span.key) ?? [])
        occupied += Math.max(
          0,
          Math.min(span.to, used.to) - Math.max(span.from, used.from),
        )
    return occupied
  }
  let grid: ReturnType<typeof routeGrid> | undefined
  let tightGrid: ReturnType<typeof routeGrid> | undefined

  function search(
    source: Port,
    target: Port,
    start: Point,
    end: Point,
    mesh: ReturnType<typeof routeGrid>,
  ) {
    const { xs, ys, rows, columns } = mesh
    const width = xs.length
    const startCell = ys.indexOf(start.y) * width + xs.indexOf(start.x)
    const endCell = ys.indexOf(end.y) * width + xs.indexOf(end.x)
    const startState = startCell * 2 + Number(source.x === start.x)
    const endAxis = Number(target.x === end.x)
    const frontier = new Frontier()
    const costs = new Map([[startState, 0]])
    const previous = new Map<number, number>()
    frontier.push({
      state: startState,
      cost: 0,
      estimate: distance(start, end),
    })
    let best: Visit | undefined
    for (let visit = frontier.pop(); visit; visit = frontier.pop()) {
      const { state, cost, estimate } = visit
      if (best && estimate >= best.cost) break
      if (cost !== costs.get(state)) continue
      const axis = state % 2
      const cell = (state - axis) / 2
      if (cell === endCell) {
        const total = cost + (axis === endAxis ? 0 : bendCost)
        if (!best || total < best.cost) best = { state, cost: total, estimate }
        continue
      }
      const column = cell % width
      const row = (cell - column) / width
      const point = { x: xs[column]!, y: ys[row]! }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const x = xs[column + dx]
        const y = ys[row + dy]
        if (x === undefined || y === undefined) continue
        const blocked = dx
          ? rows[row]!.some(
              (b) =>
                Math.min(x, point.x) < b.right && Math.max(x, point.x) > b.left,
            )
          : columns[column]!.some(
              (b) =>
                Math.min(y, point.y) < b.bottom && Math.max(y, point.y) > b.top,
            )
        if (blocked) continue
        const next = { x, y }
        const nextAxis = Number(!dx)
        const nextState = (cell + dx + dy * width) * 2 + nextAxis
        const step = distance(point, next)
        const nextCost =
          cost +
          step +
          (axis === nextAxis ? 0 : bendCost) +
          3 * congestion(point, next)
        if (nextCost >= (costs.get(nextState) ?? Infinity)) continue
        costs.set(nextState, nextCost)
        previous.set(nextState, state)
        frontier.push({
          state: nextState,
          cost: nextCost,
          estimate: nextCost + distance(next, end),
        })
      }
    }
    if (!best) return undefined
    const points: Point[] = [target]
    for (
      let state: number | undefined = best.state;
      state !== undefined;
      state = previous.get(state)
    ) {
      const cell = Math.floor(state / 2)
      points.push({ x: xs[cell % width]!, y: ys[Math.floor(cell / width)]! })
    }
    points.push(source)
    return compact(points.reverse())
  }

  return {
    padded,
    reserve(points: readonly Point[]) {
      for (let i = 1; i < points.length; i++) {
        const span = lane(points[i - 1]!, points[i]!, horizontal, vertical)
        if (!span) continue
        const { map, key, from, to } = span
        const intervals = map.get(key)
        if (intervals) intervals.push({ from, to })
        else map.set(key, [{ from, to }])
      }
    },
    available(points: readonly Point[]) {
      return points.every(
        (point, i) => !i || congestion(points[i - 1]!, point) <= laneWidth,
      )
    },
    route(
      source: Port,
      target: Port,
      sourceIndex: number,
      targetIndex: number,
    ) {
      const start = lead(source, routeClearance)
      const end = lead(target, routeClearance)
      const accessible = (
        a: Point,
        b: Point,
        index: number,
        obstacles: readonly Rectangle[],
      ) => obstacles.every((box, i) => index === i || !crosses(a, b, box))
      if (
        accessible(source, start, sourceIndex, padded) &&
        accessible(target, end, targetIndex, padded)
      ) {
        grid ??= routeGrid(
          padded,
          ports.map((port) => lead(port, routeClearance)),
        )
        const path = search(source, target, start, end, grid)
        if (path) return path
      }
      // A manually placed graph can have gaps narrower than the standard clearance.
      const nearStart = lead(source, 1)
      const nearEnd = lead(target, 1)
      if (
        accessible(source, nearStart, sourceIndex, boxes) &&
        accessible(target, nearEnd, targetIndex, boxes)
      ) {
        tightGrid ??= routeGrid(
          boxes,
          ports.map((port) => lead(port, 1)),
        )
        return search(source, target, nearStart, nearEnd, tightGrid)
      }
      return undefined
    },
  }
}
