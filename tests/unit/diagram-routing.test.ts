import { expect, test } from 'vitest'
import {
  createRouter,
  routeClearance,
} from '../../packages/components/src/diagram/routing'
import type {
  Point,
  Rectangle,
} from '../../packages/components/src/diagram/routing'
import { diagramGraph } from '../../packages/components/src/diagram/geometry'
import type { DiagramNode } from '@wfe/components/diagram'

const source = { x: 40, y: 15, side: 'right' } as const
const target = { x: 200, y: 25, side: 'left' } as const
const boxes = [
  { left: 0, right: 40, top: 0, bottom: 40 },
  { left: 80, right: 160, top: -25, bottom: 60 },
  { left: 200, right: 240, top: 0, bottom: 40 },
]

function enters(a: Point, b: Point, box: Rectangle) {
  expect(a.x === b.x || a.y === b.y).toBe(true)
  return (
    Math.min(a.x, b.x) < box.right &&
    Math.max(a.x, b.x) > box.left &&
    Math.min(a.y, b.y) < box.bottom &&
    Math.max(a.y, b.y) > box.top
  )
}

test('detours around the padded obstacle, keeps port approaches, and separates parallel routes deterministically', () => {
  const build = () => {
    const router = createRouter(boxes, [source, target])
    return Array.from({ length: 2 }, () => {
      const route = router.route(source, target, 0, 2)!
      router.reserve(route)
      return route
    })
  }
  const routes = build()
  expect(build()).toEqual(routes)
  expect(routes[1]).not.toEqual(routes[0])
  const box = boxes[1]!
  const obstacle = {
    left: box.left - routeClearance,
    right: box.right + routeClearance,
    top: box.top - routeClearance,
    bottom: box.bottom + routeClearance,
  }
  for (const route of routes) {
    expect(route[0]).toEqual(source)
    expect(route[1]?.y).toBe(source.y)
    expect(route[1]!.x).toBeGreaterThan(source.x)
    expect(route.at(-1)).toEqual(target)
    expect(route.at(-2)?.y).toBe(target.y)
    expect(route.at(-2)!.x).toBeLessThan(target.x)
    for (let i = 1; i < route.length; i++)
      expect(enters(route[i - 1]!, route[i]!, obstacle)).toBe(false)
  }
})

test('keeps the field endpoint and named source arm in both directions and every line style', () => {
  const nodes: DiagramNode[] = boxes.map((box, i) => ({
    id: String(i),
    label: String(i),
    x: box.left,
    y: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
    ports: [
      { id: 'arm', side: 'right', offset: 15, label: 'Retry' },
      { id: 'field', side: 'left', offset: 25, label: 'Order ID' },
    ],
    data: null,
  }))
  const styles = ['step', 'straight', 'bezier'] as const
  const edges = styles.flatMap((type) =>
    [
      [0, 2],
      [2, 0],
    ].map(([from, to]) => ({
      id: `${type}-${from}`,
      label: 'Inspect',
      source: { node: String(from), port: 'arm' },
      target: { node: String(to), port: 'field' },
      type,
      data: null,
    })),
  )
  const { paths } = diagramGraph(nodes, edges, 30)
  expect(paths.map(({ path }) => path)).toEqual(
    diagramGraph(nodes, edges, 30).paths.map(({ path }) => path),
  )
  for (const [i, row] of paths.entries()) {
    expect(row.path).toMatch(i % 2 ? /^M240,15L/ : /^M40,15L/)
    expect(row.path).toMatch(i % 2 ? /L0,25$/ : /L200,25$/)
    expect(row.description).toContain('/ Retry → ')
    expect(row.description).toContain('/ Order ID: Inspect')
  }
})
