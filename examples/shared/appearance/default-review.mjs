import assert from 'node:assert/strict'

/** Check that public preview controls remain reachable on a narrow screen. */
export async function reviewDefaultAppearance(page) {
  await page.setViewportSize({ width: 320, height: 844 })
  try {
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth,
      undefined,
      { timeout: 7000 },
    )
  } catch (cause) {
    let geometry
    try {
      geometry = await page.evaluate(() => ({
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        overflowing: Array.from(document.querySelectorAll('body *'))
          .map((node) => {
            const box = node.getBoundingClientRect()
            return {
              tag: node.tagName,
              id: node.id,
              className: node.getAttribute('class'),
              left: box.left,
              right: box.right,
              width: box.width,
            }
          })
          .filter((box) => box.width > 0 && box.right > innerWidth)
          .slice(0, 30),
      }))
    } catch (diagnosticError) {
      geometry = { diagnosticError: String(diagnosticError) }
    }
    throw new Error(
      `Narrow preview remained outside the viewport: ${JSON.stringify(geometry)}`,
      { cause },
    )
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.setViewportSize({ width: 1280, height: 720 })
}
