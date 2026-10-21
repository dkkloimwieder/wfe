import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function tableTitleCases({ page, url, record }) {
  await record(
    'table title: long titles preserve controls and contained scrolling',
    async () => {
      for (const scheme of [1, 2]) {
        for (const width of [1280, 390]) {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(`${url}?galleryPreview=table&scheme=${scheme}`)
          const table = page.locator('.table-workspace')
          const title = table.locator('.table-workspace-title-face')
          await expect(title).toHaveText('Records')
          assert.equal(await title.getAttribute('role'), null)
          assert.equal(await title.getAttribute('tabindex'), null)
          await title
            .locator('.table-workspace-title-text')
            .evaluate((node) => {
              const heading = document.createElement('h2')
              heading.textContent = 'A deliberately long table title '.repeat(
                12,
              )
              node.replaceChildren(heading)
            })
          await expect(title.getByRole('heading', { level: 2 })).toBeVisible()
          await expect(
            table.getByRole('button', { name: 'Refresh results', exact: true }),
          ).toBeVisible()
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          )
          await table
            .getByRole('button', { name: 'Refresh results', exact: true })
            .click()
        }
      }
    },
  )
}
