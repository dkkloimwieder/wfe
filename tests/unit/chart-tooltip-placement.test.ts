import { describe, expect, test } from 'vitest'
import { defineChart } from '@wfe/components/chart'
import type { ChartPoint, ChartScene } from '@wfe/components/chart'
import { createChartScene } from '../../packages/components/src/vendor/charts/charts-core/src/scene'
import { resolveChartTooltipBounds } from '../../packages/components/src/vendor/charts/charts-core/src/nearest'
import { resolveChartTooltipPlacement } from '../../packages/components/src/vendor/charts/charts-core/src/tooltip-placement'
import type {
  TooltipBounds,
  TooltipSize,
} from '../../packages/components/src/vendor/charts/charts-core/src/tooltip-placement'

type SceneNode = ChartScene['nodes'][number]

const boundary = { left: 0, top: 0, right: 400, bottom: 300 }
const point = (id: string, x: number, y: number): ChartPoint => ({
  key: id,
  markId: 'series',
  group: null,
  groupLabel: id,
  datum: { id },
  datumIndex: Number(id) || 0,
  xValue: x,
  yValue: y,
  x,
  y,
  color: 'currentColor',
})
function scene(
  nodes: readonly SceneNode[],
  points: readonly ChartPoint[],
): ChartScene {
  return {
    ...createChartScene(
      defineChart({ marks: [], scales: { x: null, y: null } }),
      { width: 400, height: 300 },
    ),
    nodes,
    points,
  }
}
function safePlacement(
  avoid: TooltipBounds,
  size: TooltipSize,
  bounds = boundary,
  preferred: 'auto' | 'top' = 'auto',
) {
  const result = resolveChartTooltipPlacement(
    { x: (avoid.left + avoid.right) / 2, y: (avoid.top + avoid.bottom) / 2 },
    size,
    bounds,
    preferred,
    10,
    avoid,
  )
  expect(result).not.toBeNull()
  if (!result) throw new Error('Expected a positive free region')
  const right = result.left + Math.min(size.width, result.maxWidth)
  const bottom = result.top + Math.min(size.height, result.maxHeight)
  expect(result.left).toBeGreaterThanOrEqual(bounds.left + 8)
  expect(result.top).toBeGreaterThanOrEqual(bounds.top + 8)
  expect(right).toBeLessThanOrEqual(bounds.right - 8)
  expect(bottom).toBeLessThanOrEqual(bounds.bottom - 8)
  expect(
    right <= avoid.left - 10 ||
      result.left >= avoid.right + 10 ||
      bottom <= avoid.top - 10 ||
      result.top >= avoid.bottom + 10,
  ).toBe(true)
  return result
}

describe('chart tooltip free-region placement', () => {
  test('uses the full referenced rectangle rather than its center', () => {
    const result = safePlacement(
      { left: 180, top: 130, right: 220, bottom: 170 },
      { width: 100, height: 50 },
    )
    expect(result.placement).toBe('top')
    expect(result.top).toBe(70)
  })
  test('constrains a large card to the most useful side instead of clamping across the point', () => {
    const result = safePlacement(
      { left: 150, top: 100, right: 150, bottom: 100 },
      { width: 180, height: 140 },
      { left: 0, top: 0, right: 300, bottom: 200 },
    )
    expect(result.placement).toBe('right')
    expect(result.maxWidth).toBe(132)
    expect(result.maxHeight).toBe(184)
  })
  test('falls back from an impossible explicit side to a complete fit', () => {
    const result = safePlacement(
      { left: 180, top: 10, right: 220, bottom: 30 },
      { width: 100, height: 50 },
      boundary,
      'top',
    )
    expect(result.placement).toBe('bottom')
  })
  test.each([
    { left: 8, top: 8, right: 40, bottom: 280 },
    { left: 360, top: 8, right: 392, bottom: 280 },
    { left: 8, top: 8, right: 392, bottom: 30 },
    { left: 8, top: 270, right: 392, bottom: 292 },
    { left: 120, top: 20, right: 180, bottom: 280 },
  ])('keeps edge and tall marks unobscured: %j', (avoid) => {
    safePlacement(avoid, { width: 180, height: 160 })
  })
  test('preserves diagonal preferences when they fit and permits an explicit zero gap', () => {
    const avoid = { left: 180, top: 130, right: 220, bottom: 170 }
    const result = resolveChartTooltipPlacement(
      { x: 200, y: 150 },
      { width: 80, height: 50 },
      boundary,
      ['top-right'],
      0,
      avoid,
    )
    expect(result).toMatchObject({ placement: 'top-right', left: 220, top: 80 })
  })
  test('returns null when no positive free side remains or dimensions are invalid', () => {
    const size = { width: 100, height: 50 }
    for (const avoid of [boundary, { ...boundary, left: NaN }])
      expect(
        resolveChartTooltipPlacement(
          { x: 200, y: 150 },
          size,
          boundary,
          'auto',
          10,
          avoid,
        ),
      ).toBeNull()
    expect(
      resolveChartTooltipPlacement(
        { x: 200, y: 150 },
        { width: -1, height: 50 },
        boundary,
        'auto',
        10,
        { left: 190, top: 140, right: 210, bottom: 160 },
      ),
    ).toBeNull()
  })
  test('legacy point-only callers retain their original placement', () => {
    expect(
      resolveChartTooltipPlacement(
        { x: 200, y: 150 },
        { width: 100, height: 50 },
        boundary,
        'auto',
        10,
      ),
    ).toMatchObject({ left: 150, top: 90, placement: 'top' })
  })
})

describe('chart tooltip referenced geometry', () => {
  test('protects complete rect/dot bounds across the selected group', () => {
    const a = point('1', 120, 80)
    const b = point('2', 240, 100)
    const value = scene(
      [
        {
          kind: 'rect',
          key: 'bar',
          x: 100,
          y: 60,
          width: 40,
          height: 160,
          interaction: { point: a },
        },
        {
          kind: 'dot',
          key: 'dot',
          x: 240,
          y: 100,
          radius: 12,
          interaction: { point: b },
        },
      ],
      [a, b],
    )
    expect(resolveChartTooltipBounds(value, [a, b], { x: 120, y: 80 })).toEqual(
      { left: 100, top: 60, right: 252, bottom: 220 },
    )
  })
  test('reuses translated and clipped geometry and semantic point identity', () => {
    const a = point('1', 120, 80)
    const value = scene(
      [
        {
          kind: 'group',
          key: 'translated',
          translateX: 100,
          translateY: 50,
          clip: { x: 10, y: 10, width: 25, height: 70 },
          children: [
            {
              kind: 'rect',
              key: 'bar',
              x: 0,
              y: 0,
              width: 50,
              height: 150,
              interaction: { point: a },
            },
          ],
        },
      ],
      [a],
    )
    expect(
      resolveChartTooltipBounds(value, [{ ...a }], { x: 120, y: 80 }),
    ).toEqual({ left: 110, top: 60, right: 135, bottom: 130 })
  })
  test('spanning line and area targets protect selected observations locally', () => {
    const a = point('1', 20, 20)
    const b = point('2', 200, 100)
    const c = point('3', 380, 250)
    for (const kind of ['polyline', 'area'] as const) {
      const value = scene(
        [
          {
            kind,
            key: kind,
            points: [
              [20, 20],
              [200, 100],
              [380, 250],
            ],
            interaction: { points: [a, b, c] },
          },
        ],
        [a, b, c],
      )
      expect(resolveChartTooltipBounds(value, [b], { x: 200, y: 100 })).toEqual(
        { left: 196, top: 96, right: 204, bottom: 104 },
      )
    }
  })
  test('one-observation polar area uses its complete polygon extent', () => {
    const a = point('1', 180, 120)
    const value = scene(
      [
        {
          kind: 'area',
          key: 'slice',
          points: [
            [100, 100],
            [220, 80],
            [240, 180],
          ],
          interaction: { point: a },
        },
      ],
      [a],
    )
    expect(resolveChartTooltipBounds(value, [a], { x: 180, y: 120 })).toEqual({
      left: 100,
      top: 80,
      right: 240,
      bottom: 180,
    })
  })
  test('uses the supplied anchor when no focused geometry exists', () => {
    expect(
      resolveChartTooltipBounds(scene([], []), [], { x: 35, y: 60 }),
    ).toEqual({ left: 35, top: 60, right: 35, bottom: 60 })
  })
})
