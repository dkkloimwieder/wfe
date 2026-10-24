import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  writeFile,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  qualificationStages,
  selectsQualification,
} from '../../scripts/qualify.mjs'

test('qualification selects shared toolchain and package changes', () => {
  for (const path of [
    'packages/components/src/table/engine/index.ts',
    'packages/components/src/internal/controls/select.ts',
    'packages/components/src/table/Table.tsx',
    'patches/solid-primitives-scroll-3.0.0-next.4.patch',
    'packages/components/src/index.ts',
    'examples/virtualization/NativeApp.tsx',
    'scripts/check-engine-imports.mjs',
    'pnpm-lock.yaml',
    '.github/workflows/pr.yml',
  ]) {
    assert.equal(selectsQualification([path]), true, path)
  }
  assert.equal(selectsQualification(['docs/guide/intro.md', 'README.md']), true)
})

test('qualification covers both browser inputs and keeps heap work separate', () => {
  const stages = qualificationStages('/tmp/solid-gates')
  for (const fixture of [
    'status-tiles',
    'grid',
    'shell',
    'charts',
    'table-editing',
    'components',
    'analytics',
    'table-read-only',
    'date-picker',
    'form-contract',
    'generator',
  ]) {
    for (const mode of ['source', 'distribution']) {
      const browser = stages.find(
        ({ name }) => name === `${fixture}-${mode}-browser`,
      )
      assert.equal(
        browser.env.BENCH_DISTRIBUTION,
        mode === 'distribution' ? '1' : '',
      )
      assert.equal(
        browser.env.BENCH_OUTPUT,
        `/tmp/solid-gates/${fixture}-${mode}.json`,
      )
      assert.ok(
        stages.findIndex(({ name }) => name === `${fixture}-${mode}-build`) <
          stages.indexOf(browser),
      )
    }
  }
  const live = stages.find(({ name }) => name === 'components-live-browser')
  assert.ok(live)
  assert.equal(live.args.at(-1), 'examples/components/run-live.mjs')
  assert.equal(live.env.NODE_ENV, 'development')
  assert.equal(live.env.BENCH_OUTPUT, '/tmp/solid-gates/components-live.json')
  assert.equal(live.env.BENCH_URL, undefined)
  for (const mode of ['source', 'distribution', 'development']) {
    assert.ok(stages.some(({ name }) => name === `hydration-${mode}`))
    const generator = stages.find(
      ({ name }) => name === `generator-hydration-${mode}`,
    )
    assert.ok(generator)
    assert.equal(generator.args.at(-1), 'examples/generator/run-hydration.mjs')
    const form = stages.find(({ name }) => name === `form-hydration-${mode}`)
    assert.ok(form)
    assert.equal(form.args.at(-1), 'examples/form-contract/run-hydration.mjs')
    assert.equal(
      form.env.BENCH_OUTPUT,
      `/tmp/solid-gates/form-hydration-${mode}.json`,
    )
    assert.equal(
      form.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
    assert.equal(form.env.BENCH_DEVELOPMENT, mode === 'development' ? '1' : '')
  }
  assert.ok(stages.some(({ name }) => name === 'chart-imports'))
  const fallback = stages.find(({ name }) => name === 'charts-fallback-browser')
  assert.equal(fallback.env.BENCH_CHART_FALLBACK, '1')
  for (const mode of ['source', 'distribution', 'development']) {
    const tiles = stages.find(
      ({ name }) => name === `status-tiles-hydration-${mode}`,
    )
    assert.equal(tiles.args.at(-2), 'examples/status-tiles/run.mjs')
    assert.equal(tiles.args.at(-1), '--hydration')
    assert.equal(
      tiles.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
    assert.equal(tiles.env.BENCH_DEVELOPMENT, mode === 'development' ? '1' : '')
    assert.equal(
      tiles.env.BENCH_OUTPUT,
      `/tmp/solid-gates/status-tiles-hydration-${mode}.json`,
    )
    const grid = stages.find(({ name }) => name === `grid-hydration-${mode}`)
    assert.equal(grid.args.at(-2), 'examples/grid/run.mjs')
    assert.equal(grid.args.at(-1), '--hydration')
    assert.equal(
      grid.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
    assert.equal(grid.env.BENCH_DEVELOPMENT, mode === 'development' ? '1' : '')
    assert.equal(
      grid.env.BENCH_OUTPUT,
      `/tmp/solid-gates/grid-hydration-${mode}.json`,
    )
    const shell = stages.find(({ name }) => name === `shell-hydration-${mode}`)
    assert.equal(shell.args.at(-2), 'examples/shell/run.mjs')
    assert.equal(shell.args.at(-1), '--hydration')
    assert.equal(
      shell.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
    assert.equal(shell.env.BENCH_DEVELOPMENT, mode === 'development' ? '1' : '')
    assert.equal(
      shell.env.BENCH_OUTPUT,
      `/tmp/solid-gates/shell-hydration-${mode}.json`,
    )
    const charts = stages.find(
      ({ name }) => name === `charts-hydration-${mode}`,
    )
    assert.equal(charts.args.at(-1), '--hydration')
    assert.equal(
      charts.env.BENCH_OUTPUT,
      `/tmp/solid-gates/charts-hydration-${mode}.json`,
    )
    assert.equal(
      charts.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
  }
  assert.ok(stages.some(({ name }) => name === 'analytics-server'))
  assert.ok(stages.every(({ env }) => !env.BENCH_HEAPS && !env.BENCH_WORKLOAD))
})

test('failed stages retain logs and ignore inherited review and profiling controls', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'table-qualification-test-'))
  try {
    const bin = join(scratch, 'bin')
    const output = join(scratch, 'reports')
    await mkdir(bin)
    await writeFile(
      join(bin, 'pnpm'),
      `#!${process.execPath}
require('node:fs').writeSync(1, JSON.stringify({args: process.argv.slice(2), env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('BENCH_')))}) + '\\n')
process.exitCode = process.argv.includes('scripts/check-chart-imports.mjs') ? 7 : 0
`,
      { mode: 0o755 },
    )
    const result = spawnSync(process.execPath, ['scripts/qualify.mjs'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        QUALIFICATION_OUTPUT: output,
        BENCH_URL: 'http://existing-review-server.invalid',
        BENCH_SCENARIOS: '0',
        BENCH_CASE_PATTERN: 'one-case-only',
        BENCH_HEAPS: '/tmp/unwanted-heaps',
        BENCH_WORKLOAD: '1',
      },
    })
    assert.equal(result.status, 1, result.stderr)
    const runs = await readdir(join(output, 'qualification'))
    assert.equal(runs.length, 1)
    const directory = join(output, 'qualification', runs[0])
    const report = JSON.parse(
      await readFile(join(directory, 'summary.json'), 'utf8'),
    )
    assert.equal(report.stages.at(-1).name, 'chart-imports')
    assert.equal(report.stages.at(-1).status, 7)
    const stage = JSON.parse(
      await readFile(join(directory, 'chart-imports.log'), 'utf8'),
    )
    assert.equal(stage.env.BENCH_URL, undefined)
    assert.equal(stage.env.BENCH_CASE_PATTERN, undefined)
    assert.equal(stage.env.BENCH_HEAPS, undefined)
    assert.equal(stage.env.BENCH_SCENARIOS, '1')
    assert.equal(stage.env.BENCH_WORKLOAD, '0')
    assert.equal(stage.env.BENCH_WORKLOADS, '0')
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})

test('optional WAMN stages require prepared inputs and cover three builds', () => {
  assert.equal(
    qualificationStages('/tmp/gates').some(({ name }) =>
      name.startsWith('wamn-'),
    ),
    false,
  )
  const stages = qualificationStages('/tmp/gates', { wamn: true })
  const inputs = stages.findIndex(({ name }) => name === 'wamn-inputs')
  assert.ok(inputs >= 0)
  assert.equal(stages[inputs].args.at(-1), 'examples/wamn/check-inputs.mjs')
  assert.equal(
    stages.some(({ args }) => args.includes('examples/wamn/prepare.mjs')),
    false,
  )
  for (const mode of ['source', 'distribution', 'development']) {
    const build = stages.findIndex(({ name }) => name === `wamn-${mode}-build`)
    const browser = stages.find(({ name }) => name === `wamn-${mode}-browser`)
    assert.ok(inputs < build && build < stages.indexOf(browser))
    assert.equal(
      browser.env.NODE_ENV,
      mode === 'development' ? 'development' : 'production',
    )
    assert.equal(
      browser.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
    assert.equal(
      browser.env.BENCH_DEVELOPMENT,
      mode === 'development' ? '1' : '',
    )
    assert.equal(browser.env.BENCH_OUTPUT, `/tmp/gates/wamn-${mode}.json`)
  }
})

test('WAMN generator adapter stays optional and uses prepared inputs in every mode', () => {
  assert.equal(
    qualificationStages('/tmp/gates').some(({ name }) =>
      name.startsWith('wamn-generator-'),
    ),
    false,
  )
  const stages = qualificationStages('/tmp/gates', { wamn: true })
  for (const mode of ['source', 'distribution', 'development']) {
    const build = stages.findIndex(
      ({ name }) => name === `wamn-generator-${mode}-build`,
    )
    const browser = stages.findIndex(
      ({ name }) => name === `wamn-generator-${mode}-browser`,
    )
    const hydration = stages.find(
      ({ name }) => name === `wamn-generator-${mode}-hydration`,
    )
    assert.ok(build > stages.findIndex(({ name }) => name === 'wamn-inputs'))
    assert.ok(browser > build)
    assert.equal(hydration.args.at(-1), '--hydration')
    assert.equal(
      hydration.env.BENCH_DISTRIBUTION,
      mode === 'distribution' ? '1' : '',
    )
    assert.equal(
      hydration.env.BENCH_DEVELOPMENT,
      mode === 'development' ? '1' : '',
    )
  }
})

test('qualification uses the required gate once and runs direct Node suites serially', () => {
  const stages = qualificationStages('/tmp/solid-gates')
  const checks = stages.filter(({ args }) => args.includes('check'))
  assert.equal(checks.length, 1)
  assert.equal(stages[0], checks[0])
  assert.equal(
    stages.some(({ args }) => args.includes('test:unit')),
    false,
  )
  const nodeSuites = stages.filter(({ args }) => args.includes('--test'))
  assert.ok(nodeSuites.length > 0)
  for (const stage of nodeSuites) {
    assert.ok(stage.args.includes('--test-concurrency=1'), stage.name)
  }
})

test('qualification delegates SSR and documentation contracts to its single required gate', () => {
  const stages = qualificationStages('/tmp/coverage-gates')
  const checks = stages.filter(({ args }) => args.includes('check'))
  assert.equal(checks.length, 1)
  assert.equal(stages[0], checks[0])
  for (const entry of [
    'test:ssr',
    'test:contracts',
    'scripts/test-ssr.mjs',
    'scripts/test-contracts.mjs',
  ])
    assert.equal(
      stages.some(({ args }) => args.includes(entry)),
      false,
      entry,
    )
})
