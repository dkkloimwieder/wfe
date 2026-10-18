import assert from 'node:assert/strict'
import { reviewTabs } from '../shared/controls/tabs-review.mjs'
export async function tabsCases({ page, url, record, settle }) {
  await record(
    'tabs: selection, keyboard, lifetime, focus and cleanup',
    async () => {
      await page.goto(`${url}?tabs=1`)
      await page.waitForFunction(() => Boolean(window.tabsFixture))
      await reviewTabs(page, 'client')
      const disposed = await page.evaluate(() => {
        const tab = document.querySelector('#retained-tabs [role="tab"]')
        const fixture = window.tabsFixture
        fixture.stop()
        const before = fixture.read()
        tab.click()
        tab.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        )
        return { before, after: fixture.read(), connected: tab.isConnected }
      })
      assert.deepEqual(disposed.after, disposed.before)
      assert.equal(disposed.connected, false)
      await settle()
    },
  )
}
