import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewContainerLayout(page, { hydrated = false } = {}) {
  const original = page.viewportSize()
  // Leave room for the hydration fixture's outer navigation rail.
  await page.setViewportSize({ width: 1800, height: 1000 })
  const host = page.locator('#container-host')
  const dashboard = page.locator('#container-dashboard')
  if (hydrated) {
    assert.equal(
      await page.evaluate(() => {
        const original = window.serverThemeNodes.find(
          (node) => node.id === 'container-dashboard',
        )
        return (
          Boolean(original) &&
          original === document.getElementById('container-dashboard')
        )
      }),
      true,
    )
  }
  const table = dashboard.getByRole('region', {
    name: 'Embedded table',
    exact: true,
  })
  // section has an explicit accessible name, so its landmark is a region.
  await expect(dashboard).toHaveAttribute('data-ui-responsive-ready', '')
  await expect(dashboard).not.toHaveAttribute('data-navigation-drawer')
  const nested = dashboard.getByRole('region', {
    name: 'Nested embedded table',
    exact: true,
  })
  await expect(table).not.toHaveAttribute('data-controls-drawer')
  await expect(nested).toHaveAttribute('data-controls-drawer', '')
  await nested
    .getByRole('button', { name: /controls/i })
    .first()
    .click()
  const first = nested.getByRole('textbox', { name: 'Nested first filter' })
  const second = nested.getByRole('textbox', { name: 'Nested second filter' })
  await expect(first).toBeVisible()
  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  assert.ok(
    secondBox.y >= firstBox.y + firstBox.height,
    'nested drawer controls stay stacked inside their own pane',
  )
  await second.focus()
  await page.keyboard.press('Escape')
  const draft = dashboard.getByRole('textbox', {
    name: 'Embedded navigation draft',
  })
  await draft.fill('Retained navigation')
  const navigation = dashboard.locator(':scope > .ui-dashboard-navigation')
  const retained = await navigation.elementHandle()
  await draft.focus()
  const scroll = await navigation.evaluate((node) => {
    node.scrollTop = 30
    return node.scrollTop
  })
  const height = (await host.boundingBox()).height
  await page.locator('#container-width').evaluate((node) => node.click())
  await expect(dashboard).toHaveAttribute('data-navigation-drawer', '')
  await expect(dashboard.locator('#container-mode')).toHaveText('drawer')
  const toggle = dashboard.getByRole('button', {
    name: 'Navigation',
    exact: true,
  })
  await expect(toggle).toBeFocused()
  await toggle.click()
  await expect(draft).toBeVisible()
  await expect(draft).toHaveValue('Retained navigation')
  assert.equal(await navigation.evaluate((node) => node.scrollTop), scroll)
  assert.equal(
    await navigation.evaluate((node, original) => node === original, retained),
    true,
  )
  await draft.focus()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(draft).not.toBeVisible()
  await expect(table).toHaveAttribute('data-controls-drawer', '')
  const tableToggle = table.getByRole('button', { name: /controls/i }).first()
  await tableToggle.click()
  const filter = table.getByRole('textbox', { name: 'Embedded filter draft' })
  await filter.fill('Retained filter')
  await page.keyboard.press('Escape')
  await expect(tableToggle).toBeFocused()
  await expect(filter).not.toBeVisible()
  assert.equal((await host.boundingBox()).height, height)
  await page.locator('#container-width').evaluate((node) => node.click())
  await expect(dashboard).not.toHaveAttribute('data-navigation-drawer')
  await expect(draft).toHaveValue('Retained navigation')
  await expect(table).not.toHaveAttribute('data-controls-drawer')
  await expect(filter).toHaveValue('Retained filter')
  await page.locator('#container-hidden').click()
  await expect(host).not.toBeVisible()
  await page.locator('#container-hidden').click()
  await expect(host).toBeVisible()
  await expect(dashboard).not.toHaveAttribute('data-navigation-drawer')
  await retained.dispose()
  if (original) await page.setViewportSize(original)
}
