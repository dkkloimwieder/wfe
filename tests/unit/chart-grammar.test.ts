import { describe, expect, it } from 'vitest'
import {
  defineChart,
  lineY,
  areaY,
  rect,
  cell,
  ruleX,
  ruleY,
  text,
  decorative,
  scaleLinear,
  scaleBand,
  groupBy,
  binX,
  binY,
  stackRowsX,
  stackRowsY,
  rollingWindow,
  normalize,
  select,
  polar,
  pie,
  radialArc,
  radialArea,
  radialLine,
  radialDot,
  radialText,
  radialRule,
  radialBarRadius,
  radialBarAngle,
  radialGrid,
  angleGrid,
  curveLinearClosed,
} from '@wfe/components/chart'
import type { ChartScene } from '@wfe/components/chart'
import { createChartScene } from '../../packages/components/src/vendor/charts/charts-core/src/scene'

type Node = ChartScene['nodes'][number]
const flatten = (nodes: readonly Node[]): Node[] =>
  nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
const rows = [
  { id: 'a', period: 'Mon', service: 'API', x: 0, value: 2, low: 1, high: 3 },
  { id: 'b', period: 'Mon', service: 'Jobs', x: 1, value: 4, low: 2, high: 5 },
  { id: 'c', period: 'Tue', service: 'API', x: 2, value: 6, low: 4, high: 8 },
]

describe('released chart grammar', () => {
  it('layers unrelated data and annotations without adding decorative focus targets', () => {
    const definition = defineChart({
      marks: [
        decorative(areaY(rows, { id: 'band', x: 'x', y1: 'low', y2: 'high' })),
        lineY(rows, { id: 'actual', key: 'id', x: 'x', y: 'value' }),
        ruleY([5], { id: 'target' }),
        ruleX([1], { id: 'milestone' }),
        decorative(
          text(select(rows, { value: 'value', select: 'max' }), {
            id: 'label',
            x: 'x',
            y: 'value',
            text: (row) => row.id,
          }),
        ),
      ],
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
    })
    const scene = createChartScene(definition, { width: 500, height: 300 })
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
    scene.points.forEach((point, index) =>
      expect(point.datum).toBe(rows[index]),
    )
    const nodes = flatten(scene.nodes)
    expect(
      nodes.some((node) => node.kind === 'label' && node.text === 'c'),
    ).toBe(true)
    expect(nodes.some((node) => node.kind === 'area')).toBe(true)
    expect(scene.points.every((point) => point.markId === 'actual')).toBe(true)
  })

  it('renders interval rectangles and categorical cells with original records', () => {
    const interval = [{ id: 'window', start: 1, end: 3, low: 2, high: 5 }]
    const scene = createChartScene(
      defineChart({
        marks: [
          rect(interval, {
            id: 'interval',
            key: 'id',
            x1: 'start',
            x2: 'end',
            y1: 'low',
            y2: 'high',
          }),
        ],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      }),
      { width: 400, height: 250 },
    )
    expect(scene.points[0]?.datum).toBe(interval[0])
    expect(
      flatten(scene.nodes).some(
        (node) => node.kind === 'rect' && node.width > 0 && node.height > 0,
      ),
    ).toBe(true)
    const heatmap = createChartScene(
      defineChart({
        marks: [
          cell(rows, {
            key: 'id',
            x: 'period',
            y: 'service',
            color: 'service',
          }),
        ],
        scales: { x: { scale: scaleBand }, y: { scale: scaleBand } },
      }),
      { width: 400, height: 250 },
    )
    expect(heatmap.points.map((point) => point.datum)).toEqual(rows)
  })

  it('groups and reduces explicit records while retaining their source identity', () => {
    const grouped = groupBy(rows, {
      by: 'period',
      outputs: {
        total: { value: 'value', reduce: 'sum' },
        count: { reduce: 'count' },
      },
    })
    expect(grouped.map((row) => [row.period, row.total, row.count])).toEqual([
      ['Mon', 6, 2],
      ['Tue', 6, 1],
    ])
    expect(grouped[0]?.source[0]).toBe(rows[0])
    expect(grouped[0]?.sourceIndexes).toEqual([0, 1])
    expect(
      groupBy([], { by: 'period', outputs: { count: { reduce: 'count' } } }),
    ).toEqual([])
    expect(() =>
      groupBy(rows, { by: 'period', outputs: { source: { reduce: 'count' } } }),
    ).toThrow(/reserved|output/i)
  })

  it('bins values with inclusive final endpoints, omissions and source lineage', () => {
    const data = [
      { id: 'a', value: 1 },
      { id: 'b', value: 4 },
      { id: 'c', value: 5 },
      { id: 'd', value: 10 },
      { id: 'missing', value: null },
    ]
    const bins = binX(data, {
      value: 'value',
      domain: [0, 10],
      thresholds: [0, 5, 10],
    })
    expect(bins.map((row) => [row.x1, row.x2, row.value])).toEqual([
      [0, 5, 2],
      [5, 10, 2],
    ])
    expect(bins[1]?.source).toEqual(data.slice(2, 4))
    expect(bins[1]?.source[1]).toBe(data[3])
    expect(
      binY(data, {
        value: 'value',
        domain: [0, 10],
        thresholds: [0, 5, 10],
      }).map((row) => [row.y1, row.y2, row.value]),
    ).toEqual([
      [0, 5, 2],
      [5, 10, 2],
    ])
    expect(rows.map((row) => row.value)).toEqual([2, 4, 6])
  })

  it('stacks positive and negative rows in either orientation without changing input', () => {
    const data = [
      { id: 'positive', category: 'A', value: 4 },
      { id: 'negative', category: 'A', value: -2 },
    ]
    const y = stackRowsY(data, { x: 'category', y: 'value', z: 'id' })
    expect(y[0]?.source[0]).toBe(data[0])
    expect(
      y.map((row) => [Math.min(row.y1, row.y2), Math.max(row.y1, row.y2)]),
    ).toEqual([
      [0, 4],
      [-2, 0],
    ])
    const x = stackRowsX(data, { x: 'value', y: 'category', z: 'id' })
    expect(
      x.map((row) => [Math.min(row.x1, row.x2), Math.max(row.x1, row.x2)]),
    ).toEqual([
      [0, 4],
      [-2, 0],
    ])
    expect(data).toEqual([
      { id: 'positive', category: 'A', value: 4 },
      { id: 'negative', category: 'A', value: -2 },
    ])
  })

  it('normalizes and rolls explicit data with source lineage and guarded outputs', () => {
    const normalized = normalize(rows, {
      value: 'value',
      basis: 'sum',
      as: 'fraction',
    })
    expect(
      normalized.reduce((total, row) => total + row.fraction, 0),
    ).toBeCloseTo(1)
    expect(normalized[0]?.source[0]).toBe(rows[0])
    const windows = rollingWindow(rows, {
      size: 2,
      partial: false,
      orderBy: 'x',
      outputs: { mean: { value: 'value', reduce: 'mean' } },
    })
    expect(windows.map((row) => row.mean)).toEqual([3, 5])
    expect(windows[1]?.source).toEqual(rows.slice(1))
    expect(windows[1]?.source[0]).toBe(rows[1])
    expect(
      select(rows, { by: 'period', value: 'value', select: 'max' }),
    ).toEqual([rows[1], rows[2]])
    expect(select(rows, { value: 'value', select: 'max' })[0]).toBe(rows[2])
    expect(() => rollingWindow(rows, { size: 0, outputs: {} })).toThrow(/size/)
    expect(() => normalize(rows, { value: 'value', as: 'source' })).toThrow(
      /reserved/,
    )
    expect(normalize([{ value: 0 }], { value: 'value' })[0]?.normalized).toBe(0)
  })

  it('allocates pie angles with original source references and rejects invalid values', () => {
    const slices = pie(rows, { value: 'value' })
    expect(slices.reduce((sum, row) => sum + row.fraction, 0)).toBeCloseTo(1)
    expect(slices[0]?.startAngle).toBe(0)
    expect(slices.at(-1)?.endAngle).toBeCloseTo(Math.PI * 2)
    expect(slices[0]?.source[0]).toBe(rows[0])
    expect(pie([{ value: 0 }], { value: 'value' })[0]?.fraction).toBe(0)
    expect(() => pie([{ value: -1 }], { value: 'value' })).toThrow(
      /nonnegative/,
    )
    expect(() => pie(rows, { value: 'value', endAngle: Math.PI * 3 })).toThrow(
      /sweep/,
    )
  })

  it('keeps donut focus geometry responsive and source-linked', () => {
    const slices = pie(rows, { value: 'value' })
    const definition = defineChart({
      marks: [
        polar({
          id: 'pie',
          scales: { angle: null, radius: null },
          marks: [
            radialArc(slices, {
              id: 'slices',
              key: 'id',
              z: 'period',
              innerRadius: ({ radius }) => radius * 0.5,
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })
    for (const size of [
      { width: 400, height: 300 },
      { width: 180, height: 180 },
    ]) {
      const scene = createChartScene(definition, size)
      expect(scene.points).toHaveLength(3)
      expect(scene.points[0]?.datum).toBe(slices[0])
      for (const point of scene.points) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
        expect(point.x).toBeGreaterThan(0)
        expect(point.x).toBeLessThan(size.width)
        expect(point.y).toBeGreaterThan(0)
        expect(point.y).toBeLessThan(size.height)
      }
    }
  })

  it('composes radar guides, paths, labels and both radial bar geometries', () => {
    const metrics = [
      { id: 'latency', value: 60 },
      { id: 'capacity', value: 80 },
      { id: 'availability', value: 95 },
    ]
    const radar = defineChart({
      marks: [
        polar({
          id: 'radar',
          inset: 20,
          scales: {
            angle: { scale: scaleBand },
            radius: { scale: () => scaleLinear().domain([0, 100]) },
          },
          guides: [
            radialGrid({ values: [50, 100], shape: 'polygon' }),
            angleGrid(),
          ],
          marks: [
            radialArea(metrics, {
              angle: 'id',
              radius: 'value',
              curve: curveLinearClosed,
            }),
            radialLine(metrics, {
              angle: 'id',
              radius: 'value',
              curve: curveLinearClosed,
            }),
            radialDot(metrics, { angle: 'id', radius: 'value' }),
            radialText(metrics, { angle: 'id', radius: () => 100, text: 'id' }),
            radialRule(metrics, { angle: 'id', radius1: 0, radius2: 100 }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })
    const scene = createChartScene(radar, { width: 400, height: 300 })
    expect(
      scene.points.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
    ).toBe(true)
    expect(
      flatten(scene.nodes).some(
        (node) => node.kind === 'polyline' && node.path?.endsWith('Z'),
      ),
    ).toBe(true)
    const radius = defineChart({
      marks: [
        polar({
          scales: {
            angle: { scale: scaleBand },
            radius: { scale: () => scaleLinear().domain([0, 100]) },
          },
          marks: [radialBarRadius(metrics, { angle: 'id', radius: 'value' })],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })
    expect(
      createChartScene(radius, { width: 400, height: 300 }).points,
    ).toHaveLength(3)
    const angle = defineChart({
      marks: [
        polar({
          scales: {
            angle: { scale: () => scaleLinear().domain([0, 100]) },
            radius: { scale: scaleBand },
          },
          marks: [radialBarAngle(metrics, { angle: 'value', radius: 'id' })],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })
    expect(
      createChartScene(angle, { width: 400, height: 300 }).points,
    ).toHaveLength(3)
  })
})
