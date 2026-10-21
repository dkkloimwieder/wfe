import assert from 'node:assert/strict'

/** Exercise responsive form columns without fixing the appearance profile. */
export async function reviewExampleSizing(page) {
  const original = page.viewportSize()
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 })
      const result = await page.evaluate(() => ({
        grids: [...document.querySelectorAll('.ui-form-grid')]
          .filter((node) => node.getClientRects().length > 0)
          .map((node) => ({
            declared: Number(node.dataset.columns || 1),
            columns:
              getComputedStyle(node).gridTemplateColumns.split(' ').length,
          })),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))
      for (const grid of result.grids) {
        assert.ok(
          grid.columns >= 1 && grid.columns <= grid.declared,
          JSON.stringify(grid),
        )
        if (width === 390) assert.equal(grid.columns, 1, JSON.stringify(grid))
      }
      assert.equal(result.overflow, false)
    }
  } finally {
    await page.setViewportSize(original)
  }
}
