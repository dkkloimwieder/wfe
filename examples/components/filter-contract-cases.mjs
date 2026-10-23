import { expect } from '@playwright/test'

export async function filterContractCases({ page, url, record }) {
  const fixture = () =>
    page.getByRole('region', { name: 'Filter contract fixture' })
  const header = () => fixture().locator('[data-filter-placement="header"]')
  const popup = () => header().locator('[data-header-filter-popup]')
  const accepted = () => fixture().getByLabel('Accepted criterion')
  const criterionChoice = (root) =>
    root.getByRole('button', { name: /^Criterion (Any|Alpha|Beta)$/ })
  const open = async () => {
    await page.goto(`${url}?consistency=1&filter-contract=1`)
    await header()
      .getByRole('button', { name: 'Filter Criterion', exact: true })
      .click()
    await expect(popup()).toBeVisible()
  }
  await record(
    'consistency: canonical header choice portals preserve parent focus and criterion parity',
    async () => {
      await open()
      await criterionChoice(popup()).click()
      const alpha = page.getByRole('option', { name: 'Alpha', exact: true })
      await expect(alpha).toBeVisible()
      await alpha.focus()
      await expect(alpha).toBeFocused()
      await expect(popup()).toBeVisible()
      await alpha.click()
      await expect(accepted()).toHaveText('{"operator":"in","values":["a"]}')
      await expect(
        fixture().locator('[data-filter-placement="panel"]'),
      ).toContainText('Alpha')
      await expect(popup()).toBeVisible()
      await popup()
        .getByRole('button', { name: 'Close Criterion filter' })
        .click()
      await expect(
        header().getByRole('button', { name: 'Filter Criterion', exact: true }),
      ).toBeFocused()
      await criterionChoice(
        fixture().locator('[data-filter-placement="panel"]'),
      ).click()
      await page.getByRole('option', { name: 'Beta', exact: true }).click()
      await expect(accepted()).toHaveText('{"operator":"in","values":["b"]}')
      await header()
        .getByRole('button', { name: 'Filter Criterion', exact: true })
        .click()
      await expect(popup()).toContainText('Beta')
    },
  )
  await record(
    'consistency: canonical header calendar retains parent popup and releases nested content on removal',
    async () => {
      await page.goto(`${url}?consistency=1&filter-contract=1`)
      await fixture().getByRole('button', { name: 'Use date filter' }).click()
      await header()
        .getByRole('button', { name: 'Filter Criterion', exact: true })
        .click()
      await popup()
        .getByRole('button', {
          name: 'Open Criterion start calendar',
          exact: true,
        })
        .click()
      const day = page.locator('[data-date="2026-01-02"]')
      await expect(day).toBeVisible()
      await day.focus()
      await expect(day).toBeFocused()
      await expect(popup()).toBeVisible()
      const selectionFocus = await day.evaluate((node) => {
        node.click()
        return document.activeElement?.getAttribute('aria-label')
      })
      expect(selectionFocus).toBe('Open Criterion start calendar')
      await expect(accepted()).toHaveText('{"start":"2026-01-02"}')
      await expect(
        fixture()
          .locator('[data-filter-placement="panel"]')
          .getByLabel('Criterion start', { exact: true }),
      ).toHaveValue('2026-01-02')
      await expect(popup()).toBeVisible()
      await popup()
        .getByRole('button', {
          name: 'Open Criterion start calendar',
          exact: true,
        })
        .click()
      await expect(day).toBeVisible()
      await fixture()
        .getByRole('button', { name: 'Remove filter controls' })
        .evaluate((node) => node.click())
      await expect(day).toHaveCount(0)
      await expect(fixture().locator('[data-header-filter-popup]')).toHaveCount(
        0,
      )
      await expect(accepted()).toHaveText('{"start":"2026-01-02"}')
    },
  )
}
