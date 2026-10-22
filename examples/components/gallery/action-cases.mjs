import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function galleryActionCases({ page, url, record }) {
  await record(
    'gallery: new form actions support submission control and icons',
    async () => {
      await page.goto(`${url}?gallery=form-actions`)
      const host = page.locator('.gallery-example-host')
      const form = host.locator('form')
      const save = form.getByRole('button', { name: 'Save', exact: true })
      const cancel = form.getByRole('button', { name: 'Cancel', exact: true })
      assert.equal(
        await save.evaluate(
          (node) =>
            node.parentElement === node.form.lastElementChild &&
            node.parentElement.classList.contains('ui-form-actions'),
        ),
        true,
      )
      assert.equal(
        await cancel.evaluate(
          (node) => node.parentElement === node.form.lastElementChild,
        ),
        true,
      )
      await expect(save).toHaveAttribute('type', 'submit')
      await expect(cancel).toHaveAttribute('type', 'button')
      await host.getByText('Disable submission', { exact: true }).click()
      await expect(save).toBeDisabled()
      await expect(cancel).toBeEnabled()
      const name = form.getByRole('textbox', { name: 'Name', exact: true })
      await name.fill('Draft')
      await name.press('Enter')
      await expect(host.getByRole('status')).toHaveText('No action requested.')
      await cancel.click()
      await expect(name).toHaveValue('Sample record')
      await host.getByText('Disable submission', { exact: true }).click()
      await host.getByText('Icon-only actions', { exact: true }).click()
      await expect(save).toHaveText('')
      await expect(cancel).toHaveText('')
      await name.fill('Example')
      await name.press('Enter')
      await expect(host.getByRole('status')).toHaveText('Saved Example.')
      await host.getByText('Include icons', { exact: true }).click()
      await expect(save).toHaveText('Save')
      await expect(cancel).toHaveText('Cancel')
      await host.getByRole('button', { name: 'Preview', exact: true }).click()
      await expect(host.getByRole('status')).toHaveText('Preview requested.')
      await page.getByRole('link', { name: 'Fields', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Fields', exact: true }),
      ).toBeVisible()
      await page.goBack()
      await expect(name).toHaveValue('Sample record')
      await expect(host.getByRole('status')).toHaveText('No action requested.')
    },
  )
  await record(
    'gallery: new table controls and row actions are reachable and reactive',
    async () => {
      await page.goto(`${url}?gallery=column-controls`)
      const host = page.locator('.gallery-example-host')
      const table = host.locator('table')
      await expect(table).toBeVisible()
      await expect(
        table.getByRole('button', { name: 'Sort by Actions' }),
      ).toHaveCount(0)
      await expect(
        host
          .getByRole('region', { name: 'Column filters' })
          .getByLabel('Actions', { exact: true }),
      ).toHaveCount(0)
      await host
        .getByRole('button', { name: 'Server sorting', exact: true })
        .click()
      await table
        .getByRole('button', { name: 'Sort by Name', exact: true })
        .click()
      await expect(table.locator('th[data-column="name"]')).toHaveAttribute(
        'aria-sort',
        'ascending',
      )
      await expect(table.locator('tbody td[data-column="name"]')).toHaveText([
        'Beta',
        'Alpha',
      ])
      await host
        .getByRole('button', { name: 'Toggle Beta pending', exact: true })
        .click()
      await expect(
        host.getByRole('button', { name: 'Edit Beta', exact: true }),
      ).toBeDisabled()
      await host
        .getByRole('button', { name: 'Toggle Beta pending', exact: true })
        .click()
      await host
        .getByRole('button', { name: 'Toggle Beta archived', exact: true })
        .click()
      await expect(
        host.getByRole('button', { name: 'Archive Beta', exact: true }),
      ).toHaveCount(0)
      await host
        .getByRole('button', { name: 'Replace action callback', exact: true })
        .click()
      await host.getByRole('button', { name: 'View Beta', exact: true }).click()
      await expect(
        host.getByRole('status').filter({ hasText: 'replacement' }),
      ).toContainText('"id":"b"')
      await page.getByRole('link', { name: 'Table', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Table', exact: true }),
      ).toBeVisible()
      await page.goBack()
      await expect(
        host.getByRole('button', { name: 'Edit Beta', exact: true }),
      ).toBeEnabled()
      await expect(
        host.getByRole('button', { name: 'Archive Beta', exact: true }),
      ).toBeVisible()
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(table).toBeVisible()
      await expect(
        host.getByRole('button', { name: 'Toggle Beta pending', exact: true }),
      ).toBeInViewport()
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
}
