import assert from 'node:assert/strict'

/** Compare nested layout scopes and real fields with the shared form profile. */
export async function reviewExampleSizing(page) {
  const original = page.viewportSize()
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 })
      const result = await page.evaluate(() => {
        const visible = (node) => node.getClientRects().length > 0
        const scopes = [...document.querySelectorAll('.ui-dashboard')]
        const controls = [
          ...document.querySelectorAll('.ui-input, .popup-trigger, .ui-button'),
        ]
          .filter(visible)
          .filter(
            (node) =>
              !node.closest('table') &&
              !node.matches('.column-sort, .column-move, .header-rename'),
          )
        const forms = [...document.querySelectorAll('.ui-form')].filter(visible)
        return {
          scopes: scopes.map((node) => {
            const style = getComputedStyle(node)
            return [
              style.getPropertyValue('--ui-control-height').trim(),
              style.getPropertyValue('--ui-gap').trim(),
              style.fontSize,
            ]
          }),
          controls: controls.map((node) => ({
            label:
              node.getAttribute('aria-label') || node.textContent || node.id,
            height: node.getBoundingClientRect().height,
            compactHeader: Boolean(node.closest('.table-workspace-header')),
          })),
          forms: forms.map((node) => {
            const box = node.getBoundingClientRect(),
              parent = node.parentElement.getBoundingClientRect()
            return {
              width: box.width,
              multiColumn: Boolean(
                node.querySelector(
                  ".ui-form-grid[data-columns='2'], .ui-form-grid[data-columns='3']",
                ),
              ),
              center: (box.left + box.right - parent.left - parent.right) / 2,
              gap: getComputedStyle(node).rowGap,
            }
          }),
          fields: [
            ...document.querySelectorAll(
              '.ui-input, .ui-textarea, .popup-trigger, .choice-control',
            ),
          ]
            .filter(visible)
            .map((node) => node.getBoundingClientRect().width),
          grids: [...document.querySelectorAll('.ui-form-grid')]
            .filter(visible)
            .map((node) => ({
              declared: Number(node.dataset.columns || 1),
              width: node.closest('.ui-form-layout').clientWidth,
              columns:
                getComputedStyle(node).gridTemplateColumns.split(' ').length,
            })),
          tableControls: [
            ...document.querySelectorAll(
              '.table-scroll tbody .ui-button, .table-scroll tbody .ui-input, .table-scroll tbody .popup-trigger',
            ),
          ]
            .filter(visible)
            .map((node) => node.getBoundingClientRect().height),
          overflow: document.documentElement.scrollWidth > innerWidth,
        }
      })
      assert.ok(result.scopes.length)
      for (const scope of result.scopes)
        assert.deepEqual(scope, ['32px', '8px', '12px'])
      for (const control of result.controls)
        assert.equal(
          control.height,
          control.compactHeader ? 26 : 32,
          JSON.stringify(control),
        )
      for (const form of result.forms) {
        if (!form.multiColumn)
          assert.ok(form.width <= 480.5, JSON.stringify(form))
        assert.ok(Math.abs(form.center) <= 1, JSON.stringify(form))
        assert.equal(form.gap, '20px')
      }
      for (const field of result.fields)
        assert.ok(field <= 480.5, String(field))
      for (const grid of result.grids) {
        const expected =
          grid.declared === 3
            ? grid.width >= 720
              ? 3
              : 1
            : grid.declared === 2
              ? grid.width >= 480
                ? 2
                : 1
              : 1
        assert.equal(grid.columns, expected, JSON.stringify(grid))
      }
      for (const height of result.tableControls) assert.equal(height, 26)
      assert.equal(result.overflow, false)
    }
  } finally {
    await page.setViewportSize(original)
  }
}
