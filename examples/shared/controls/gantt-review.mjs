import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewGantt(page) {
  const fixture = page.locator('#gantt-review')
  const bar = () => fixture.locator('[data-interval="release"]')
  await bar().click()
  await expect(fixture.locator('[data-gantt-selected]')).toHaveText('release')
  await bar().press('F2')
  await expect(fixture.locator('[data-gantt-activated]')).toHaveText(
    'Hydrated release',
  )
  await bar().press('Space')
  await bar().press('ArrowRight')
  await bar().press('Space')
  await expect(fixture.locator('[data-gantt-requests]')).toHaveText('1')
  await expect(fixture.locator('[data-gantt-start]')).toHaveText(
    '2026-10-03T01:00:00.000Z',
  )
  await bar().focus()
  await bar().press('Space')
  await bar().evaluate((node) => {
    window.detachedGanttBar = node
  })
  // Dispose while the keyboard gesture is active, without a pointer event
  // canceling the gesture before the fixture itself can clean it up.
  await fixture
    .getByRole('button', { name: 'Unmount hydrated schedule' })
    .evaluate((node) => node.click())
  await expect(fixture.locator('.ui-gantt')).toHaveCount(0)
  const connected = await page.evaluate(() => {
    const node = window.detachedGanttBar
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ArrowRight',
        key: 'ArrowRight',
        bubbles: true,
      }),
    )
    node.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }),
    )
    window.dispatchEvent(new Event('blur'))
    return node.isConnected
  })
  assert.equal(connected, false)
  await expect(fixture.locator('[data-gantt-requests]')).toHaveText('1')
}
