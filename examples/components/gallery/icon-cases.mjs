import { expect } from '@playwright/test'
import { withCleanup } from '../../shared/browser/runner.mjs'
export async function iconCases({ page, url, record }) {
  await record(
    'gallery: a cold icon import shows pending content within its boundary',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      // Reset the module registry, then let the catalog boot before holding only
      // the lazy icon module. Core Vite startup is not part of the pending test.
      await page.goto(`${url}?gallery=fields`)
      const navigation = page.getByRole('navigation', {
        name: 'Component catalog',
        exact: true,
      })
      await expect(navigation).toBeVisible()
      await navigation.locator('summary', { hasText: /^Components$/ }).click()
      await expect(
        page.getByRole('textbox', { name: 'Find icons', exact: true }),
      ).toHaveCount(0)
      const matchesIconModule = (requestUrl) =>
        /\/IconsExample(?:-[^/]+\.js|\.tsx)$/.test(requestUrl.pathname)
      let release
      const held = new Promise((resolve) => {
        release = resolve
      })
      let intercepted = false
      let retainedNavigation
      const pendingImports = []
      const importFailures = []
      const holdImport = (route) => {
        intercepted = true
        const pending = held
          .then(() => route.fallback())
          .catch((error) => {
            importFailures.push(error)
          })
        pendingImports.push(pending)
        return pending
      }
      const releaseImports = async () => {
        release()
        await Promise.all(pendingImports)
        if (importFailures.length)
          throw new AggregateError(
            importFailures,
            'The held icon import failed',
          )
      }
      await page.route(matchesIconModule, holdImport)
      await withCleanup(async () => {
        retainedNavigation = await navigation.elementHandle()
        await navigation
          .getByRole('link', { name: 'Icons', exact: true })
          .click()
        await expect.poll(() => intercepted).toBe(true)
        const pending = page.getByRole('status', {
          name: 'Example loading',
          exact: true,
        })
        await expect(pending).toBeVisible()
        await expect(navigation).toBeVisible()
        await expect(
          page.getByRole('textbox', { name: 'Find icons', exact: true }),
        ).toHaveCount(0)
        await releaseImports()
        const search = page.getByRole('textbox', {
          name: 'Find icons',
          exact: true,
        })
        await expect(search).toBeVisible()
        await expect(pending).toHaveCount(0)
        await expect(navigation).toHaveJSProperty('isConnected', true)
        await expect
          .poll(() =>
            retainedNavigation.evaluate(
              (node) =>
                node ===
                document.querySelector('nav[aria-label="Component catalog"]'),
            ),
          )
          .toBe(true)
        await search.fill('no matching icon exists')
        await expect(
          page.getByRole('status', { name: 'Icon results', exact: true }),
        ).toHaveText('0 icons')
      }, [
        {
          name: 'held icon import',
          close: releaseImports,
        },
        {
          name: 'icon import route',
          close: () => page.unroute(matchesIconModule, holdImport),
        },
        {
          name: 'retained navigation handle',
          close: () => retainedNavigation?.dispose(),
        },
      ])
    },
  )
  await record(
    'gallery: icons search and selection preserve accessible controls',
    async () => {
      await page.goto(`${url}?gallery=icons`)
      const host = page.locator('.gallery-example-host')
      const list = host.getByRole('group', {
        name: 'Available icons',
        exact: true,
      })
      const search = host.getByRole('textbox', { name: 'Find icons' })
      await expect(list.getByRole('button')).toHaveCount(60)
      await host
        .getByRole('button', { name: 'More icons', exact: true })
        .click()
      await expect(list.getByRole('button')).toHaveCount(120)
      await search.fill('search')
      const choice = list.getByRole('button', { name: 'search', exact: true })
      await choice.focus()
      await page.keyboard.press('Enter')
      const preview = host.getByRole('button', {
        name: 'Selected icon preview',
      })
      await expect(preview).toHaveText('search')
      await expect(preview.locator('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
      await expect(preview.locator('svg')).toHaveAttribute('focusable', 'false')
      const searchGeometry = await preview.locator('svg').innerHTML()
      await search.fill('calendar')
      await list.getByRole('button', { name: 'calendar', exact: true }).click()
      await expect(preview).toHaveText('calendar')
      await expect(preview.locator('svg')).not.toHaveJSProperty(
        'innerHTML',
        searchGeometry,
      )
      await expect(host.locator('code').first()).toContainText('iconCalendar')
      await search.fill('no matching icon exists')
      await expect(list.getByRole('button')).toHaveCount(0)
      await expect(
        host.getByRole('status', { name: 'Icon results' }),
      ).toHaveText('0 icons')
      await expect(preview).toHaveText('calendar')
    },
  )
}
