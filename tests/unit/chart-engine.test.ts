import { describe, expect, it } from 'vitest'
import {
  defineChart,
  lineY,
  barY,
  dot,
  areaY,
  scaleLinear,
  scaleBand,
} from '@wfe/components/chart'
import { createChartScene } from '../../packages/components/src/vendor/charts/charts-core/src/scene'
import { renderChartSvg } from '../../packages/components/src/vendor/charts/charts-core/src/svg'

const size = { width: 480, height: 260 }

describe('owned chart engine', () => {
  it('preserves supplied data and escapes accessible names and series text', () => {
    const rows = [
      { id: 'a', x: 0, y: -2 },
      { id: 'b', x: 1, y: 0 },
      { id: 'c', x: 2, y: 4 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      }),
      size,
    )
    expect(scene.points.map((p) => p.datum)).toEqual(rows)
    expect(scene.points.map((p) => p.yValue)).toEqual([-2, 0, 4])
    const svg = renderChartSvg(scene, { ariaLabel: '<Requests "today">' })
    expect(svg).toContain('&lt;Requests &quot;today&quot;&gt;')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('Infinity')
  })

  it('renders area, bar and scatter through the same scene and SVG engine', () => {
    for (const mark of [areaY([1, 0, -2]), dot([1, 0, -2])]) {
      const scene = createChartScene(
        defineChart({
          marks: [mark],
          scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
        }),
        size,
      )
      expect(scene.points).toHaveLength(3)
      expect(renderChartSvg(scene, { ariaLabel: 'Values' })).not.toContain(
        'NaN',
      )
    }
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(
            [
              { name: 'A', value: 0 },
              { name: 'B', value: -3 },
            ],
            { x: 'name', y: 'value' },
          ),
        ],
        scales: { x: { scale: scaleBand }, y: { scale: scaleLinear } },
      }),
      size,
    )
    expect(scene.points.map((p) => p.yValue)).toEqual([0, -3])
    expect(renderChartSvg(scene, { ariaLabel: 'Bars' })).toContain('<rect')
  })

  it('keeps missing line values as gaps and permits empty results', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, null, 3])],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      }),
      size,
    )
    expect(scene.points.map((p) => p.yValue)).toEqual([1, 3])
    const empty = createChartScene(
      defineChart({
        marks: [lineY([])],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      }),
      size,
    )
    expect(empty.points).toHaveLength(0)
    expect(renderChartSvg(empty, { ariaLabel: 'Empty' })).toContain('<svg')
  })
})
