import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewRecordsWorkflow({
  browser,
  url,
  hydration,
  report,
  record,
}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', (error) => report.errors.push(error.message))
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type()))
      report.warnings.push(message.text())
  })
  await page.addInitScript(() => {
    window.recordHistoryListeners = new Set()
    const add = window.addEventListener
    const remove = window.removeEventListener
    window.addEventListener = function (name, listener, ...rest) {
      if (name === 'popstate') window.recordHistoryListeners.add(listener)
      return add.call(this, name, listener, ...rest)
    }
    window.removeEventListener = function (name, listener, ...rest) {
      if (name === 'popstate') window.recordHistoryListeners.delete(listener)
      return remove.call(this, name, listener, ...rest)
    }
    window.recordReplaceCalls = 0
    const replace = history.replaceState
    history.replaceState = function (...args) {
      window.recordReplaceCalls++
      return replace.apply(this, args)
    }
  })
  const diagnostics = async () => {
    assert.deepEqual(
      (await page.evaluate(() => window.generatorFixture.diagnostics())).filter(
        (event) => event.code !== 'HOT_SCOPE_TIME',
      ),
      [],
    )
  }
  const attached = async () => {
    if (!hydration) return
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true')
    assert.equal(
      await page.evaluate(() =>
        window.generatorServerNodes.every((node) => node.isConnected),
      ),
      true,
    )
  }
  try {
    await page.goto(`${url}/?app=records`)
    await attached()
    await record(
      'ordinary records uses a full-width table and application row actions',
      async () => {
        await expect(page.locator('tbody tr')).toHaveCount(2)
        await expect(
          page.getByRole('button', { name: 'View Sample record', exact: true }),
        ).toBeVisible()
        await expect(
          page.getByRole('button', { name: 'Edit Second record', exact: true }),
        ).toBeVisible()
        await expect(page.locator('form')).toHaveCount(0)
        await expect(page.getByLabel('Cell note', { exact: true })).toHaveCount(
          0,
        )
        await expect(
          page.getByRole('button', {
            name: /Revise description|Remove editor/,
          }),
        ).toHaveCount(0)
        const width = await page
          .locator('.record-table-screen')
          .evaluate((node) => node.getBoundingClientRect().width)
        assert.ok(width > 1240)
        await page.evaluate(() => {
          window.recordOriginalTable = document.querySelector('table')
        })
      },
    )
    let state, scroll
    await record(
      'View and browser Back preserve table state, scroll, nodes and action focus',
      async () => {
        await page
          .getByRole('button', { name: 'Sort by Name', exact: true })
          .click()
        await page
          .getByRole('button', { name: 'Sort by Name', exact: true })
          .click()
        await page
          .getByRole('button', { name: 'Table controls', exact: true })
          .click()
        await expect(
          page.locator('summary').filter({ hasText: /^Actions$/i }),
        ).toHaveCount(0)
        await page.evaluate(() => window.generatorFixture.workflowColumns())
        await page.locator('.table-scroll').evaluate((node) => {
          node.scrollLeft = node.scrollWidth
        })
        scroll = await page
          .locator('.table-scroll')
          .evaluate((node) => node.scrollLeft)
        assert.ok(scroll > 0)
        state = (await page.evaluate(() => window.generatorFixture.snapshot()))
          .table
        assert.deepEqual(state.sorting, [{ id: 'name', desc: true }])
        await page
          .getByRole('button', { name: 'View Second record', exact: true })
          .click()
        await expect(
          page.getByRole('heading', { name: 'Second record', exact: true }),
        ).toBeFocused()
        await expect(page.locator('.record-details')).toContainText(
          'Another note',
        )
        await expect(
          page
            .locator('.record-details')
            .getByRole('img', { name: 'No', exact: true }),
        ).toHaveCount(1)
        await expect(page.locator('form')).toHaveCount(0)
        await expect(page.locator('.record-table-screen')).toBeHidden()
        await expect(page.locator('.record-table-screen')).toHaveAttribute(
          'inert',
          '',
        )
        await page.goBack()
        await expect(
          page.getByRole('button', { name: 'View Second record', exact: true }),
        ).toBeFocused()
        assert.deepEqual(
          (await page.evaluate(() => window.generatorFixture.snapshot())).table,
          state,
        )
        assert.ok(
          Math.abs(
            (await page
              .locator('.table-scroll')
              .evaluate((node) => node.scrollLeft)) - scroll,
          ) <= 1,
        )
        assert.equal(
          await page.evaluate(
            () =>
              document.querySelector('table') === window.recordOriginalTable,
          ),
          true,
        )
      },
    )
    await record(
      'Edit targets the second record and Back/Forward discards unsaved drafts',
      async () => {
        await page
          .getByRole('button', { name: 'Edit Second record', exact: true })
          .click()
        const name = page.locator('form').getByLabel('Name', { exact: true })
        const quantity = page
          .locator('form')
          .getByLabel('Quantity', { exact: true })
        await expect(name).toHaveValue('Second record')
        await expect(quantity).toHaveValue('5')
        await expect(
          page.getByRole('checkbox', { name: 'Active', exact: true }),
        ).not.toBeChecked()
        await expect(
          page.getByRole('switch', { name: 'Alerts', exact: true }),
        ).toBeChecked()
        await expect(page.getByLabel('Notes', { exact: true })).toHaveValue(
          'Another note',
        )
        assert.equal(
          (await page.evaluate(() => window.generatorFixture.snapshot())).values
            .category,
          'b',
        )
        await name.fill('Updated second')
        await quantity.fill('7')
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(page.getByRole('status')).toHaveText('Saved.')
        const rows = (
          await page.evaluate(() => window.generatorFixture.snapshot())
        ).rows
        assert.equal(rows['record-1'].name, 'Updated second')
        assert.equal(rows['record-1'].quantity, 7)
        assert.equal(rows['record-0'].name, 'Sample record')
        assert.equal(rows['record-0'].quantity, 2)
        await page.goBack()
        await expect(
          page.getByRole('button', {
            name: 'Edit Updated second',
            exact: true,
          }),
        ).toBeFocused()
        assert.equal(
          await page.evaluate(
            () =>
              document.querySelector('table') === window.recordOriginalTable,
          ),
          true,
        )
        await page.goForward()
        await expect(name).toHaveValue('Updated second')
        await expect(quantity).toHaveValue('7')
        await name.fill('Discard this')
        await quantity.fill('-')
        await page.goBack()
        await page.goForward()
        await expect(name).toHaveValue('Updated second')
        await expect(quantity).toHaveValue('7')
        await expect(quantity).not.toHaveAttribute('data-ui-invalid-input')
        assert.equal(await page.evaluate(() => window.recordReplaceCalls), 0)
      },
    )
    await diagnostics()
    await record(
      'breadcrumb links preserve URL context, native activation, history and retained table state',
      async () => {
        await page.goto(`${url}/?app=records&context=kept#review`)
        await attached()
        await page
          .getByRole('button', { name: 'Sort by Name', exact: true })
          .click()
        const table = await page.locator('table').elementHandle()
        const before = (
          await page.evaluate(() => window.generatorFixture.snapshot())
        ).table
        await page
          .getByRole('button', { name: 'Edit Second record', exact: true })
          .click()
        const nav = page.getByRole('navigation', {
          name: 'Record navigation',
          exact: true,
        })
        const view = nav.getByRole('link', {
          name: 'Second record',
          exact: true,
        })
        const expected = new URL(page.url())
        expected.searchParams.set('screen', 'view')
        assert.equal(
          await view.getAttribute('href'),
          expected.pathname + expected.search + expected.hash,
        )
        await expect(nav.locator('[aria-current="page"]')).toHaveText('Edit')
        const draft = page.locator('form').getByLabel('Name', { exact: true })
        await draft.fill('Unsaved breadcrumb draft')
        const originalUrl = page.url()
        const originalState = await page.evaluate(() =>
          window.generatorFixture.snapshot(),
        )
        await view.evaluate((link) => {
          window.breadcrumbNativeClick = undefined
          const listener = (event) => {
            if (!link.contains(event.target) || !event.ctrlKey) return
            window.breadcrumbNativeClick = {
              ctrlKey: event.ctrlKey,
              preventedByApplication: event.defaultPrevented,
              href: link.href,
              tag: link.tagName,
            }
            // Observe the application handler before stopping browser navigation in this test.
            event.preventDefault()
          }
          document.addEventListener('click', listener)
          window.releaseBreadcrumbClick = () =>
            document.removeEventListener('click', listener)
        })
        let native
        try {
          await view.click({ modifiers: ['Control'] })
          native = await page.evaluate(() => window.breadcrumbNativeClick)
        } finally {
          await page.evaluate(() => {
            window.releaseBreadcrumbClick?.()
            delete window.releaseBreadcrumbClick
            delete window.breadcrumbNativeClick
          })
        }
        assert.deepEqual(native, {
          ctrlKey: true,
          preventedByApplication: false,
          href: expected.href,
          tag: 'A',
        })
        assert.equal(page.url(), originalUrl)
        assert.deepEqual(
          await page.evaluate(() => window.generatorFixture.snapshot()),
          originalState,
        )
        // Exercise the captured destination separately from native new-tab transport.
        const destination = await browser.newPage()
        destination.on('pageerror', (error) =>
          report.errors.push(error.message),
        )
        destination.on('console', (message) => {
          if (['warning', 'error'].includes(message.type()))
            report.warnings.push(message.text())
        })
        try {
          await destination.goto(native.href)
          await expect(destination).toHaveURL(expected.href)
          if (hydration)
            await expect(destination.locator('html')).toHaveAttribute(
              'data-hydrated',
              'true',
            )
          await expect(
            destination.getByRole('heading', {
              name: 'Second record',
              exact: true,
            }),
          ).toBeVisible()
          await expect(destination.locator('.record-details')).toBeVisible()
          await expect(destination.locator('form')).toHaveCount(0)
        } finally {
          await destination.close()
        }
        await expect(draft).toHaveValue('Unsaved breadcrumb draft')
        await view.click()
        await expect(page.locator('form')).toHaveCount(0)
        await expect(nav.locator('[aria-current="page"]')).toHaveText(
          'Second record',
        )
        await page.goBack()
        await expect(draft).toHaveValue('Second record')
        await page.goForward()
        await expect(page.locator('form')).toHaveCount(0)
        await nav.getByRole('link', { name: 'Records', exact: true }).click()
        assert.equal(new URL(page.url()).searchParams.get('context'), 'kept')
        assert.equal(new URL(page.url()).searchParams.has('screen'), false)
        assert.equal(
          await table.evaluate(
            (node) => node === document.querySelector('table'),
          ),
          true,
        )
        assert.deepEqual(
          (await page.evaluate(() => window.generatorFixture.snapshot())).table,
          before,
        )
        await page.goBack()
        await expect(nav.locator('[aria-current="page"]')).toHaveText(
          'Second record',
        )
        await page.goForward()
        await expect(page.locator('.record-table-screen')).toBeVisible()
        await table.dispose()
        await diagnostics()
      },
    )
    await record(
      'direct record URLs match server output and hydration',
      async () => {
        for (const screen of ['view', 'edit']) {
          const target = `${url}/?app=records&screen=${screen}&record=record-1`
          if (hydration) {
            const context = await browser.newContext({
              javaScriptEnabled: false,
            })
            try {
              const server = await context.newPage()
              await server.goto(target)
              await expect(
                server.getByRole('heading', {
                  name: 'Second record',
                  exact: true,
                }),
              ).toBeVisible()
              await expect(server.locator('.record-table-screen')).toBeHidden()
              if (screen === 'edit')
                await expect(
                  server.locator('form').getByLabel('Name', { exact: true }),
                ).toHaveValue('Second record')
              else await expect(server.locator('form')).toHaveCount(0)
            } finally {
              await context.close()
            }
          }
          await page.goto(target)
          await attached()
          await expect(
            page.getByRole('heading', { name: 'Second record', exact: true }),
          ).toBeVisible()
          if (screen === 'edit')
            await expect(
              page.locator('form').getByLabel('Quantity', { exact: true }),
            ).toHaveValue('5')
          await diagnostics()
        }
      },
    )
    await record(
      'missing record URLs recover without replace navigation',
      async () => {
        await page.goto(`${url}/?app=records&screen=view&record=missing`)
        await attached()
        await expect(page.getByRole('alert')).toHaveText('Record not found')
        await expect(page.locator('form')).toHaveCount(0)
        await page.getByRole('link', { name: 'Records', exact: true }).click()
        await expect(
          page.getByRole('button', { name: 'Edit Sample record', exact: true }),
        ).toBeVisible()
        assert.equal(await page.evaluate(() => window.recordReplaceCalls), 0)
        await diagnostics()
      },
    )
    await record(
      'ordinary records and editor fit small screens and release navigation listeners',
      async () => {
        // Restore natural column widths with a fresh application for the narrow review.
        await page.goto(`${url}/?app=records`)
        await attached()
        await page.setViewportSize({ width: 320, height: 844 })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        )
        await page
          .getByRole('button', { name: 'Edit Second record', exact: true })
          .click()
        await expect(
          page.locator('form').getByLabel('Name', { exact: true }),
        ).toHaveValue('Second record')
        const panelHeight = await page
          .locator('[data-generator-panel="records-panel"]')
          .evaluate((panel) => {
            const main = panel.closest('main')
            const style = getComputedStyle(main)
            return {
              actual: panel.getBoundingClientRect().height,
              available:
                main.clientHeight -
                parseFloat(style.paddingTop) -
                parseFloat(style.paddingBottom),
            }
          })
        assert.ok(
          Math.abs(panelHeight.actual - panelHeight.available) < 2,
          JSON.stringify(panelHeight),
        )
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        )
        assert.equal(
          await page.evaluate(() => window.recordHistoryListeners.size),
          1,
        )
        await page.evaluate(() => window.generatorFixture.stop())
        assert.equal(
          await page.evaluate(() => window.recordHistoryListeners.size),
          0,
        )
        await page.evaluate(() =>
          window.dispatchEvent(new PopStateEvent('popstate')),
        )
        await expect(page.locator('#root table, #root form')).toHaveCount(0)
        await diagnostics()
      },
    )
  } finally {
    await page.close()
  }
}
