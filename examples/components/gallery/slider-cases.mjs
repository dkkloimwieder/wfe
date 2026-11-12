import { expect } from '@playwright/test'

export async function sliderCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser'])
    for (const scheme of [1, 2]) {
      await record(
        `gallery: sliders ${preset} scheme ${scheme} preserve accepted values and focus`,
        () =>
          reviewPage(async (page) => {
            await page.setViewportSize({
              width: scheme === 2 ? 390 : 1280,
              height: 900,
            })
            const route = `${url}?gallery=sliders&preset=${preset}&scheme=${scheme}`
            await page.goto(route)
            const volume = page.getByRole('slider', {
              name: 'Volume',
              exact: true,
            })
            await volume.focus()
            await volume.press('ArrowRight')
            await expect(volume).toHaveAttribute('aria-valuenow', '31')
            await expect(page.locator('[data-slider-commit]')).toHaveText(
              'Volume 31',
            )
            await expect(volume).toBeFocused()
            const lower = page.getByRole('slider', {
              name: 'Operating range Minimum',
              exact: true,
            })
            const upper = page.getByRole('slider', {
              name: 'Operating range Maximum',
              exact: true,
            })
            await lower.press('End')
            await expect(lower).toHaveAttribute('aria-valuenow', '80')
            await expect(upper).toHaveAttribute('aria-valuemin', '80')
            await upper.press('Home')
            await expect(upper).toHaveAttribute('aria-valuenow', '80')
            await page
              .getByRole('button', { name: 'Submit slider values' })
              .click()
            await expect(page.getByLabel('Slider form result')).toHaveText(
              'Volume 31; range 80 to 80',
            )
            await page
              .getByText('Accept slider changes', { exact: true })
              .click()
            const committed = await page
              .locator('[data-slider-commit]')
              .textContent()
            await volume.press('End')
            await expect(page.locator('[data-slider-request]')).toHaveText(
              'Volume 100',
            )
            await expect(volume).toHaveAttribute('aria-valuenow', '31')
            await expect(volume).toBeFocused()
            await expect(page.locator('[data-slider-commit]')).toHaveText(
              committed,
            )
            await page.goto(route + '&state=readonly')
            const readonly = page.getByRole('slider', {
              name: 'Volume',
              exact: true,
            })
            await readonly.press('End')
            await expect(readonly).toHaveAttribute('aria-readonly', 'true')
            await expect(readonly).toHaveAttribute('aria-valuenow', '30')
            await page.goto(route + '&state=disabled')
            await expect(
              page.getByRole('slider', { name: 'Volume', exact: true }),
            ).toHaveAttribute('aria-disabled', 'true')
            await page
              .getByRole('button', { name: 'Submit slider values' })
              .click()
            await expect(page.getByLabel('Slider form result')).toHaveText(
              'Volume omitted; range omitted',
            )
          }),
      )
    }
  await record(
    'gallery: sliders trusted touch and RTL keyboard keep bounded values',
    () =>
      reviewPage(async (page) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(`${url}?gallery=sliders`)
        const volume = page.getByRole('slider', { name: 'Volume', exact: true })
        await volume.scrollIntoViewIfNeeded()
        const box = await page
          .getByRole('group', { name: 'Volume', exact: true })
          .locator('.ui-slider-track')
          .boundingBox()
        if (!box) throw new Error('Slider track must be visible')
        const client = await page.context().newCDPSession(page)
        const touch = async (type, fraction) =>
          client.send('Input.dispatchTouchEvent', {
            type,
            touchPoints:
              fraction === undefined
                ? []
                : [
                    {
                      id: 1,
                      x: box.x + box.width * fraction,
                      y: box.y + box.height / 2,
                    },
                  ],
          })
        await touch('touchStart', 0.1)
        await touch('touchMove', 0.65)
        await touch('touchEnd')
        await expect(volume).toHaveAttribute('aria-valuenow', '65')
        await expect(volume).toBeFocused()
        const rtl = page.getByRole('slider', {
          name: 'RTL position',
          exact: true,
        })
        await rtl.press('ArrowRight')
        await expect(rtl).toHaveAttribute('aria-valuenow', '4')
        const vertical = page.getByRole('slider', {
          name: 'Vertical level',
          exact: true,
        })
        await vertical.press('ArrowUp')
        await expect(vertical).toHaveAttribute('aria-valuenow', '51')
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
      }),
  )
}
