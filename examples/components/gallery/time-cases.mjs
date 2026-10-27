import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryTimeCases({ page, url, record }) {
  for (const preset of ['sketchy', 'vanilla', 'laser']) {
    await record(
      `gallery: ${preset} time and datetime popup selection`,
      async () => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?gallery=dates&preset=${preset}`)
        const time = page.getByRole('textbox', {
          name: 'Time (24-hour)',
          exact: true,
        })
        await expect(time).toHaveValue('14:30')
        await page
          .getByRole('button', {
            name: 'Open Time (24-hour) time picker',
            exact: true,
          })
          .click()
        const popup = page.getByRole('dialog', {
          name: 'Time (24-hour)',
          exact: true,
        })
        const minute = popup.getByRole('button', { name: /^Minute / })
        await minute.click()
        await page
          .getByRole('option', { name: '07', exact: true })
          .press('Enter')
        await popup
          .getByRole('button', { name: 'Apply time', exact: true })
          .click()
        await expect(time).toHaveValue('14:07')
        await expect(popup).toBeHidden()
        const combined = page.getByRole('group', {
          name: 'Datetime',
          exact: true,
        })
        const clock = combined.getByRole('textbox', {
          name: 'Time',
          exact: true,
        })
        await combined
          .getByRole('button', { name: 'Open Time time picker', exact: true })
          .click()
        const datetimePopup = page.getByRole('dialog', {
          name: 'Time',
          exact: true,
        })
        await datetimePopup.getByRole('button', { name: /^Hour / }).click()
        await page.getByRole('option', { name: '16', exact: true }).click()
        await datetimePopup
          .getByRole('button', { name: 'Apply time', exact: true })
          .click()
        await expect(clock).toHaveValue('16:30')
        await expect(
          combined.getByRole('textbox', { name: 'Datetime', exact: true }),
        ).toHaveValue('2026-10-18')
        await clock.fill('25:00')
        assert.equal(
          await clock.evaluate((node) => node.validity.customError),
          true,
        )
        await clock.press('Escape')
        await expect(clock).toHaveValue('16:30')
        await page.setViewportSize({ width: 390, height: 844 })
        await page
          .getByRole('button', {
            name: 'Open Time (12-hour with seconds) time picker',
            exact: true,
          })
          .click()
        const secondsPopup = page.getByRole('dialog', {
          name: 'Time (12-hour with seconds)',
          exact: true,
        })
        await expect(
          secondsPopup.getByRole('button', { name: /^Second / }),
        ).toBeVisible()
        await expect(
          secondsPopup.getByRole('button', { name: /^AM\/PM / }),
        ).toBeVisible()
        assert.equal(
          await secondsPopup.evaluate((node) => {
            const rect = node.getBoundingClientRect()
            return rect.left >= 0 && rect.right <= innerWidth
          }),
          true,
        )
        await page.keyboard.press('Escape')
        await expect(secondsPopup).toBeHidden()
      },
    )
  }
}
