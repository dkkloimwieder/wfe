import {
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  startStaticServer,
} from '../shared/browser/runner.mjs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { loadavg } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const distribution = Boolean(process.env.BENCH_DISTRIBUTION)
const assets = fileURLToPath(
  new URL(distribution ? '.dist-package/' : '.dist/', import.meta.url),
)
const output = process.env.BENCH_OUTPUT ?? '/tmp/table-accessor-profile.json'
function list(name, fallback, minimum) {
  const values = (process.env[name] ?? fallback).split(',').map(Number)
  assert.ok(
    values.length &&
      values.every((n) => Number.isSafeInteger(n) && n >= minimum),
    `Invalid ${name}`,
  )
  return values
}
const report = { errors: [], warnings: [], samples: [] }
let browser, server
try {
  const sizes = list('BENCH_SIZES', '1000,10000,50000', 200)
  const iterations = list('BENCH_ITERATIONS', '0,64', 0)
  const repeats = list('BENCH_REPEATS', '3', 1)[0]
  const warmups = list('BENCH_WARMUPS', '1', 0)[0]
  const availableModes = [
    'native',
    'native-reuse',
    'separate',
    'matcher-cache',
    'fused',
  ]
  const modes = process.env.BENCH_MODES?.split(',') ?? availableModes
  assert.ok(
    modes.length &&
      new Set(modes).size === modes.length &&
      modes.every((mode) => availableModes.includes(mode)),
    'Invalid BENCH_MODES',
  )
  server = await startStaticServer({
    assets,
    onServerError: (error) => {
      report.serverErrors ??= []
      report.serverErrors.push(error)
    },
  })
  browser = await launchBrowser({ chromium })
  const samples = report.samples
  const expectedCounts = new Map()
  for (const size of sizes)
    for (const work of iterations)
      for (let repeat = -warmups; repeat < repeats; repeat++) {
        // Rotate order across repetitions to reduce a consistent first-mode advantage.
        const offset = (repeat + warmups) % modes.length
        for (const mode of [
          ...modes.slice(offset),
          ...modes.slice(0, offset),
        ]) {
          const page = await browser.newPage()
          const errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          page.on('console', (message) => {
            if (['warning', 'error'].includes(message.type()))
              errors.push(message.text())
          })
          await page.goto(server.url + '/')
          await (
            await page.waitForFunction(() => window.accessorProfile)
          ).dispose()
          const loadBefore = loadavg()
          const result = await page.evaluate(
            ({ mode, size, work }) =>
              window.accessorProfile.run(mode, size, work),
            { mode, size, work },
          )
          assert.equal(result.steps.length, 14)
          assert.equal(result.disposed, true)
          assert.deepEqual(errors, [])
          const counts = result.steps.map(({ name, counts }) => ({
            name,
            counts,
          }))
          const key = `${size}/${work}/${mode}`
          if (expectedCounts.has(key))
            assert.deepEqual(
              counts,
              expectedCounts.get(key),
              `${key}: nondeterministic work counts`,
            )
          else expectedCounts.set(key, counts)
          if (repeat >= 0)
            samples.push({
              ...result,
              repeat,
              loadBefore,
              loadAfter: loadavg(),
            })
          await page.close()
          console.log(
            `${mode} ${size} rows, ${work} iterations, ${repeat < 0 ? 'warmup' : `sample ${repeat + 1}`}: ${result.steps.length} states passed`,
          )
        }
      }
  for (const size of sizes)
    for (const work of iterations) {
      const representative = (mode) =>
        samples.find(
          (sample) =>
            sample.size === size &&
            sample.iterations === work &&
            sample.mode === mode,
        )
      const native = representative('native')
      const separate = representative('separate')
      const cached = representative('matcher-cache')
      const reused = representative('native-reuse')
      // Stable feature activation has the same traversal and predicate contract.
      if (native && separate)
        for (const { name } of native.steps) {
          const a = native.steps.find((step) => step.name === name)
          const b = separate.steps.find((step) => step.name === name)
          assert.deepEqual(
            a.counts,
            b.counts,
            `${size}/${work}/${name}: unmatched native and separate work`,
          )
        }
      if (cached && separate)
        for (const step of cached.steps) {
          const baseline = separate.steps.find(({ name }) => name === step.name)
          assert.equal(step.rows, baseline.rows)
          assert.equal(step.computedFacets, baseline.computedFacets)
          assert.equal(step.colorFacets, baseline.colorFacets)
          assert.ok(
            step.counts.computed <= baseline.counts.computed,
            `${step.name}: matcher cache added computed work`,
          )
          for (const key of ['records', 'filters', 'searches', 'colors'])
            assert.equal(
              step.counts[key],
              baseline.counts[key],
              `${step.name}: matcher cache changed ${key}`,
            )
        }
      if (reused && cached) {
        assert.deepEqual(
          reused.steps.map(
            ({ name, counts, rows, computedFacets, colorFacets }) => ({
              name,
              counts,
              rows,
              computedFacets,
              colorFacets,
            }),
          ),
          cached.steps.map(
            ({ name, counts, rows, computedFacets, colorFacets }) => ({
              name,
              counts,
              rows,
              computedFacets,
              colorFacets,
            }),
          ),
          `${size}/${work}: unmatched native reuse and matcher cache work`,
        )
      }
      const fused = representative('fused')
      if (fused) {
        assert.equal(
          fused.steps.find(({ name }) => name === 'activeColorEdit').passes
            .combined,
          1,
          'Fused color edit did not rerun its combined derivation',
        )
      }
      if (separate) {
        assert.equal(
          separate.steps.find(({ name }) => name === 'activeColorEdit').passes
            .rows,
          0,
          'Separate color edit reran row membership',
        )
        assert.equal(
          separate.steps.find(({ name }) => name === 'ownFilterChange').passes
            .computed,
          0,
          'Own filter change reran its facet',
        )
      }
      if (native) {
        const nativeColor = native.steps.find(
          ({ name }) => name === 'activeColorEdit',
        )
        assert.equal(
          nativeColor.counts.records,
          size,
          'Native color edit traversed more than one output',
        )
        assert.equal(nativeColor.counts.filters, size)
        assert.equal(
          nativeColor.counts.searches,
          nativeColor.populations.filterPasses,
        )
        assert.equal(
          nativeColor.counts.computed,
          size + nativeColor.populations.filterPasses,
        )
        assert.equal(
          nativeColor.counts.colors,
          nativeColor.populations.eligible,
        )
        const ownFilter = native.steps.find(
          ({ name }) => name === 'ownFilterChange',
        )
        assert.equal(
          ownFilter.counts.records,
          2 * size,
          'Own filter change traversed more than rows and the other facet',
        )
        assert.equal(ownFilter.counts.filters, 2 * size)
        assert.equal(
          ownFilter.counts.searches,
          2 * ownFilter.populations.filterPasses,
        )
        assert.equal(
          ownFilter.counts.computed,
          2 * size + 2 * ownFilter.populations.filterPasses,
        )
        assert.equal(ownFilter.counts.colors, ownFilter.populations.eligible)
      }
    }
  const assetHashes = {}
  for (const file of await readdir(resolve(assets, 'assets')))
    assetHashes[file] = createHash('sha256')
      .update(await readFile(resolve(assets, 'assets', file)))
      .digest('hex')
  Object.assign(report, {
    timestamp: new Date().toISOString(),
    browser: browser.version(),
    distribution,
    sizes,
    iterations,
    repeats,
    warmups,
    modes,
    assetHashes,
    samples,
    contention: 'Shared development host. Timings are advisory.',
    consumer:
      'One persistent Solid effect observes active outputs. Timed steps include mutation, flush, and observed derivation. The independent seed oracle runs outside timing and never reads the source store.',
    sampling:
      'Each mode/sample uses a fresh page and caller store. Warmups are discarded independent runs, not a guarantee of a warmed JIT in each later page.',
    limits:
      'Bench-only alternatives cover row filtering and two facets. Fused mode couples active-output dependencies. No sorting, grouping, custom accessors, or production replacement claim.',
  })
} catch (error) {
  report.failure = errorText(error)
  report.failureDetails = errorDetails(error)
} finally {
  const failed = await finalizeReport({
    report,
    output,
    cleanup: [
      { name: 'browser', close: () => browser?.close() },
      { name: 'static server', close: () => server?.close() },
    ],
  })
  if (failed) process.exitCode = 1
}
