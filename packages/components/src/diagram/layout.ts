import { diagramGraph } from './geometry'
import type {
  DiagramEdge,
  DiagramLayoutOptions,
  DiagramNode,
  DiagramInputNode,
} from './types'

/** Deterministic left-to-right layout. Cycles share a column; source records remain unchanged. */
export function layoutDiagram<N, E>(
  nodes: readonly DiagramInputNode<N>[],
  edges: readonly DiagramEdge<E>[],
  options: DiagramLayoutOptions = {},
): DiagramNode<N>[] {
  const nodeGap = options.nodeGap ?? 48
  const rankGap = options.rankGap ?? 120
  if (![nodeGap, rankGap].every((gap) => Number.isFinite(gap) && gap >= 0))
    throw new Error('Diagram layout gaps must be finite nonnegative numbers')
  // Reuse graph validation, including named ports, without requiring input coordinates.
  diagramGraph(
    nodes.map((node) => ({ ...node, x: 0, y: 0 })),
    edges,
  )
  const index = new Map(nodes.map((node, i) => [node.id, i]))
  const next = nodes.map(() => new Set<number>())
  const previous = nodes.map(() => new Set<number>())
  for (const edge of edges) {
    const source = index.get(edge.source.node)!
    const target = index.get(edge.target.node)!
    next[source]!.add(target)
    previous[target]!.add(source)
  }

  // Iterative depth-first traversal avoids call-stack limits on long workflows.
  const visited = new Set<number>()
  const finished: number[] = []
  for (let start = 0; start < nodes.length; start++) {
    if (visited.has(start)) continue
    visited.add(start)
    const stack = [{ node: start, children: next[start]!.values() }]
    while (stack.length) {
      const frame = stack[stack.length - 1]!
      const child = frame.children.next()
      if (child.done) {
        finished.push(frame.node)
        stack.pop()
      } else if (!visited.has(child.value)) {
        visited.add(child.value)
        stack.push({ node: child.value, children: next[child.value]!.values() })
      }
    }
  }
  const component = new Map<number, number>()
  let count = 0
  for (const start of finished.reverse()) {
    if (component.has(start)) continue
    const stack = [start]
    component.set(start, count)
    while (stack.length) {
      const node = stack.pop()!
      for (const parent of previous[node]!) {
        if (component.has(parent)) continue
        component.set(parent, count)
        stack.push(parent)
      }
    }
    count++
  }

  // Collapse cycles before assigning ranks along the resulting acyclic graph.
  const links = Array.from({ length: count }, () => new Set<number>())
  const incoming = Array<number>(count).fill(0)
  const ranks = Array<number>(count).fill(0)
  for (let source = 0; source < next.length; source++) {
    for (const target of next[source]!) {
      const from = component.get(source)!
      const to = component.get(target)!
      if (from === to || links[from]!.has(to)) continue
      links[from]!.add(to)
      incoming[to]!++
    }
  }
  const queue = incoming.flatMap((value, i) => (value === 0 ? [i] : []))
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const from = queue[cursor]!
    for (const to of links[from]!) {
      ranks[to] = Math.max(ranks[to]!, ranks[from]! + 1)
      if (--incoming[to]! === 0) queue.push(to)
    }
  }
  const columns: number[][] = []
  nodes.forEach((_, i) => {
    const rank = ranks[component.get(i)!]!
    ;(columns[rank] ??= []).push(i)
  })
  const result: DiagramNode<N>[] = []
  let x = 0
  columns.forEach((column) => {
    // Align the packed column with its already-positioned predecessors.
    // Same-column cycle edges cannot influence their own placement.
    let localY = 0
    let offset = 0
    for (const i of column) {
      const localCenter = localY + nodes[i]!.height / 2
      const parents = [...previous[i]!].flatMap((parent) =>
        result[parent] ? [result[parent]!] : [],
      )
      const desiredCenter = parents.length
        ? parents.reduce(
            (sum, parent) => sum + parent.y + parent.height / 2,
            0,
          ) / parents.length
        : localCenter
      offset += desiredCenter - localCenter
      localY += nodes[i]!.height + nodeGap
    }
    let y = Math.max(0, offset / column.length)
    let width = 0
    for (const i of column) {
      const node = nodes[i]!
      result[i] = { ...node, x, y }
      y += node.height + nodeGap
      width = Math.max(width, node.width)
    }
    x += width + rankGap
  })
  return result
}
