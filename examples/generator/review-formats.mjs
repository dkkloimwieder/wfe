import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
const raw = '0123456789abcdef'
const field = (page, key) => page.locator(`[data-generator-field="${key}"]`)
const cell = (page, key) =>
  page.locator(`tr[data-row="first"] [data-column="${key}"]`)
export async function reviewFormatsServer(page) {
  await expect(field(page, 'code').locator('output')).toHaveText('01234567')
  await expect(
    field(page, 'code').getByRole('img', { name: raw }),
  ).toHaveAttribute('title', raw)
  await expect(
    field(page, 'active').getByRole('img', { name: 'Yes' }),
  ).toBeVisible()
  await expect(field(page, 'day').locator('output')).toHaveText('29/02/2024')
  await expect(field(page, 'instant').locator('output')).toHaveText(
    '29/02/2024 14:15',
  )
  await expect(cell(page, 'code')).toHaveText('01234567')
  await expect(
    page.getByRole('button', { name: 'save', exact: true }),
  ).toBeVisible()
}
export async function reviewFormats({ page, record }) {
  const snapshot = () => page.evaluate(() => window.generatorFixture.snapshot())
  await record(
    'Generated forms and tables share date, boolean and hash presentation',
    async () => {
      await reviewFormatsServer(page)
      await expect(
        cell(page, 'active').getByRole('img', { name: 'Yes' }),
      ).toBeVisible()
      await expect(cell(page, 'day')).toHaveText('29/02/2024')
      await expect(cell(page, 'instant')).toHaveText('29/02/2024 14:15')
      const output = field(page, 'code').locator('output')
      await expect(output).toHaveAttribute('aria-live', 'off')
      assert.equal(
        await output.evaluate((node) => node.labels[0].textContent),
        'code',
      )
      const described = await output.evaluate(
        (node) =>
          document.getElementById(
            node.getAttribute('aria-describedby').split(' ')[0],
          ).textContent,
      )
      assert.equal(described, 'Full value available in the title')
      assert.equal((await snapshot()).requests, 0)
      await expect(
        page.getByText('Display columns', { exact: true }),
      ).toBeHidden()
      const tableWidth = await page
        .locator('.generated-formats table')
        .evaluate((node) => ({
          table: node.getBoundingClientRect().width,
          scroller: node.parentElement.clientWidth,
        }))
      assert.ok(tableWidth.table >= tableWidth.scroller - 1)
    },
  )
  await record(
    'Editable fields retain raw drafts and focus across immutable display updates',
    async () => {
      const note = page.getByRole('textbox', { name: 'note', exact: true })
      await note.fill('An unshortened note')
      await note.evaluate((node) => {
        window.formatNote = node
        window.formatOutput = document.querySelector(
          '[data-generator-field="day"] output',
        )
        window.formatCell = document.querySelector(
          'tr[data-row="first"] [data-column="day"]',
        )
      })
      await page.evaluate(() => window.generatorFixture.revise())
      await expect(note).toBeFocused()
      await expect(note).toHaveValue('An unshortened note')
      assert.equal(
        await note.evaluate((node) => node === window.formatNote),
        true,
      )
      assert.equal(
        await field(page, 'day')
          .locator('output')
          .evaluate((node) => node === window.formatOutput),
        true,
      )
      assert.equal(
        await cell(page, 'day').evaluate((node) => node === window.formatCell),
        true,
      )
      await expect(field(page, 'day').locator('output')).toHaveText(
        '02/29/2024',
      )
      await expect(cell(page, 'instant')).toHaveText('02/29/2024 09:15')
      await expect(field(page, 'instant').locator('output')).toHaveText(
        '02/29/2024 09:15',
      )
      assert.equal(
        await field(page, 'code')
          .locator('output')
          .evaluate((node) => node.labels[0].textContent),
        'Identifier',
      )
      await expect(
        page.getByRole('columnheader', { name: /Identifier/ }),
      ).toBeVisible()
    },
  )
  await record(
    'Native text selection selects the displayed hash prefix',
    async () => {
      const text = await cell(page, 'code')
        .getByRole('img', { name: raw })
        .evaluate((node) => {
          const range = document.createRange()
          range.selectNodeContents(node)
          const selection = window.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)
          const result = selection.toString()
          selection.removeAllRanges()
          return result
        })
      assert.equal(text, '01234567')
    },
  )
  await record(
    'Default submit label calls the application once with raw formatted values',
    async () => {
      await page.getByRole('button', { name: 'save', exact: true }).click()
      await expect(page.locator('[data-format-result]')).toHaveText('Saved')
      const result = await snapshot()
      assert.equal(result.submissions, 1)
      assert.equal(result.requests, 1)
      assert.deepEqual(result.saved, {
        note: 'An unshortened note',
        code: raw,
        active: true,
        day: '2024-02-29',
        instant: '2024-02-29T14:15:00Z',
      })
      assert.equal(result.rawRows[0].code, raw)
    },
  )
  await record(
    'Formatted fields and tables fit narrow screens with contained table scrolling',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page
        .getByRole('button', { name: 'Navigation', exact: true })
        .click()
      await expect(
        page.getByRole('textbox', { name: 'note', exact: true }),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      )
      await page
        .getByRole('button', { name: 'Close navigation', exact: true })
        .click()
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
  await record(
    'Removed fields release native handlers and application disposal removes the views',
    async () => {
      await page
        .getByRole('textbox', { name: 'note', exact: true })
        .evaluate((node) => {
          window.removedFormatInput = node
        })
      await page.evaluate(() => window.generatorFixture.remove())
      const before = await snapshot()
      await page.evaluate(() => {
        window.removedFormatInput.value = 'Detached edit'
        window.removedFormatInput.dispatchEvent(
          new Event('input', { bubbles: true }),
        )
      })
      assert.equal((await snapshot()).requests, before.requests)
      await expect(page.locator('form')).toHaveCount(0)
      await page.evaluate(() => window.generatorFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
    },
  )
}
