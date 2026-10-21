import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewContexts(page) {
  const fixture = page.locator('[data-context-review]')
  const trigger = () =>
    fixture.getByRole('button', { name: /^Change context:/ })
  const popup = () => page.locator('.ui-sidebar-context-popup')
  const search = () => popup().getByRole('textbox', { name: 'Search contexts' })
  const open = async () => {
    await trigger().click()
    await expect(search()).toBeFocused()
  }
  const select = async (query, name) => {
    await open()
    await search().fill(query)
    await popup().getByRole('button', { name, exact: true }).click()
    await expect(popup()).toHaveCount(0)
  }
  await expect(trigger()).toHaveAccessibleName('Change context: Project Atlas')
  await fixture.getByLabel('Retained note').fill('Keep this draft')
  await open()
  await expect(
    popup().getByRole('button', { name: 'Project Unavailable', exact: true }),
  ).toBeDisabled()
  await search().press('ArrowDown')
  await expect(
    popup().getByRole('button', { name: 'Project Atlas', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('End')
  await expect(
    popup().getByRole('button', { name: 'Project Beacon', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Home')
  await expect(
    popup().getByRole('button', { name: 'Project Atlas', exact: true }),
  ).toBeFocused()
  await search().focus()
  await search().fill('Atlas')
  await search().press('Home')
  await expect(search()).toBeFocused()
  assert.equal(await search().evaluate((node) => node.selectionStart), 0)
  await search().fill('')
  const parent = popup().getByRole('button', { name: /^Up one level/ })
  await parent.focus()
  const parentNode = await parent.elementHandle()
  await fixture
    .getByRole('button', { name: 'Refresh available contexts' })
    .evaluate((node) => node.click())
  assert.equal(
    await parentNode.evaluate((node) => node === document.activeElement),
    true,
  )
  await fixture
    .getByRole('button', { name: 'Remove parent', exact: true })
    .evaluate((node) => node.click())
  await expect(search()).toBeFocused()
  await fixture
    .getByRole('button', { name: 'Restore contexts', exact: true })
    .evaluate((node) => node.click())
  await search().fill('bea')
  await search().press('ArrowDown')
  await fixture
    .getByRole('button', { name: 'Toggle sibling availability', exact: true })
    .evaluate((node) => node.click())
  await expect(search()).toBeFocused()
  await expect(
    popup().getByRole('button', { name: 'Project Beacon', exact: true }),
  ).toBeDisabled()
  await fixture
    .getByRole('button', { name: 'Restore contexts', exact: true })
    .evaluate((node) => node.click())
  await search().press('ArrowDown')
  await fixture
    .getByRole('button', { name: 'Remove sibling', exact: true })
    .evaluate((node) => node.click())
  await expect(search()).toBeFocused()
  await fixture
    .getByRole('button', { name: 'Restore contexts', exact: true })
    .evaluate((node) => node.click())
  await search().fill('')
  await fixture
    .getByRole('button', { name: 'Hide current choice', exact: true })
    .evaluate((node) => node.click())
  await expect(trigger()).toHaveAccessibleName('Change context: Project Atlas')
  await expect(
    popup().getByRole('button', { name: 'Project Atlas', exact: true }),
  ).toHaveCount(0)
  await fixture
    .getByRole('button', { name: 'Restore contexts', exact: true })
    .evaluate((node) => node.click())
  await search().fill('zzmissing')
  await expect(popup().getByRole('status')).toHaveText('No matching contexts')
  await search().press('Escape')
  await expect(trigger()).toBeFocused()

  await open()
  await search().fill('bea')
  await search().press('ArrowDown')
  const beacon = popup().getByRole('button', {
    name: 'Project Beacon',
    exact: true,
  })
  await expect(beacon).toBeFocused()
  const original = await beacon.elementHandle()
  await fixture
    .getByRole('button', { name: 'Refresh available contexts' })
    .evaluate((node) => node.click())
  await expect(beacon).toBeFocused()
  assert.equal(
    await original.evaluate((node) => node === document.activeElement),
    true,
  )
  await beacon.press('Enter')
  await expect(trigger()).toHaveAccessibleName('Change context: Project Beacon')
  await expect(
    fixture.getByRole('heading', { name: 'Project Beacon', exact: true }),
  ).toBeFocused()
  await expect(fixture.getByLabel('Retained note')).toHaveValue(
    'Keep this draft',
  )

  await fixture.getByText('Reject context changes', { exact: true }).click()
  await select('atlas', 'Project Atlas')
  await expect(trigger()).toHaveAccessibleName('Change context: Project Beacon')
  await expect(fixture.locator('[data-context-request]')).toHaveText(
    'Requested Project Atlas',
  )
  await open()
  await popup()
    .getByRole('button', {
      name: 'Up one level: Organization Example',
      exact: true,
    })
    .click()
  await expect(trigger()).toHaveAccessibleName('Change context: Project Beacon')
  await fixture.getByText('Reject context changes', { exact: true }).click()
  await select('atlas', 'Project Atlas')
  await fixture
    .getByRole('button', { name: 'Atlas / dev', exact: true })
    .click()
  await expect(trigger()).toHaveAccessibleName(
    'Change context: Environment Atlas / dev',
  )
  await expect(
    fixture.getByRole('link', { name: 'Workloads', exact: true }),
  ).toBeVisible()
  await expect(
    fixture.getByRole('link', { name: 'Overview', exact: true }),
  ).toHaveCount(0)
  await select('production', 'Environment Atlas / production')
  await expect(trigger()).toHaveAccessibleName(
    'Change context: Environment Atlas / production',
  )
  await open()
  await popup()
    .getByRole('button', { name: 'Up one level: Project Atlas', exact: true })
    .click()
  await expect(trigger()).toHaveAccessibleName('Change context: Project Atlas')
  await open()
  await popup()
    .getByRole('button', {
      name: 'Up one level: Organization Example',
      exact: true,
    })
    .click()
  await expect(trigger()).toHaveAccessibleName(
    'Change context: Organization Example',
  )
  await open()
  await expect(
    popup().getByRole('button', { name: /^Up one level/ }),
  ).toHaveCount(0)
  await search().press('Escape')
  await fixture.getByRole('button', { name: 'Atlas', exact: true }).click()
  await expect(trigger()).toHaveAccessibleName('Change context: Project Atlas')

  await fixture
    .getByRole('button', { name: 'Compact navigation', exact: true })
    .click()
  await open()
  await search().fill('bea')
  await search().press('ArrowDown')
  await popup()
    .getByRole('button', { name: 'Project Beacon', exact: true })
    .press('Enter')
  await expect(trigger()).toHaveAccessibleName('Change context: Project Beacon')
  await fixture
    .getByRole('button', { name: 'Compact navigation', exact: true })
    .click()
  await open()
  await search().fill('bea')
  await search().press('ArrowDown')
  await fixture.evaluate((node) => {
    const buttons = [...node.querySelectorAll('button')]
    buttons
      .find((button) => button.textContent.trim() === 'Remove sibling')
      .click()
    const label = [...node.querySelectorAll('label')].find((item) =>
      item.textContent.includes('Disable context switcher'),
    )
    label.click()
  })
  await expect(popup()).toHaveCount(0)
  await expect(trigger()).toBeDisabled()
  await fixture.getByText('Disable context switcher', { exact: true }).click()
  await expect(trigger()).toBeEnabled()
}
