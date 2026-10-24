import { artifactPath } from '../../scripts/artifacts.mjs'
import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function invitationCases({ page, initialize, record }) {
  await record(
    'platform: primary table action stays in the header across collapse and mobile layout',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await initialize('?screen=users')
      const table = page.locator('[data-generator-view="platform-users"]')
      const action = table
        .locator('.table-workspace-header')
        .getByRole('button', { name: 'Invite a user', exact: true })
      await expect(action).toHaveCount(1)
      const original = await action.elementHandle()
      if (await page.evaluate(() => Boolean(window.platformServerNodes))) {
        assert.equal(
          await action.evaluate(
            (node) => node === window.platformServerNodes.invite,
          ),
          true,
        )
      }
      const toggle = table.getByRole('button', {
        name: 'Table controls',
        exact: true,
      })
      await toggle.click()
      await expect(action).toBeVisible()
      await toggle.click()
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 })
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(action).toBeVisible()
        const bounds = await action.boundingBox()
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width)
        assert.equal(
          await action.evaluate((node, old) => node === old, original),
          true,
        )
      }
      await action.click()
      await expect(
        page.getByRole('textbox', { name: 'Display name', exact: true }),
      ).toBeVisible()
      await page.goBack()
      await expect(action).toBeVisible()
      assert.equal(
        await action.evaluate((node, old) => node === old, original),
        true,
      )
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
  await record(
    'platform: invitation mockup keeps repeated drafts and projects sample requests',
    async () => {
      await initialize('?screen=users')
      await page
        .getByRole('button', { name: 'Invite a user', exact: true })
        .click()
      await expect(
        page.getByRole('textbox', { name: 'Display name', exact: true }),
      ).toBeEnabled()
      await page
        .getByRole('textbox', { name: 'Display name', exact: true })
        .fill('Morgan Sample')
      await page
        .getByRole('textbox', { name: 'Email', exact: true })
        .fill('morgan@example.test')
      const memberships = page.locator('[data-generator-field="memberships"]')
      await memberships
        .getByRole('button', { name: 'Add row', exact: true })
        .click()
      const target = memberships
        .getByRole('combobox', { name: 'Project / environment', exact: true })
        .first()
      await expect(target).toHaveAttribute('aria-required', 'true')
      await target.fill('billing')
      await page
        .getByRole('option', { name: 'billing / dev', exact: true })
        .click()
      await expect(target).toHaveValue('billing / dev')
      await expect(page.getByRole('listbox')).not.toBeVisible()
      await page.screenshot({
        path: await artifactPath('wfe-invitation-desktop.png'),
      })
      const original = await target.elementHandle()
      await memberships
        .getByRole('button', { name: 'Add row', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Create sample invitation', exact: true })
        .click()
      await expect(
        memberships.getByText('Choose a current sample target.', {
          exact: true,
        }),
      ).toBeVisible()
      const invalidTarget = memberships.getByRole('combobox').nth(1)
      await expect(invalidTarget).toHaveAttribute('aria-invalid', 'true')
      await expect(invalidTarget).toHaveAccessibleDescription(
        'Choose a current sample target.',
      )
      await memberships
        .getByRole('button', {
          name: 'Remove Environment memberships row 2',
          exact: true,
        })
        .click()
      assert.equal(
        await target.evaluate((node, old) => node === old, original),
        true,
      )
      await expect(target).toHaveValue('billing / dev')
      const admins = page.locator('[data-generator-field="projectAdmins"]')
      await admins.getByRole('button', { name: 'Add row', exact: true }).click()
      await admins
        .getByRole('combobox', { name: 'Project', exact: true })
        .fill('billing')
      await page.getByRole('option', { name: 'billing', exact: true }).click()
      await page
        .getByRole('button', { name: 'Create sample invitation', exact: true })
        .click()
      await expect(
        page.getByText('Sample invitation completed. No email was sent.', {
          exact: true,
        }),
      ).toBeVisible()
      assert.deepEqual(
        await page.evaluate(
          () =>
            window.platformFixture
              .app()
              .mock.sent()
              .findLast((r) => r.operation.includes('user/invite')).items[0]
              .value,
        ),
        {
          display_name: 'Morgan Sample',
          email: 'morgan@example.test',
          org_admin: null,
          memberships: [{ project: 'billing', env: 'dev' }],
          project_admins: ['billing'],
        },
      )
      await page
        .getByRole('button', { name: 'Back to users', exact: true })
        .click()
      await expect(
        page.getByRole('cell', { name: 'Morgan Sample', exact: true }),
      ).toBeVisible()
      await page.goBack()
      await expect(
        page.getByRole('textbox', { name: 'Display name', exact: true }),
      ).toBeVisible()
    },
  )
  await record(
    'platform: sample lifecycle confirmations cancel, refuse, complete and restore focus',
    async () => {
      await initialize('?screen=users')
      const trigger = page.getByRole('button', {
        name: 'Deactivate Ann Example',
        exact: true,
      })
      const sent = () =>
        page.evaluate(
          () =>
            window.platformFixture
              .app()
              .mock.sent()
              .filter((r) => r.operation.includes('user/deactivate')).length,
        )
      const before = await sent()
      await trigger.click()
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toContainText('Ann Example')
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(dialog).not.toBeVisible()
      assert.equal(await sent(), before)
      await expect(trigger).toBeFocused()
      await trigger.click()
      await page.evaluate(() =>
        window.platformFixture.app().mock.replyNext({
          status: 403,
          body: JSON.stringify({
            error: {
              code: 'permission-denied',
              operation: 'wamn-control:user/deactivate@0.9.0',
            },
          }),
        }),
      )
      await dialog
        .getByRole('button', { name: 'Confirm sample change', exact: true })
        .click()
      await expect(dialog.getByRole('alert')).toBeVisible()
      await expect(dialog).toBeVisible()
      await dialog
        .getByRole('button', { name: 'Confirm sample change', exact: true })
        .click()
      await expect(dialog).not.toBeVisible()
      await expect(
        page.getByRole('row').filter({
          has: page.getByRole('cell', { name: 'Ann Example', exact: true }),
        }),
      ).toContainText('inactive')
    },
  )
  await record(
    'platform: invitation mockup fits a phone and discards a pending result after navigation',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await initialize('?screen=users')
      await page
        .getByRole('button', { name: 'Invite a user', exact: true })
        .click()
      await page
        .getByRole('textbox', { name: 'Display name', exact: true })
        .fill('Pending Sample')
      await page
        .getByRole('textbox', { name: 'Email', exact: true })
        .fill('pending@example.test')
      await page.evaluate(() => {
        window.releaseInvitation = window.platformFixture.app().mock.holdNext()
      })
      await page
        .getByRole('button', { name: 'Create sample invitation', exact: true })
        .click()
      await expect(
        page.getByRole('button', {
          name: 'Create sample invitation',
          exact: true,
        }),
      ).toBeDisabled()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      await page.screenshot({
        path: await artifactPath('wfe-invitation-phone.png'),
      })
      // The browser Back command remains available while generated form actions are locked.
      await page.goBack()
      await page.evaluate(() => window.releaseInvitation())
      await expect(
        page.getByRole('table', { name: 'Users', exact: true }),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(() =>
          window.platformFixture.app().invitation.completed(),
        ),
        '',
      )
      await page.setViewportSize({ width: 1280, height: 844 })
    },
  )
}
