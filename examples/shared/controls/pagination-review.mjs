import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import { choiceControl, controlValue, selectValue } from './select-review.mjs'

export async function reviewPagination(page, mode = 'client') {
  const host = page.locator('#paged-records')
  const navigation = host.getByRole('navigation', { name: 'Table pages' })
  const previous = navigation.getByRole('button', { name: 'Previous page' })
  const next = navigation.getByRole('button', { name: 'Next page' })
  const size = choiceControl(navigation, { name: 'Page size', exact: true })
  const rows = host.locator('tr[data-row]')
  const call = (operation, value) =>
    page.evaluate(
      ({ mode, operation, value }) => {
        const api =
          mode === 'hydration'
            ? window.hydrationFixture.lifecycle.pagination
            : window.readOnlyFixture.pagination
        return api[operation](value)
      },
      { mode, operation, value },
    )
  await expect(rows).toHaveText(['Record 1', 'Record 2', 'Record 3'])
  await expect(previous).toBeDisabled()
  await expect(navigation.getByRole('status')).toHaveText('Page 1 of 3')
  const originalNext = await next.elementHandle()
  await call('hold', true)
  await next.click()
  await expect(navigation).toHaveAttribute('aria-busy', 'true')
  for (const control of [previous, next, size])
    await expect(control).toBeDisabled()
  await expect(
    host.getByRole('button', { name: 'Refresh results', exact: true }),
  ).toBeEnabled()
  await expect(rows).toHaveText(['Record 1', 'Record 2', 'Record 3'])
  await call('reject')
  await expect(next).toBeEnabled()
  await expect(navigation.getByRole('status')).toHaveText('Page 1 of 3')
  await next.focus()
  await next.press('Enter')
  await call('accept')
  await expect(rows).toHaveText(['Record 4', 'Record 5', 'Record 6'])
  assert.equal(
    await originalNext.evaluate(
      (node) =>
        node ===
        document.querySelector('#paged-records [aria-label="Next page"]'),
    ),
    true,
  )
  await call('hold', false)
  await next.click()
  await expect(rows).toHaveText(['Record 7', 'Record 8'])
  await expect(next).toBeDisabled()
  await previous.focus()
  await previous.press('Enter')
  await expect(rows).toHaveText(['Record 4', 'Record 5', 'Record 6'])
  await call('hold', true)
  await selectValue(size, '6')
  await expect.poll(() => controlValue(size)).toBe('3')
  await expect(size).toBeDisabled()
  await call('reject')
  await expect.poll(() => controlValue(size)).toBe('3')
  await call('hold', false)
  await selectValue(size, '6')
  await expect.poll(() => controlValue(size)).toBe('6')
  await expect(rows).toHaveCount(6)
  await expect(navigation.getByRole('status')).toHaveText('Page 1 of 2')
  await call('unknownTotal')
  await expect(navigation.getByRole('status')).toHaveText('Page 1')
  await call('empty')
  await expect(rows).toHaveCount(0)
  await expect(next).toBeEnabled()
  const viewport = page.viewportSize()
  await page.setViewportSize({ width: 390, height: 800 })
  for (const control of [previous, next, size]) {
    const box = await control.boundingBox()
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390)
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await next.click()
  await expect(rows).toHaveText(['Record 7', 'Record 8'])
  if (viewport) await page.setViewportSize(viewport)
}
