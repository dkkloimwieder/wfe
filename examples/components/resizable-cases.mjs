import assert from 'node:assert/strict'
import { reviewResizable } from '../shared/controls/resizable-review.mjs'
import { reviewDefaultAppearance } from '../shared/appearance/default-review.mjs'
export async function resizableCases({ page, url, record, settle }) {
  await record(
    'resizable: pointer and keyboard sizing, retained panes, table layouts and cleanup',
    async () => {
      await page.goto(`${url}?resizable=1`)
      await page.waitForFunction(() => Boolean(window.resizableFixture))
      await reviewDefaultAppearance(page)
      await reviewResizable(page, 'client')
      await page.evaluate(() => {
        const active = new Set()
        const restores = []
        for (const [target, type] of [
          [window, 'blur'],
          [document, 'visibilitychange'],
        ]) {
          const add = target.addEventListener
          const remove = target.removeEventListener
          target.addEventListener = function (name, listener, ...rest) {
            if (name === type) active.add(listener)
            return add.call(this, name, listener, ...rest)
          }
          target.removeEventListener = function (name, listener, ...rest) {
            if (name === type) active.delete(listener)
            return remove.call(this, name, listener, ...rest)
          }
          restores.push(() => {
            target.addEventListener = add
            target.removeEventListener = remove
          })
        }
        window.resizeListenerAudit = {
          count: () => active.size,
          restore: () => restores.forEach((restore) => restore()),
        }
      })
      const handle = page.locator('#resizable-review').getByRole('separator')
      await handle.scrollIntoViewIfNeeded()
      const box = await handle.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await handle.evaluate((node) => {
        node.addEventListener(
          'pointerdown',
          (event) => {
            window.resizeDisposePointerId = event.pointerId
          },
          { once: true },
        )
      })
      await page.mouse.down()
      await page.mouse.move(
        box.x + box.width / 2 + 1,
        box.y + box.height / 2 + 1,
      )
      assert.equal(await handle.getAttribute('data-resizing'), '')
      assert.equal(
        await handle.evaluate((node) =>
          node.hasPointerCapture(window.resizeDisposePointerId),
        ),
        true,
      )
      assert.equal(
        await page.evaluate(() => window.resizeListenerAudit.count()),
        2,
      )
      const cleanup = await page.evaluate(async () => {
        const fixture = window.resizableFixture
        const node = document.querySelector(
          '#resizable-review .ui-resize-handle',
        )
        const before = fixture.read()
        fixture.stop()
        node.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
        )
        window.dispatchEvent(new Event('blur'))
        await new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        )
        return {
          before,
          after: fixture.read(),
          connected: node.isConnected,
          capture: node.hasPointerCapture(window.resizeDisposePointerId),
          listeners: window.resizeListenerAudit.count(),
        }
      })
      await page.mouse.up()
      assert.deepEqual(cleanup.after, cleanup.before)
      assert.equal(cleanup.connected, false)
      assert.equal(cleanup.capture, false)
      assert.equal(cleanup.listeners, 0)
      await page.evaluate(() => window.resizeListenerAudit.restore())
      await settle()
    },
  )
}
