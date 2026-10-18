import assert from 'node:assert/strict'
import { reviewAccordion } from '../shared/controls/accordion-review.mjs'
import { reviewDefaultAppearance } from '../shared/appearance/default-review.mjs'
export async function accordionCases({ page, url, record, settle }) {
  await record(
    'accordion: grouped forms, native keyboard, retained drafts and cleanup',
    async () => {
      await page.goto(`${url}?accordion=1`)
      await page.waitForFunction(() => Boolean(window.accordionFixture))
      await reviewDefaultAppearance(page)
      await reviewAccordion(page, 'client')
      const cleanup = await page.evaluate(async () => {
        const fixture = window.accordionFixture
        const summary = document.querySelector('#accordion-contact > summary')
        const details = summary.parentElement
        const root = document.querySelector('#profile-accordion')
        const before = fixture.read()
        fixture.stop()
        summary.click()
        details.dispatchEvent(new Event('toggle'))
        summary.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        )
        await new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        )
        return { before, after: fixture.read(), connected: root.isConnected }
      })
      assert.deepEqual(cleanup.after.requests, cleanup.before.requests)
      assert.deepEqual(
        cleanup.after.multipleRequests,
        cleanup.before.multipleRequests,
      )
      assert.equal(cleanup.after.cleanups, 1)
      assert.equal(cleanup.connected, false)
      await settle()
    },
  )
}
