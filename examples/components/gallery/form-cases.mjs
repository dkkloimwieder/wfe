import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryFormCases({ page, url, record }) {
  await record(
    'gallery: everything form uses the reference typography and 30rem fields in both modes',
    async () => {
      for (const scheme of [1, 2]) {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?gallery=everything&scheme=${scheme}`)
        const frame = page.frameLocator('.gallery-frame')
        const form = frame.getByRole('form', { name: 'Everything form' })
        await expect(form).toBeVisible()
        await expect(form.locator('.ui-field-group')).toHaveCount(7)
        const metrics = await form.evaluate((node) => {
          const input = node.querySelector('input[name=name]')
          const label = input.closest('.ui-field').querySelector('.ui-label')
          const style = getComputedStyle(input)
          return {
            width: node.getBoundingClientRect().width,
            fontLoaded: document.fonts.check('12px "Fira Code Variable"'),
            font: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            height: input.getBoundingClientRect().height,
            padding: style.padding,
            labelWeight: getComputedStyle(label).fontWeight,
            labelHeight: label.getBoundingClientRect().height,
            border: style.borderTopColor,
            background: style.backgroundColor,
          }
        })
        assert.equal(metrics.width, 480)
        const formatted = form.getByLabel('Recorded date', { exact: true })
        await expect(formatted).toHaveCSS('line-height', '16px')
        assert.equal(
          await formatted.evaluate(
            (node) => node.getBoundingClientRect().height,
          ),
          32,
        )
        assert.equal(metrics.fontLoaded, true)
        assert.match(metrics.font, /Fira Code Variable/)
        assert.equal(metrics.fontSize, '12px')
        assert.equal(metrics.lineHeight, '16px')
        assert.equal(metrics.height, 32)
        assert.equal(metrics.padding, '4px 10px')
        assert.equal(metrics.labelHeight, 12)
        assert.equal(metrics.labelWeight, '400')
        assert.equal(
          metrics.border,
          scheme === 2 ? 'rgba(255, 255, 255, 0.15)' : 'rgb(229, 229, 229)',
        )
        if (scheme === 2) {
          const rgba = metrics.background.match(
            /^rgba\(255, 255, 255, ([\d.]+)\)$/,
          )
          assert.ok(rgba)
          assert.ok(Math.abs(Number(rgba[1]) - 0.045) <= 1 / 255)
        } else assert.equal(metrics.background, 'rgba(0, 0, 0, 0)')
        await form
          .getByRole('button', { name: 'Save example', exact: true })
          .click()
        await expect(form.getByRole('alert')).toContainText(
          'Review the highlighted fields.',
        )
        await expect(
          form.getByRole('textbox', { name: 'Record name', exact: true }),
        ).toBeFocused()
        await expect(
          form.getByRole('textbox', { name: 'Record name', exact: true }),
        ).toHaveCSS('outline-width', '1px')
        await form
          .getByRole('textbox', { name: 'Record name', exact: true })
          .fill('Combined example')
        await form
          .getByRole('textbox', { name: 'Contact email', exact: true })
          .fill('review@example.test')
        const quantity = form.getByRole('textbox', {
          name: 'Quantity',
          exact: true,
        })
        await quantity.fill('-1')
        await form
          .getByRole('button', { name: 'Save example', exact: true })
          .click()
        await expect(form.getByRole('alert')).toBeVisible()
        await expect(quantity).toBeFocused()
        await quantity.fill('24')
        await form.getByText('Send notifications', { exact: true }).click()
        await form
          .getByRole('button', { name: 'Save example', exact: true })
          .click()
        await expect(form.getByLabel('Saved example')).toContainText(
          'Combined example',
        )
        await form
          .getByRole('button', { name: 'Reset example', exact: true })
          .click()
        await expect(
          form.getByRole('textbox', { name: 'Record name', exact: true }),
        ).toHaveValue('')
        await expect(form.getByLabel('Saved example')).toHaveCount(0)
        await expect(quantity).toHaveValue('12')
        await expect(
          form.getByRole('checkbox', {
            name: 'Send notifications',
            exact: true,
          }),
        ).toBeChecked()
        await page.setViewportSize({ width: 390, height: 900 })
        assert.equal(
          await form.evaluate(
            (node) =>
              document.documentElement.scrollWidth <= innerWidth &&
              node.getBoundingClientRect().width <= innerWidth,
          ),
          true,
        )
      }
    },
  )
}
