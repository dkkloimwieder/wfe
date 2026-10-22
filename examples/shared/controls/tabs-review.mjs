import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewTabs(page, api) {
  const configure = (next) =>
    page.evaluate(
      ({ api, next }) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.tabs
          : window.tabsFixture
        ).configure(next),
      { api, next },
    )
  const read = () =>
    page.evaluate(
      (api) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.tabs
          : window.tabsFixture
        ).read(),
      api,
    )
  const root = page.locator('#retained-tabs')
  const details = root.getByRole('tab', { name: 'Details', exact: true })
  const notes = root.getByRole('tab', { name: 'Notes', exact: true })
  const other = root.getByRole('tab', { name: 'Other', exact: true })
  await expect(details).toHaveAttribute('aria-selected', 'true')
  assert.deepEqual((await read()).requests, [])
  for (const tab of [details, notes, other]) {
    const id = await tab.getAttribute('aria-controls')
    if (id) assert.equal(await page.locator(`[id="${id}"]`).count(), 1)
  }
  const input = page.getByLabel('Retained tab draft')
  await input.fill('Retained value')
  await configure({ value: 'notes' })
  await expect(notes).toBeFocused()
  await expect(input).not.toBeVisible()
  await expect(
    root.getByRole('tabpanel', { includeHidden: true }).filter({ has: input }),
  ).toHaveAttribute('inert', '')
  await configure({ value: 'details' })
  await expect(input).toHaveValue('Retained value')
  await configure({ accept: false })
  await notes.click()
  await expect(details).toHaveAttribute('aria-selected', 'true')
  assert.deepEqual((await read()).requests, ['notes'])
  await configure({ accept: true, prevent: true })
  await notes.click()
  assert.deepEqual((await read()).requests, ['notes'])
  await configure({ prevent: false })
  await details.focus()
  await page.keyboard.press('ArrowRight')
  await expect(notes).toBeFocused()
  await expect(notes).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(other).toBeFocused()
  await expect(other).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(details).toBeFocused()
  await configure({ activationMode: 'manual' })
  await page.keyboard.press('ArrowRight')
  await expect(notes).toBeFocused()
  await expect(details).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(notes).toHaveAttribute('aria-selected', 'true')
  await configure({ orientation: 'vertical' })
  await page.keyboard.press('ArrowDown')
  await expect(other).toBeFocused()
  await page.keyboard.press('Space')
  await expect(other).toHaveAttribute('aria-selected', 'true')
  await configure({
    orientation: 'horizontal',
    activationMode: 'automatic',
    dir: 'rtl',
    value: 'details',
  })
  await details.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(notes).toBeFocused()
  await expect(notes).toHaveAttribute('aria-selected', 'true')
  await configure({ preventKeys: true })
  await page.keyboard.press('Home')
  await expect(notes).toBeFocused()
  await configure({ preventKeys: false, dir: 'ltr' })
  await configure({ disabled: true })
  await expect(details).toBeDisabled()
  await configure({ disabled: false })
  const active = page.locator('#active-tabs')
  const draft = active.getByLabel('Disposable tab draft')
  await draft.fill('Temporary value')
  await configure({ activeValue: 'summary' })
  await expect(
    active.getByRole('tab', { name: 'Summary', exact: true }),
  ).toBeFocused()
  await expect(draft).toHaveCount(0)
  await configure({ activeValue: 'draft' })
  await draft.fill('Temporary value')
  const before = await read()
  await active.getByRole('tab', { name: 'Summary', exact: true }).click()
  await expect(draft).toHaveCount(0)
  assert.equal((await read()).cleanups, before.cleanups + 1)
  await active.getByRole('tab', { name: 'Draft', exact: true }).click()
  await expect(draft).toHaveValue('Original draft')
  await page.locator('#tabs-outside').focus()
  await configure({ value: 'notes' })
  await expect(page.locator('#tabs-outside')).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await root.evaluate((node) => node.scrollWidth <= node.clientWidth),
    true,
  )
  await page.setViewportSize({ width: 1280, height: 720 })
}
