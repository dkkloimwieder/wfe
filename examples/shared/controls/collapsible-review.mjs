import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewCollapsible(page, api) {
  const configure = (next) =>
    page.evaluate(
      ({ api, next }) => {
        const fixture =
          api === 'hydration'
            ? window.hydrationFixture.lifecycle.collapsible
            : window.collapsibleFixture
        fixture.configure(next)
      },
      { api, next },
    )
  const read = () =>
    page.evaluate(
      (api) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.collapsible
          : window.collapsibleFixture
        ).read(),
      api,
    )
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        ),
    )
  const controlled = page.locator('#controlled-disclosure')
  const summary = controlled.locator(':scope > summary')
  const native = page.locator('#native-disclosure')
  const nativeSummary = native.locator(':scope > summary')
  const input = controlled.getByLabel('Retained disclosure draft')
  await settle()
  assert.deepEqual((await read()).requests, [])
  assert.deepEqual((await read()).nativeRequests, [])
  await input.fill('Retained local draft')
  await configure({ open: false })
  await expect(summary).toBeFocused()
  await expect(input).not.toBeVisible()
  await configure({ open: true })
  await expect(input).toHaveValue('Retained local draft')
  await settle()
  assert.deepEqual((await read()).requests, [])
  await configure({ accept: false })
  await summary.focus()
  await page.keyboard.press('Enter')
  await settle()
  await expect(controlled).toHaveAttribute('open', '')
  assert.deepEqual((await read()).requests, [false])
  await configure({ accept: true })
  await page.keyboard.press('Space')
  await settle()
  await expect(controlled).not.toHaveAttribute('open')
  assert.deepEqual((await read()).requests, [false, false])
  await page.keyboard.press('Enter')
  await settle()
  await expect(controlled).toHaveAttribute('open', '')
  await controlled.getByRole('button', { name: 'Summary action' }).click()
  await settle()
  assert.equal((await read()).actions, 1)
  assert.deepEqual((await read()).requests, [false, false, true])
  await configure({ prevent: true })
  await summary.focus()
  await page.keyboard.press('Enter')
  await settle()
  await expect(controlled).toHaveAttribute('open', '')
  assert.deepEqual((await read()).requests, [false, false, true])
  await configure({ prevent: false })
  await nativeSummary.focus()
  await page.keyboard.press('Enter')
  await settle()
  await expect(native).toHaveAttribute('open', '')
  await page.keyboard.press('Space')
  await settle()
  await expect(native).not.toHaveAttribute('open')
  assert.deepEqual((await read()).nativeRequests, [true, false])
  await native.evaluate((node) => {
    node.open = true
  })
  await settle()
  assert.deepEqual((await read()).nativeRequests, [true, false, true])
  // Multiple writes in one task produce one native toggle observation.
  await native.evaluate((node) => {
    node.open = false
    node.open = true
  })
  await settle()
  assert.deepEqual((await read()).nativeRequests, [true, false, true])
  await page.locator('#disclosure-outside').focus()
  await configure({ open: false })
  await expect(page.locator('#disclosure-outside')).toBeFocused()
  await configure({ open: true })
  await input.focus()
  await controlled.evaluate((node) => {
    node.open = false
  })
  await settle()
  await expect(controlled).not.toHaveAttribute('open')
  assert.deepEqual((await read()).requests, [false, false, true, false])
  await expect(summary).toBeFocused()
  await configure({ open: true, accept: false })
  await input.focus()
  await controlled.evaluate((node) => {
    node.open = false
  })
  await settle()
  await expect(controlled).toHaveAttribute('open', '')
  assert.deepEqual((await read()).requests, [false, false, true, false, false])
  await expect(input).toHaveValue('Retained local draft')
  assert.deepEqual(
    new Set(await controlled.evaluate((node) => [...node.classList])),
    new Set(['fixture-disclosure', 'caller-open', 'ui-collapsible']),
  )
  await expect(controlled.locator('.ui-collapsible-content')).toHaveClass(
    /fixture-content/,
  )
}
