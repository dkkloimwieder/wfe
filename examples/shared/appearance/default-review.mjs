import assert from 'node:assert/strict'

/** Test the approved appearance on the public component preview routes. */
export async function reviewDefaultAppearance(page) {
  const appearance = await page
    .locator('.component-preview')
    .evaluate((scope) => {
      const pane = scope.querySelector('.ui-card')
      const action = scope.querySelector(
        '.ui-tabs-trigger, .ui-breadcrumbs-link, [data-accordion-review] .ui-button, [data-resizable-review] .ui-button, [data-file-review] .ui-button',
      )
      const canvasStyle = getComputedStyle(scope)
      const paneStyle = getComputedStyle(pane)
      const actionStyle = getComputedStyle(action)
      return {
        canvas: canvasStyle.backgroundColor,
        pane: paneStyle.backgroundColor,
        action: actionStyle.color,
        border:
          action.tagName === 'BUTTON' ? actionStyle.borderColor : undefined,
        variant:
          action.tagName === 'BUTTON' ? action.dataset.variant : undefined,
        shadow: paneStyle.boxShadow,
        depth: scope.style.getPropertyValue('--ui-panel-shadow').trim(),
        reachesBottom: scope.getBoundingClientRect().bottom >= innerHeight,
        fullWidth: scope.getBoundingClientRect().width === innerWidth,
        outsideButton: scope.querySelector('#tabs-outside')
          ? {
              color: getComputedStyle(scope.querySelector('#tabs-outside'))
                .color,
              font: getComputedStyle(scope.querySelector('#tabs-outside'))
                .fontFamily,
              expectedFont: actionStyle.fontFamily,
              textCase: getComputedStyle(scope.querySelector('#tabs-outside'))
                .textTransform,
            }
          : null,
      }
    })
  assert.equal(appearance.canvas, 'rgb(252, 252, 253)')
  assert.equal(appearance.pane, 'rgb(255, 255, 255)')
  assert.equal(appearance.action, 'rgb(25, 113, 194)')
  if (appearance.border !== undefined) {
    assert.equal(appearance.border, appearance.action)
    assert.equal(appearance.variant, 'outline')
  }
  assert.equal(appearance.depth, 'var(--review-shadow-2)')
  assert.notEqual(appearance.shadow, 'none')
  assert.equal(appearance.reachesBottom, true)
  assert.equal(appearance.fullWidth, true)
  if (appearance.outsideButton) {
    assert.equal(appearance.outsideButton.color, appearance.action)
    assert.equal(
      appearance.outsideButton.font,
      appearance.outsideButton.expectedFont,
    )
    assert.equal(appearance.outsideButton.textCase, 'uppercase')
  }
  await page.setViewportSize({ width: 320, height: 844 })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.setViewportSize({ width: 1280, height: 720 })
}
