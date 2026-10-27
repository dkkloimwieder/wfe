import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryTimeCases({ page, url, record }) {
  for (const preset of ['sketchy', 'vanilla', 'laser']) {
    await record(
      `gallery: ${preset} integrated datetime columns and clock`,
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
        await popup
          .getByRole('listbox', { name: 'Minute', exact: true })
          .getByRole('option', { name: '07', exact: true })
          .press('Enter')
        await expect(time).toHaveValue('14:30')
        await popup
          .getByRole('button', { name: 'Apply time', exact: true })
          .click()
        await expect(time).toHaveValue('14:07')
        const columns = page.getByRole('textbox', {
          name: 'Datetime (time columns)',
          exact: true,
        })
        const clock = page.getByRole('textbox', {
          name: 'Datetime (clock)',
          exact: true,
        })
        await page
          .getByRole('button', {
            name: 'Open Datetime (time columns) date and time picker',
            exact: true,
          })
          .click()
        const combinedPopup = page.getByRole('dialog', {
          name: 'Datetime (time columns)',
          exact: true,
        })
        await combinedPopup.locator('[data-date="2026-10-19"]').click()
        await combinedPopup
          .getByRole('listbox', { name: 'Hour', exact: true })
          .getByRole('option', { name: '16', exact: true })
          .press('Enter')
        await expect(columns).toHaveValue('2026-10-18 14:30')
        await combinedPopup
          .getByRole('button', { name: 'Apply date and time', exact: true })
          .click()
        await expect(columns).toHaveValue('2026-10-19 16:30')
        await expect(clock).toHaveValue('2026-10-19 16:30')
        await page
          .getByRole('button', {
            name: 'Open Datetime (clock) date and time picker',
            exact: true,
          })
          .click()
        const clockPopup = page.getByRole('dialog', {
          name: 'Datetime (clock)',
          exact: true,
        })
        await clockPopup.locator('[data-date="2026-10-20"]').click()
        const dial = clockPopup.getByRole('slider')
        await expect(dial).toBeFocused()
        await dial.press('ArrowUp')
        await dial.press('Enter')
        await dial.press('End')
        await expect(clock).toHaveValue('2026-10-19 16:30')
        await clockPopup
          .getByRole('button', { name: 'Apply date and time', exact: true })
          .click()
        await expect(clock).toHaveValue('2026-10-20 17:59')
        await expect(columns).toHaveValue('2026-10-20 17:59')
        await clock.fill('2026-10-20 25:00')
        assert.equal(
          await clock.evaluate((node) => node.validity.customError),
          true,
        )
        await clock.press('Escape')
        await expect(clock).toHaveValue('2026-10-20 17:59')
        await page.setViewportSize({ width: 390, height: 844 })
        for (const name of ['Datetime (time columns)', 'Datetime (clock)']) {
          await page
            .getByRole('button', {
              name: `Open ${name} date and time picker`,
              exact: true,
            })
            .click()
          const dialog = page.getByRole('dialog', { name, exact: true })
          if (name === 'Datetime (clock)')
            await dialog.locator('[data-date="2026-10-21"]').click()
          assert.equal(
            await dialog.evaluate((node) => {
              const rect = node.getBoundingClientRect()
              return rect.left >= 0 && rect.right <= innerWidth
            }),
            true,
          )
          await dialog
            .getByRole('button', { name: 'Cancel', exact: true })
            .click()
          await expect(dialog).toBeHidden()
          await expect(clock).toHaveValue('2026-10-20 17:59')
        }
      },
    )
  }
}
