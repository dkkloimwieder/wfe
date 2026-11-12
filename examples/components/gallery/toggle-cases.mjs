import { expect } from '@playwright/test'
export async function toggleCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser'])
    for (const scheme of [1, 2]) {
      await record(
        `gallery: toggles ${preset} scheme ${scheme} preserve selection drafts and keyboard focus`,
        () =>
          reviewPage(async (page) => {
            await page.setViewportSize({
              width: scheme === 2 ? 390 : 1280,
              height: 900,
            })
            const route = `${url}?gallery=toggles&preset=${preset}&scheme=${scheme}`
            await page.goto(route)
            const draft = page.getByRole('textbox', {
              name: 'Retained toggle draft',
            })
            await draft.fill('Accepted draft')
            const pin = page.getByRole('button', {
              name: 'Pin record',
              exact: true,
            })
            await pin.press('Space')
            await expect(pin).toHaveAttribute('aria-pressed', 'true')
            const group = page.getByRole('group', {
              name: 'View selector',
              exact: true,
            })
            const list = group.getByRole('button', {
                name: 'List',
                exact: true,
              }),
              board = group.getByRole('button', { name: 'Board', exact: true })
            await list.focus()
            await list.press('ArrowRight')
            await expect(board).toBeFocused()
            await expect(list).toHaveAttribute('aria-pressed', 'true')
            await board.press('Enter')
            await expect(board).toHaveAttribute('aria-pressed', 'true')
            await expect(board).toBeFocused()
            const italic = page
              .getByRole('group', { name: 'Text formatting', exact: true })
              .getByRole('button', { name: 'Italic', exact: true })
            await italic.press('Space')
            await expect(italic).toHaveAttribute('aria-pressed', 'true')
            await page
              .getByRole('button', { name: 'Submit toggle values' })
              .click()
            await expect(page.getByLabel('Toggle form result')).toHaveText(
              'Pin yes; view board; format bold,italic',
            )
            await page
              .getByText('Accept toggle changes', { exact: true })
              .click()
            await pin.press('Enter')
            await expect(page.locator('[data-toggle-request]')).toHaveText(
              'Pin off',
            )
            await expect(pin).toHaveAttribute('aria-pressed', 'true')
            await expect(pin).toBeFocused()
            await expect(draft).toHaveValue('Accepted draft')
            await page.goto(route + '&state=readonly')
            const locked = page.getByRole('button', {
              name: 'Pin record',
              exact: true,
            })
            await locked.press('Space')
            await expect(locked).toHaveAttribute('aria-pressed', 'false')
            await expect(locked).toHaveAttribute('aria-disabled', 'true')
            await page.goto(route + '&state=disabled')
            await expect(
              page.getByRole('button', { name: 'Pin record', exact: true }),
            ).toBeDisabled()
            await page
              .getByRole('button', { name: 'Submit toggle values' })
              .click()
            await expect(page.getByLabel('Toggle form result')).toHaveText(
              'Pin off; view none; format none',
            )
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true)
          }),
      )
    }
}
