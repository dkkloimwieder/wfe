import { expect, test } from 'vitest'
import { defineChart, lineY, scaleLinear } from '@wfe/components/chart'
import { createChartRendererAdapter } from '../../packages/components/src/vendor/charts/charts-core/src/adapter-renderer'
import { createSvgChartRenderer } from '../../packages/components/src/vendor/charts/charts-core/src/svg-surface'

const spec = () =>
  defineChart({
    marks: [lineY([1, 3, 2])],
    scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
  })
test('runtime defaults preserve authored static themes after destruction and recreation', () => {
  const adapter = createChartRendererAdapter(
    {
      definition: {
        ...spec(),
        theme: { foreground: 'red', palette: ['orange'] },
      },
      renderer: createSvgChartRenderer(),
      ariaLabel: 'Values',
    },
    {
      defaultTheme: {
        foreground: 'blue',
        background: 'black',
        palette: ['purple'],
      },
    },
  )
  for (let pass = 0; pass < 2; pass++) {
    const svg = adapter.prerender()
    expect(svg).toContain('red')
    expect(svg).toContain('orange')
    expect(svg).not.toContain('purple')
    adapter.destroy()
  }
})
test('responsive builders receive runtime defaults while their authored themes retain precedence', () => {
  let builderDefault = ''
  const adapter = createChartRendererAdapter(
    {
      definition: {
        chart(context) {
          builderDefault = context.defaultTheme.foreground
          return {
            ...spec(),
            theme: { foreground: 'red', palette: ['orange'] },
          }
        },
      },
      renderer: createSvgChartRenderer(),
      ariaLabel: 'Values',
    },
    { defaultTheme: { foreground: 'blue', palette: ['purple'] } },
  )
  const svg = adapter.prerender()
  expect(builderDefault).toBe('blue')
  expect(svg).toContain('orange')
  expect(svg).toContain('red')
  expect(svg).not.toContain('purple')
  adapter.destroy()
})
