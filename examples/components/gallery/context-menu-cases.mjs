import { expect } from '@playwright/test'

export async function contextMenuCases({ page, url, record }) {
  for (const preset of ['default', 'vanilla', 'laser']) {
    for (const scheme of [1, 2]) {
      await record(
        `gallery: context menu ${preset} scheme ${scheme} preserves actions focus and drafts`,
        async () => {
          await page.setViewportSize({
            width: scheme === 2 ? 390 : 1280,
            height: scheme === 2 ? 844 : 900,
          })
          await page.goto(
            `${url}?gallery=context-menu&preset=${preset}&scheme=${scheme}`,
          )
          const host = page.getByRole('group', {
            name: 'Project record',
            exact: true,
          })
          const draft = page.getByRole('textbox', {
            name: 'Retained record draft',
          })
          await draft.fill('Unsaved record draft')
          await page
            .getByRole('button', { name: 'Other record actions', exact: true })
            .click()
          await expect(
            page.getByRole('menuitem', {
              name: 'Inspect with dropdown',
              exact: true,
            }),
          ).toBeFocused()
          await page.keyboard.press('Enter')
          await expect(page.locator('output[data-menu-action]')).toHaveText(
            'Dropdown inspect requested',
          )
          await expect(
            page.getByRole('button', {
              name: 'Other record actions',
              exact: true,
            }),
          ).toBeFocused()
          await host.click({ button: 'right', position: { x: 30, y: 30 } })
          await expect(
            page.getByRole('menu', { name: 'Project record' }),
          ).toBeVisible()
          await expect(
            page.getByRole('menuitem', { name: 'Inspect record', exact: true }),
          ).toBeFocused()
          await expect(
            page.getByRole('menuitem', { name: 'Delete record', exact: true }),
          ).toHaveAttribute('aria-disabled', 'true')
          await page.keyboard.press('Enter')
          await expect(page.getByRole('menu')).toHaveCount(0)
          await expect(host).toBeFocused()
          await expect(page.locator('output[data-menu-request]')).toHaveText(
            'Close requested',
          )
          await expect(page.locator('output[data-menu-action]')).toHaveText(
            'Inspect requested',
          )
          await expect(draft).toHaveValue('Unsaved record draft')
          await page.keyboard.press('Shift+F10')
          await expect(page.getByRole('menu')).toBeVisible()
          await page
            .getByRole('menuitemcheckbox', { name: 'Pin record' })
            .click()
          await expect(
            page.getByRole('menuitemcheckbox', { name: 'Pin record' }),
          ).toHaveAttribute('aria-checked', 'true')
          await page.keyboard.press('Escape')
          await expect(page.getByRole('menu')).toHaveCount(0)
          await expect(host).toContainText('Pinned')
          await page.getByText('Accept menu changes', { exact: true }).click()
          await host.click({ button: 'right', position: { x: 30, y: 30 } })
          await expect(page.locator('output[data-menu-request]')).toHaveText(
            'Open requested',
          )
          await expect(page.getByRole('menu')).toHaveCount(0)
          await page.getByText('Accept menu changes', { exact: true }).click()
          await host.focus()
          await page.keyboard.press('Shift+F10')
          await page
            .getByRole('menuitem', { name: 'Copy', exact: true })
            .hover()
          await expect(
            page.getByRole('menu', { name: 'Copy', exact: true }),
          ).toBeVisible()
          await page
            .getByRole('menuitem', { name: 'Identifier', exact: true })
            .click()
          await expect(page.locator('output[data-menu-action]')).toHaveText(
            'Copy identifier requested',
          )
          await expect(page.getByRole('menu')).toHaveCount(0)
          await expect(draft).toHaveValue('Unsaved record draft')
        },
      )
    }
  }
  await record(
    'gallery: context menu touch holds and narrow layout keep controls reachable',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${url}?gallery=context-menu`)
      const host = page.getByRole('group', {
        name: 'Project record',
        exact: true,
      })
      await host.dispatchEvent('pointerdown', {
        pointerType: 'touch',
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: 60,
        clientY: 200,
      })
      const menu = page.getByRole('menu', { name: 'Project record' })
      await expect(menu).toBeVisible()
      const box = await menu.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(391)
      await page.keyboard.press('Escape')
      await expect(menu).toHaveCount(0)
      await expect(host).toBeFocused()
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
}
