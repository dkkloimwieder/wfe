import type { ChartValue } from '@wfe/components/chart'
import type { FinancialPoint } from '../../examples/shared/charts/financial-data'
import { describe, expect, it } from 'vitest'
import {
  financialDefinition,
  financialPanels,
  comparisons,
  marketSessions,
} from '../../examples/shared/charts/financial-data'
import { FinancialCharts } from '../../examples/shared/charts/Financial'
import { createChartScene } from '../../packages/components/src/vendor/charts/charts-core/src/scene'

describe('financial and comparison recipes', () => {
  it('exports the shared gallery fixture', () => {
    expect(FinancialCharts).toBeTypeOf('function')
  })
  for (const panel of financialPanels)
    it(`${panel.id} preserves original records and stable semantic keys`, () => {
      const scene = createChartScene<FinancialPoint, ChartValue, ChartValue>(
        financialDefinition(panel.id),
        { width: 640, height: 300 },
      )
      expect(scene.points.length).toBeGreaterThan(0)
      const original = scene.points.map((point) => point.key).sort()
      const reversed = createChartScene<FinancialPoint, ChartValue, ChartValue>(
        financialDefinition(panel.id, 1, false, true),
        { width: 640, height: 300 },
      )
      expect(reversed.points.map((point) => point.key).sort()).toEqual(original)
      for (const point of scene.points) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
        expect([...marketSessions, ...comparisons]).toContain(
          (point.datum as { source: unknown }).source,
        )
        expect((point.datum as { details: string }).details).toMatch(/USD|\$|%/)
      }
      expect(
        createChartScene<FinancialPoint, ChartValue, ChartValue>(
          financialDefinition(panel.id, 0, true),
          { width: 320, height: 300 },
        ).points,
      ).toHaveLength(0)
    })
  it('uses the same coordinate limits in all small multiples', () => {
    const scenes = comparisons.map((region) =>
      createChartScene<FinancialPoint, ChartValue, ChartValue>(
        financialDefinition(`multiple-${region.id}`),
        { width: 640, height: 300 },
      ),
    )
    expect(scenes.map((scene) => scene.points.map((point) => point.x))).toEqual(
      scenes.map(() => scenes[0]!.points.map((point) => point.x)),
    )
    for (const scene of scenes) {
      expect(scene.points).toHaveLength(2)
      expect(scene.scales.y!.domain).toEqual([50, 100])
      expect(scene.scales.y!.map(75)).toBe(scenes[0]!.scales.y!.map(75))
    }
  })
  it('resolves configured price and comparison domains instead of inferring each panel', () => {
    for (const id of ['candlestick', 'ohlc']) {
      const scene = createChartScene<FinancialPoint, ChartValue, ChartValue>(
        financialDefinition(id),
        { width: 640, height: 300 },
      )
      expect(scene.scales.y!.domain).toEqual([98, 114])
      expect(scene.scales.x!.domain).toEqual([0.5, 5.5])
    }
    const dumbbell = createChartScene<FinancialPoint, ChartValue, ChartValue>(
      financialDefinition('dumbbell'),
      { width: 640, height: 300 },
    )
    expect(dumbbell.scales.x!.domain).toEqual([50, 100])
    expect(dumbbell.scales.y!.domain).toEqual(comparisons.map((row) => row.id))
    expect(
      dumbbell.points.filter((point) => point.markId === 'comparison-before'),
    ).toHaveLength(4)
    expect(
      dumbbell.points.filter((point) => point.markId === 'comparison-after'),
    ).toHaveLength(4)
  })
  it('keeps all OHLC price extrema and the unchanged session in source details', () => {
    for (const row of marketSessions) {
      expect(row.low).toBeLessThanOrEqual(Math.min(row.open, row.close))
      expect(row.high).toBeGreaterThanOrEqual(Math.max(row.open, row.close))
    }
    expect(marketSessions.some((row) => row.open === row.close)).toBe(true)
  })
  it('keeps repeated refreshes inside the plot with realistic completion rates', () => {
    for (const panel of financialPanels) {
      const initial = createChartScene<FinancialPoint, ChartValue, ChartValue>(
        financialDefinition(panel.id),
        { width: 640, height: 300 },
      )
      for (const revision of [1, 4, 5, 9, 10, 25, 99, 1000]) {
        const scene = createChartScene<FinancialPoint, ChartValue, ChartValue>(
          financialDefinition(panel.id, revision),
          { width: 640, height: 300 },
        )
        expect(scene.points).toHaveLength(initial.points.length)
        for (const point of scene.points) {
          expect(point.x).toBeGreaterThanOrEqual(scene.chart.x)
          expect(point.x).toBeLessThanOrEqual(scene.chart.x + scene.chart.width)
          expect(point.y).toBeGreaterThanOrEqual(scene.chart.y)
          expect(point.y).toBeLessThanOrEqual(
            scene.chart.y + scene.chart.height,
          )
          if (
            panel.id !== 'candlestick' &&
            panel.id !== 'ohlc' &&
            panel.id !== 'bubble'
          ) {
            const completion =
              panel.id === 'dumbbell' ? point.xValue : point.yValue
            expect(completion).toBeGreaterThanOrEqual(0)
            expect(completion).toBeLessThanOrEqual(100)
          }
        }
      }
    }
  })
})
