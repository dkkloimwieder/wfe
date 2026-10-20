import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

async function initial(page) {
  await expect(page.locator('table')).toHaveCount(2)
  const toggle = page.getByRole('button', {
    name: 'Collapse Collection A',
    exact: true,
  })
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const id = await toggle.getAttribute('aria-controls')
  assert.equal(
    await page.locator('[data-child-row="alpha"]').getAttribute('id'),
    id,
  )
  await expect(
    page.locator('[data-generator-view="items-alpha"]'),
  ).toContainText('First item')
}
export const subtableChecks = {
  sizing: false,
  initial,
  server: initial,
  async review({ page, record }) {
    await record(
      'subtables: hydrated details retain child nodes and restore controls',
      async () => {
        const child = page.locator('[data-generator-view="items-alpha"] table')
        await child.evaluate((node) => {
          node.dataset.retained = 'yes'
        })
        const parent = page
          .locator('[data-generator-view="collections"] table')
          .first()
        await parent
          .locator(':scope > thead')
          .getByRole('button', { name: 'Sort by Name', exact: true })
          .click()
        await expect(child).toHaveAttribute('data-retained', 'yes')
        await page
          .getByRole('button', { name: 'Collapse Collection A', exact: true })
          .click()
        await expect(child).toHaveCount(0)
        const toggle = page.getByRole('button', {
          name: 'Expand Collection A',
          exact: true,
        })
        await expect(toggle).toBeFocused()
        await toggle.click()
        await expect(child).toBeVisible()
        await initial(page)
      },
    )
  },
}
