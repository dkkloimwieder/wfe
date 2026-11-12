import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getViewportForBounds,
  Position,
} from '@xyflow/system'
import type {
  DiagramEdge,
  DiagramEndpoint,
  DiagramNode,
  DiagramInputNode,
  DiagramViewport,
} from './types'

export function diagramGraph<N, E>(
  nodes: readonly DiagramInputNode<N>[],
  edges: readonly DiagramEdge<E>[],
  cornerRadius = 0,
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
  const paths = edges.map((edge) => {
    if (!edge.id || edgeIds.has(edge.id))
      throw new Error('Diagram requires unique nonempty edge IDs')
    edgeIds.add(edge.id)
    const source = endpoint(edge.source, 'right', byId)
    const target = endpoint(edge.target, 'left', byId)
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
          ? getSmoothStepPath({ ...options, borderRadius: cornerRadius })
          : getBezierPath(options)
    return {
      edge,
      path,
      labelX,
      labelY,
      description: `${source.label} → ${target.label}: ${edge.label}`,
    }
  })
  const positioned = [...byId.values()]
  const left = positioned.length ? Math.min(...positioned.map((n) => n.x)) : 0
  const top = nodes.length ? Math.min(...positioned.map((n) => n.y)) : 0
  const right = nodes.length
    ? Math.max(...positioned.map((n) => n.x + n.width))
    : 1
  const bottom = nodes.length
    ? Math.max(...positioned.map((n) => n.y + n.height))
    : 1
  return {
    byId,
    paths,
    bounds: { x: left, y: top, width: right - left, height: bottom - top },
  }
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
  return getViewportForBounds(bounds, width, height, 0.05, 1.5, 0.15)
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
