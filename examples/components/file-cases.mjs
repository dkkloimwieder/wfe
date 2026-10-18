import assert from 'node:assert/strict'
import { reviewFiles } from '../shared/controls/file-review.mjs'
import { reviewDefaultAppearance } from '../shared/appearance/default-review.mjs'
export async function fileCases({ page, url, record, settle }) {
  await record(
    'files: controlled selection, native validity, picker/drop parity, reset and cleanup',
    async () => {
      await page.goto(`${url}?files=1`)
      await page.waitForFunction(() => Boolean(window.fileFixture))
      await reviewDefaultAppearance(page)
      await reviewFiles(page)
      const result = await page.evaluate(async () => {
        const input = document.querySelector(
          '[data-file-review] input[type=file]',
        )
        const root = document.querySelector('.ui-file-input')
        const remove = root.querySelector('li button')
        const fixture = window.fileFixture
        const before = fixture.read()
        document.querySelector('#file-review-form').reset()
        fixture.stop()
        const transfer = new DataTransfer()
        transfer.items.add(
          new File(['abc'], 'detached.txt', { type: 'text/plain' }),
        )
        root.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        )
        input.dispatchEvent(new Event('change', { bubbles: true }))
        remove?.click()
        await new Promise((done) => setTimeout(done, 20))
        return { before, after: fixture.read(), connected: input.isConnected }
      })
      assert.deepEqual(result.after, result.before)
      assert.equal(result.connected, false)
      await settle()
    },
  )
}
