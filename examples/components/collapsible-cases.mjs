import assert from 'node:assert/strict'
import { reviewCollapsible } from '../shared/controls/collapsible-review.mjs'

export async function collapsibleCases({ page, url, record, settle }) {
  await record(
    'collapsible: native keyboard, controlled requests, retained drafts and focus',
    async () => {
      await page.goto(`${url}?collapsible=1`)
      await page.waitForFunction(() => Boolean(window.collapsibleFixture))
      await reviewCollapsible(page, 'client')
      const cleanup = await page.evaluate(async () => {
        const fixture = window.collapsibleFixture
        const details = document.querySelector('#controlled-disclosure')
        const native = document.querySelector('#native-disclosure')
        const summary = details.querySelector('summary')
        // Queue an event before disposal and retain the removed nodes.
        native.open = false
        const before = fixture.read()
        fixture.stop()
        summary.click()
        details.open = false
        details.dispatchEvent(new Event('toggle'))
        native.dispatchEvent(new Event('toggle'))
        await new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        )
        return { before, after: fixture.read(), connected: details.isConnected }
      })
      assert.deepEqual(cleanup.after, cleanup.before)
      assert.equal(cleanup.connected, false)
      await settle()
    },
  )
}
