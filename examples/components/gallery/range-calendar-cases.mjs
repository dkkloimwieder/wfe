import { expect } from '@playwright/test'
export async function rangeCalendarCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser'])
    for (const scheme of [1, 2]) {
      await record(
        `gallery: calendar ranges ${preset} scheme ${scheme} preserve controlled dates and popup focus`,
        () =>
          reviewPage(async (page) => {
            await page.setViewportSize({
              width: scheme === 2 ? 390 : 1280,
              height: 1000,
            })
            const route = `${url}?gallery=calendar-ranges&preset=${preset}&scheme=${scheme}`
            await page.goto(route)
            const inline = page.locator('[data-range-inline]')
            const cell = (value) => inline.locator(`[data-date="${value}"]`)
            const draft = page.getByRole('textbox', {
              name: 'Retained range draft',
            })
            await draft.fill('Retained planning note')
            await expect(inline.getByRole('grid')).toHaveCount(2)
            await expect(cell('2026-11-12')).toBeDisabled()
            await cell('2026-11-01').click()
            await cell('2026-11-02').click()
            await expect(page.locator('[data-range-value]')).toHaveText(
              '2026-11-01 to 2026-11-02',
            )
            await cell('2026-11-06').click()
            await expect(page.locator('[data-range-value]')).toHaveText(
              '2026-11-06 to …',
            )
            await cell('2026-11-10').click()
            await expect(page.locator('[data-range-value]')).toHaveText(
              '2026-11-06 to 2026-11-10',
            )
            await expect(inline.locator('[aria-selected="true"]')).toHaveCount(
              5,
            )
            for (const [date, edge] of [
              ['2026-11-11', 'left'],
              ['2026-11-17', 'top'],
            ]) {
              expect(
                await cell(date).evaluate((node, edge) => {
                  const rect = node.getBoundingClientRect()
                  return node.contains(
                    document.elementFromPoint(
                      edge === 'left'
                        ? rect.left + 1
                        : rect.left + rect.width / 2,
                      edge === 'top'
                        ? rect.top + 1
                        : rect.top + rect.height / 2,
                    ),
                  )
                }, edge),
              ).toBe(true)
            }
            await cell('2026-11-07').click()
            await page
              .getByText('Accept range changes', { exact: true })
              .click()
            await cell('2026-11-11').click()
            await expect(page.locator('[data-range-request]')).toHaveText(
              'Calendar 2026-11-07 to 2026-11-11',
            )
            await expect(page.locator('[data-range-value]')).toHaveText(
              '2026-11-07 to …',
            )
            await page
              .getByText('Accept range changes', { exact: true })
              .click()
            const trigger = page.getByRole('button', { name: /^Booking range/ })
            const dialog = page.getByRole('dialog', {
              name: 'Booking range calendar',
              exact: true,
            })
            await trigger.click()
            await dialog.locator('[data-date="2026-11-01"]').click()
            await expect(dialog).toBeVisible()
            await dialog.locator('[data-date="2026-11-02"]').click()
            await expect(dialog).toHaveCount(0)
            await expect(trigger).toBeFocused()
            await trigger.click()
            expect(
              await dialog.evaluate(
                (node) => node.scrollWidth <= node.clientWidth + 1,
              ),
            ).toBe(true)
            await dialog.locator('[data-date="2026-11-08"]').click()
            await expect(dialog).toBeVisible()
            await page.keyboard.press('Escape')
            await expect(trigger).toBeFocused()
            await page
              .getByText('Accept range changes', { exact: true })
              .click()
            await trigger.click()
            expect(
              await dialog.evaluate(
                (node) => node.scrollWidth <= node.clientWidth + 1,
              ),
            ).toBe(true)
            await dialog.locator('[data-date="2026-11-15"]').click()
            await expect(dialog).toBeVisible()
            await expect(page.locator('[data-range-request]')).toHaveText(
              'Picker 2026-11-08 to 2026-11-15',
            )
            await page.keyboard.press('Escape')
            await page
              .getByText('Accept range changes', { exact: true })
              .click()
            await trigger.click()
            expect(
              await dialog.evaluate(
                (node) => node.scrollWidth <= node.clientWidth + 1,
              ),
            ).toBe(true)
            await dialog.locator('[data-date="2026-11-15"]').click()
            await expect(dialog).toHaveCount(0)
            await expect(trigger).toBeFocused()
            await expect(draft).toHaveValue('Retained planning note')
            await page
              .getByRole('button', { name: 'Submit range values' })
              .click()
            await expect(page.getByLabel('Range form result')).toHaveText(
              '2026-11-08 to 2026-11-15',
            )
            await page
              .getByRole('button', { name: 'Use French locale' })
              .click()
            await expect(inline.getByRole('grid').first()).toHaveAttribute(
              'aria-label',
              /novembre/,
            )
            await page
              .getByRole('button', { name: 'One month', exact: true })
              .click()
            await expect(inline.getByRole('grid')).toHaveCount(1)
            await inline
              .locator('[data-date="2026-12-03"][data-outside]')
              .click()
            await expect(
              inline.locator('[data-date="2026-12-03"]:not([data-outside])'),
            ).toBeFocused()
            await page.goto(route + '&state=readonly')
            await cell('2026-11-06').press('Enter')
            await expect(page.locator('[data-range-request]')).toHaveText(
              'No range change requested',
            )
            await expect(inline.getByRole('grid').first()).toHaveAttribute(
              'aria-readonly',
              'true',
            )
            await page.goto(route + '&state=disabled')
            await expect(cell('2026-11-06')).toBeDisabled()
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true)
          }),
      )
    }
}
