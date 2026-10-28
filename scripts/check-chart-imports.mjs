import { vendorTransforms } from './vendor-transforms.mjs'
import assert from 'node:assert/strict'
import { build } from 'vite'
import solid from '@solidjs/vite-plugin'
import { fileURLToPath } from 'node:url'

const chartModule = (id) =>
  /\/components\/(?:src|dist(?:\/server)?)\/(?:chart|vendor\/charts)\//.test(
    id,
  ) || /\/node_modules\/(?:\.pnpm\/)?(?:d3-|@types\/d3-)/.test(id)

for (const distribution of [false, true]) {
  for (const chart of [false, true]) {
    let modules
    const entry = '\0wfe-chart-boundary'
    await build({
      configFile: false,
      root: fileURLToPath(new URL('../', import.meta.url)),
      logLevel: 'error',
      resolve: {
        conditions: [
          ...(distribution ? [] : ['wfe-source']),
          'module',
          'browser',
          'development|production',
        ],
      },
      build: {
        target: 'esnext',
        write: false,
        rollupOptions: { input: entry },
      },
      plugins: [
        vendorTransforms(),
        solid({ performanceTracks: false }),
        {
          name: 'chart-boundary-probe',
          resolveId(id) {
            if (id === entry) return entry
          },
          load(id) {
            if (id !== entry) return
            return chart
              ? `import { ChartView } from '@wfe/generator/chart'; globalThis.wfeChartProbe = ChartView;`
              : `import { FormView, LayoutView } from '@wfe/generator'; globalThis.wfeChartProbe = [FormView, LayoutView];`
          },
          generateBundle(_options, bundle) {
            modules = Object.values(bundle).flatMap((chunk) =>
              chunk.type === 'chunk' ? Object.keys(chunk.modules) : [],
            )
          },
        },
      ],
    })
    assert.ok(modules?.length, 'Probe must expose resolved module IDs')
    const generator = modules.filter((id) =>
      id.includes('/packages/generator/'),
    )
    assert.ok(
      generator.length > 0,
      'Probe must retain the requested generator entry',
    )
    const directory = distribution
      ? '/packages/generator/dist/'
      : '/packages/generator/src/'
    assert.ok(
      generator.every((id) => id.includes(directory)),
      `${distribution ? 'package' : 'source'}: resolved generator delivery`,
    )
    if (distribution)
      assert.ok(
        modules.every(
          (id) => !/\/packages\/(?:components|form|generator)\/src\//.test(id),
        ),
        'Built probes must not use workspace source',
      )
    assert.equal(
      modules.some(chartModule),
      chart,
      `${distribution ? 'package' : 'source'}: chart runtime boundary`,
    )
    assert.ok(
      modules.every((id) => !/@tanstack\/(?:charts|chart-core)/.test(id)),
      'Charts must use the owned engine',
    )
    console.log(
      `${distribution ? 'Package' : 'Source'} ${chart ? 'chart' : 'form/layout'} import graph passed (${modules.length} modules).`,
    )
  }
}
