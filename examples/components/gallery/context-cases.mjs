import { artifactPath } from '../../../scripts/artifacts.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { reviewContexts } from '../../shared/controls/context-review.mjs'

export async function contextCases({ page, url, record }) {
  await record(
    'contexts: controlled siblings, parent navigation, search, focus and compact menus',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?contexts=1`)
      await reviewContexts(page)
      await page.setViewportSize({ width: 390, height: 844 })
      await page
        .getByRole('button', { name: 'Context navigation', exact: true })
        .click()
      await page.getByRole('button', { name: /^Change context:/ }).click()
      const popup = page.locator('.ui-sidebar-context-popup')
      await expect(popup.getByRole('textbox')).toBeFocused()
      const bounds = await popup.boundingBox()
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= 390,
        'context choices remain reachable on a phone',
      )
      await popup.getByRole('textbox').press('Escape')
      await expect(
        page.getByRole('button', { name: /^Change context:/ }),
      ).toBeFocused()
      await page.screenshot({
        path: await artifactPath('wfe-context-phone.png'),
      })
      await page.getByRole('button', { name: /^Change context:/ }).click()
      await page.evaluate(() => window.contextFixture.stop())
      await expect(page.locator('.ui-sidebar-context-popup')).toHaveCount(0)
      await expect(page.locator('[data-context-review]')).toHaveCount(0)
    },
  )
}
