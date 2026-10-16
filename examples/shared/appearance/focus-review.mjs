import assert from 'node:assert/strict'

export async function reviewAppearanceFocus(page) {
  const original = page.viewportSize()
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      )
      const panel = page.locator('.appearance-review')
      const bounds = await panel.boundingBox()
      await page.keyboard.press('Tab')
      for (const strip of await page
        .locator('.appearance-pickers, .appearance-layers')
        .all()) {
        for (const button of [
          strip.getByRole('button').first(),
          strip.getByRole('button').last(),
        ]) {
          await button.focus()
          const ring = await button.evaluate((node) => {
            const style = getComputedStyle(node)
            const outside =
              parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)
            const target = node.getBoundingClientRect()
            const viewport = node
              .closest('.appearance-pickers, .appearance-layers')
              .getBoundingClientRect()
            return {
              style: style.outlineStyle,
              width: parseFloat(style.outlineWidth),
              visible: node.matches(':focus-visible'),
              left: target.left - outside - viewport.left,
              right: viewport.right - target.right - outside,
              top: target.top - outside - viewport.top,
              bottom: viewport.bottom - target.bottom - outside,
            }
          })
          assert.equal(ring.visible, true)
          assert.equal(ring.style, 'solid')
          assert.equal(ring.width, 2)
          for (const edge of ['left', 'right', 'top', 'bottom'])
            assert.ok(ring[edge] >= -1, JSON.stringify({ width, edge, ring }))
          assert.deepEqual(await panel.boundingBox(), bounds)
        }
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
    }
  } finally {
    await page.setViewportSize(original)
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
  }
}

export async function appearanceColor(page, role) {
  return page.locator('main').evaluate((scope, role) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${role})`
    scope.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, role)
}
