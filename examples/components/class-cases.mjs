import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import {
  reviewStructuredClasses,
  reviewDynamicIds,
  initialClassTokens,
} from '../shared/controls/class-review.mjs'

export async function classCases({ page, url, record, settle }) {
  await record(
    'structured classes: reactive values preserve library classes, nodes, refs and events',
    async () => {
      await page.goto(`${url}?classes=1`)
      const before = await page.evaluate(() => window.classFixture.read())
      assert.equal(before.refs, 2)
      await reviewStructuredClasses(
        page,
        async (value) => {
          await page.evaluate(
            (value) => window.classFixture.configure(value),
            value,
          )
          await settle()
        },
        (enabled, nested) =>
          page.evaluate(
            ({ enabled, nested }) =>
              window.classFixture.configureMap(enabled, nested),
            { enabled, nested },
          ),
      )
      await reviewDynamicIds(page, (suffix) =>
        page.evaluate(
          (suffix) => window.classFixture.configureIds(suffix),
          suffix,
        ),
      )
      await page.locator('#class-button').click()
      await page
        .getByRole('button', { name: 'Class action', exact: true })
        .click()
      assert.deepEqual(await page.evaluate(() => window.classFixture.read()), {
        ...before,
        clicks: 2,
      })
      await page.locator('#class-input').fill('Retained input events')
      await expect(page.locator('#class-input')).toHaveValue(
        'Retained input events',
      )
      await page.locator('#class-popover-trigger').click()
      const popup = page.locator('[data-class-base="ui-popover"]')
      await expect(popup).toBeVisible()
      const initial = [
        'caller-a caller-shared',
        { 'caller-on': true },
        [0, 23, 'caller-nested'],
      ]
      await page.evaluate(
        (value) => window.classFixture.configure(value),
        initial,
      )
      for (const base of [
        'ui-popover',
        'ui-popup-title',
        'ui-popup-description',
      ]) {
        const part = page.locator(`[data-class-base="${base}"]`)
        await expect
          .poll(() => part.evaluate((node) => [...node.classList].sort()))
          .toEqual([...initialClassTokens, base].sort())
      }
      await page.evaluate(() =>
        window.classFixture.configure({ 'caller-popup': true }),
      )
      await expect
        .poll(() => popup.evaluate((node) => [...node.classList].sort()))
        .toEqual(['caller-popup', 'ui-popover'])
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click()
      await expect(page.locator('#class-popover-trigger')).toBeFocused()
      assert.equal(
        await page.locator('#class-popover-trigger button').count(),
        0,
      )
      await page.evaluate(() => window.classFixture.stop())
      assert.equal(await page.locator('[data-class-base]').count(), 0)
      assert.equal(
        await page.evaluate(() => window.classFixture.read().cleanups),
        1,
      )
    },
  )
}
