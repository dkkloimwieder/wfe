import { choiceControl } from '../../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryThemeCases({ page, url, record }) {
  await record(
    'gallery: theme audit nested owners isolate optional overrides and retain popup state',
    async () => {
      await page.goto(`${url}?gallery=themes&preset=vanilla`)
      const outer = page.locator('#theme-review-laser')
      const inner = page.locator('#theme-review-laser-vanilla')
      const draft = page.getByRole('textbox', {
        name: 'Vanilla within Laser draft',
        exact: true,
      })
      await draft.fill('Retained owner draft')
      const trigger = page.getByRole('button', {
        name: 'Vanilla within Laser details',
        exact: true,
      })
      await trigger.click()
      const popup = page.locator(
        '[data-theme-review-popup="Vanilla within Laser"]',
      )
      await popup.evaluate((node) => {
        node.dataset.retainedOwner = 'yes'
      })
      const roles = {
        '--ui-choice-selection-surface': 'var(--ui-surface)',
        '--ui-choice-selection-text': 'var(--ui-text)',
        '--ui-choice-decoration-color': 'var(--ui-accent)',
        '--ui-choice-decoration-opacity': '0.5',
        '--ui-choice-decoration-surface': 'var(--ui-surface)',
        '--ui-laser-action-surface': 'var(--ui-surface)',
        '--ui-laser-glow-strength': '0.5',
        '--ui-laser-text-glow-strength': '0.5',
        '--ui-laser-icon-glow-strength': '0.5',
      }
      const hasOverrides = (target) =>
        target.evaluate(
          (node, names) =>
            names.map(
              (name) =>
                getComputedStyle(node).getPropertyValue(name).trim() !== '',
            ),
          Object.keys(roles),
        )
      const all = Object.keys(roles).map(() => true)
      const none = Object.keys(roles).map(() => false)
      await outer.evaluate((node, values) => {
        for (const [name, value] of Object.entries(values))
          node.style.setProperty(name, value)
      }, roles)
      assert.deepEqual(await hasOverrides(outer), all)
      assert.deepEqual(await hasOverrides(inner), none)
      assert.deepEqual(await hasOverrides(popup), none)
      // Even a class declared before the library stylesheet beats the zero-specificity reset.
      await page.evaluate((values) => {
        const style = document.createElement('style')
        style.dataset.themeAudit = ''
        style.textContent = `.theme-audit-override { ${Object.entries(values)
          .map(([name, value]) => `${name}: ${value};`)
          .join(' ')} }`
        document.head.prepend(style)
      }, roles)
      await inner.evaluate((node) => node.classList.add('theme-audit-override'))
      assert.deepEqual(await hasOverrides(inner), all)
      assert.deepEqual(await hasOverrides(popup), all)
      // Inline values can replace a class override and can explicitly return to defaults.
      await inner.evaluate((node, names) => {
        for (const name of names) node.style.setProperty(name, 'initial')
      }, Object.keys(roles))
      assert.deepEqual(await hasOverrides(inner), none)
      assert.deepEqual(await hasOverrides(popup), none)
      await inner.evaluate((node, values) => {
        for (const [name, value] of Object.entries(values))
          node.style.setProperty(name, value)
      }, roles)
      assert.deepEqual(await hasOverrides(popup), all)
      assert.deepEqual(await hasOverrides(outer), all)
      await expect(popup).toHaveAttribute('data-retained-owner', 'yes')
      assert.equal(
        await popup.evaluate(
          (node) => node.closest('[data-ui-theme-owner]')?.id,
        ),
        'theme-review-laser-vanilla',
      )
      await expect(popup.getByRole('textbox')).toHaveValue(
        'Retained owner draft',
      )
      await expect(draft).toHaveValue('Retained owner draft')
      await page.keyboard.press('Escape')
      await expect(popup).toHaveCount(0)
      await expect(trigger).toBeFocused()
    },
  )

  for (const preset of ['default', 'vanilla', 'laser']) {
    await record(
      `gallery: theme audit ${preset} choice roles retain selection and geometry`,
      async () => {
        await page.goto(`${url}?gallery=tree&preset=${preset}`)
        const tree = page.getByRole('tree', { name: 'Files', exact: true })
        const selected = tree.getByRole('treeitem', {
          name: 'Beta',
          exact: true,
        })
        await expect(selected).toHaveAttribute('aria-selected', 'true')
        await selected.evaluate((node) => {
          node.dataset.retainedChoice = 'yes'
        })
        const owner = page.locator('.gallery-shell')
        await owner.evaluate((node) => {
          node.style.setProperty(
            '--ui-choice-selection-surface',
            'var(--ui-warning-surface)',
          )
          node.style.setProperty(
            '--ui-choice-selection-text',
            'var(--ui-warning-text)',
          )
          node.style.setProperty(
            '--ui-choice-decoration-color',
            'var(--ui-secondary-accent)',
          )
          node.style.setProperty('--ui-tree-row-min-height', '64px')
          node.style.setProperty('--ui-tree-indent', '40px')
        })
        await expect(selected).toHaveAttribute('data-retained-choice', 'yes')

        await expect(selected).toHaveAttribute('aria-selected', 'true')
        assert.equal(
          await selected.evaluate((node) => {
            const box = node.getBoundingClientRect()
            return node.contains(
              document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2,
              ),
            )
          }),
          true,
        )
        assert.equal(
          await selected.evaluate((node) =>
            getComputedStyle(node)
              .getPropertyValue('--ui-choice-selection-surface')
              .trim(),
          ),
          await owner.evaluate((node) =>
            getComputedStyle(node)
              .getPropertyValue('--ui-choice-selection-surface')
              .trim(),
          ),
        )
        // The same role crosses the owning automatic portal without replacing accepted values.
        await page.goto(`${url}?gallery=choices&preset=${preset}`)
        await page.locator('.gallery-shell').evaluate((node) => {
          node.style.setProperty(
            '--ui-choice-selection-surface',
            'var(--ui-warning-surface)',
          )
          node.style.setProperty(
            '--ui-choice-selection-text',
            'var(--ui-warning-text)',
          )
        })
        const trigger = page.getByRole('button', {
          name: /Selected category/,
        })
        await trigger.click()
        const option = page
          .getByRole('option', { name: 'Alpha', exact: true })
          .first()
        await expect(option).toHaveAttribute('aria-selected', 'true')

        assert.equal(
          await option.evaluate((node) =>
            getComputedStyle(node)
              .getPropertyValue('--ui-choice-selection-surface')
              .trim(),
          ),
          await page
            .locator('.gallery-shell')
            .evaluate((node) =>
              getComputedStyle(node)
                .getPropertyValue('--ui-choice-selection-surface')
                .trim(),
            ),
        )
        await page.keyboard.press('Escape')
        await expect(trigger).toBeFocused()
        await expect(trigger).toHaveText('Alpha')
        const contains = page.getByRole('combobox', {
          name: 'Contains',
          exact: true,
        })
        await contains.focus()
        await contains.press('ArrowDown')
        const comboOption = page
          .getByRole('option', { name: 'Alpha', exact: true })
          .first()
        await expect(comboOption).toHaveAttribute('aria-selected', 'true')

        assert.equal(
          await comboOption.evaluate((node) =>
            getComputedStyle(node)
              .getPropertyValue('--ui-choice-selection-text')
              .trim(),
          ),
          await page
            .locator('.gallery-shell')
            .evaluate((node) =>
              getComputedStyle(node)
                .getPropertyValue('--ui-choice-selection-text')
                .trim(),
            ),
        )
        await page.keyboard.press('Escape')
        await expect(
          page.getByRole('combobox', { name: 'Contains', exact: true }),
        ).toHaveValue('Alpha')
      },
    )
  }
  await record(
    'gallery: theme audit Laser retains independent keyboard focus without glow',
    async () => {
      await page.goto(`${url}?gallery=tree&preset=laser&scheme=0`)
      const tree = page.getByRole('tree', { name: 'Files', exact: true })
      await page.getByText('Multiple selection', { exact: true }).click()
      const alpha = tree.getByRole('treeitem', { name: 'Alpha', exact: true })
      const beta = tree.getByRole('treeitem', { name: 'Beta', exact: true })
      await alpha.focus()
      await alpha.press('Enter')
      await expect(alpha).toHaveAttribute('aria-selected', 'true')
      await expect(beta).toHaveAttribute('aria-selected', 'true')
      await alpha.press('ArrowDown')
      await expect(beta).toBeFocused()
      assert.equal(
        await beta.evaluate((node) => node.matches(':focus-visible')),
        true,
      )
      assert.equal(
        await alpha.evaluate((node) => node.matches(':focus-visible')),
        false,
      )
      assert.equal(
        await beta.evaluate((node) => {
          const style = getComputedStyle(node)
          return (
            style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
          )
        }),
        true,
      )
      await page.goto(`${url}?gallery=buttons&preset=laser&scheme=0`)
      const icon = page.getByRole('button', {
        name: 'neutral refresh',
        exact: true,
      })
      await icon.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(icon).toBeFocused()
      assert.equal(
        await icon.evaluate((node) => {
          const style = getComputedStyle(node)
          return (
            node.matches(':focus-visible') &&
            style.outlineStyle !== 'none' &&
            parseFloat(style.outlineWidth) > 0
          )
        }),
        true,
      )
      await page.locator('.gallery-shell').evaluate((node) => {
        node.style.setProperty('--ui-laser-glow', 'none')
        node.style.setProperty('--ui-laser-text-glow', 'none')
        node.style.setProperty('--ui-laser-icon-shadow', 'none')
      })
      await expect(icon).toBeFocused()
      assert.equal(
        await icon.evaluate(
          (node) => getComputedStyle(node).outlineStyle !== 'none',
        ),
        true,
      )
    },
  )

  await record(
    'gallery: theme changes retain the mounted draft and navigation preset',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${url}?gallery=fields`)
      const draft = page
        .locator('.gallery-preview')
        .getByRole('textbox', { name: 'Name', exact: true })
      await draft.fill('Retained through theme changes')
      await draft.evaluate((node) => {
        node.dataset.themeRetained = 'yes'
      })
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await choiceControl(page, { name: 'Theme', exact: true }).click()
      await page.getByRole('option', { name: 'Vanilla', exact: true }).click()
      await expect(draft).toHaveValue('Retained through theme changes')
      await expect(draft).toHaveAttribute('data-theme-retained', 'yes')
      await expect(page.locator('.gallery-shell')).toHaveAttribute(
        'data-ui-preset',
        'vanilla',
      )
      assert.equal(new URL(page.url()).searchParams.get('preset'), 'vanilla')
      await expect(
        page.getByRole('group', {
          name: 'Secondary accent colors',
          exact: true,
        }),
      ).toHaveCount(1)
      for (const [name, key, value] of [
        ['Orange accent', 'accent', '6'],
        ['Yellow secondary accent', 'secondary', '9'],
        ['Base Surface 3', 'canvas', '2'],
        ['Content Surface 2', 'content', '1'],
      ]) {
        const control = page.getByRole('button', { name, exact: true })
        await control.click()
        await expect(control).toHaveAttribute('aria-pressed', 'true')
        assert.equal(new URL(page.url()).searchParams.get(key), value)
        await expect(draft).toHaveValue('Retained through theme changes')
        await expect(draft).toHaveAttribute('data-theme-retained', 'yes')
      }
      await expect(page.getByRole('slider')).toHaveCount(0)
      await choiceControl(page, { name: 'Theme', exact: true }).click()
      await page.getByRole('option', { name: 'Laser', exact: true }).click()
      await expect(draft).toHaveValue('Retained through theme changes')
      await expect(draft).toHaveAttribute('data-theme-retained', 'yes')
      await expect(page.locator('.gallery-shell')).toHaveAttribute(
        'data-ui-preset',
        'laser',
      )
      assert.equal(new URL(page.url()).searchParams.get('preset'), 'laser')
      await expect(page.locator('.ui-disclosure-decoration')).toHaveCount(0)
      await choiceControl(page, { name: 'Theme', exact: true }).click()
      await page.getByRole('option', { name: 'Sketchy', exact: true }).click()
      await expect(draft).toHaveValue('Retained through theme changes')
      await expect(draft).toHaveAttribute('data-theme-retained', 'yes')
      await page.goBack()
      await page.goBack()
      await expect(page.locator('.gallery-shell')).toHaveAttribute(
        'data-ui-preset',
        'vanilla',
      )
      await expect(draft).toHaveValue('Retained through theme changes')
    },
  )
  await record(
    'gallery: nested themes keep popups in their owning boundary and share application state',
    async () => {
      await page.goto(`${url}?gallery=themes&preset=vanilla`)
      await page
        .getByRole('textbox', { name: 'Vanilla inner draft', exact: true })
        .fill('One application draft')
      for (const [name, id] of [
        ['Sketchy outer', 'theme-review-default'],
        ['Vanilla inner', 'theme-review-vanilla-inner'],
        ['Vanilla outer', 'theme-review-vanilla'],
        ['Sketchy inner', 'theme-review-default-inner'],
        ['Custom vanilla', 'theme-review-custom'],
        ['Laser outer', 'theme-review-laser'],
        ['Vanilla within Laser', 'theme-review-laser-vanilla'],
      ]) {
        await expect(
          page.getByRole('textbox', { name: `${name} draft`, exact: true }),
        ).toHaveValue('One application draft')
        const trigger = page.getByRole('button', {
          name: `${name} details`,
          exact: true,
        })
        await trigger.click()
        const popup = page.locator(`[data-theme-review-popup="${name}"]`)
        await expect(popup).toBeVisible()
        assert.equal(
          await popup.evaluate(
            (node) => node.closest('[data-ui-theme-owner]')?.id,
          ),
          id,
        )
        await expect(popup.getByRole('textbox')).toHaveValue(
          'One application draft',
        )
        await page.keyboard.press('Escape')
        await expect(popup).toHaveCount(0)
        await expect(trigger).toBeFocused()
      }
    },
  )
}
