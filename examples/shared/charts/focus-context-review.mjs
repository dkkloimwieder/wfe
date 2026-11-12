import { expect } from '@playwright/test'
export async function reviewFocusContext(page, { hydration = false } = {}) {
  if (hydration)
    expect(
      await page.evaluate(() =>
        window.focusContextServerNodes.every((node) => node.isConnected),
      ),
    ).toBe(true)
  const host = page.locator('[data-focus-context]')
  const count = host.getByLabel('Selected interval count')
  await expect(count).toHaveText('7 daily intervals')
  const note = host.getByRole('textbox', { name: 'Retained navigation note' })
  await note.fill('Keep my interval analysis')
  await host.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(count).toHaveText('4 daily intervals')
  await expect(host.getByLabel('Accepted range UTC')).toHaveText(
    /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z to \d{4}-\d{2}-\d{2}T00:00:00\.000Z$/,
  )
  const start = host.getByLabel('Range start UTC')
  const end = host.getByLabel('Range end UTC')
  const acceptedEnd = await end.inputValue()
  // A same-day request cannot replace the accepted interval.
  await end.fill(await start.inputValue())
  await end.press('Tab')
  await expect(host.getByLabel('Range request status')).toHaveText(
    'Choose a range of at least one day.',
  )
  await expect(end).toHaveValue(acceptedEnd)
  await expect(count).toHaveText('4 daily intervals')
  await host.getByText('Accept range changes', { exact: true }).click()
  await host.getByRole('button', { name: 'Full month', exact: true }).click()
  await expect(host.getByLabel('Range request status')).toHaveText(
    'Range rejected by application',
  )
  await expect(count).toHaveText('4 daily intervals')
  await host.getByText('Accept range changes', { exact: true }).click()
  await host.getByRole('button', { name: 'Full month', exact: true }).click()
  await expect(count).toHaveText('30 daily intervals')
  const svg = host.getByRole('img', { name: 'Month overview', exact: true })
  await svg.focus()
  await svg.press('ArrowRight')
  await svg.press('Enter')
  await expect(host.getByLabel('Range request status')).toContainText(
    'Range start selected',
  )
  await svg.press('ArrowRight')
  await svg.press('ArrowRight')
  await svg.press('Enter')
  await expect(host.getByLabel('Range request status')).toHaveText(
    'Range accepted',
  )
  await expect(host.getByLabel('Linked source detail')).toContainText(
    '72 original hourly records',
  )
  await expect(count).toHaveText('3 daily intervals')
  // Pointer selection uses actual rendered dot centers, including SVG scaling.
  const dots = svg.locator('.ts-chart__line circle')
  async function clickDot(dot) {
    await svg.scrollIntoViewIfNeeded()
    const box = await dot.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  }
  await clickDot(dots.first())
  await expect(host.getByLabel('Range request status')).toContainText(
    'Range start selected',
  )
  await svg.press('Escape')
  await expect(host.getByLabel('Range request status')).toHaveText(
    'Range selection canceled',
  )
  await clickDot(dots.first())
  await expect(host.getByLabel('Range request status')).toContainText(
    'Range start selected',
  )
  await clickDot(dots.last())
  await expect(host.getByLabel('Range request status')).toHaveText(
    'Range accepted',
  )
  await expect(count).toHaveText('30 daily intervals')
  await expect(note).toHaveValue('Keep my interval analysis')
  expect(
    await host.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true)
}
