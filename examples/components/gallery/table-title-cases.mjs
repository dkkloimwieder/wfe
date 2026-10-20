import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function tableTitleCases({ page, url, record }) {
  await record(
    'table title: full pane, fixed header height and inert accent decoration',
    async () => {
      for (const scheme of [1, 2]) {
        for (const width of [1280, 390]) {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(`${url}?galleryPreview=table&scheme=${scheme}`)
          const table = page.locator('.table-workspace')
          const title = table.locator('.table-workspace-title-face')
          await expect(title).toHaveText('Records')
          const dimensions = await table.boundingBox()
          assert.deepEqual(dimensions, { x: 0, y: 0, width, height: 900 })
          const header = table.locator('.table-workspace-header')
          assert.equal((await header.boundingBox()).height, 41)
          assert.equal((await title.boundingBox()).height, 32)
          assert.equal(await title.getAttribute('role'), null)
          assert.equal(await title.getAttribute('tabindex'), null)
          await expect(title).toHaveCSS('cursor', 'default')
          const paint = await title.evaluate((node) => {
            const style = getComputedStyle(node)
            const backing = getComputedStyle(node, '::before')
            const header = node.closest('.table-workspace-header')
            return {
              text: style.color,
              neutral: style.getPropertyValue('--ui-sidebar-neutral').trim(),
              header: getComputedStyle(header).backgroundImage,
              pattern: backing.backgroundImage,
              opacity: backing.opacity,
              inset: backing.top,
              overflow: getComputedStyle(node.parentElement).overflow,
              angle: style.getPropertyValue('--ui-action-angle'),
            }
          })
          assert.match(paint.header, /radial-gradient/)
          assert.match(paint.pattern, /radial-gradient/)
          assert.notEqual(paint.header, paint.pattern)
          assert.equal(paint.opacity, '1')
          assert.equal(paint.inset, '-6px')
          assert.equal(paint.overflow, 'visible')
          assert.notEqual(paint.angle, '')
          await title.hover()
          assert.equal((await header.boundingBox()).height, 41)
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth),
            width,
          )
          if (width === 390) {
            await table
              .getByRole('button', { name: 'Table controls', exact: true })
              .click()
            const close = table.getByRole('button', {
              name: 'Close table controls',
              exact: true,
            })
            await expect(close).toBeVisible()
            await close.click()
            await expect(close).not.toBeVisible()
          }
        }
      }
      await page.setViewportSize({ width: 1280, height: 900 })
      for (const scheme of [1, 2]) {
        await page.goto(`${url}?gallery=table&scheme=${scheme}`)
        const title = page
          .frameLocator('.gallery-frame')
          .locator('.table-workspace-title-face')
        await expect(title).toBeVisible()
        const paint = (locator) =>
          locator.evaluate((node) => {
            const style = getComputedStyle(node, '::before')
            return { dots: style.backgroundImage, border: style.borderColor }
          })
        const expected = await paint(title)
        const selected = page
          .getByRole('navigation', { name: 'Component catalog' })
          .locator('a[aria-current="page"]')
        assert.deepEqual(await paint(selected), expected)
        assert.deepEqual(
          await paint(page.locator('.ui-sidebar-group .ui-button').first()),
          expected,
        )
      }
    },
  )
}
