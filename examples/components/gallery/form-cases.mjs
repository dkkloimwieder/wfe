import { faceAlpha } from './dot-default-cases.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryFormCases({ page, url, record }) {
  await record(
    'gallery: everything form uses the reference typography and 30rem fields in both modes',
    async () => {
      for (const scheme of [1, 2]) {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${url}?gallery=everything&scheme=${scheme}`)
        const previewHost = page.locator('.gallery-example-host')
        const form = previewHost.getByRole('form', { name: 'Everything form' })
        await expect(form).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
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
        const layout = await form.evaluate((node) => {
          const rect = node.getBoundingClientRect()
          const preview = node
            .closest('.gallery-preview')
            .getBoundingClientRect()
          return {
            left: rect.left - preview.left,
            right: preview.right - rect.right,
            headingsInside: [...node.querySelectorAll('.ui-field-group')].every(
              (group) =>
                group
                  .querySelector('.ui-field-group-title')
                  .getBoundingClientRect().top >
                group.getBoundingClientRect().top,
            ),
          }
        })
        assert.ok(Math.abs(layout.left - layout.right) < 1)
        assert.equal(layout.headingsInside, true)
        const compounds = await form
          .locator('.filter-input, .choice-control')
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.querySelector('input'))
              .map((node) => {
                const input = node.querySelector('input')
                const style = getComputedStyle(input)
                return [...node.querySelectorAll(':scope > button')].map(
                  (button) => {
                    const buttonStyle = getComputedStyle(button)
                    return {
                      inputHeight: input.getBoundingClientRect().height,
                      buttonHeight: button.getBoundingClientRect().height,
                      buttonWidth: button.getBoundingClientRect().width,
                      sameFill:
                        style.backgroundColor === buttonStyle.backgroundColor,
                      sameBorder:
                        style.borderTopColor === buttonStyle.borderTopColor,
                    }
                  },
                )
              })
              .flat(),
          )
        assert.ok(compounds.length >= 4)
        for (const compound of compounds) {
          assert.deepEqual(compound, {
            inputHeight: 32,
            buttonHeight: 32,
            buttonWidth: 32,
            sameFill: true,
            sameBorder: true,
          })
        }
        const hoverAction = page.getByRole('button', {
          name: 'Appearance',
          exact: true,
        })
        const actionBox = await hoverAction.boundingBox()
        await hoverAction.hover()
        const backing = (node) => getComputedStyle(node, '::before').opacity
        assert.equal(await hoverAction.evaluate(backing), '1')
        await expect(hoverAction).toHaveCSS('box-shadow', 'none')
        assert.equal((await hoverAction.boundingBox()).width, actionBox.width)
        const sidebarLink = page.getByRole('link', {
          name: 'Everything form',
          exact: true,
        })
        await sidebarLink.hover()
        assert.equal(await sidebarLink.evaluate(backing), '1')
        await expect(sidebarLink).toHaveCSS('text-decoration-line', 'none')
        await page.mouse.move(0, 0)
        assert.equal(await sidebarLink.evaluate(backing), '1')
        await expect(hoverAction).toHaveCSS('box-shadow', 'none')
        assert.equal(await hoverAction.evaluate(backing), '0')
        const navigationGroup = page.locator('.ui-sidebar-group').first()
        const summary = navigationGroup.locator('summary')
        for (const open of [false, true]) {
          if (
            (await summary.evaluate((node) => node.parentElement.open)) !== open
          )
            await summary.click()
          const colors = await summary.evaluate((node) => {
            const style = getComputedStyle(node)
            const probe = document.createElement('span')
            probe.style.color = style.getPropertyValue('--ui-heading-color')
            node.append(probe)
            const expected = getComputedStyle(probe).color
            probe.remove()
            return { actual: style.color, expected }
          })
          assert.equal(colors.actual, colors.expected)
        }
        for (const button of await page
          .locator('.gallery-toolbar button[aria-pressed=true]')
          .all()) {
          assert.equal(await faceAlpha(button), 255)
          assert.match(
            await button.evaluate(
              (node) => getComputedStyle(node, '::before').backgroundImage,
            ),
            /^radial-gradient/,
          )
          await expect(button).toHaveCSS('border-top-width', '1px')
          await expect(button).toHaveCSS('border-top-style', 'solid')
          assert.equal(await button.evaluate(backing), '1')
        }

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
          scheme === 2 ? 'rgb(92, 92, 92)' : 'rgb(229, 229, 229)',
        )
        const expectedBackground = await form.evaluate((node) => {
          const probe = document.createElement('span')
          probe.style.background = 'var(--ui-control-surface)'
          node.append(probe)
          const color = getComputedStyle(probe).backgroundColor
          probe.remove()
          return color
        })
        assert.equal(metrics.background, expectedBackground)
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
