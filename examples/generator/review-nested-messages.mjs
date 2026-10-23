import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewNestedMessagesServer(page) {
  const scope = page.locator('#nested-messages-review')
  await expect(scope.getByLabel('Nested active', { exact: true })).toHaveText(
    'Sí',
  )
  await expect(scope.getByLabel('Detail blank', { exact: true })).toHaveText(
    'Vacío',
  )
  await expect(
    scope.getByRole('button', { name: 'Abrir Nested date', exact: true }),
  ).toBeVisible()
}

export async function reviewNestedMessages({ page, record }) {
  await record(
    'Nested control messages preserve generated controls, raw values and focused drafts',
    async () => {
      const scope = page.locator('#nested-messages-review')
      const date = scope.getByRole('textbox', {
        name: 'Nested date',
        exact: true,
      })
      const repeated = scope.getByRole('textbox', {
        name: 'Repeated amount',
        exact: true,
      })
      const before = await scope
        .getByLabel('Nested accepted values')
        .textContent()
      await date.evaluate((node) => {
        window.nestedMessageDate = node
      })
      await scope
        .getByRole('button', { name: 'Abrir Nested date', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Mes siguiente', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      const header = scope.getByRole('button', {
        name: 'Filter Header date',
        exact: true,
      })
      await header.click()
      await page
        .getByRole('button', { name: 'Abrir Header date start', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Mes siguiente', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await date.fill('31/02/2024')
      await repeated.fill('-1')
      await repeated.focus()
      await scope
        .getByRole('button', { name: 'Translate nested controls', exact: true })
        .evaluate((node) => node.click())
      await expect(repeated).toBeFocused()
      await expect(repeated).toHaveValue('-1')
      assert.equal(
        await repeated.evaluate((node) => node.validationMessage),
        'Minimum: 0',
      )
      assert.equal(
        await date.evaluate((node) => node.validationMessage),
        'Date invalide',
      )
      assert.equal(
        await date.evaluate((node) => node === window.nestedMessageDate),
        true,
      )
      await expect(
        scope.getByLabel('Nested active', { exact: true }),
      ).toHaveText('Oui')
      await expect(
        scope.getByLabel('Detail blank', { exact: true }),
      ).toHaveText('Vide')
      await expect(
        scope.locator('[data-nested-table] tbody td').first(),
      ).toHaveText('Oui')
      await expect(
        scope.getByRole('button', {
          name: 'Ouvrir Record date start',
          exact: true,
        }),
      ).toBeVisible()
      assert.equal(
        await scope.getByLabel('Nested accepted values').textContent(),
        before,
      )
      await expect(scope.getByLabel('Nested request count')).toHaveText('0')
    },
  )
}
