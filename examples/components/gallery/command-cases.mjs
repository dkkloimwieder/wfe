import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryCommandCases({ page, url, record }) {
  for (const preset of ['default', 'vanilla', 'laser']) {
    await record(
      `gallery: ${preset} commands, search and context ownership`,
      async () => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?gallery=commands&preset=${preset}`)
        const host = page.locator('[data-command-review]')
        const input = host.getByRole('combobox', {
          name: 'Find a command',
          exact: true,
        })
        const result = host.getByLabel('Command result')
        const note = host.getByRole('textbox', {
          name: 'Retained command note',
          exact: true,
        })
        await note.fill('Retained application draft')
        await input.fill('reload')
        await expect(
          host.getByRole('option', { name: /Refresh Atlas/ }),
        ).toBeVisible()
        await input.press('ArrowDown')
        await input.press('Enter')
        await expect(result).toHaveText('Refreshed Atlas')
        await input.fill('')
        await expect(
          host.getByRole('option', { name: /Delete Atlas/ }),
        ).toHaveAttribute('aria-disabled', 'true')
        await input.fill('Switch to Beacon')
        await input.press('ArrowDown')
        await input.press('Enter')
        await expect(
          host.getByRole('heading', { name: 'Commands for Beacon' }),
        ).toBeVisible()
        await expect(note).toHaveValue('Retained application draft')
        await expect(
          host.getByRole('option', { name: /Refresh Beacon/ }),
        ).toBeVisible()
        await expect(
          host.getByRole('option', { name: /Refresh Atlas/ }),
        ).toHaveCount(0)

        const trigger = host.getByRole('button', {
          name: 'Search project records',
          exact: true,
        })
        await trigger.click()
        const dialog = page.getByRole('dialog', {
          name: 'Search project records',
          exact: true,
        })
        const search = dialog.getByRole('combobox', {
          name: 'Search records',
          exact: true,
        })
        await expect(search).toBeFocused()
        await expect(dialog.getByRole('option')).toHaveCount(0)
        await search.fill('pl')
        await expect(
          dialog.getByText('Type at least 3 characters'),
        ).toBeVisible()
        await expect(dialog.getByRole('option')).toHaveCount(0)
        await search.fill('pla')
        await search.fill('plan')
        await expect(
          dialog.getByRole('option', { name: /Beacon plan/ }),
        ).toBeVisible()
        // The first mock response is slower. It must not replace the latest result.
        await page.waitForTimeout(500)
        await expect(dialog.getByRole('option')).toHaveCount(1)
        await expect(
          dialog.getByRole('option', { name: /Beacon plan/ }),
        ).toBeVisible()
        await search.fill('issue')
        await expect(
          dialog
            .getByRole('group', { name: 'Records', exact: true })
            .getByRole('option'),
        ).toHaveCount(120)
        await search.fill('is')
        await expect(dialog.getByRole('option')).toHaveCount(0)
        await search.fill('error')
        await expect(dialog.getByRole('alert')).toHaveText(
          'Search is unavailable. Try another query.',
        )
        await search.fill('missing record')
        await expect(
          dialog.getByText('No matching records', { exact: true }),
        ).toBeVisible()
        await search.fill('notes')
        await expect(
          dialog.getByRole('option', { name: /Beacon notes/ }),
        ).toBeVisible()
        await search.press('Tab')
        const selected = dialog.getByRole('option', {
          name: 'Beacon notes',
          exact: true,
        })
        await expect(selected).toBeFocused()
        await selected.press('Shift+Tab')
        await expect(search).toBeFocused()
        await search.press('Tab')
        await selected.press('Enter')
        await expect(dialog).toHaveCount(0)
        await expect(result).toHaveText('Opened Beacon notes')
        await expect(trigger).toBeFocused()

        await trigger.click()
        await search.fill('fields')
        const link = dialog.getByRole('option', {
          name: 'Fields gallery',
          exact: true,
        })
        await expect(link).toHaveAttribute('href', '?gallery=fields')
        await search.press('Escape')
        await expect(dialog).toHaveCount(0)
        await expect(trigger).toBeFocused()
        await note.focus()
        await page.keyboard.press('ControlOrMeta+k')
        await expect(dialog).toHaveCount(0)
        await trigger.focus()
        await page.keyboard.press('ControlOrMeta+k')
        await expect(search).toBeFocused()
        await page.setViewportSize({ width: 390, height: 844 })
        const bounds = await dialog.boundingBox()
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390)
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        )
        await search.press('Escape')
        await expect(note).toHaveValue('Retained application draft')
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.evaluate(() => {
          document.documentElement.dataset.commandNavigation = 'retained'
        })
        await input.fill('Fields gallery')
        await host
          .getByRole('option', { name: 'Fields gallery', exact: true })
          .click()
        await expect(page).toHaveURL(/gallery=fields/)
        assert.equal(
          await page.evaluate(
            () => document.documentElement.dataset.commandNavigation,
          ),
          'retained',
        )
        await page.goBack()
        await expect(page).toHaveURL(/gallery=commands/)
      },
    )
  }
}

// Keep native-tab coverage separate so its browser startup failure does not mask command interaction results.
export async function galleryCommandLinkCases({ page, url, record }) {
  for (const preset of ['default', 'vanilla', 'laser']) {
    await record(
      `gallery: ${preset} command native modified navigation`,
      async () => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?gallery=commands&preset=${preset}`)
        await page
          .getByRole('button', { name: 'Search project records', exact: true })
          .click()
        const dialog = page.getByRole('dialog', {
          name: 'Search project records',
          exact: true,
        })
        await dialog
          .getByRole('combobox', { name: 'Search records', exact: true })
          .fill('fields')
        const link = dialog.getByRole('option', {
          name: 'Fields gallery',
          exact: true,
        })
        await expect(link).toHaveAttribute('href', '?gallery=fields')
        const nextPage = page.context().waitForEvent('page')
        await link.click({ modifiers: ['ControlOrMeta'] })
        const opened = await nextPage
        try {
          await opened.waitForURL(/gallery=fields/)
          await expect(dialog).toBeVisible()
          await expect(page.getByLabel('Command result')).toHaveText(
            'No action selected',
          )
        } finally {
          await opened.close()
        }
        await dialog.getByRole('combobox').press('Escape')
        await expect(dialog).toHaveCount(0)
        await expect(
          page.getByRole('button', {
            name: 'Search project records',
            exact: true,
          }),
        ).toBeFocused()
      },
    )
  }
}
