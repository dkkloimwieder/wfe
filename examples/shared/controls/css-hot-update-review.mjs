import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withTemporarySource } from '../../../scripts/temporary-source.mjs'
import { hashCss } from '../../../scripts/css-provenance.mjs'
import { reviewCssProvenance } from './css-review.mjs'

export async function reviewImportedCssUpdates({
  page,
  browser,
  server,
  url,
  output,
  report,
}) {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const source = fileURLToPath(
    new URL(
      '../../../packages/components/src/styles/components.css',
      import.meta.url,
    ),
  )
  const entry = fileURLToPath(
    new URL(
      '../../../packages/components/src/styles/styles.css',
      import.meta.url,
    ),
  )
  const directory = join(
    dirname(output),
    `css-updates-${process.pid}-${Date.now()}`,
  )
  await mkdir(directory, { recursive: true })
  const property = '--wfe-css-update-probe'
  const input = page.getByRole('textbox', { name: 'Display name', exact: true })
  const id = await input.getAttribute('id')
  assert.ok(id)
  const draft = await input.inputValue()
  await input.evaluate((node) => {
    window.cssProbeInput = node
  })
  const original = await readFile(source)
  const trace = (report.cssUpdates = {
    source,
    entry,
    backup: join(directory, 'original-components.css'),
    originalHash: hashCss(original),
    watcherEvents: [],
    phases: [],
    cleanupErrors: [],
  })
  let navigationCount = 0
  const navigated = (frame) => {
    if (frame === page.mainFrame()) navigationCount++
  }
  const watched = (event, file) => {
    if (file === source || file.startsWith(source + '.'))
      trace.watcherEvents.push({ event, file, at: Date.now() })
  }
  server.watcher.on('all', watched)
  page.on('framenavigated', navigated)
  const graph = (file) =>
    [...(server.moduleGraph.getModulesByFile(file) ?? [])].map((module) => ({
      id: module.id,
      url: module.url,
      file: module.file,
      lastHMRTimestamp: module.lastHMRTimestamp,
      lastInvalidationTimestamp: module.lastInvalidationTimestamp,
      importers: [...module.importers].map((parent) => parent.file),
    }))
  const waitForValue = (target, value) =>
    target.waitForFunction(
      ({ id, property, value }) => {
        const node = document.getElementById(id)
        return (
          node &&
          getComputedStyle(node).getPropertyValue(property).trim() === value
        )
      },
      { id, property, value },
      { timeout: 30000 },
    )
  const retained = async () => {
    assert.equal(
      await input.evaluate((node) => node === window.cssProbeInput),
      true,
      'CSS updates retain the original input node',
    )
    assert.equal(
      await input.inputValue(),
      draft,
      'CSS updates retain the application draft',
    )
    assert.equal(navigationCount, 0, 'CSS updates do not reload the document')
  }
  const fresh = async (value) => {
    const context = await browser.newContext()
    let failure
    let failed = false
    let closeFailure
    let closeFailed = false
    try {
      const target = await context.newPage()
      const accessibility = await context.newCDPSession(target)
      await accessibility.send('Accessibility.enable')
      target.on('pageerror', (error) => report.errors.push(error.stack))
      target.on('console', (message) => {
        if (
          ['warning', 'error'].includes(message.type()) &&
          !message.text().startsWith('[HOT_SCOPE_TIME]')
        )
          report.warnings.push(message.text())
      })
      await target.goto(`${url}?consumer=1`)
      await waitForValue(target, value)
      await reviewCssProvenance(target, url)
    } catch (error) {
      failure = error
      failed = true
    } finally {
      try {
        await context.close()
      } catch (error) {
        closeFailure = error
        closeFailed = true
      }
    }
    if (failed && closeFailed)
      throw new AggregateError(
        [failure, closeFailure],
        'Fresh stylesheet review and context cleanup failed',
      )
    if (failed) throw failure
    if (closeFailed) throw closeFailure
  }
  const served = async () => {
    const manifest = await reviewCssProvenance(page, url)
    const sheets = []
    for (const sheet of manifest.stylesheets) {
      const response = await page.request.get(
        new URL(`/@fs${join(root, sheet.file)}?direct`, url).href,
      )
      assert.equal(response.status(), 200)
      const sha256 = hashCss((await response.text()).trim())
      assert.equal(sha256, sheet.sha256, `Stale served CSS: ${sheet.file}`)
      sheets.push({ file: sheet.file, sha256 })
    }
    return sheets
  }
  const diagnose = async (phase) => {
    phase.graph = { source: graph(source), entry: graph(entry) }
    phase.watcherEvents = [...trace.watcherEvents]
    try {
      phase.current = await input.evaluate(
        (node, property) => ({
          value: getComputedStyle(node).getPropertyValue(property).trim(),
          connected: node.isConnected,
          draft: node.value,
        }),
        property,
      )
      const response = await page.request.get(
        new URL('css-provenance.json', url).href,
      )
      phase.provenance = {
        status: response.status(),
        body: await response.text(),
      }
      // Capture the failed state before this request can cause a new transform.
      const served = await page.request.get(
        new URL(`/@fs${entry}?direct`, url).href,
      )
      const css = await served.text()
      phase.served = { status: served.status(), sha256: hashCss(css) }
      await writeFile(join(directory, 'served-styles.css'), css)
    } catch (error) {
      phase.diagnosticError = String(error)
    }
    await writeFile(
      join(directory, 'failure.json'),
      JSON.stringify(trace, null, 2),
    )
  }
  let failure
  const cleanupErrors = []
  let failed = false
  try {
    await waitForValue(page, '')
    await reviewCssProvenance(page, url)
    await withTemporarySource(source, trace.backup, async (edit) => {
      for (const [index, method] of [
        'atomic',
        'in-place',
        'atomic',
      ].entries()) {
        const value = `css-${index}-${process.pid}`
        const phase = { method, value, started: Date.now() }
        trace.phases.push(phase)
        try {
          edit.write(
            `${edit.original}\n:where([data-ui]) { ${property}: ${value}; }\n`,
            method,
          )
          phase.sourceHash = hashCss(await readFile(source))
          await waitForValue(page, value)
          await retained()
          phase.provenance = await reviewCssProvenance(page, url)
          await fresh(value)
          phase.passed = true
        } catch (error) {
          phase.error = error.stack ?? String(error)
          try {
            await diagnose(phase)
          } catch (diagnosticError) {
            phase.diagnosticError =
              diagnosticError?.stack ?? String(diagnosticError)
          }
          throw error
        }
      }
    })
  } catch (error) {
    failure = error
    failed = true
  } finally {
    try {
      trace.restoredHash = hashCss(await readFile(source))
      assert.equal(
        trace.restoredHash,
        trace.originalHash,
        'Restore exact stylesheet bytes',
      )
      await waitForValue(page, '')
      await retained()
      await reviewCssProvenance(page, url)
      await fresh('')
      trace.restoredSheets = await served()
      trace.restored = true
    } catch (error) {
      trace.cleanupErrors.push(error.stack ?? String(error))
      cleanupErrors.push(error)
    } finally {
      server.watcher.off('all', watched)
      page.off('framenavigated', navigated)
      await page
        .evaluate(() => {
          delete window.cssProbeInput
        })
        .catch(() => {})
      try {
        await writeFile(
          join(directory, 'trace.json'),
          JSON.stringify(trace, null, 2),
        )
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
  }
  if (cleanupErrors.length)
    throw new AggregateError(
      failed ? [failure, ...cleanupErrors] : cleanupErrors,
      'Stylesheet update cleanup failed',
    )
  if (failed) throw failure
  report.cases.push(
    'Imported CSS updates preserve drafts and nodes after atomic and in-place saves',
  )
}
