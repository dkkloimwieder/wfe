import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewAccordion(page, api) {
  const configure = (next) =>
    page.evaluate(
      ({ api, next }) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.accordion
          : window.accordionFixture
        ).configure(next),
      { api, next },
    )
  const read = () =>
    page.evaluate(
      (api) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.accordion
          : window.accordionFixture
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
  const contact = page.locator('#accordion-contact')
  const preferences = page.locator('#accordion-preferences')
  const first = contact.locator(':scope > summary')
  const second = preferences.locator(':scope > summary')
  const last = page.locator('#accordion-notes > summary')
  const name = page.locator('#accordion-name')
  await settle()
  assert.deepEqual(await read(), {
    requests: [],
    multipleRequests: [],
    actions: 0,
    mounts: 1,
    cleanups: 0,
  })
  await expect(contact).toHaveAttribute('open', '')
  await first.focus()
  await page.keyboard.press('ArrowDown')
  await expect(second).toBeFocused()
  await expect(preferences).not.toHaveAttribute('open')
  await page.keyboard.press('End')
  await expect(last).toBeFocused()
  await page.keyboard.press('Home')
  await expect(first).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(last).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await page.keyboard.press('Shift+ArrowDown')
  await expect(first).toBeFocused()
  await configure({ preventKeys: true })
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await configure({ preventKeys: false })
  await last.evaluate((node) => (node.parentElement.inert = true))
  await second.focus()
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await last.evaluate((node) => (node.parentElement.inert = false))
  await last.evaluate((node) => (node.tabIndex = -1))
  await second.focus()
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await last.evaluate((node) => node.removeAttribute('tabindex'))
  assert.equal(
    await first.evaluate(
      (node) =>
        getComputedStyle(node).outlineStyle !== 'none' &&
        parseFloat(getComputedStyle(node).outlineWidth) > 0,
    ),
    true,
  )

  await page.locator('#accordion-help').click()
  assert.equal((await read()).actions, 1)
  assert.deepEqual((await read()).requests, [])
  await page.locator('#accordion-help').focus()
  await page.keyboard.press('Home')
  await expect(page.locator('#accordion-help')).toBeFocused()
  await name.fill('Retained contact draft')
  await name.focus()
  await page.keyboard.press('End')
  await expect(name).toBeFocused()
  await configure({ value: ['preferences'] })
  await expect(first).toBeFocused()
  await expect(name).not.toBeVisible()
  const delivery = page.locator('#accordion-delivery > summary')
  const backup = page.locator('#accordion-backup > summary')
  await delivery.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#accordion-delivery')).toHaveAttribute('open', '')
  await page.keyboard.press('ArrowDown')
  await expect(backup).toBeFocused()
  await page.keyboard.press('End')
  await expect(backup).toBeFocused()
  await page.keyboard.press('Home')
  await expect(delivery).toBeFocused()
  await expect(preferences).toHaveAttribute('open', '')
  await second.focus()
  await page.keyboard.press('ArrowDown')
  await expect(last).toBeFocused()
  await configure({ accept: false })
  await first.focus()
  await page.keyboard.press('Enter')
  await settle()
  await expect(preferences).toHaveAttribute('open', '')
  await expect(contact).not.toHaveAttribute('open')
  assert.deepEqual((await read()).requests, [['contact']])
  await configure({ accept: true })
  await page.keyboard.press('Enter')
  await settle()
  await expect(contact).toHaveAttribute('open', '')
  await expect(preferences).not.toHaveAttribute('open')
  await expect(name).toHaveValue('Retained contact draft')
  await configure({ prevent: true })
  await page.keyboard.press('Space')
  await settle()
  await expect(contact).toHaveAttribute('open', '')
  assert.deepEqual((await read()).requests, [['contact'], ['contact']])
  await configure({ prevent: false })
  await page.keyboard.press('Space')
  await settle()
  await expect(contact).not.toHaveAttribute('open')
  await page.keyboard.press('Enter')
  await settle()
  await expect(name).toHaveValue('Retained contact draft')
  await contact.evaluate((node) => {
    node.open = false
  })
  await settle()
  await expect(contact).not.toHaveAttribute('open')
  await configure({ value: ['contact'] })
  const notifications = page.locator('#accordion-notifications')
  const access = page.locator('#accordion-access')
  await access.locator(':scope > summary').focus()
  await page.keyboard.press('Enter')
  await expect(notifications).toHaveAttribute('open', '')
  await expect(access).toHaveAttribute('open', '')
  await notifications.locator(':scope > summary').focus()
  await page.keyboard.press('Space')
  await expect(notifications).not.toHaveAttribute('open')
  await expect(access).toHaveAttribute('open', '')
  assert.deepEqual((await read()).multipleRequests, [
    ['notifications', 'access'],
    ['access'],
  ])
  await page.locator('#accordion-outside').focus()
  await configure({ value: [] })
  await expect(page.locator('#accordion-outside')).toBeFocused()
  await configure({ value: ['contact'] })
  assert.deepEqual((await read()).requests, [
    ['contact'],
    ['contact'],
    [],
    ['contact'],
    [],
  ])
  assert.equal((await read()).mounts, 1)
  assert.equal((await read()).cleanups, 0)
  await page.setViewportSize({ width: 320, height: 844 })
  assert.equal(
    await page
      .locator('[data-accordion-review]')
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
    true,
  )
  await page.setViewportSize({ width: 1280, height: 720 })
}
