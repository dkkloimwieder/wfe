import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewBreadcrumbs(page, api) {
  const fixture = api === 'hydration' ? 'hydration' : 'client'
  const configure = (next) =>
    page.evaluate(
      ({ fixture, next }) =>
        (fixture === 'hydration'
          ? window.hydrationFixture.lifecycle.breadcrumb
          : window.breadcrumbFixture
        ).configure(next),
      { fixture, next },
    )
  const read = () =>
    page.evaluate(
      (fixture) =>
        (fixture === 'hydration'
          ? window.hydrationFixture.lifecycle.breadcrumb
          : window.breadcrumbFixture
        ).read(),
      fixture,
    )
  const nav = page.locator('#breadcrumb-review')
  await expect(nav).toHaveAttribute('aria-label', 'Review navigation')
  const link = nav.getByRole('link', { name: 'Records', exact: true })
  await expect(nav.getByRole('list')).toBeVisible()
  await expect(nav.getByRole('listitem')).toHaveCount(2)
  await expect(nav.locator('[aria-current="page"]')).toHaveText(
    'Record details',
  )
  await expect(nav.locator('.ui-breadcrumbs-separator')).toHaveAttribute(
    'aria-hidden',
    'true',
  )
  await expect(link).toHaveAttribute('href', '#breadcrumb-records')
  assert.equal((await read()).refs, 1)
  await nav.evaluate((node) => {
    node.style.setProperty('--ui-focus-ring', 'rgb(25, 113, 194)')
  })
  await link.focus()
  const ring = await link.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      color: style.outlineColor,
      width: style.outlineWidth,
      offset: style.outlineOffset,
    }
  })
  assert.deepEqual(ring, {
    color: 'rgb(25, 113, 194)',
    width: '2px',
    offset: '2px',
  })
  await page.keyboard.press('Enter')
  assert.equal((await read()).clicks, 1)
  await configure({
    label: 'Updated navigation',
    current: 'A very long record name '.repeat(10),
    href: '#changed-records',
  })
  await expect(nav).toHaveAttribute('aria-label', 'Updated navigation')
  await expect(link).toHaveAttribute('href', '#changed-records')
  await expect(link).toBeFocused()
  assert.equal((await read()).refs, 1)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await page
      .locator('#breadcrumb-review')
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
    true,
  )
  await page.setViewportSize({ width: 1280, height: 720 })
}
