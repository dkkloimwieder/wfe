import assert from 'node:assert/strict'
import { reviewBreadcrumbs } from '../shared/controls/breadcrumb-review.mjs'
export async function breadcrumbCases({ page, url, record, settle }) {
  await record(
    'breadcrumbs: native links, current page, keyboard, responsive layout and disposal',
    async () => {
      await page.goto(`${url}?breadcrumbs=1`)
      await page.waitForFunction(() => Boolean(window.breadcrumbFixture))
      await reviewBreadcrumbs(page, 'client')
      const result = await page.evaluate(() => {
        const fixture = window.breadcrumbFixture
        const link = document.querySelector('#breadcrumb-review a')
        fixture.stop()
        const before = fixture.read()
        link.click()
        return { before, after: fixture.read(), connected: link.isConnected }
      })
      assert.deepEqual(result.after, result.before)
      assert.equal(result.connected, false)
      await settle()
    },
  )
}
