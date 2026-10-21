import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'

export async function applicationAccessCases({
  page,
  initialize,
  record,
  hydration,
}) {
  const retainedShell = async () => {
    if (!hydration) return
    assert.equal(
      await page.evaluate(
        () =>
          window.platformServerNodes.main === document.querySelector('main') &&
          window.platformServerNodes.heading ===
            document.querySelector('[data-platform-heading]'),
      ),
      true,
    )
  }
  const users = () => page.locator('[data-generator-view="application-users"]')
  const permissions = () =>
    page.locator('[data-generator-view="application-role-permissions"]')
  await record(
    'platform: application roles keep assignments, coverage and host scope separate',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await initialize('?screen=environment&project=billing&env=dev')
      await page
        .getByRole('button', { name: 'Application users', exact: true })
        .click()
      await expect(
        users().getByRole('cell', { name: 'ann@example.test', exact: true }),
      ).toHaveCount(2)
      await expect(
        users().getByRole('columnheader', { name: /Administrator coverage/ }),
      ).toBeVisible()
      await users()
        .getByRole('button', {
          name: 'Manage application roles for ann@example.test',
          exact: true,
        })
        .click()
      await expect(
        page.getByRole('heading', {
          name: 'Application role assignment',
          level: 2,
        }),
      ).toBeVisible()
      await selectValue(
        choiceControl(page, { name: 'Role', exact: true }),
        'Team / reviewer',
      )
      await page
        .getByRole('button', { name: 'Apply role command', exact: true })
        .click()
      await expect(
        page.getByText('Role grant completed.', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Current application roles' }),
      ).toContainText('Team / reviewer')
      const request = await page.evaluate(() =>
        window.platformFixture
          .app()
          .applicationAccess.mock.sent()
          .findLast((entry) =>
            entry.request.operation.includes('user-role/grant'),
          ),
      )
      assert.deepEqual(request.scope, { project: 'billing', env: 'dev' })
      assert.deepEqual(request.request.items[0].value, {
        user_id: '00000000-0000-4000-8000-000000000002',
        role: 'Team / reviewer',
      })
      assert.equal('project' in request.request.items[0], false)
      await page.goBack()
      await expect(
        users().getByRole('cell', {
          name: 'reader, Team / reviewer',
          exact: true,
        }),
      ).toBeVisible()
      await users()
        .getByRole('button', { name: 'Sort by Email', exact: true })
        .click()
      await expect(
        users().getByRole('columnheader', { name: /Email/ }),
      ).toHaveAttribute('aria-sort', 'ascending')
      await page.screenshot({ path: '/tmp/wfe-application-users.png' })
      await initialize('?screen=app-users&project=billing&env=prod')
      await expect(
        users().getByText(/Application administration is not available/),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(
          () => window.platformFixture.app().authority().orgAdmin,
        ),
        true,
      )
    },
  )
  await record(
    'platform: application permissions preserve stored flags, built-in admin and native history',
    async () => {
      await initialize('?screen=app-roles&project=billing&env=dev')
      await retainedShell()
      await page
        .getByRole('button', {
          name: 'View permissions for editor',
          exact: true,
        })
        .click()
      const retired = permissions().locator(
        'tr[data-row="example:records/retired@0.1.0"]',
      )
      await expect(retired).toBeVisible()
      await retired
        .getByRole('button', {
          name: 'Revoke example:records/retired@0.1.0',
          exact: true,
        })
        .click()
      await expect(
        page.getByText('Permission revoke completed.', { exact: true }),
      ).toBeVisible()
      await expect(retired).toHaveCount(0)
      const write = permissions().locator(
        'tr[data-row="example:records/write@1.0.0"]',
      )
      await write
        .getByRole('button', {
          name: 'Revoke example:records/write@1.0.0',
          exact: true,
        })
        .click()
      await expect(
        write.getByRole('button', {
          name: 'Grant example:records/write@1.0.0',
          exact: true,
        }),
      ).toBeVisible()
      await write
        .getByRole('button', {
          name: 'Grant example:records/write@1.0.0',
          exact: true,
        })
        .click()
      await expect(
        write.getByRole('button', {
          name: 'Revoke example:records/write@1.0.0',
          exact: true,
        }),
      ).toBeVisible()
      await page.screenshot({ path: '/tmp/wfe-application-permissions.png' })
      await page.goBack()
      await page
        .getByRole('button', {
          name: 'View permissions for admin',
          exact: true,
        })
        .click()
      await expect(
        page.getByText(/Built-in administrator: all served operations/),
      ).toBeVisible()
      await expect(
        permissions().getByRole('button', { name: /^(Grant|Revoke) / }),
      ).toHaveCount(0)
      await permissions()
        .getByRole('button', { name: 'Refresh results', exact: true })
        .click()
      await expect(
        page.getByText(/Built-in administrator: all served operations/),
      ).toBeVisible()
    },
  )
  await record(
    'platform: application direct links and forms fit small screens',
    async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 })
        await initialize(
          '?screen=app-role&project=billing&env=dev&role=Team%20%2F%20reviewer',
        )
        await expect(permissions().getByRole('table')).toBeVisible()
        await retainedShell()
        const breadcrumb = page
          .locator('[aria-current="page"]')
          .filter({ hasText: 'Team / reviewer' })
        await expect(breadcrumb).toContainText('Team / reviewer')
        if (width === 390)
          await page.screenshot({ path: '/tmp/wfe-application-mobile.png' })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        )
        const header = permissions().locator('.table-workspace-header')
        await expect(
          header.getByRole('button', {
            name: 'Application users',
            exact: true,
          }),
        ).toBeVisible()
        await header
          .getByRole('button', { name: 'Application users', exact: true })
          .click()
        await users()
          .getByRole('button', {
            name: 'Manage application roles for ann@example.test',
            exact: true,
          })
          .click()
        await expect(
          choiceControl(page, { name: 'Role', exact: true }),
        ).toBeVisible()
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        )
        const form = page.locator('.platform-form-page[data-fill]')
        assert.ok((await form.boundingBox()).height > 500)
      }
      await page.setViewportSize({ width: 1280, height: 900 })
    },
  )
}
