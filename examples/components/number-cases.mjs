import assert from 'node:assert/strict'
import { reviewNumber } from '../shared/controls/number-review.mjs'
export async function numberCases({ page, url, record }) {
  await record(
    'number: finite values, retained drafts, explicit clearing, focus and cleanup',
    async () => {
      await page.goto(`${url}?number=1`)
      await page.waitForFunction(() => Boolean(window.numberFixture))
      await reviewNumber(page, 'client')
      await page
        .getByRole('textbox', { name: 'Numeric amount', exact: true })
        .fill('2.00')
      const result = await page.evaluate(async () => {
        const input = document.querySelector(
          '#number-review input:not([type=hidden])',
        )
        input.blur()
        const before = window.numberFixture.read()
        window.numberFixture.stop()
        input.value = '99'
        input.dispatchEvent(new InputEvent('input', { bubbles: true }))
        input.dispatchEvent(new FocusEvent('blur'))
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
        await Promise.resolve()
        return {
          before,
          after: window.numberFixture.read(),
          connected: input.isConnected,
        }
      })
      assert.deepEqual(result.after, result.before)
      assert.equal(result.connected, false)
    },
  )
}
