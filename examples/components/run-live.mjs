import { readFile } from 'node:fs/promises'
import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
} from '../shared/browser/runner.mjs'
import { reviewImportedCssUpdates } from '../shared/controls/css-hot-update-review.mjs'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { withArtifactRun } from '../../scripts/artifacts.mjs'

await withArtifactRun(
  {
    suite: 'components-live',
    mode: 'development',
    hydration: process.argv.includes('--hydration'),
  },
  async (artifacts) => {
    const ui = fileURLToPath(
      new URL('../../packages/components/src/', import.meta.url),
    )
    const parts = {
      Combobox: [
        'Root',
        'Arrow',
        'Content',
        'Control',
        'Description',
        'ErrorMessage',
        'HiddenSelect',
        'Icon',
        'Input',
        'Item',
        'ItemDescription',
        'ItemIndicator',
        'ItemLabel',
        'Label',
        'Listbox',
        'Portal',
        'Section',
        'Trigger',
      ],
      Select: [
        'Root',
        'Arrow',
        'Content',
        'Description',
        'ErrorMessage',
        'HiddenSelect',
        'Icon',
        'Item',
        'ItemDescription',
        'ItemIndicator',
        'ItemLabel',
        'Label',
        'Listbox',
        'Portal',
        'Section',
        'Trigger',
        'Value',
      ],
      DropdownMenu: [
        'Root',
        'Arrow',
        'CheckboxItem',
        'Content',
        'Group',
        'GroupLabel',
        'Icon',
        'Item',
        'ItemDescription',
        'ItemIndicator',
        'ItemLabel',
        'Portal',
        'RadioGroup',
        'RadioItem',
        'Separator',
        'Sub',
        'SubContent',
        'SubTrigger',
        'Trigger',
      ],
      Popover: [
        'Root',
        'Anchor',
        'Arrow',
        'CloseButton',
        'Content',
        'Description',
        'Portal',
        'Title',
        'Trigger',
      ],
      Tooltip: ['Root', 'Arrow', 'Content', 'Portal', 'Trigger'],
      Dialog: [
        'Root',
        'Portal',
        'Trigger',
        'CloseButton',
        'Overlay',
        'Content',
        'Title',
        'Description',
      ],
      AlertDialog: [
        'Root',
        'Portal',
        'Trigger',
        'CloseButton',
        'Overlay',
        'Content',
        'Title',
        'Description',
        'Cancel',
        'Action',
      ],
      Sheet: [
        'Root',
        'Portal',
        'Trigger',
        'CloseButton',
        'Overlay',
        'Content',
        'Title',
        'Description',
      ],
    }
    const output = artifacts.reportPath
    const report = { cases: [], errors: [], warnings: [] }
    let browser, server, accessibility, detachDiagnostics
    try {
      report.groups = selectGroups({ 'components-live': true })
      server = await createServer({
        configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
        server: { host: '127.0.0.1', port: 0, strictPort: true },
      })
      await server.listen()
      const url = `http://127.0.0.1:${server.httpServer.address().port}/`
      browser = await launchBrowser({ chromium })
      const page = await browser.newPage()
      page.setDefaultTimeout(10000)
      accessibility = await page.context().newCDPSession(page)
      await accessibility.send('Accessibility.enable')
      detachDiagnostics = attachDiagnostics(page, report, {
        console: ({ type, text }) =>
          ['warning', 'error'].includes(type) &&
          !text.startsWith('[HOT_SCOPE_TIME]')
            ? 'reject'
            : 'observe',
      })
      await page.goto(`${url}?consumer=1`)
      await page
        .getByRole('textbox', { name: 'Display name', exact: true })
        .fill('Refresh draft')
      const assertParts = async () => {
        const missing = await page.evaluate(
          async ({ ui, parts }) => {
            const exports = await import(`/@fs${ui}index.ts`)
            return Object.entries(parts).flatMap(([name, keys]) =>
              keys
                .filter((key) => typeof exports[name]?.[key] !== 'function')
                .map((key) => `${name}.${key}`),
            )
          },
          { ui, parts },
        )
        assert.deepEqual(missing, [])
      }
      await assertParts()
      report.cases.push(
        'All public compound parts survive Vite refresh proxies',
      )
      for (const name of [
        'Combobox',
        'Select',
        'DropdownMenu',
        'Popover',
        'Tooltip',
        'Dialog',
        'AlertDialog',
        'Sheet',
      ]) {
        const module = server.moduleGraph.getModuleById(
          `${ui}components/${name}.tsx`,
        )
        assert.ok(module, `loaded ${name} module`)
        const updated = page.waitForEvent('console', {
          predicate: (message) =>
            message.text().includes('hot updated:') &&
            message.text().includes(`${name}.tsx`),
        })
        await server.reloadModule(module)
        await updated
        await assertParts()
        assert.equal(
          await page
            .getByRole('textbox', { name: 'Display name', exact: true })
            .inputValue(),
          'Refresh draft',
        )
      }
      await page
        .getByRole('button', { name: 'Review record', exact: true })
        .click()
      await page
        .getByRole('alertdialog', { name: 'Save this record?' })
        .waitFor()
      await page
        .getByRole('button', { name: 'Keep editing', exact: true })
        .click()
      await page.getByRole('alertdialog').waitFor({ state: 'hidden' })
      report.cases.push(
        'Hot updates preserve compound parts, form draft and confirmation interaction',
      )
      await reviewImportedCssUpdates({
        page,
        browser,
        server,
        url,
        output,
        report,
      })
      assert.deepEqual(report.errors, [])
      assert.deepEqual(report.warnings, [])
      await accessibility.detach()
      accessibility = undefined
      await browser.close()
      browser = undefined
      const requested = process.env.BENCH_OUTPUT
      const interactionsOutput = requested
        ? /\.json$/.test(requested)
          ? requested.replace(/\.json$/, '-interactions.json')
          : requested + '-interactions.json'
        : output.replace(/\.json$/, '-interactions.json')
      report.interactions = { report: interactionsOutput }
      const result = await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [fileURLToPath(new URL('./run.mjs', import.meta.url))],
          {
            env: {
              ...process.env,
              BENCH_URL: url,
              // The child runs its own complete application group.
              BENCH_APPLICATION_PATTERN: '',
              BENCH_WORKLOADS: '0',
              BENCH_WORKLOAD: '0',
              BENCH_OUTPUT: interactionsOutput,
              BENCH_DEVELOPMENT: '1',
              BENCH_ARTIFACT_PARENT: artifacts.directory,
              BENCH_ARTIFACT_STAGE: 'components-live-interactions',
            },
            stdio: 'inherit',
          },
        )
        child.on('error', reject)
        child.on('close', (status, signal) => resolve({ status, signal }))
      })
      assert.equal(result.status, 0, JSON.stringify(result))
      const interactions = JSON.parse(
        await readFile(interactionsOutput, 'utf8'),
      )
      report.interactions.artifacts = interactions.artifacts
      report.cases.push(
        'Full popup interactions pass against the Vite development server',
      )
    } catch (error) {
      report.failure = errorText(error)
      report.failureDetails = errorDetails(error)
    } finally {
      const failed = await finalizeReport({
        report,
        output,
        cleanup: [
          {
            name: 'accessibility CDP session',
            close: () => accessibility?.detach(),
          },
          { name: 'browser', close: () => browser?.close() },
          { name: 'diagnostic listeners', close: () => detachDiagnostics?.() },
          { name: 'Vite server', close: () => server?.close() },
        ],
      })
      if (failed) process.exitCode = 1
    }
  },
)
