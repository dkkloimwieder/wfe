import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function subtableCases({ page, url, record }) {
  await record(
    'subtables: controlled details, nested copy, sorting and empty records',
    async () => {
      await page.goto(`${url}?galleryPreview=subtables`)
      const parent = page
        .locator(
          '[data-generator-view="collections"] > .table-workspace > .table-workspace-results table',
        )
        .first()
      const expand = page.getByRole('button', {
        name: 'Expand Collection A',
        exact: true,
      })
      await expand.click()
      const child = page.locator('[data-generator-view="items-alpha"] table')
      await expect(child).toBeVisible()
      const childView = page.locator('[data-generator-view="items-alpha"]')
      await expect(
        childView.getByRole('button', { name: 'Refresh results' }),
      ).toHaveCount(0)
      const inset = await childView.evaluate((node) => {
        const style = getComputedStyle(node.closest('.sub-table-row > td'))
        return [
          style.paddingTop,
          style.paddingRight,
          style.paddingBottom,
          style.paddingLeft,
        ]
      })
      assert.deepEqual(inset, ['0px', '0px', '0px', '10px'])
      const toggleColumn = parent.locator(':scope > thead th').first()
      const toggleBounds = await toggleColumn.boundingBox()
      assert.ok(
        Math.abs(toggleBounds.width - toggleBounds.height) <= 1,
        'expand column is as wide as the header is tall',
      )
      await expect(
        parent.locator(':scope > tbody > tr:last-child > td').first(),
      ).toHaveCSS('border-bottom-width', '1px')
      await expect(childView.locator('.table-workspace').first()).toHaveCSS(
        'border-right-width',
        '0px',
      )
      await expect(
        page.getByRole('button', {
          name: 'Collapse Collection A',
          exact: true,
        }),
      ).toHaveCSS('height', '26px')
      for (const height of ['32px', '40px']) {
        await parent.evaluate(
          (node, value) => node.style.setProperty('--ui-row-height', value),
          height,
        )
        assert.equal(
          (
            await parent
              .locator(':scope > tbody > tr[data-row]')
              .first()
              .boundingBox()
          ).height,
          Number.parseFloat(height),
        )
      }
      await parent.evaluate((node) =>
        node.style.removeProperty('--ui-row-height'),
      )
      const parentCell = page.locator(
        '[data-row="alpha"] > [data-column="name"]',
      )
      const childCell = child.locator('[data-row="one"] > [data-column="name"]')
      await parentCell.click()
      await expect(parent).toHaveAttribute('data-native-cell-selection', '')
      await childCell.click()
      await expect(child).toHaveAttribute('data-native-cell-selection', '')
      await expect(parent).not.toHaveAttribute('data-native-cell-selection', '')
      const copy = (locator) =>
        locator.evaluate((node) => {
          const data = new DataTransfer()
          node.dispatchEvent(
            new ClipboardEvent('copy', {
              clipboardData: data,
              bubbles: true,
              cancelable: true,
            }),
          )
          return data.getData('text/plain')
        })
      assert.equal(await copy(child), 'First item')
      await parent.focus()
      await expect(parent).toHaveAttribute('data-native-cell-selection', '')
      await expect(child).not.toHaveAttribute('data-native-cell-selection', '')
      assert.equal(await copy(parent), 'Collection A')
      await child.focus()
      await expect(child).toHaveAttribute('data-native-cell-selection', '')
      assert.equal(await copy(child), 'First item')
      const marker = await child.evaluate((node) => {
        node.dataset.retained = 'yes'
        return node.dataset.retained
      })
      await parent
        .locator(':scope > thead')
        .getByRole('button', { name: /Sort by Name/ })
        .click()
      await expect(child).toHaveAttribute('data-retained', marker)
      await page
        .getByRole('button', { name: 'Collapse Collection A', exact: true })
        .click()
      await expect(child).toHaveCount(0)
      await expect(expand).toBeFocused()
      await page
        .getByRole('button', { name: 'Expand Collection B', exact: true })
        .click()
      const empty = page.locator('[data-generator-view="items-beta"]')
      await expect(empty).toContainText('0/0 records')
      await expect(empty.locator('tbody > tr[data-row]')).toHaveCount(0)
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
}
