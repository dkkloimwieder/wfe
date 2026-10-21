/* global window, requestAnimationFrame */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { loadavg } from 'node:os'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import { build } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const fixture = resolve(root, 'bench/action-disposal')
const inspector = resolve(root, 'bench/inspect-heap.mjs')
const output = resolve(
  process.env.DISPOSAL_OUTPUT ?? 'test-results/action-disposal',
)
const size = Number(process.env.DISPOSAL_SIZE ?? 1000)
const repetitions = Number(process.env.DISPOSAL_REPETITIONS ?? 2)
assert.ok(
  Number.isSafeInteger(size) && size > 0,
  'DISPOSAL_SIZE must be positive',
)
assert.ok(
  Number.isSafeInteger(repetitions) && repetitions > 0,
  'DISPOSAL_REPETITIONS must be positive',
)
await mkdir(dirname(output), { recursive: true })
// Refuse to replace first-failure evidence from an earlier run.
await mkdir(output)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const assets = process.env.DISPOSAL_DIST
  ? resolve(process.env.DISPOSAL_DIST)
  : resolve(output, 'dist')
const fixtureSource = process.env.DISPOSAL_DIST
  ? process.env.DISPOSAL_SOURCE
  : resolve(fixture, 'main.js')
assert.ok(
  fixtureSource,
  'Set DISPOSAL_SOURCE to the fixture source for a preserved bundle',
)
const report = {
  size,
  repetitions,
  label: process.env.DISPOSAL_LABEL ?? 'installed-runtime',
  runtimeSource: process.env.DISPOSAL_DIST
    ? 'preserved-bundle'
    : 'installed-runtime',
  fixtureSource: resolve(fixtureSource),
  fixtureSha256: hash(await readFile(fixtureSource)),
  inspectorSha256: hash(await readFile(inspector)),
  runnerSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  playwright: createRequire(import.meta.url)('@playwright/test/package.json')
    .version,
  browser: '',
  executable: chromium.executablePath(),
  hostLoad: loadavg(),
  hasPreload: Boolean(process.env.NODE_OPTIONS?.includes('--import')),
  files: [],
  modules: [],
  cases: [],
  errors: [],
  cleanupErrors: [],
  verdict: 'incomplete',
}
const save = () =>
  writeFile(
    resolve(output, 'summary.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
let browser
let server
let failed = false
try {
  if (!process.env.DISPOSAL_DIST) {
    await build({
      configFile: false,
      root: fixture,
      plugins: [
        {
          name: 'disposal-module-inventory',
          generateBundle(_options, bundle) {
            this.emitFile({
              type: 'asset',
              fileName: 'modules.json',
              source: JSON.stringify(
                Object.values(bundle).flatMap((item) =>
                  item.type === 'chunk' ? Object.keys(item.modules) : [],
                ),
                null,
                2,
              ),
            })
          },
        },
      ],
      build: { outDir: assets, target: 'esnext', minify: false },
    })
  }
  report.modules = JSON.parse(
    await readFile(resolve(assets, 'modules.json'), 'utf8'),
  )
  for (const entry of await readdir(assets, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue
    const file = resolve(entry.parentPath, entry.name)
    report.files.push({
      path: file.slice(assets.length + 1),
      sha256: hash(await readFile(file)),
    })
  }
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname
      if (pathname === '/favicon.ico') return void response.writeHead(204).end()
      const path = resolve(
        assets,
        '.' + (pathname === '/' ? '/index.html' : pathname),
      )
      assert.ok(path.startsWith(assets + sep))
      response.setHeader(
        'Content-Type',
        path.endsWith('.js') ? 'text/javascript' : 'text/html',
      )
      response.end(await readFile(path))
    } catch (error) {
      report.errors.push(String(error))
      response.writeHead(500).end()
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  browser = await chromium.launch()
  report.browser = browser.version()
  for (let repetition = 0; repetition < repetitions; repetition++) {
    for (const mode of ['settled', 'settled-no-cleanup', 'cleanup']) {
      for (const method of ['plain', 'action']) {
        const result = { mode, method, size, repetition }
        report.cases.push(result)
        const context = await browser.newContext()
        try {
          const page = await context.newPage()
          page.on('pageerror', (error) => report.errors.push(error.message))
          page.on('console', (message) => {
            if (['warning', 'error'].includes(message.type()))
              report.errors.push(message.text())
          })
          const client = await context.newCDPSession(page)
          await page.goto(`http://127.0.0.1:${server.address().port}`)
          await (
            await page.waitForFunction(
              () => window.repro,
              {},
              { timeout: 60000 },
            )
          ).dispose()
          await page.evaluate(
            ({ mode, size }) => window.repro.start(mode, size),
            { mode, size },
          )
          async function capture(stage) {
            // Same schedule as the preserved rc.13 reproduction. No retries.
            for (let i = 0; i < 2; i++) {
              await page.evaluate(() => window.repro.settle())
              await page.evaluate(
                () =>
                  new Promise((done) =>
                    requestAnimationFrame(() => requestAnimationFrame(done)),
                  ),
              )
              await client.send('HeapProfiler.collectGarbage')
            }
            const chunks = []
            const collect = ({ chunk }) => chunks.push(chunk)
            client.on('HeapProfiler.addHeapSnapshotChunk', collect)
            try {
              await client.send('HeapProfiler.takeHeapSnapshot', {
                reportProgress: false,
              })
            } finally {
              client.off('HeapProfiler.addHeapSnapshotChunk', collect)
            }
            const path = resolve(
              output,
              `${mode}-${method}-${size}-${repetition}-${stage}.heapsnapshot.gz`,
            )
            await writeFile(path, gzipSync(chunks.join('')))
            execFileSync(
              process.execPath,
              [inspector, path, 'object:RetentionRecord'],
              { stdio: 'pipe' },
            )
            const summary = JSON.parse(
              await readFile(path + '.summary.json', 'utf8'),
            )
            const tagged = summary.requestedGroup
            assert.equal(tagged?.key, 'object:RetentionRecord')
            return {
              path,
              records: tagged.count,
              retainingPath: tagged.retainingPath,
            }
          }
          result.loaded = await capture('loaded')
          result.counts = await page.evaluate(() => window.repro.inspect())
          result.disposedCounts = await page.evaluate(
            (method) => window.repro.dispose(method),
            method,
          )
          result.disposed = await capture('disposed')
          await save()
          assert.equal(result.loaded.records, size)
          assert.equal(result.counts.setups, 1)
          assert.equal(result.counts.cleanups, 0)
          assert.equal(result.disposedCounts.cleanups, 1)
          assert.equal(result.disposedCounts.value, size)
          if (method === 'action' || mode === 'cleanup')
            assert.equal(result.disposed.records, 0)
          if (result.disposed.records) {
            assert.equal(result.disposed.retainingPath[0]?.index, 0)
            assert.ok(result.disposed.retainingPath.some((step) => step.via))
          }
          assert.deepEqual(report.errors, [])
          console.log(
            `${mode}/${method}/${repetition}: ${result.loaded.records} loaded, ${result.disposed.records} retained`,
          )
        } catch (error) {
          result.error = String(error.stack ?? error)
          throw error
        } finally {
          try {
            await context.close()
          } catch (error) {
            report.cleanupErrors.push(String(error))
            failed = true
          }
          await save()
        }
      }
    }
  }
  report.verdict = report.cases.some((entry) => entry.disposed.records > 0)
    ? 'workaround-required'
    : 'candidate-for-fixture-qualification'
} catch (error) {
  report.errors.push(String(error.stack ?? error))
  failed = true
} finally {
  try {
    await browser?.close()
  } catch (error) {
    report.cleanupErrors.push(String(error))
    failed = true
  }
  try {
    if (server?.listening)
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
  } catch (error) {
    report.cleanupErrors.push(String(error))
    failed = true
  }
  if (failed) report.verdict = 'incomplete'
  await save()
}
if (failed) process.exitCode = 1
console.log(report.verdict)
