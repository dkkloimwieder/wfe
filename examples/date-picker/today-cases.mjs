import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export const localDayBoundaries = [
  {
    timezoneId: 'Pacific/Kiritimati',
    instant: '2026-05-31T12:30:00Z',
    day: '2026-06-01',
  },
  {
    timezoneId: 'America/Los_Angeles',
    instant: '2026-11-01T00:30:00Z',
    day: '2026-10-31',
  },
]

export async function dateTodayCase({ browser, url, report }, boundary) {
  const context = await browser.newContext({ timezoneId: boundary.timezoneId })
  try {
    const page = await context.newPage()
    page.on('pageerror', (error) => report.errors.push(error.stack))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type()))
        report.warnings.push(message.text())
    })
    await page.clock.setFixedTime(new Date(boundary.instant))
    await page.goto(url)
    await page.waitForFunction(() => Boolean(window.datePickerFixture))
    await page.evaluate(() =>
      window.datePickerFixture.set({ value: undefined }),
    )
    const trigger = page.getByRole('button', {
      name: 'Open Review date calendar',
      exact: true,
    })
    const input = page.getByLabel('Review date', { exact: true })
    const state = () => page.evaluate(() => window.datePickerFixture.snapshot())
    await trigger.click()
    const today = page.locator(`[data-date="${boundary.day}"]`)
    await expect(today).toBeFocused()
    assert.equal((await state()).changes, 0)
    await expect(input).toHaveValue('')
    await today.click()
    await expect(input).toHaveValue(boundary.day)
    assert.equal((await state()).value, boundary.day)
    assert.equal((await state()).changes, 1)

    // Bounds restrict calendar selection without shifting the stored date.
    await page.evaluate(
      (day) =>
        window.datePickerFixture.set({ value: undefined, min: day, max: day }),
      boundary.day,
    )
    await trigger.click()
    await expect(today).toBeFocused()
    await expect(page.locator('[data-date]:not(:disabled)')).toHaveCount(1)
    await today.click()
    assert.equal((await state()).value, boundary.day)

    // An accepted date wins over the current clock in every browser timezone.
    await page.evaluate(() =>
      window.datePickerFixture.set({
        value: '2024-02-29',
        min: undefined,
        max: undefined,
      }),
    )
    await trigger.click()
    await expect(page.locator('[data-date="2024-02-29"]')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(input).toHaveValue('2024-02-29')
    assert.equal((await state()).changes, 2)
    report.diagnostics.push(
      ...(await page.evaluate(() => window.datePickerFixture.diagnostics())),
    )
  } finally {
    await context.close()
  }
}
