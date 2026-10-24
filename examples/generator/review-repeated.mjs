import { artifactPath } from '../../scripts/artifacts.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
const row = (page, key) => page.locator(`[data-generator-row="${key}"]`)
const name = (page, key) =>
  row(page, key).getByRole('textbox', { name: 'name', exact: true })
const save = (page) => page.getByRole('button', { name: 'save', exact: true })
export async function reviewRepeatedServer(page) {
  await expect(
    page.getByRole('textbox', { name: 'title', exact: true }),
  ).toHaveValue('Repeated records')
  await expect(name(page, 'first')).toHaveValue('First')
  await expect(name(page, 'second')).toHaveValue('Second')
  await expect(
    page.getByRole('button', { name: 'Add row', exact: true }),
  ).toBeVisible()
}
export async function reviewRepeated({ page, record }) {
  const snapshot = () => page.evaluate(() => window.generatorFixture.snapshot())
  await record(
    'Repeated form submits and associates application errors with one row',
    async () => {
      await reviewRepeatedServer(page)
      assert.equal((await snapshot()).factories, 0)
      assert.equal((await snapshot()).requests, 0)
      await save(page).click()
      await expect(
        row(page, 'second').getByText('Choose another name', { exact: true }),
      ).toHaveCount(2)
      await expect(name(page, 'second')).toHaveAttribute('aria-invalid', 'true')
      assert.equal((await snapshot()).submissions, 1)
      await name(page, 'second').fill('Changed')
      await save(page).click()
      await expect(page.locator('[data-repeated-result]')).toHaveText('Saved')
      assert.equal((await snapshot()).submissions, 2)
      assert.equal((await snapshot()).saved.entries[1].name, 'Changed')
    },
  )
  await record(
    'Row additions and reorders preserve native drafts and stable controls',
    async () => {
      await page.getByRole('button', { name: 'Add row', exact: true }).click()
      await expect(name(page, 'added-1')).toBeFocused()
      await name(page, 'added-1').fill('Third')
      const quantity = row(page, 'first').getByRole('textbox', {
        name: 'quantity',
        exact: true,
      })
      await quantity.fill('-')
      await quantity.evaluate((node) => {
        window.repeatedQuantity = node
      })
      await page.evaluate(() => window.generatorFixture.revise())
      await expect(quantity).toBeFocused()
      await expect(quantity).toHaveValue('-')
      assert.equal(
        await quantity.evaluate((node) => node === window.repeatedQuantity),
        true,
      )
      const before = (await snapshot()).submissions
      await save(page).click()
      assert.equal((await snapshot()).submissions, before)
      await quantity.fill('9')
      await save(page).click()
      assert.equal(
        (await snapshot()).saved.entries.find((entry) => entry.key === 'first')
          .quantity,
        9,
      )
    },
  )
  await record(
    'Applications can reject requests or lock repeated groups',
    async () => {
      await page.evaluate(() =>
        window.generatorFixture.repeatedConfiguration({ reject: true }),
      )
      await name(page, 'first').fill('Rejected')
      await expect(name(page, 'first')).toHaveValue('First')
      await page.getByRole('button', { name: 'Add row', exact: true }).click()
      await expect(row(page, 'added-2')).toHaveCount(0)
      await row(page, 'first')
        .getByRole('button', { name: /^Remove entries row/ })
        .click()
      await expect(name(page, 'first')).toBeVisible()
      await page.evaluate(() =>
        window.generatorFixture.repeatedConfiguration({
          reject: false,
          readOnly: true,
        }),
      )
      await expect(
        page.getByRole('button', { name: 'Add row', exact: true }),
      ).toBeDisabled()
      await expect(name(page, 'first')).toHaveAttribute('readonly', '')
      assert.equal((await snapshot()).factories, 2)
      await page.evaluate(() =>
        window.generatorFixture.repeatedConfiguration({ readOnly: false }),
      )
    },
  )
  await record(
    'Repeated forms fill their panel and fit narrow screens',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      )
      const dimensions = await page.locator('form').evaluate((node) => ({
        bottom: node.getBoundingClientRect().bottom,
        panel: node.closest('[data-generator-panel]').getBoundingClientRect()
          .bottom,
      }))
      assert.ok(Math.abs(dimensions.bottom - dimensions.panel) < 20)
      for (const button of [
        page.getByRole('button', { name: 'Add row', exact: true }),
        save(page),
      ]) {
        await button.scrollIntoViewIfNeeded()
        const target = await button.evaluate((node) => {
          const box = node.getBoundingClientRect()
          const form = node.closest('form').getBoundingClientRect()
          const x = box.left + box.width / 2,
            y = box.top + box.height / 2
          return {
            label: node.textContent,
            box: { top: box.top, bottom: box.bottom },
            form: { top: form.top, bottom: form.bottom },
            visible:
              box.top >= form.top - 1 &&
              box.bottom <= form.bottom + 1 &&
              box.top >= 0 &&
              box.bottom <= innerHeight,
            hit: node.contains(document.elementFromPoint(x, y)),
            scroll: node.closest('form').scrollTop,
          }
        })
        assert.equal(target.visible, true, JSON.stringify(target))
        assert.equal(target.hit, true)
        assert.ok(target.scroll > 0)
      }
      await page.screenshot({
        path: await artifactPath('wfe-repeated-phone.png'),
      })
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.screenshot({
        path: await artifactPath('wfe-repeated-wide.png'),
      })
    },
  )
  await record(
    'Removal and disposal release repeated controls and their handlers',
    async () => {
      await name(page, 'added-1').evaluate((node) => {
        window.removedRepeatedInput = node
      })
      await row(page, 'added-1')
        .getByRole('button', { name: /^Remove entries row/ })
        .click()
      await expect(
        page.getByRole('button', { name: 'Add row', exact: true }),
      ).toBeFocused()
      const before = (await snapshot()).requests
      await page.evaluate(() => {
        window.removedRepeatedInput.value = 'Detached'
        window.removedRepeatedInput.dispatchEvent(
          new Event('input', { bubbles: true }),
        )
      })
      assert.equal((await snapshot()).requests, before)
      await page.evaluate(() => window.generatorFixture.remove())
      await expect(page.locator('form')).toHaveCount(0)
      await page.evaluate(() => window.generatorFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
    },
  )
}
