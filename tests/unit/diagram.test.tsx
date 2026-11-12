import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Diagram } from '@wfe/components/diagram'
import type { DiagramNode, DiagramSelection } from '@wfe/components/diagram'
import {
  diagramGraph,
  fitDiagram,
  zoomDiagram,
} from '../../packages/components/src/diagram/geometry'
const nodes: readonly DiagramNode[] = Object.freeze([
  Object.freeze({
    id: 'a',
    label: 'A',
    x: -100,
    y: 20,
    width: 200,
    height: 100,
    data: 'a',
    ports: [
      { id: 'field', label: 'Account ID', side: 'right' as const, offset: 70 },
    ],
  }),
  Object.freeze({
    id: 'b',
    label: 'B',
    x: 400,
    y: 100,
    width: 200,
    height: 100,
    data: 'b',
  }),
])
const edges = [
  {
    id: 'ab',
    label: 'owns',
    source: { node: 'a', port: 'field' },
    target: { node: 'b' },
    data: 'ab',
  },
]
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
test('routes named endpoints with their source labels and rejects corrupt references', () => {
  const graph = diagramGraph(nodes, edges)
  expect(graph.paths[0]?.path).toMatch(/^M100,90/)
  expect(graph.paths[0]?.description).toBe('A / Account ID → B: owns')
  expect(graph.bounds).toEqual({ x: -100, y: 20, width: 700, height: 180 })
  expect(() =>
    diagramGraph(nodes, [{ ...edges[0]!, target: { node: 'missing' } }]),
  ).toThrow('missing node')
  expect(() =>
    diagramGraph(nodes, [
      { ...edges[0]!, target: { node: 'b', port: 'missing' } },
    ]),
  ).toThrow('missing port')
  expect(() => diagramGraph([...nodes, nodes[0]!], [])).toThrow('unique')
  expect(() => diagramGraph([{ ...nodes[0]!, width: NaN }], [])).toThrow(
    'finite',
  )
  expect(() =>
    diagramGraph(
      [
        {
          ...nodes[0]!,
          ports: [{ id: 'x', label: 'X', side: 'left', offset: 101 }],
        },
      ],
      [],
    ),
  ).toThrow('boundary')
})
test('fits negative coordinates and preserves the zoom anchor', () => {
  const bounds = diagramGraph(nodes, edges).bounds
  const view = fitDiagram(bounds, 320, 400)
  expect(bounds.x * view.zoom + view.x).toBeGreaterThanOrEqual(0)
  expect((bounds.x + bounds.width) * view.zoom + view.x).toBeLessThanOrEqual(
    320,
  )
  const next = zoomDiagram(view, 2, 120, 80)
  expect((120 - next.x) / next.zoom).toBeCloseTo((120 - view.x) / view.zoom)
  expect((80 - next.y) / next.zoom).toBeCloseTo((80 - view.y) / view.zoom)
})
test('selection waits for application acceptance, nodes survive updates, navigation never edits source records, observers dispose', () => {
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {
        disconnect()
      }
    },
  )
  const [selection, setSelection] = createSignal<DiagramSelection | null>(null)
  const [records, setRecords] = createSignal(nodes)
  const request = vi.fn()
  const h = render(() => (
    <Diagram
      label="Relationships"
      nodes={records()}
      edges={edges}
      selection={selection()}
      onSelectionChange={request}
    />
  ))
  flush()
  const node = h.container.querySelector('[data-diagram-node="a"]')!
  const button = h.getByRole('button', { name: 'Inspect A' })
  fireEvent.click(button)
  flush()
  expect(request).toHaveBeenCalledWith({ kind: 'node', id: 'a' })
  expect(button.getAttribute('aria-pressed')).toBe('false')
  setSelection({ kind: 'node', id: 'a' })
  flush()
  expect(button.getAttribute('aria-pressed')).toBe('true')
  fireEvent.keyDown(button, { key: 'Delete' })
  fireEvent.keyDown(button, { key: 'ArrowRight' })
  flush()
  expect(nodes[0]?.x).toBe(-100)
  const world = h.container.querySelector<HTMLElement>('.ui-diagram-world')!
  const before = world.style.transform
  fireEvent.click(h.getByRole('button', { name: 'Zoom in' }))
  flush()
  expect(world.style.transform).not.toBe(before)
  setRecords(nodes.map((n) => ({ ...n, label: `${n.label} updated` })))
  flush()
  expect(h.container.querySelector('[data-diagram-node="a"]')).toBe(node)
  h.unmount()
  flush()
  expect(disconnect).toHaveBeenCalledTimes(3)
})

test('custom node content keeps its owner and receives updated records', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  const [records, setRecords] = createSignal(nodes)
  let creations = 0
  const renderer = (
    context: import('@wfe/components/diagram').DiagramNodeContext,
  ) => {
    creations++
    return <span data-node-body>{context.node.data as string}</span>
  }
  const h = render(() => (
    <Diagram
      label="Custom"
      nodes={records()}
      edges={edges}
      renderNode={renderer}
    />
  ))
  flush()
  const body = h.container.querySelector('[data-node-body]')!
  setRecords(nodes.map((node) => ({ ...node, data: 'Changed' })))
  flush()
  expect(h.container.querySelector('[data-node-body]')).toBe(body)
  expect(body.textContent).toBe('Changed')
  expect(creations).toBe(2)
})

test('content measurement updates endpoints without changing source dimensions and hidden labels retain relationships', () => {
  const callbacks = new Map<Element, () => void>()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: () => void
      constructor(callback: () => void) {
        this.callback = callback
      }
      observe(element: Element) {
        callbacks.set(element, this.callback)
      }
      disconnect() {}
    },
  )
  const records = nodes.map((node) => ({
    ...node,
    ports: undefined,
    fitContent: true,
  }))
  const [labels, setLabels] = createSignal(true)
  const h = render(() => (
    <Diagram
      label="Measured"
      nodes={records}
      edges={[{ ...edges[0]!, source: { node: 'a' } }]}
      showEdgeLabels={labels()}
    />
  ))
  flush()
  const node = h.container.querySelector<HTMLElement>(
    '[data-diagram-node="a"]',
  )!
  const path = h.container.querySelector('.ui-diagram-edge-line')!
  Object.defineProperty(node, 'offsetHeight', {
    configurable: true,
    value: 240,
  })
  callbacks.get(node)!()
  flush()
  expect(path.getAttribute('d')).toMatch(/^M100,140/)
  Object.defineProperty(node, 'offsetHeight', { configurable: true, value: 80 })
  callbacks.get(node)!()
  flush()
  expect(path.getAttribute('d')).toMatch(/^M100,60/)
  expect(records[0]!.height).toBe(100)
  expect(h.container.querySelector('.ui-diagram-edge-label')).not.toBeNull()
  setLabels(false)
  flush()
  expect(h.container.querySelector('.ui-diagram-edge-label')).toBeNull()
  expect(
    h.container.querySelector('.ui-diagram-edge-label-background'),
  ).toBeNull()
  expect(
    h.container
      .querySelector('[data-diagram-edge]')
      ?.getAttribute('aria-label'),
  ).toBe('A → B: owns')
})

test('elbow corner routing preserves named branch endpoints', () => {
  const records = [
    {
      ...nodes[0]!,
      ports: [
        {
          id: 'yes',
          label: 'Eligible',
          side: 'right' as const,
          offset: 40,
          showLabel: true,
        },
        {
          id: 'no',
          label: 'More evidence',
          side: 'right' as const,
          offset: 80,
          showLabel: true,
        },
      ],
    },
    nodes[1]!,
  ]
  const branches = ['yes', 'no'].map((port) => ({
    ...edges[0]!,
    id: port,
    type: 'step' as const,
    source: { node: 'a', port },
  }))
  const square = diagramGraph(records, branches)
  const rounded = diagramGraph(records, branches, 18)
  expect(rounded.paths[0]!.path).not.toBe(square.paths[0]!.path)
  for (let i = 0; i < branches.length; i++) {
    expect(rounded.paths[i]!.path.split('L')[0]).toBe(
      square.paths[i]!.path.split('L')[0],
    )
    expect(rounded.paths[i]!.description).toBe(square.paths[i]!.description)
  }
  expect(rounded.paths[0]!.path.split('L')[0]).not.toBe(
    rounded.paths[1]!.path.split('L')[0],
  )
})

test('accepted edge selection retains one accessible focus target through updates and deselection', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  const [selection, setSelection] = createSignal<DiagramSelection | null>(null)
  const [relationships, setRelationships] = createSignal(edges)
  const request = vi.fn()
  const h = render(() => (
    <Diagram
      label="Edge inspection"
      nodes={nodes}
      edges={relationships()}
      selection={selection()}
      onSelectionChange={request}
    />
  ))
  flush()
  const edge = h.container.querySelector('[data-diagram-edge="ab"]')!
  fireEvent.keyDown(edge, { key: 'Enter' })
  flush()
  expect(request).toHaveBeenCalledWith({ kind: 'edge', id: 'ab' })
  expect(edge.getAttribute('aria-pressed')).toBe('false')
  setSelection({ kind: 'edge', id: 'ab' })
  flush()
  expect(edge.getAttribute('aria-pressed')).toBe('true')
  setRelationships(
    edges.map((row) => ({ ...row, label: 'Updated relationship' })),
  )
  flush()
  expect(h.container.querySelector('[data-diagram-edge="ab"]')).toBe(edge)
  expect(
    h.container.querySelectorAll('[data-diagram-edge="ab"][role="button"]'),
  ).toHaveLength(1)
  expect(edge.getAttribute('aria-label')).toContain('Updated relationship')
  setSelection(null)
  flush()
  expect(h.container.querySelector('[data-diagram-edge="ab"]')).toBe(edge)
  expect(edge.getAttribute('aria-pressed')).toBe('false')
  setRelationships([])
  flush()
  expect(edge.isConnected).toBe(false)
})
