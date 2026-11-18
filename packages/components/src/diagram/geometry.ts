import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getViewportForBounds,
  Position,
} from '@xyflow/system'
import {
  compact,
  createRouter,
  crosses,
  distance,
  overlaps,
  pointBounds,
} from './routing'
import type { Point, Rectangle } from './routing'
import type {
  DiagramEdge,
  DiagramEndpoint,
  DiagramNode,
  DiagramInputNode,
  DiagramViewport,
} from './types'

export function resolveDiagram<N, E>(
  nodes: readonly DiagramInputNode<N>[],
  edges: readonly DiagramEdge<E>[],
) {
  const byId = new Map<string, DiagramNode<N>>()
  for (const node of nodes) {
    if (!node.id || byId.has(node.id))
      throw new Error('Diagram requires unique nonempty node IDs')
    if (
      ![node.x, node.y, node.width, node.height].every(Number.isFinite) ||
      node.width <= 0 ||
      node.height <= 0
    )
      throw new Error(
        `Diagram node ${node.id} requires finite coordinates and positive dimensions`,
      )
    const ports = new Set<string>()
    for (const port of node.ports ?? []) {
      if (!port.id || ports.has(port.id))
        throw new Error(
          `Diagram node ${node.id} requires unique nonempty port IDs`,
        )
      const limit =
        port.side === 'left' || port.side === 'right' ? node.height : node.width
      if (
        !['left', 'right', 'top', 'bottom'].includes(port.side) ||
        !Number.isFinite(port.offset) ||
        port.offset < 0 ||
        port.offset > limit
      )
        throw new Error(`Diagram port ${port.id} must lie on its node boundary`)
      ports.add(port.id)
    }
    byId.set(node.id, { ...node, x: node.x!, y: node.y! })
  }
  const edgeIds = new Set<string>()
  const connections = edges.map((edge) => {
    if (!edge.id || edgeIds.has(edge.id))
      throw new Error('Diagram requires unique nonempty edge IDs')
    edgeIds.add(edge.id)
    const source = endpoint(edge.source, 'right', byId)
    const target = endpoint(edge.target, 'left', byId)
    return {
      edge,
      source,
      target,
      description: `${source.label} → ${target.label}: ${edge.label}`,
    }
  })
  return { byId, connections }
}

export function prepareDiagram<N, E>(
  nodes: readonly DiagramInputNode<N>[],
  edges: readonly DiagramEdge<E>[],
) {
  const { byId, connections } = resolveDiagram(nodes, edges)
  const positioned = [...byId.values()]
  const indices = new Map(positioned.map((node, i) => [node.id, i]))
  const boxes = positioned.map((node) => ({
    left: node.x,
    right: node.x + node.width,
    top: node.y,
    bottom: node.y + node.height,
  }))
  const router = createRouter(
    boxes,
    connections.flatMap(({ source, target }) => [source, target]),
  )
  const usedPaths = new Set<string>()
  const armJoins = new Set<string>()
  const bounds = boxes.length
    ? {
        left: Math.min(...boxes.map((box) => box.left)),
        right: Math.max(...boxes.map((box) => box.right)),
        top: Math.min(...boxes.map((box) => box.top)),
        bottom: Math.max(...boxes.map((box) => box.bottom)),
      }
    : { left: 0, right: 1, top: 0, bottom: 1 }
  const paths = connections.map(({ edge, source, target, description }) => {
    const sourceIndex = indices.get(edge.source.node)!
    const targetIndex = indices.get(edge.target.node)!
    const obstacles = router.padded.map((box, i) =>
      i === sourceIndex || i === targetIndex ? boxes[i]! : box,
    )
    const options = {
      sourceX: source.x,
      sourceY: source.y,
      targetX: target.x,
      targetY: target.y,
      sourcePosition: source.position,
      targetPosition: target.position,
    }
    const [path, labelX, labelY] =
      edge.type === 'straight'
        ? getStraightPath(options)
        : edge.type === 'step'
          ? getSmoothStepPath({ ...options, borderRadius: 0 })
          : getBezierPath(options)
    const native = pathPoints(path)
    const linear = edge.type === 'step' || edge.type === 'straight'
    const nativeBounds = pointBounds(native)
    const clear = linear
      ? native.every(
          (point, i) =>
            !i ||
            obstacles.every((box) => !crosses(native[i - 1]!, point, box)),
        )
      : obstacles.every((box) => !overlaps(nativeBounds, box))
    const join = JSON.stringify([
      edge.source.node,
      edge.target.node,
      edge.target.port,
    ])
    // Distinct named arms from one node can merge on a clear approach to
    // their common target port. Identical connections still seek a new lane.
    const mergesArms =
      edge.type === 'step' &&
      edge.source.port !== undefined &&
      armJoins.has(join)
    const useNative =
      clear &&
      !usedPaths.has(path) &&
      (!linear || mergesArms || router.available(native))
    const detour = useNative
      ? undefined
      : router.route(source, target, sourceIndex, targetIndex)
    const points =
      detour ?? (edge.type === 'step' ? compact(native) : undefined)
    if (points || linear) router.reserve(points ?? native)
    usedPaths.add(path)
    if (useNative && edge.source.port !== undefined) armJoins.add(join)
    if (detour) {
      const extent = pointBounds(detour)
      bounds.left = Math.min(bounds.left, extent.left)
      bounds.right = Math.max(bounds.right, extent.right)
      bounds.top = Math.min(bounds.top, extent.top)
      bounds.bottom = Math.max(bounds.bottom, extent.bottom)
    }
    const label = placeLabel(
      detour,
      { x: labelX, y: labelY },
      edge.label,
      boxes,
    )
    return {
      edge,
      description,
      labelX: label.x,
      labelY: label.y,
      labelWidth: label.width,
      labelVisible: label.visible,
      path: (cornerRadius: number) =>
        points && points.length >= 2
          ? drawRoute(points, edge.type, cornerRadius, obstacles)
          : path,
    }
  })
  return {
    byId,
    paths,
    bounds: {
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    },
  }
}

export function diagramGraph<N, E>(
  nodes: readonly DiagramInputNode<N>[],
  edges: readonly DiagramEdge<E>[],
  cornerRadius = 0,
) {
  const graph = prepareDiagram(nodes, edges)
  return {
    ...graph,
    paths: graph.paths.map((row) => ({ ...row, path: row.path(cornerRadius) })),
  }
}

function pathPoints(path: string) {
  // The zero-radius xyflow step path repeats corner points. The Bézier supplies
  // two control points whose bounding box conservatively encloses the curve.
  const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number)
  const points: Point[] = []
  for (let i = 0; i < numbers.length; i += 2)
    points.push({ x: numbers[i]!, y: numbers[i + 1]! })
  return points
}

function drawRoute(
  points: readonly Point[],
  type: DiagramEdge['type'],
  cornerRadius: number,
  obstacles: readonly Rectangle[],
) {
  const coordinate = (point: Point) => `${point.x},${point.y}`
  let path = `M${coordinate(points[0]!)}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const c = points[i + 1]!
    const bend = a.x !== c.x && a.y !== c.y
    const extent =
      !bend || type === 'straight' ? 0 : type === 'step' ? cornerRadius : 16
    const limit = Math.min(distance(a, b) / 2, distance(b, c) / 2, extent)
    const toward = (point: Point, amount: number) => ({
      x: b.x + Math.sign(point.x - b.x) * amount,
      y: b.y + Math.sign(point.y - b.y) * amount,
    })
    let rounded = false
    for (
      let size = limit, attempt = 0;
      size > 0 && attempt < 5;
      size /= 2, attempt++
    ) {
      const entry = toward(a, size)
      const exit = toward(c, size)
      // The entire corner lies in this control hull, so rounding cannot cut
      // the corner of an obstacle the orthogonal legs just cleared.
      const hull = pointBounds([entry, b, exit])
      if (obstacles.every((box) => !overlaps(hull, box))) {
        path +=
          type === 'step'
            ? `L${coordinate(entry)}Q${coordinate(b)} ${coordinate(exit)}`
            : `L${coordinate(entry)}C${coordinate(b)} ${coordinate(b)} ${coordinate(exit)}`
        rounded = true
        break
      }
    }
    if (!rounded) path += `L${coordinate(b)}`
  }
  return path + `L${coordinate(points.at(-1)!)}`
}

function placeLabel(
  detour: readonly Point[] | undefined,
  preferred: Point,
  text: string,
  boxes: readonly Rectangle[],
) {
  const width = text.length * 7 + 12
  const fits = ({ x, y }: Point) =>
    boxes.every(
      (box) =>
        !overlaps(
          {
            left: x - width / 2 - 1,
            right: x + width / 2 + 1,
            top: y - 23,
            bottom: y - 1,
          },
          box,
        ),
    )
  const candidates: Point[] = []
  if (detour) {
    const segments = detour.slice(1).map((b, i) => ({ a: detour[i]!, b }))
    segments.sort((a, b) => distance(b.a, b.b) - distance(a.a, a.b))
    for (const { a, b } of segments)
      candidates.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  }
  candidates.push(preferred)
  const match = candidates.find(fits)
  return { ...(match ?? candidates[0]!), width, visible: match !== undefined }
}

function endpoint<N>(
  end: DiagramEndpoint,
  fallback: 'left' | 'right',
  nodes: ReadonlyMap<string, DiagramNode<N>>,
) {
  const node = nodes.get(end.node)
  if (!node)
    throw new Error(`Diagram endpoint references missing node ${end.node}`)
  const port =
    end.port === undefined
      ? undefined
      : node.ports?.find((p) => p.id === end.port)
  if (end.port !== undefined && !port)
    throw new Error(`Diagram endpoint references missing port ${end.port}`)
  const side = port?.side ?? fallback
  const offset = port?.offset ?? node.height / 2
  return {
    x: node.x + (side === 'right' ? node.width : side === 'left' ? 0 : offset),
    y: node.y + (side === 'bottom' ? node.height : side === 'top' ? 0 : offset),
    side,
    position: {
      left: Position.Left,
      right: Position.Right,
      top: Position.Top,
      bottom: Position.Bottom,
    }[side],
    label: `${node.label}${port ? ` / ${port.label}` : ''}`,
  }
}
export function fitDiagram(
  bounds: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
): DiagramViewport {
  // xyflow 1.0 takes pixels. Keep the old 0.15 ratio and per-axis rounding.
  const padding = (size: number) => Math.floor((size - size / 1.15) * 0.5)
  return getViewportForBounds(bounds, width, height, 0.05, 1.5, {
    x: padding(width),
    y: padding(height),
  })
}
export function zoomDiagram(
  view: DiagramViewport,
  zoom: number,
  x: number,
  y: number,
): DiagramViewport {
  const next = Math.max(0.05, Math.min(3, zoom))
  return {
    x: x - ((x - view.x) * next) / view.zoom,
    y: y - ((y - view.y) * next) / view.zoom,
    zoom: next,
  }
}
