import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function dateMessageCases({ page, test }) {
  await test('Message changes retain invalid drafts, calendar focus and date formatting locale', async () => {
    const input = page.getByRole('textbox', {
      name: 'Review date',
      exact: true,
    })
    await input.fill('2024-02-30')
    await input.focus()
    const original = await input.elementHandle()
    await page.evaluate(() =>
      window.datePickerFixture.set({
        messages: {
          invalidDate: (pattern) => `Fecha inválida: ${pattern}`,
          openCalendar: (label) => `Abrir ${label}`,
          calendarTitle: (label) => `Calendario de ${label}`,
          nextMonth: 'Mes siguiente',
          previousMonth: 'Mes anterior',
        },
      }),
    )
    await expect(input).toHaveValue('2024-02-30')
    await expect(input).toBeFocused()
    assert.equal(
      await input.evaluate((node) => node.validationMessage),
      'Fecha inválida: YYYY-MM-DD',
    )
    assert.equal(
      (await page.evaluate(() => window.datePickerFixture.snapshot())).changes,
      0,
    )
    await input.press('Escape')
    await expect(input).toHaveValue('2024-02-29')
    await page
      .getByRole('button', { name: 'Abrir Review date', exact: true })
      .click()
    const selected = page.locator('[data-date="2024-02-29"]')
    await expect(selected).toBeFocused()
    const dateLabel = await selected.getAttribute('aria-label')
    await page.evaluate(() =>
      window.datePickerFixture.set({
        messages: { nextMonth: 'Suivant', previousMonth: 'Précédent' },
      }),
    )
    await expect(selected).toBeFocused()
    assert.equal(await selected.getAttribute('aria-label'), dateLabel)
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible()
    await selected.press('ArrowLeft')
    await expect(page.locator('[data-date="2024-02-28"]')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', {
        name: 'Open Review date calendar',
        exact: true,
      }),
    ).toBeFocused()
    assert.equal(await original.evaluate((node) => node.isConnected), true)
    await original.dispose()
    assert.equal(
      (await page.evaluate(() => window.datePickerFixture.snapshot())).changes,
      0,
    )
  })
  await test('Datetime messages retain the combined draft and focused calendar day', async () => {
    const input = page.getByRole('textbox', {
      name: 'Appointment',
      exact: true,
    })
    await input.fill('29/02/2024 25:00')
    await input.focus()
    const original = await input.elementHandle()
    await page.evaluate(() =>
      window.datePickerFixture.setDateTime({
        messages: {
          invalidDateTime: 'Instante inválido',
          openDateTimePicker: (label) => `Abrir ${label}`,
          nextMonth: 'Mes siguiente',
        },
      }),
    )
    await expect(input).toHaveValue('29/02/2024 25:00')
    await expect(input).toBeFocused()
    assert.equal(
      await input.evaluate((node) => node.validationMessage),
      'Instante inválido',
    )
    assert.equal(
      (await page.evaluate(() => window.datePickerFixture.snapshot()))
        .datetimeChanges,
      0,
    )
    await input.press('Escape')
    await expect(input).toHaveValue('29/02/2024 14:15')
    await page
      .getByRole('button', { name: 'Abrir Appointment', exact: true })
      .click()
    const selected = page.locator('[data-date="2024-02-29"]')
    await expect(selected).toBeFocused()
    const dateLabel = await selected.getAttribute('aria-label')
    await page.evaluate(() =>
      window.datePickerFixture.setDateTime({
        messages: { nextMonth: 'Suivant' },
      }),
    )
    await expect(selected).toBeFocused()
    assert.equal(await selected.getAttribute('aria-label'), dateLabel)
    await expect(
      page.getByRole('button', { name: 'Suivant', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', {
        name: 'Open Appointment date and time picker',
        exact: true,
      }),
    ).toBeFocused()
    assert.equal(await original.evaluate((node) => node.isConnected), true)
    await original.dispose()
    assert.equal(
      (await page.evaluate(() => window.datePickerFixture.snapshot()))
        .datetimeChanges,
      0,
    )
  })
}
