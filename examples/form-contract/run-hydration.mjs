import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
  startStaticServer,
} from '../shared/browser/runner.mjs'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'
import {
  choiceControl,
  expectValue,
  selectValue,
} from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { withArtifactRun } from '../../scripts/artifacts.mjs'

await withArtifactRun(
  { suite: 'form-contract', hydration: true },
  async (artifacts) => {
    const suffix = process.env.BENCH_DEVELOPMENT
      ? '-dev'
      : process.env.BENCH_DISTRIBUTION
        ? '-package'
        : ''
    const assets = fileURLToPath(
      new URL(`.dist-hydration${suffix}/`, import.meta.url),
    )
    const report = {
      cases: [],
      errors: [],
      warnings: [],
      serverWarnings: [],
      diagnostics: [],
    }
    let browser, server, detachDiagnostics
    let html
    const output = artifacts.reportPath

    try {
      report.groups = selectGroups({ 'form-contract-hydration': true })
      for (const ssr of [true, false]) {
        execFileSync(
          'pnpm',
          [
            'exec',
            'vite',
            'build',
            '--config',
            'examples/form-contract/vite.hydration.config.ts',
          ],
          {
            stdio: 'inherit',
            env: { ...process.env, HYDRATION_SERVER: ssr ? '1' : '' },
          },
        )
        const modules = JSON.parse(
          await readFile(
            fileURLToPath(
              new URL(
                `.dist-hydration${ssr ? '-server' : ''}${suffix}/modules.json`,
                import.meta.url,
              ),
            ),
            'utf8',
          ),
        )
        const directory = process.env.BENCH_DISTRIBUTION
          ? '/packages/form/dist/'
          : '/packages/form/src/'
        assert.ok(
          modules.some((id) => id.includes(directory)),
          `Missing ${ssr ? 'server' : 'client'} form modules from ${directory}`,
        )
      }
      const { render } = await import(
        new URL(`.dist-hydration-server${suffix}/server.js`, import.meta.url)
      )
      const warn = console.warn
      const error = console.error
      let rendered
      try {
        console.warn = console.error = (...args) =>
          report.serverWarnings.push(args.map(String).join(' '))
        rendered = await render()
        const second = await render()
        assert.deepEqual(second.snapshot, rendered.snapshot)
      } finally {
        console.warn = warn
        console.error = error
      }
      assert.deepEqual(report.serverWarnings, [])
      assert.deepEqual(rendered.snapshot.values, {
        name: 'Draft record',
        category: 'General',
        enabled: false,
      })
      assert.equal(rendered.snapshot.phase, 'idle')
      assert.equal(rendered.snapshot.dirty, false)
      assert.deepEqual(rendered.snapshot.requests, [])
      const template = await readFile(assets + 'hydration.html', 'utf8')
      assert.ok(template.includes('<!--ssr-->'))
      html = template
        .replace('<!--ssr-->', rendered.html)
        .replace(
          '</body>',
          '<script>window.serverNodes = [...document.querySelectorAll("#root main :is(form, input, select, button, label)")];</script></body>',
        )
      if (!process.env.BENCH_URL)
        server = await startStaticServer({
          assets,
          renderIndex: () => html,
          onServerError: (error) => {
            report.serverErrors ??= []
            report.serverErrors.push(error)
          },
        })
      browser = await launchBrowser({ chromium })
      report.browser = browser.version()
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      })
      detachDiagnostics = attachDiagnostics(page, report)
      let releaseScripts
      const scripts = new Promise((resolve) => {
        releaseScripts = resolve
      })
      await page.route('**/*.js', async (route) => {
        await scripts
        await route.continue()
      })
      await page.goto(process.env.BENCH_URL ?? server.url + '/', {
        waitUntil: 'commit',
      })
      await page.waitForFunction(() => window.serverNodes?.length > 0)
      const name = page.getByRole('textbox', { name: 'Name', exact: true })
      const category = choiceControl(page, { name: 'Category', exact: true })
      const enabled = page.getByRole('checkbox', {
        name: 'Enabled',
        exact: true,
      })
      const save = page.getByRole('button', { name: 'Save', exact: true })
      const status = page.getByRole('status')
      const phase = (value) => expect(status).toContainText(value)
      const snapshot = () =>
        page.evaluate(() => window.formContractFixture.snapshot())
      async function test(name, run) {
        await run()
        report.cases.push({ name, status: 'passed' })
        console.log('PASS ' + name)
      }
      const retained = () =>
        page.evaluate(() =>
          window.serverNodes.every(
            (node) =>
              node.isConnected &&
              document.getElementById('root').contains(node),
          ),
        )
      async function associations() {
        const area = page.getByRole('region', {
          name: 'Association cases',
          exact: true,
        })
        const cases = [
          ['textbox', 'Custom text', 'Conditional text help.', 'Text error.'],
          ['textbox', 'Custom notes', 'Notes help.'],
          ['combobox', 'Custom choice', 'Choice help.'],
          [
            'button',
            'Shared field choice',
            'Conditional choice help.',
            'Choice error.',
          ],
          [
            'checkbox',
            'Custom check',
            'Conditional check help.',
            'Check error.',
          ],
          ['switch', 'Automatic switch', 'Switch help.'],
          ['button', 'Automatic select', 'Select help.'],
          ['combobox', 'Automatic search', 'Search help.'],
        ]
        for (const [role, name, ...messages] of cases) {
          const control =
            name === 'Shared field choice'
              ? choiceControl(area, { name, exact: true })
              : area.getByRole(role, { name, exact: true })
          await expect(control).toHaveCount(1)
          const references = await control.evaluate((node) => ({
            id: node.id,
            labels: [...document.querySelectorAll('label')]
              .filter((label) => label.htmlFor === node.id)
              .map((label) => label.textContent),
            described: (node.getAttribute('aria-describedby') ?? '')
              .split(/\s+/)
              .filter(Boolean)
              .map((id) => ({
                id,
                text: document.getElementById(id)?.textContent,
              })),
            labelled: (node.getAttribute('aria-labelledby') ?? '')
              .split(/\s+/)
              .filter(Boolean)
              .map((id) => document.getElementById(id)?.textContent),
          }))
          assert.ok(references.id)
          assert.ok(
            references.labels.some((label) => label === name) ||
              references.labelled.some((label) => label === name),
            name,
          )
          assert.ok(
            references.described.every((item) => item.text !== undefined),
            name,
          )
          for (const message of messages)
            assert.ok(
              references.described.some((item) => item.text === message),
              `${name}: ${message}`,
            )
        }
        await expect(
          area.getByRole('textbox', { name: 'No description', exact: true }),
        ).not.toHaveAttribute('aria-describedby')
        await expect(
          area.getByRole('checkbox', { name: 'Standalone check', exact: true }),
        ).not.toHaveAttribute('aria-labelledby')
        await expect(
          area.getByRole('checkbox', { name: 'Span check', exact: true }),
        ).toHaveCount(1)
        assert.equal(
          await area
            .getByText('Span check', { exact: true })
            .getAttribute('for'),
          null,
        )
        return area
      }
      await test('Server markup provides the same values, labels and controls before and after attachment', async () => {
        const help = await name.evaluate((node) =>
          (node.getAttribute('aria-describedby') ?? '')
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent)
            .join(' '),
        )
        assert.ok(help.includes('Enter a record name.'))
        await expectValue(name, 'Draft record')
        await expectValue(category, 'General')
        await expect(enabled).not.toBeChecked()
        assert.equal(
          await page.evaluate(() => Boolean(window.formContractFixture)),
          false,
        )
        await associations()
        const failed = new Promise((_, reject) =>
          page.once('pageerror', reject),
        )
        releaseScripts()
        await Promise.race([
          page.waitForSelector('html[data-hydrated="true"]'),
          failed,
        ])
        report.cssProvenance = await reviewCssProvenance(
          page,
          process.env.BENCH_URL ?? server.url,
        )
        assert.equal(await retained(), true)
        assert.deepEqual((await snapshot()).requests, [])
        assert.equal(
          await page.evaluate(
            () => window.formContractFixture.capture().lifecycle.changes,
          ),
          0,
        )
        await phase('idle')
        await associations()
      })
      await test('Hydrated controls request each edit once and only explicit Save validates or submits', async () => {
        await name.fill('Hydrated record')
        await name.press('Enter')
        await selectValue(category, 'Research')
        await enabled.focus()
        await page.keyboard.press('Space')
        await expect(enabled).toBeChecked()
        assert.deepEqual((await snapshot()).requests, [])
        assert.equal(
          await page.evaluate(
            () => window.formContractFixture.capture().lifecycle.changes,
          ),
          3,
        )
        await name.fill('')
        await save.press('Enter')
        await phase('invalid')
        await expect(name).toBeFocused()
        await expect(name).toHaveAttribute('aria-invalid', 'true')
        const descriptions = await name.evaluate((node) =>
          (node.getAttribute('aria-describedby') ?? '')
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent)
            .join(' '),
        )
        assert.ok(descriptions.includes('Enter a name.'))
        assert.deepEqual(
          (await snapshot()).requests.map((request) => request.stage),
          ['validation'],
        )
        await name.fill('Saved after hydration')
        await save.press('Space')
        await phase('success')
        await phase('Unchanged')
        assert.deepEqual(
          (await snapshot()).requests.map((request) => request.stage),
          ['validation', 'validation', 'submission'],
        )
        assert.equal(await retained(), true)
      })
      await test('Server rejections and unexpected failures remain accessible and allow explicit retry', async () => {
        const response = choiceControl(page, {
          name: 'Simulated response',
          exact: true,
        })
        const before = (await snapshot()).requests.length
        await selectValue(response, 'field-error')
        await save.click()
        await phase('rejected')
        await expect(name).toBeFocused()
        await expect(
          page.getByText('This name is already in use.', { exact: true }),
        ).toBeVisible()
        await selectValue(response, 'form-error')
        await save.click()
        await phase('rejected')
        await expect(page.getByRole('alert')).toHaveText(
          'The service rejected this record.',
        )
        await selectValue(response, 'failure')
        await save.click()
        await phase('error')
        await expect(page.getByRole('alert')).toHaveText(
          'The save failed. Try again.',
        )
        await selectValue(response, 'success')
        await save.click()
        await phase('success')
        await expect(page.getByRole('alert')).toHaveCount(0)
        assert.equal((await snapshot()).requests.length - before, 8)
        assert.equal(await retained(), true)
      })
      await test('Hydrated pending work deduplicates, cancels accepted edits and ignores old responses', async () => {
        await page.evaluate(() => window.formContractFixture.hold('submission'))
        await name.fill('First request')
        await save.click()
        await phase('submitting')
        assert.equal(
          await page.evaluate(() => {
            const form = window.formContractFixture.capture().form
            return form.submit() === form.submit()
          }),
          true,
        )
        const first = (await snapshot()).requests.at(-1).attempt
        await name.fill('Second request')
        await phase('idle')
        await save.click()
        await phase('submitting')
        const second = (await snapshot()).requests.at(-1).attempt
        assert.ok(second > first)
        await page.evaluate(
          (attempt) =>
            window.formContractFixture.complete(attempt, 'submission'),
          first,
        )
        await phase('submitting')
        await page.evaluate(
          (attempt) =>
            window.formContractFixture.complete(attempt, 'submission'),
          second,
        )
        await phase('success')
        await expectValue(name, 'Second request')
        assert.equal((await snapshot()).defaults.name, 'Second request')
        assert.equal(await retained(), true)
      })
      await test('External replacement and reset preserve hydrated nodes and application defaults', async () => {
        await page
          .getByRole('button', { name: 'Load other record', exact: true })
          .click()
        await name.fill('Unsaved edit')
        await page
          .getByRole('button', { name: 'Reset', exact: true })
          .press('Enter')
        await expectValue(name, 'External record')
        await expectValue(category, 'Research')
        await expect(enabled).toBeChecked()
        await phase('Unchanged')
        assert.equal(await retained(), true)
      })
      await test('Custom IDs and conditional descriptions update without replacing controls or retaining old references', async () => {
        const area = await associations()
        const text = area.getByRole('textbox', {
          name: 'Custom text',
          exact: true,
        })
        const check = area.getByRole('checkbox', {
          name: 'Custom check',
          exact: true,
        })
        const shared = choiceControl(area, {
          name: 'Shared field choice',
          exact: true,
        })
        const originalText = await text.elementHandle()
        const originalCheck = await check.elementHandle()
        const originalShared = await shared.elementHandle()
        await area
          .getByRole('button', { name: 'Change association IDs', exact: true })
          .click()
        await expect(text).toHaveAttribute('id', 'custom-input-b')
        await expect(check).toHaveAttribute('id', 'custom-check-b')
        await expect(shared).toHaveAttribute('id', 'custom-shared-choice-b')
        await associations()
        await area
          .getByRole('button', { name: 'Toggle association help', exact: true })
          .click()
        await area
          .getByRole('button', {
            name: 'Toggle association errors',
            exact: true,
          })
          .click()
        for (const [control, original] of [
          [text, originalText],
          [check, originalCheck],
          [shared, originalShared],
        ]) {
          await expect(control).toHaveAttribute(
            'aria-describedby',
            'external-description',
          )
          assert.equal(
            await control.evaluate(
              (node, original) => node === original,
              original,
            ),
            true,
          )
        }
        await area
          .getByRole('button', { name: 'Toggle association help', exact: true })
          .click()
        await area
          .getByRole('button', {
            name: 'Toggle association errors',
            exact: true,
          })
          .click()
        await associations()
        await originalText.dispose()
        await originalCheck.dispose()
        await originalShared.dispose()
      })
      await test('Six lifetimes release listeners, subscriptions and pending work without navigation', async () => {
        for (let index = 0; index < 6; index++) {
          const stage = index % 2 ? 'validation' : 'submission'
          await page.evaluate(
            (stage) => window.formContractFixture.hold(stage),
            stage,
          )
          await save.click()
          await phase(stage === 'validation' ? 'validating' : 'submitting')
          const result = await page.evaluate(async () => {
            const fixture = window.formContractFixture
            const old = fixture.capture()
            const pending = old.form.submit()
            const nodes = [
              ...document.querySelectorAll(
                'form input, form select, form button',
              ),
            ]
            fixture.stop()
            const reads = old.lifecycle.reads
            const changes = old.lifecycle.changes
            const requests = old.snapshot().requests.length
            const afterSnapshotReads = old.lifecycle.reads
            for (const node of nodes) {
              if ('value' in node) node.value = 'Detached value'
              node.dispatchEvent(new Event('input', { bubbles: true }))
              node.dispatchEvent(new Event('change', { bubbles: true }))
              node.click()
            }
            old.form.setValue('name', 'Detached edit')
            old.form.reset()
            old.form.cancel()
            const stale = await old.form.submit()
            old.complete()
            await Promise.resolve()
            await Promise.resolve()
            const finalReads = old.lifecycle.reads
            const state = old.snapshot()
            return {
              outcome: await pending,
              stale,
              cleanups: old.lifecycle.cleanups,
              changes,
              afterChanges: old.lifecycle.changes,
              requests,
              afterRequests: state.requests.length,
              aborted: state.requests.at(-1).aborted,
              afterSnapshotReads,
              finalReads,
              reads,
              detached: nodes.every((node) => !node.isConnected),
              remaining: document.querySelectorAll(
                '#root form, #root input, #root button',
              ).length,
            }
          })
          assert.deepEqual(result.outcome, { status: 'disposed' })
          assert.deepEqual(result.stale, { status: 'disposed' })
          assert.equal(result.cleanups, 1)
          assert.equal(result.afterChanges, result.changes)
          assert.equal(result.afterRequests, result.requests)
          assert.equal(result.aborted, true)
          assert.equal(result.finalReads, result.afterSnapshotReads)
          assert.equal(result.detached, true)
          assert.equal(result.remaining, 0)
          await page.evaluate(() => window.formContractFixture.start())
          await expectValue(name, 'Draft record')
          await expectValue(category, 'General')
          await expect(enabled).not.toBeChecked()
          assert.deepEqual((await snapshot()).requests, [])
          assert.equal(
            await page.evaluate(
              () => window.formContractFixture.capture().lifecycle.changes,
            ),
            0,
          )
        }
        await page.evaluate(() => window.formContractFixture.stop())
      })
      report.diagnostics = (
        await page.evaluate(() => window.formContractFixture.diagnostics())
      ).filter((event) => event.code !== 'HOT_SCOPE_TIME')
      assert.deepEqual(report.errors, [])
      assert.deepEqual(report.warnings, [])
      assert.deepEqual(report.diagnostics, [])
    } catch (error) {
      report.failure = errorText(error)
      report.failureDetails = errorDetails(error)
    } finally {
      const failed = await finalizeReport({
        report,
        output,
        cleanup: [
          { name: 'browser', close: () => browser?.close() },
          { name: 'diagnostic listeners', close: () => detachDiagnostics?.() },
          { name: 'static server', close: () => server?.close() },
        ],
      })
      if (failed) process.exitCode = 1
    }
  },
)
