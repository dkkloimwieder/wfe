import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function entryPanelCases({ page, url, record }) {
  await record(
    'entry panel: centered, responsive, scrollable and application-owned form',
    async () => {
      for (const scheme of [1, 2]) {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?galleryPreview=entry&scheme=${scheme}`)
        const frame = page.locator('.ui-entry-panel')
        const surface = page.locator('.ui-entry-panel-surface')
        await frame.evaluate((n) => (n.hidden = true))
        await expect(frame).toBeHidden()
        await frame.evaluate((n) => (n.hidden = false))
        const a = await frame.boundingBox(),
          b = await surface.boundingBox()
        assert.ok(Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 1)
        assert.ok(Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1)
        assert.ok(b.width <= 480 && b.height < 600)
        await page.getByLabel('Name', { exact: true }).fill('Ada')
        await page.getByLabel('Email', { exact: true }).fill('ada@example.test')
        await page
          .getByRole('button', { name: 'Continue', exact: true })
          .click()
        await expect(page.getByRole('status')).toHaveText(
          'Example submitted. No request was sent.',
        )
        await page.screenshot({ path: `/tmp/wfe-entry-${scheme}.png` })
        await page.setViewportSize({ width: 320, height: 220 })
        const bounds = await surface.boundingBox()
        assert.ok(bounds.x >= 8 && bounds.x + bounds.width <= 312)
        assert.ok(bounds.y >= 8, 'overflow starts below the reachable top edge')
        assert.equal(
          await frame.evaluate((n) => n.scrollWidth <= n.clientWidth),
          true,
        )
        await page.getByRole('button', { name: 'Clear', exact: true }).click()
        await expect(page.getByLabel('Name', { exact: true })).toHaveValue('')
        await expect(page.getByRole('status')).toBeEmpty()
      }
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=entry`)
      const frame = await page.locator('.ui-entry-panel').boundingBox()
      const stage = await page.locator('.gallery-stage').boundingBox()
      assert.ok(
        Math.abs(frame.height - stage.height) < 1,
        'container mode fills the available gallery pane',
      )
    },
  )
}
