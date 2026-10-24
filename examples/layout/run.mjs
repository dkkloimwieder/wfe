import { reviewThemeHost } from '../shared/appearance/host-review.mjs'
import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
  startStaticServer,
} from '../shared/browser/runner.mjs'
import { choiceControl } from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const directory = process.env.BENCH_DEVELOPMENT
  ? '.dist-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '.dist-package'
    : '.dist'
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
const output = process.env.BENCH_OUTPUT ?? 'test-results/layout.json'
const report = { cases: [], errors: [], warnings: [] }
let browser
let server
let detachDiagnostics
try {
  report.groups = selectGroups({ layout: true })
  const modules = JSON.parse(await readFile(assets + 'modules.json', 'utf8'))
  assert.ok(
    modules.some((id) =>
      id.includes(
        process.env.BENCH_DISTRIBUTION
          ? '/components/dist/source/layout/Dashboard.jsx'
          : '/components/src/layout/Dashboard.tsx',
      ),
    ),
  )
  server = await startStaticServer({
    assets,
    onServerError: (error) => {
      report.serverErrors ??= []
      report.serverErrors.push(error)
    },
  })
  browser = await launchBrowser({ chromium })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  detachDiagnostics = attachDiagnostics(page, report)
  await page.goto(server.url + '/')
  await page.waitForFunction(() => Boolean(window.layoutFixture))
  await reviewThemeHost(page)
  const test = async (name, run) => {
    await run()
    report.cases.push(name)
    console.log(`PASS ${name}`)
  }
  const toggle = page.getByRole('button', { name: 'Navigation', exact: true })
  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
    exact: true,
  })
  const main = page.getByRole('main', { name: 'Records', exact: true })
  await test('Desktop exposes caller landmarks and preserves all available height', async () => {
    assert.equal(await page.getByRole('banner').count(), 1)
    assert.equal(await navigation.count(), 1)
    await expect(toggle).toBeHidden()
    assert.equal((await page.locator('#shell').boundingBox()).height, 900)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      900,
    )
    const panels = page.locator('#grid .ui-dashboard-panel')
    assert.equal(
      (await panels.nth(0).boundingBox()).y,
      (await panels.nth(1).boundingBox()).y,
    )
  })
  await test('A table-sized scroller stays fixed for empty, small and large result sets', async () => {
    const before = await page.locator('#results').boundingBox()
    for (const count of [250, 0, 2]) {
      await page.evaluate(
        (count) => window.layoutFixture.replaceRows(count),
        count,
      )
      assert.deepEqual(await page.locator('#results').boundingBox(), before)
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollHeight),
        900,
      )
    }
  })
  await test('Narrow navigation preserves nodes and drafts and moves focus before hiding', async () => {
    const draft = page.getByRole('textbox', {
      name: 'Navigation draft',
      exact: true,
    })
    await draft.fill('Persistent draft')
    await page.evaluate(() => {
      window.layoutSavedDraft = document.querySelector(
        '[aria-label="Navigation draft"]',
      )
    })
    await page.setViewportSize({ width: 390, height: 800 })
    await expect(toggle).toBeFocused()
    assert.equal(await navigation.count(), 0)
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    )
    const panels = page.locator('#grid .ui-dashboard-panel')
    assert.ok(
      (await panels.nth(1).boundingBox()).y >
        (await panels.nth(0).boundingBox()).y,
    )
    const before = await main.boundingBox()
    await toggle.press('Enter')
    await expect(navigation).toBeVisible()
    assert.deepEqual(await main.boundingBox(), before)
    assert.equal(
      (await navigation.boundingBox()).y,
      (await page.getByRole('banner').boundingBox()).y +
        (await page.getByRole('banner').boundingBox()).height,
    )
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector('[aria-label="Navigation draft"]') ===
          window.layoutSavedDraft,
      ),
      true,
    )
    assert.equal(await draft.inputValue(), 'Persistent draft')
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).navigationMounts,
      1,
    )
  })
  await test('Escape and Close restore focus and the nonmodal panel leaves content usable', async () => {
    await page
      .getByRole('textbox', { name: 'Navigation draft', exact: true })
      .focus()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(navigation).toBeHidden()
    await toggle.press('Space')
    await page.locator('#results').focus()
    await expect(page.locator('#results')).toBeFocused()
    assert.equal(await page.locator('main[inert]').count(), 0)
    await page.keyboard.press('Escape')
    await expect(navigation).toBeVisible()
    await page
      .getByRole('button', { name: 'Close navigation', exact: true })
      .click()
    await expect(toggle).toBeFocused()
    await expect(navigation).toBeHidden()
  })
  await test('Application navigation owns activation and can close the panel', async () => {
    await toggle.click()
    await page
      .getByRole('button', { name: 'Open reports', exact: true })
      .click()
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).visits,
      1,
    )
    await expect(toggle).toBeFocused()
    await expect(navigation).toBeHidden()
  })
  await test('Returning to desktop restores visible focus without remounting navigation', async () => {
    await toggle.focus()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(navigation).toBeFocused()
    assert.equal(
      await page
        .getByRole('textbox', { name: 'Navigation draft', exact: true })
        .inputValue(),
      'Persistent draft',
    )
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).navigationMounts,
      1,
    )
  })
  await test('Application removal releases navigation refs before a later resize', async () => {
    await page
      .getByRole('textbox', { name: 'Navigation draft', exact: true })
      .focus()
    await page.evaluate(() => {
      window.staleNavigationFocus = 0
      const oldToggle = document.querySelector('.ui-dashboard-toggle')
      oldToggle.focus = () => {
        window.staleNavigationFocus++
      }
      window.layoutFixture.configure({ navigation: false })
      window.staleNavigationReads = 0
      const computedStyle = window.getComputedStyle
      window.getComputedStyle = (node, ...args) => {
        if (node === oldToggle) window.staleNavigationReads++
        return computedStyle.call(window, node, ...args)
      }
      try {
        window.layoutFixture.close()
      } finally {
        window.getComputedStyle = computedStyle
      }
    })
    await page.setViewportSize({ width: 390, height: 800 })
    assert.equal(await page.evaluate(() => window.staleNavigationFocus), 0)
    assert.equal(await page.evaluate(() => window.staleNavigationReads), 0)
    assert.equal(await navigation.count(), 0)
    assert.equal(await toggle.count(), 0)
    await page.evaluate(() =>
      window.layoutFixture.configure({ navigation: true }),
    )
    await expect(toggle).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
  })
  await test('Main owns scrolling when the application selects main scrolling', async () => {
    await page.evaluate(() => {
      window.layoutFixture.configure({ scroll: 'main' })
      const tall = document.createElement('div')
      tall.id = 'tall'
      tall.style.height = '1600px'
      tall.style.flexShrink = '0'
      document.querySelector('main').append(tall)
    })
    assert.equal(
      await main.evaluate((node) => getComputedStyle(node).overflowY),
      'auto',
    )
    assert.ok(
      await main.evaluate((node) => node.scrollHeight > node.clientHeight),
    )
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      900,
    )
    await page.evaluate(() => {
      document.getElementById('tall').remove()
      window.layoutFixture.configure({ scroll: 'content' })
    })
  })
  await test('Shared density and theme reach panels and controls without changing shell height', async () => {
    await page.evaluate(() =>
      window.layoutFixture.configure({ density: 'comfortable', theme: 'dark' }),
    )
    assert.equal(
      await page.locator('#shell').getAttribute('data-ui-density'),
      'comfortable',
    )

    assert.equal((await page.locator('#shell').boundingBox()).height, 900)
  })
  await test('Disposal removes listeners and refuses stale navigation callbacks', async () => {
    await page.setViewportSize({ width: 390, height: 800 })
    await toggle.click()
    await page.evaluate(() => {
      const oldToggle = document.querySelector('.ui-dashboard-toggle')
      const oldNavigation = document.querySelector('nav')
      window.layoutFixture.stop()
      window.layoutFixture.close()
      oldToggle.click()
      oldNavigation.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    assert.equal(await page.locator('#root').textContent(), '')
    const counts = await page.evaluate(() => window.layoutFixture.read())
    assert.equal(counts.navigationMounts, counts.navigationCleanups)
  })
  await test('The shell also supports no navigation and retains full content width', async () => {
    await page.evaluate(() => window.layoutFixture.start(false))
    assert.equal(await page.getByRole('navigation').count(), 0)
    assert.equal(await toggle.count(), 0)
    assert.equal((await main.boundingBox()).width, 1280)
  })
  await test('An outer UI scope preserves shell columns and narrow content width', async () => {
    await page.evaluate(() => {
      document.getElementById('root').setAttribute('data-ui', '')
      window.layoutFixture.start()
    })
    const sidebar = await navigation.boundingBox()
    assert.equal((await main.boundingBox()).width, 1280 - sidebar.width)
    await page.setViewportSize({ width: 390, height: 800 })
    try {
      await expect
        .poll(async () => (await main.boundingBox())?.width, { timeout: 7000 })
        .toBe(390)
    } catch (error) {
      report.resizeFailure = await main
        .evaluate((node) => {
          const shell = node.closest('.ui-dashboard')
          return {
            viewport: innerWidth,
            mainWidth: node.getBoundingClientRect().width,
            shellWidth: shell?.getBoundingClientRect().width,
            attributes: shell
              ? Object.fromEntries(
                  [...shell.attributes].map(({ name, value }) => [name, value]),
                )
              : {},
            columns: shell
              ? getComputedStyle(shell).gridTemplateColumns
              : undefined,
            navigationWidth: shell
              ?.querySelector('.ui-dashboard-navigation')
              ?.getBoundingClientRect().width,
          }
        })
        .catch((diagnosticError) => ({ error: String(diagnosticError) }))
      throw error
    }
    assert.equal((await main.boundingBox()).width, 390)
    assert.equal(await navigation.count(), 0)
  })
  await test('A large virtual Table keeps bounded rows and scrolls within the dashboard', async () => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.evaluate(() => window.layoutFixture.start())
    const results = page.locator('#results')
    const original = await results.boundingBox()
    await page.evaluate(() => window.layoutFixture.replaceRows(100000))
    await expect
      .poll(() => page.locator('tr[data-row]').count())
      .toBeGreaterThan(1)
    assert.ok((await page.locator('tr[data-row]').count()) < 100)
    assert.deepEqual(await results.boundingBox(), original)
    await results.evaluate((node) => {
      node.scrollTop = node.scrollHeight
      node.scrollLeft = node.scrollWidth
    })
    await expect(page.locator('tr[data-row="99999"]')).toBeVisible()
    assert.ok((await page.locator('tr[data-row]').count()) < 100)
    const last = await page.locator('tr[data-row="99999"]').boundingBox()
    const viewport = await results.boundingBox()
    assert.ok(last.y + last.height <= viewport.y + viewport.height + 1)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      1280,
    )
    for (const count of [0, 2, 100000]) {
      await page.evaluate(
        (count) => window.layoutFixture.replaceRows(count),
        count,
      )
      assert.deepEqual(await results.boundingBox(), original)
    }
  })
  await test('Virtual row sizes follow density and remain contained at narrow widths', async () => {
    for (const [density, height] of [
      ['compact', 32],
      ['comfortable', 40],
    ]) {
      await page.evaluate(
        (density) => window.layoutFixture.configure({ density, theme: 'dark' }),
        density,
      )
      await page.setViewportSize({ width: 390, height: 800 })
      const results = page.locator('#results')
      await results.evaluate((node) => {
        node.scrollTop = 0
        node.scrollLeft = 0
      })
      await expect(page.locator('tr[data-row="0"]')).toBeVisible()
      await expect
        .poll(
          async () =>
            (await page.locator('tr[data-row="0"]').boundingBox()).height,
        )
        .toBe(height)
      assert.ok((await page.locator('tr[data-row]').count()) < 100)
      await results.evaluate((node) => {
        node.scrollLeft = node.scrollWidth
      })
      assert.ok(await results.evaluate((node) => node.scrollLeft > 0))
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      )
      assert.equal(
        await page
          .locator('#shell')
          .evaluate((node) => node.getBoundingClientRect().height),
        800,
      )
    }
  })
  await test('A navigation popup handles Escape before the shell and inherits the live theme', async () => {
    await page.evaluate(() => window.layoutFixture.start())
    await page.setViewportSize({ width: 390, height: 800 })
    await toggle.click()
    const help = page.getByRole('button', {
      name: 'Navigation help',
      exact: true,
    })
    await help.click()
    const popup = page.locator('.ui-popover')
    await expect(popup).toBeVisible()
    await page.evaluate(() =>
      window.layoutFixture.configure({ theme: 'dark', density: 'comfortable' }),
    )

    assert.equal(
      await popup.evaluate((node) => Boolean(node.closest('#shell'))),
      true,
    )
    await page.getByRole('button', { name: 'Close help', exact: true }).focus()
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
    await expect(help).toBeFocused()
    await expect(navigation).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(navigation).toBeHidden()
    await expect(toggle).toBeFocused()
  })
  await test('Dialog and nested popup retain focus, theme, and table geometry across resizing', async () => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.evaluate(() => window.layoutFixture.start())
    const trigger = page.getByRole('button', {
      name: 'Workspace preferences',
      exact: true,
    })
    const desktopReady = async () => {
      await expect(page.locator('#shell')).toHaveAttribute(
        'data-ui-responsive-ready',
        '',
      )
      await expect(page.locator('#shell')).not.toHaveAttribute(
        'data-navigation-drawer',
        '',
      )
      await expect(navigation).toBeVisible()
      await expect(toggle).toBeHidden()
    }
    await desktopReady()
    const before = await page.locator('#results').boundingBox()
    await trigger.press('Enter')
    const dialog = page.getByRole('dialog', {
      name: 'Workspace preferences',
      exact: true,
    })
    await expect(dialog).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Preference draft', exact: true }),
    ).toBeFocused()
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab')
      await expect
        .poll(() =>
          dialog.evaluate((node) => node.contains(document.activeElement)),
        )
        .toBe(true)
    }
    await page
      .getByRole('button', { name: 'Preference help', exact: true })
      .click()
    await expect(page.locator('.ui-popover')).toBeVisible()
    await page
      .getByRole('button', { name: 'Close preference help', exact: true })
      .focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('.ui-popover')).toBeHidden()
    await expect(
      page.getByRole('button', { name: 'Preference help', exact: true }),
    ).toBeFocused()
    await expect(dialog).toBeVisible()
    await page.evaluate(() =>
      window.layoutFixture.configure({ theme: 'dark', density: 'comfortable' }),
    )

    await page.setViewportSize({ width: 390, height: 800 })
    assert.equal(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
      true,
    )
    const bounds = await dialog.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.evaluate(() =>
      window.layoutFixture.configure({ density: 'compact' }),
    )
    await desktopReady()
    assert.deepEqual(await page.locator('#results').boundingBox(), before)
  })
  await test('Disposal with an open dialog releases portals and page locks', async () => {
    await page
      .getByRole('button', { name: 'Workspace preferences', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.evaluate(() => window.layoutFixture.stop())
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.locator('.ui-dialog-portal, .ui-popup-portal'),
    ).toHaveCount(0)
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
    assert.equal(
      await page.locator('#root[aria-hidden="true"], #root[inert]').count(),
      0,
    )
    await page.setViewportSize({ width: 390, height: 800 })
    assert.equal(await page.locator('#root').textContent(), '')
  })
  await test('Organization bands share menu insets and content fills the main region', async () => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.evaluate(() => {
      window.layoutFixture.start()
      window.layoutFixture.configure({ context: true, footer: true })
    })
    const geometry = await page.locator('#shell').evaluate((shell) => {
      const box = (selector) => {
        const node = shell.querySelector(selector),
          rect = node.getBoundingClientRect()
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          padding: getComputedStyle(node).paddingLeft,
        }
      }
      return {
        header: box('header'),
        footer: box('footer'),
        menu: box('.ui-dashboard-navigation'),
        context: box('.ui-dashboard-context'),
        main: box('main'),
      }
    })
    assert.equal(geometry.header.left, 0)
    assert.equal(geometry.header.right, 1280)
    assert.equal(geometry.footer.left, 0)
    assert.equal(geometry.footer.right, 1280)
    assert.equal(geometry.menu.right, geometry.context.left)
    assert.equal(geometry.context.right, geometry.main.left)
    assert.equal(geometry.header.bottom, geometry.main.top)
    assert.equal(geometry.footer.top, geometry.main.bottom)

    await page.evaluate(() =>
      window.layoutFixture.configure({ scroll: 'main' }),
    )

    await page.evaluate(() =>
      window.layoutFixture.configure({ scroll: 'content' }),
    )
    assert.equal(await page.locator('footer').textContent(), '')
  })
  await test('Context drafts survive responsive drawers and only one menu opens at a time', async () => {
    const context = page.getByRole('navigation', {
      name: 'Context navigation',
      exact: true,
    })
    const primary = page.getByRole('navigation', {
      name: 'Primary navigation',
      exact: true,
    })
    const contextToggle = page.getByRole('button', {
      name: 'Context',
      exact: true,
    })
    const menuToggle = page.getByRole('button', {
      name: 'Navigation',
      exact: true,
    })
    const draft = context.getByRole('textbox', {
      name: 'Context draft',
      exact: true,
    })
    await draft.fill('Retained context')
    const original = await draft.elementHandle()
    await page.setViewportSize({ width: 900, height: 844 })
    await expect(context).toBeHidden()
    await expect(contextToggle).toBeFocused()
    await expect(primary).toBeVisible()
    await contextToggle.click()
    await expect(draft).toHaveValue('Retained context')
    assert.equal(
      await draft.evaluate((node, before) => node === before, original),
      true,
    )
    await page.setViewportSize({ width: 320, height: 844 })
    await menuToggle.click()
    await expect(primary).toBeVisible()
    await expect(context).toBeHidden()
    await expect(contextToggle).toHaveAttribute('aria-expanded', 'false')
    await contextToggle.click()
    await expect(primary).toBeHidden()
    await expect(context).toBeVisible()
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
    await draft.focus()
    await page.keyboard.press('Escape')
    await expect(context).toBeHidden()
    await expect(contextToggle).toBeFocused()
    await contextToggle.click()
    await choiceControl(page, { name: 'Context choice', exact: true }).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(context).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(context).toBeHidden()
    await expect(contextToggle).toBeFocused()
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(draft).toHaveValue('Retained context')
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).contextMounts,
      1,
    )
  })
  await test('Portaled context focus returns safely on breakpoint changes and context removal', async () => {
    const context = page.getByRole('navigation', {
      name: 'Context navigation',
      exact: true,
    })
    const toggle = page.getByRole('button', { name: 'Context', exact: true })
    await choiceControl(page, { name: 'Context choice', exact: true }).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.setViewportSize({ width: 900, height: 844 })
    await expect(toggle).toBeFocused()
    await expect(context).toBeHidden()
    await page.keyboard.press('Escape')
    await toggle.click()
    await choiceControl(page, { name: 'Context choice', exact: true }).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.evaluate(() =>
      window.layoutFixture.configure({ context: false }),
    )
    await expect(context).toHaveCount(0)
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await expect(page.getByRole('main')).toBeFocused()
    await expect(
      page.getByRole('contentinfo', { name: 'Workspace footer', exact: true }),
    ).toBeVisible()
    await page.evaluate(() => window.layoutFixture.stop())
    const counts = await page.evaluate(() => window.layoutFixture.read())
    assert.equal(counts.contextMounts, counts.contextCleanups)
    assert.equal(counts.navigationMounts, counts.navigationCleanups)
  })
  const diagnostics = await page.evaluate(() =>
    window.layoutFixture.diagnostics(),
  )
  report.timingDiagnostics = diagnostics.filter(
    (event) => event.code === 'HOT_SCOPE_TIME',
  )
  report.diagnostics = diagnostics.filter(
    (event) => event.code !== 'HOT_SCOPE_TIME',
  )
  assert.deepEqual(report.diagnostics, [])
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
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
