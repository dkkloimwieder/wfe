import { expect } from '@playwright/test'
export async function iconCases({ page, url, record }) {
  await record(
    'gallery: icons search and selection preserve accessible controls',
    async () => {
      await page.goto(`${url}?gallery=icons`)
      const host = page.locator('.gallery-example-host')
      const list = host.getByRole('group', {
        name: 'Available icons',
        exact: true,
      })
      const search = host.getByRole('textbox', { name: 'Find icons' })
      await expect(list.getByRole('button')).toHaveCount(60)
      await host
        .getByRole('button', { name: 'More icons', exact: true })
        .click()
      await expect(list.getByRole('button')).toHaveCount(120)
      await search.fill('search')
      const choice = list.getByRole('button', { name: 'search', exact: true })
      await choice.focus()
      await page.keyboard.press('Enter')
      const preview = host.getByRole('button', {
        name: 'Selected icon preview',
      })
      await expect(preview).toHaveText('search')
      await expect(preview.locator('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
      await expect(preview.locator('svg')).toHaveAttribute('focusable', 'false')
      const searchGeometry = await preview.locator('svg').innerHTML()
      await search.fill('calendar')
      await list.getByRole('button', { name: 'calendar', exact: true }).click()
      await expect(preview).toHaveText('calendar')
      await expect(preview.locator('svg')).not.toHaveJSProperty(
        'innerHTML',
        searchGeometry,
      )
      await expect(host.locator('code').first()).toContainText('iconCalendar')
      await search.fill('no matching icon exists')
      await expect(list.getByRole('button')).toHaveCount(0)
      await expect(
        host.getByRole('status', { name: 'Icon results' }),
      ).toHaveText('0 icons')
      await expect(preview).toHaveText('calendar')
    },
  )
}
