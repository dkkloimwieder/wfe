import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

/** Normal standalone examples mount a real owner; raw interoperability cases opt out. */
export async function reviewThemeHost(page) {
  const owner = page.locator('[data-ui-theme-owner]')
  await expect(owner).toHaveCount(1)
  await expect(owner).toBeVisible()
  assert.equal(await owner.getAttribute('data-ui-portal-root'), '')
  const main = page.getByRole('main').first()
  await expect(main).toBeVisible()
  assert.equal(
    await main.evaluate((node) =>
      Boolean(node.closest('[data-ui-theme-owner]')),
    ),
    true,
  )
}
