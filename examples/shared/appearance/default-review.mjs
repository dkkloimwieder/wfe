import assert from 'node:assert/strict'

/** Check that public preview controls remain reachable on a narrow screen. */
export async function reviewDefaultAppearance(page) {
  await page.setViewportSize({ width: 320, height: 844 })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.setViewportSize({ width: 1280, height: 720 })
}
