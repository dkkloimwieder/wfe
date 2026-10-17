import assert from 'node:assert/strict'

export async function collapsedGroupLabel(button) {
  assert.equal(await button.getAttribute('aria-expanded'), 'false')
  const icon = button.locator('.ui-icon-text-slot svg')
  assert.equal(await icon.count(), 1)
  assert.equal(await icon.getAttribute('aria-hidden'), 'true')
  assert.equal(await icon.getAttribute('focusable'), 'false')
  assert.ok(
    await icon.locator('path').evaluate((path) => path.getBBox().width > 0),
  )
  return (await button.innerText()).trim()
}
