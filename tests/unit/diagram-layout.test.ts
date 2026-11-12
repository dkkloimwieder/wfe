import { expect, test } from 'vitest'
import { layoutDiagram } from '@wfe/components/diagram'
import type {
  DiagramEdge,
  DiagramNode,
  DiagramInputNode,
} from '@wfe/components/diagram'

const node = (
  id: string,
  width = 180,
  height = 100,
): DiagramInputNode<string> =>
  Object.freeze({ id, label: id, width, height, data: id })
const edge = (source: string, target: string): DiagramEdge => ({
  id: `${source}-${target}`,
  label: '',
  source: { node: source },
  target: { node: target },
  data: null,
})
function expectSeparated(nodes: readonly DiagramNode[]) {
  nodes.forEach((a, i) => {
    for (const b of nodes.slice(i + 1)) {
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true)
    }
  })
}
test('arranges branches and joins deterministically without changing inputs', () => {
  const nodes = Object.freeze([
    node('start'),
    node('a', 250, 300),
    node('b', 140, 90),
    node('end'),
  ])
  const edges = [
    edge('start', 'a'),
    edge('start', 'b'),
    edge('a', 'end'),
    edge('b', 'end'),
  ]
  const result = layoutDiagram(nodes, edges)
  expectSeparated(result)
  expect(result[0]!.x + result[0]!.width).toBeLessThan(result[1]!.x)
  expect(result[1]!.x).toBe(result[2]!.x)
  expect(result[1]!.x + result[1]!.width).toBeLessThan(result[3]!.x)
  expect(result.map((n) => n.id)).toEqual(nodes.map((n) => n.id))
  expect(result.map((n) => n.data)).toEqual(nodes.map((n) => n.data))
  expect(nodes.every((n) => n.x === undefined && n.y === undefined)).toBe(true)
  expect(layoutDiagram(nodes, edges)).toEqual(result)
  expectSeparated(
    layoutDiagram(
      nodes.map((n) => (n.id === 'a' ? { ...n, height: 600 } : n)),
      edges,
    ),
  )
})
test('handles cycles, self-loops, disconnected components, and empty graphs', () => {
  const nodes = [node('a'), node('b'), node('c'), node('alone'), node('other')]
  const edges = [
    edge('a', 'b'),
    edge('b', 'a'),
    edge('b', 'c'),
    edge('alone', 'alone'),
  ]
  const result = layoutDiagram(nodes, edges)
  expectSeparated(result)
  expect(result[0]!.x).toBe(result[1]!.x)
  expect(result[2]!.x).toBeGreaterThan(result[1]!.x)
  expect(result).toHaveLength(nodes.length)
  expect(layoutDiagram([], [])).toEqual([])
})
test('honors spacing and validates endpoints, dimensions, and layout options', () => {
  const nodes = [node('a'), node('b'), node('c')]
  const edges = [edge('a', 'c'), edge('b', 'c')]
  const result = layoutDiagram(nodes, edges, { nodeGap: 75, rankGap: 200 })
  expect(result[1]!.y - result[0]!.y - result[0]!.height).toBe(75)
  expect(result[2]!.x - result[0]!.x - result[0]!.width).toBe(200)
  expect(() => layoutDiagram(nodes, [edge('a', 'missing')])).toThrow(
    'missing node',
  )
  expect(() => layoutDiagram([node('a', 0)], [])).toThrow('positive dimensions')
  expect(() => layoutDiagram(nodes, edges, { nodeGap: -1 })).toThrow(
    'nonnegative',
  )
  expect(() => layoutDiagram(nodes, edges, { rankGap: NaN })).toThrow(
    'nonnegative',
  )
})
test('lays out long chains without recursive traversal', () => {
  const nodes = Array.from({ length: 4000 }, (_, i) => node(String(i)))
  const edges = nodes.slice(1).map((_, i) => edge(String(i), String(i + 1)))
  const result = layoutDiagram(nodes, edges)
  expect(result).toHaveLength(4000)
  expect(result[3999]!.x).toBeGreaterThan(result[3998]!.x)
})

test('aligns a single-parent column with that parent when another root skips the column', () => {
  const records = [
    node('accounts'),
    node('orders'),
    node('items', 180, 140),
    node('products'),
  ]
  const result = layoutDiagram(records, [
    edge('accounts', 'orders'),
    edge('orders', 'items'),
    edge('products', 'items'),
  ])
  expectSeparated(result)
  expect(result[1]!.y).toBe(result[0]!.y)
  expect(result[3]!.y).toBeGreaterThan(result[1]!.y + result[1]!.height)
  expect(result[2]!.y).toBeGreaterThan(result[1]!.y)
})
