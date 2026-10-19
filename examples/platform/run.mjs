import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium, expect } from '@playwright/test'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'

const hydration = process.argv.includes('--hydration')
const suffix = process.env.BENCH_DEVELOPMENT
  ? '-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '-package'
    : ''
const directory = `.dist${hydration ? '-hydration' : ''}${suffix}`
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
let render
if (hydration) {
  for (const server of [true, false])
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        'examples/platform/vite.hydration.config.ts',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, HYDRATION_SERVER: server ? '1' : '' },
      },
    )
  const module = await import(
    pathToFileURL(
      `${assets.replace(`.dist-hydration${suffix}`, `.dist-hydration-server${suffix}`)}/server.js`,
    ).href
  )
  render = module.render
}
const report = { directory, hydration, cases: [], errors: [], warnings: [] }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://platform.example')
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    response.setHeader(
      'Content-Type',
      url.pathname.endsWith('.js')
        ? 'text/javascript'
        : url.pathname.endsWith('.css')
          ? 'text/css'
          : url.pathname.endsWith('.json')
            ? 'application/json'
            : 'text/html',
    )
    if (url.pathname === '/' && render) {
      const html = await render(url.href)
      const template = await readFile(`${assets}/hydration.html`, 'utf8')
      response.end(
        template.replace(
          '<div id="root"></div>',
          `<div id="root" data-ssr="true">${html}</div><script>window.platformServerNodes={main:document.querySelector('main'),heading:document.querySelector('[data-platform-heading]'),table:document.querySelector('table')}</script>`,
        ),
      )
    } else
      response.end(
        await readFile(
          assets +
            (url.pathname === '/' ? 'index.html' : url.pathname.slice(1)),
        ),
      )
  } catch (error) {
    response.writeHead(500).end(String(error))
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const url =
  process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.setDefaultTimeout(7000)
const accessibility = await page.context().newCDPSession(page)
await accessibility.send('Accessibility.enable')
page.on('pageerror', (error) => report.errors.push(String(error)))
page.on('console', (message) => {
  if (
    ['error', 'warning'].includes(message.type()) &&
    !message.text().startsWith('[HOT_SCOPE_TIME]')
  )
    report.warnings.push(message.text())
})
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
const projects = () =>
  page.getByRole('table', { name: 'Projects', exact: true })
const openProject = (name) =>
  page.getByRole('button', { name: `Open project ${name}`, exact: true })
const openEnvironment = (name) =>
  page.getByRole('button', { name: `View environment ${name}`, exact: true })
const go = (query = '') => page.goto(url + query)
const initialize = async (query = '') => {
  await go(query)
  await page.waitForFunction(
    () =>
      Boolean(window.platformFixture) &&
      !window.platformFixture.app().session().loading,
  )
}
async function record(name, work) {
  await work()
  await settle()
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
  report.cases.push(name)
  console.log(`PASS ${name}`)
}
try {
  await record(
    'platform: native navigation, persistent tables, stable resizing and approved appearance',
    async () => {
      await initialize('?other=keep#review')
      await expect(openProject('billing')).toBeVisible()
      await reviewCssProvenance(page, url)
      await expect(page.locator('.platform-example')).toHaveCSS(
        'background-color',
        'rgb(233, 236, 239)',
      )
      await expect(
        page.getByRole('button', { name: 'Appearance', exact: true }),
      ).toHaveCSS('color', 'rgb(28, 126, 214)')
      const beforeModified = page.url()
      await page.evaluate(() => {
        window.platformObserveModified = (event) => {
          window.platformModified = {
            control: event.ctrlKey,
            trusted: event.isTrusted,
            prevented: event.defaultPrevented,
            href: event.target.closest('a')?.href,
          }
          // Record application behavior, then contain only browser transport.
          event.preventDefault()
        }
        document.addEventListener('click', window.platformObserveModified)
      })
      try {
        await page
          .getByRole('navigation', { name: 'Platform navigation' })
          .getByRole('link', { name: 'Users', exact: true })
          .click({ modifiers: ['Control'] })
      } finally {
        await page.evaluate(() =>
          document.removeEventListener('click', window.platformObserveModified),
        )
      }
      const modified = await page.evaluate(() => window.platformModified)
      assert.equal(modified.trusted, true)
      assert.equal(page.url(), beforeModified)
      assert.equal(modified.control, true)
      assert.equal(modified.prevented, false)
      assert.equal(new URL(modified.href).searchParams.get('other'), 'keep')
      assert.equal(new URL(modified.href).searchParams.get('screen'), 'users')
      assert.equal(new URL(modified.href).hash, '#review')
      const table = await projects().elementHandle()
      assert.ok(
        (await projects().evaluate(
          (node) =>
            node.closest('.table-component').getBoundingClientRect().height,
        )) > 650,
      )
      if (hydration)
        assert.equal(
          await page.evaluate(
            () =>
              window.platformServerNodes.main ===
                document.querySelector('main') &&
              window.platformServerNodes.heading ===
                document.querySelector('[data-platform-heading]') &&
              window.platformServerNodes.table ===
                document.querySelector('table'),
          ),
          true,
        )
      const handle = page.getByRole('separator', {
        name: 'Resize Project column',
        exact: true,
      })
      const original = await handle.elementHandle(),
        box = await handle.boundingBox()
      const width = Number(await handle.getAttribute('aria-valuenow'))
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      for (const offset of [15, 30, 45]) {
        await page.mouse.move(
          box.x + box.width / 2 + offset,
          box.y + box.height / 2,
        )
        await settle()
        assert.equal(await original.evaluate((node) => node.isConnected), true)
        await expect(handle).toHaveAttribute(
          'aria-valuenow',
          String(width + offset),
        )
      }
      await page.mouse.up()
      await handle.focus()
      await page.keyboard.press('ArrowRight')
      await expect(handle).toHaveAttribute('aria-valuenow', String(width + 55))
      await page
        .getByRole('button', { name: 'Sort by Project', exact: true })
        .click()
      await expect(
        projects().locator('th[data-column="name"]'),
      ).toHaveAttribute('aria-sort', 'ascending')
      await openProject('billing').click()
      await expect(openEnvironment('dev')).toBeVisible()
      assert.equal(new URL(page.url()).searchParams.get('project'), 'billing')
      await openEnvironment('dev').click()
      await expect(
        page.getByText('billing-dev-http', { exact: true }),
      ).toBeVisible()
      await page.goBack()
      await expect(openEnvironment('dev')).toBeVisible()
      await page.goBack()
      await expect(openProject('billing')).toBeVisible()
      assert.equal(
        await table.evaluate(
          (node) =>
            node ===
            document.querySelector(
              '[data-generator-view="platform-projects"] table',
            ),
        ),
        true,
      )
      await expect(
        projects().locator('th[data-column="name"]'),
      ).toHaveAttribute('aria-sort', 'ascending')
      await expect(handle).toHaveAttribute('aria-valuenow', String(width + 55))
      await page.goForward()
      await expect(openEnvironment('dev')).toBeVisible()
      await initialize('?screen=environment&project=shop&env=dev')
      await expect(
        page.getByText('shop-dev-http', { exact: true }),
      ).toBeVisible()
      if (hydration)
        assert.equal(
          await page.evaluate(
            () =>
              window.platformServerNodes.main ===
              document.querySelector('main'),
          ),
          true,
        )
    },
  )
  await record(
    'platform: project creation validates, maps server refusals and immediately opens its accepted target',
    async () => {
      await initialize('?screen=create')
      const input = page.getByRole('textbox', { name: 'Project', exact: true })
      const submit = page.getByRole('button', {
        name: 'Create a project',
        exact: true,
      })
      await input.fill('é'.repeat(21))
      await submit.click()
      await expect(
        page.getByText('Use 1 to 40 UTF-8 bytes for the project name.', {
          exact: true,
        }),
      ).toBeVisible()
      await input.fill('billing')
      await submit.click()
      await expect(
        page.getByText('This project is a project of the org already.', {
          exact: true,
        }),
      ).toBeVisible()
      await input.fill('accounts')
      await submit.click()
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'Project created: accounts' }),
      ).toBeVisible()
      await page
        .getByRole('link', { name: 'Open project', exact: true })
        .click()
      await expect(
        page.getByText('No environments exist in this project.', {
          exact: true,
        }),
      ).toBeVisible()
      assert.equal(new URL(page.url()).searchParams.get('project'), 'accounts')
      const command = await page.evaluate(() =>
        window.platformFixture
          .app()
          .mock.sent()
          .find(
            (request) =>
              request.operation.includes('project/create') &&
              request.items[0]?.value?.project === 'accounts',
          ),
      )
      assert.equal(typeof command.items[0].request_id, 'string')
      assert.deepEqual(command.items[0].value, { project: 'accounts' })
      await page
        .getByRole('navigation', { name: 'Platform navigation' })
        .getByRole('link', { name: 'Projects', exact: true })
        .click()
      await expect(openProject('accounts')).toBeVisible()
    },
  )
  await record(
    'platform: scope, empty results, failures, stale replies and cancellation stay application-owned',
    async () => {
      await initialize('?scenario=project-admin')
      await expect(openProject('billing')).toBeVisible()
      await expect(openProject('shop')).not.toBeVisible()
      await initialize('?scenario=project-admin&screen=create')
      await expect(page.getByRole('alert')).toContainText('Access was refused')
      await expect(
        page.getByRole('textbox', { name: 'Project', exact: true }),
      ).not.toBeVisible()
      await initialize('?scenario=no-access')
      await expect(
        page.getByText('No access has been granted.', { exact: true }),
      ).toBeVisible()
      await expect(page.getByRole('table')).not.toBeVisible()
      await initialize('?scenario=empty')
      await expect(
        page.getByText('No projects exist in this organization.', {
          exact: true,
        }),
      ).toBeVisible()
      assert.ok(
        (await projects().evaluate(
          (node) =>
            node.closest('.table-component').getBoundingClientRect().height,
        )) > 650,
      )
      await initialize()
      await page.evaluate(() => {
        window.platformRelease = window.platformFixture.app().mock.holdNext()
        window.platformFixture
          .app()
          .enter({ screen: 'environment', project: 'billing', env: 'dev' })
        window.platformFixture
          .app()
          .enter({ screen: 'environment', project: 'shop', env: 'dev' })
      })
      await expect(
        page.getByText('shop-dev-http', { exact: true }),
      ).toBeVisible()
      await page.evaluate(() => window.platformRelease())
      await settle()
      await expect(
        page.getByText('billing-dev-http', { exact: true }),
      ).not.toBeVisible()
      await page.evaluate(() =>
        window.platformFixture
          .app()
          .mock.replyNext({ status: 200, body: '{broken' }),
      )
      await page
        .getByRole('button', { name: 'Refresh environment', exact: true })
        .click()
      await expect(page.getByRole('alert')).toContainText('not valid JSON')
      await initialize('?screen=create')
      await page
        .getByRole('textbox', { name: 'Project', exact: true })
        .fill('late-write')
      await page.evaluate(() => {
        window.platformRelease = window.platformFixture.app().mock.holdNext()
      })
      await page
        .getByRole('button', { name: 'Create a project', exact: true })
        .click()
      await expect(
        page.getByRole('link', { name: 'Stop waiting', exact: true }),
      ).toBeVisible()
      await page
        .getByRole('link', { name: 'Stop waiting', exact: true })
        .click()
      await page.evaluate(() => window.platformRelease())
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'command can still complete' }),
      ).toBeVisible()
      await expect(
        page.getByText('Project created: late-write', { exact: true }),
      ).not.toBeVisible()
      await page
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Refresh results', exact: true })
        .click()
      await expect(openProject('late-write')).toBeVisible()
    },
  )
  await record(
    'platform: user directory, scoped access commands and hierarchy refusals',
    async () => {
      await initialize('?screen=users')
      const users = page.getByRole('table', { name: 'Users', exact: true })
      await expect(users).toBeVisible()
      await expect(
        users.getByText('Ann Example', { exact: true }),
      ).toBeVisible()
      await users
        .getByRole('button', { name: 'Sort by Name', exact: true })
        .click()
      await expect(
        users.getByRole('columnheader').filter({
          has: page.getByRole('button', {
            name: 'Sort by Name',
            exact: true,
          }),
        }),
      ).toHaveAttribute('aria-sort', 'ascending')
      await expect(
        page
          .getByRole('navigation', { name: 'Platform location' })
          .getByRole('link', { name: 'Projects', exact: true }),
      ).toHaveCount(0)
      const original = await users.elementHandle()
      const choose = async (label, value) => {
        await page
          .getByRole('button', { name: new RegExp('^' + label + '(?: |$)') })
          .click()
        await page.getByRole('option', { name: value, exact: true }).click()
        await expect(page.getByRole('listbox')).toBeHidden()
      }
      await page
        .getByRole('button', {
          name: 'Manage access for Ann Example',
          exact: true,
        })
        .click()
      await expect(
        page.getByRole('heading', {
          name: 'Manage access',
          exact: true,
          level: 2,
        }),
      ).toBeVisible()
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText('Select an available project.', { exact: true }),
      ).toBeVisible()
      await expect(
        page
          .getByRole('navigation', { name: 'Platform location' })
          .getByRole('link', { name: 'Users', exact: true }),
      ).toBeVisible()
      assert.ok(
        await page
          .getByRole('button', { name: 'Refresh access', exact: true })
          .evaluate((node) => node.getBoundingClientRect().width < 400),
      )
      await choose('Project', 'billing')
      await expect(
        page.getByRole('button', { name: /^Environment(?: |$)/ }),
      ).toBeEnabled()
      await choose('Environment', 'dev')
      await choose('Access scope', 'Project administrator')
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText('The command completed.', { exact: true }),
      ).toBeVisible()
      await choose('Access scope', 'Environment member')
      await expect(
        page.getByRole('button', { name: /^Environment(?: |$)/ }),
      ).toBeEnabled()
      await choose('Command', 'Revoke')
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText(/The user holds org-admin or project-admin/),
      ).toBeVisible()
      await expect(page.getByText(/Details:.*principal_id/)).toBeVisible()
      await choose('Access scope', 'Project administrator')
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText('The command completed.', { exact: true }),
      ).toBeVisible()
      await page
        .getByRole('button', { name: 'Back to users', exact: true })
        .click()
      assert.equal(
        await users.evaluate((node, previous) => node === previous, original),
        true,
      )
      await expect(
        users.getByRole('columnheader').filter({
          has: page.getByRole('button', {
            name: 'Sort by Name',
            exact: true,
          }),
        }),
      ).toHaveAttribute('aria-sort', 'ascending')
      await page
        .getByRole('navigation', { name: 'Platform navigation' })
        .getByRole('link', { name: 'Projects', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'View members of billing', exact: true })
        .click()
      const members = page.getByRole('table', {
        name: 'Members · billing',
        exact: true,
      })
      await expect(
        members.getByRole('row').filter({ hasText: 'Ann Example' }),
      ).toContainText('dev, prod')
      await page.goBack()
      await expect(projects()).toBeVisible()
      await page.goForward()
      await expect(members).toBeVisible()
    },
  )
  await record(
    'platform: access scope restrictions, partial-write recovery, self-revocation and phone layout',
    async () => {
      const principal = '00000000-0000-4000-8000-000000000002'
      await initialize(
        `?screen=access&principal=${principal}&scenario=project-admin`,
      )
      await expect(
        page.getByRole('button', { name: /^Access scope(?: |$)/ }),
      ).toBeVisible()
      await page.getByRole('button', { name: /^Access scope(?: |$)/ }).click()
      await expect(
        page.getByRole('option', {
          name: 'Organization administrator',
          exact: true,
        }),
      ).toHaveAttribute('aria-disabled', 'true')
      await page.keyboard.press('Escape')
      await initialize('?screen=users&scenario=no-access')
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: 'Access was refused for this operation.' }),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(() =>
          window.platformFixture
            .app()
            .mock.sent()
            .some((row) => row.operation.includes(':user/list')),
        ),
        false,
      )
      await initialize(`?screen=access&principal=${principal}`)
      await page.evaluate(() => {
        const mock = window.platformFixture.app().mock
        const original = mock.transport.invoke.bind(mock.transport)
        mock.transport.invoke = async (request) => {
          if (request.method === 'POST')
            mock.replyNext({
              status: 200,
              body: JSON.stringify([
                {
                  request_id: request.items[0].request_id,
                  error: {
                    code: 'application_write_incomplete',
                    detail: {
                      environment: 'billing/prod',
                      completed: ['billing/dev'],
                    },
                  },
                },
              ]),
            })
          return original(request)
        }
      })
      await page.getByRole('button', { name: /^Access scope(?: |$)/ }).click()
      await page
        .getByRole('option', {
          name: 'Organization administrator',
          exact: true,
        })
        .click()
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText(/Details:.*billing\/prod.*billing\/dev/),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(
          () =>
            window.platformFixture
              .app()
              .mock.sent()
              .filter((row) => row.method === 'POST').length,
        ),
        1,
      )
      await page.setViewportSize({ width: 320, height: 740 })
      await settle()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      await page.screenshot({ path: '/tmp/wfe-access-phone.png' })
      await page.setViewportSize({ width: 1280, height: 900 })
      await initialize(
        '?screen=access&principal=00000000-0000-4000-8000-000000000001',
      )
      await page.getByRole('button', { name: /^Access scope(?: |$)/ }).click()
      await page
        .getByRole('option', {
          name: 'Organization administrator',
          exact: true,
        })
        .click()
      await page.getByRole('button', { name: /^Command(?: |$)/ }).click()
      await page.getByRole('option', { name: 'Revoke', exact: true }).click()
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText('No access has been granted.', { exact: true }),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(
          () => window.platformFixture.app().authority().orgAdmin,
        ),
        false,
      )
      await expect(
        page.getByRole('button', { name: /^Access scope(?: |$)/ }),
      ).toBeHidden()
      await expect(
        page.getByText('The command completed.', { exact: true }),
      ).toBeVisible()
    },
  )
  await record(
    'platform: stale choices, Stop waiting and failed authority recovery',
    async () => {
      const principal = '00000000-0000-4000-8000-000000000002'
      const choose = async (label, value) => {
        await page
          .getByRole('button', { name: new RegExp('^' + label + '(?: |$)') })
          .click()
        await page.getByRole('option', { name: value, exact: true }).click()
        await expect(page.getByRole('listbox')).toBeHidden()
      }
      await initialize(`?screen=access&principal=${principal}`)
      await page.evaluate(() => {
        window.accessRelease = window.platformFixture.app().mock.holdNext()
      })
      await choose('Project', 'billing')
      await expect(
        page.getByText('Loading environments', { exact: true }),
      ).toBeVisible()
      await choose('Project', 'shop')
      await expect(
        page.getByText('Loading environments', { exact: true }),
      ).toBeHidden()
      await page.evaluate(() => window.accessRelease())
      await page.getByRole('button', { name: /^Environment(?: |$)/ }).click()
      await expect(
        page.getByRole('option', { name: 'dev', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('option', { name: 'prod', exact: true }),
      ).toHaveCount(0)
      await page.keyboard.press('Escape')
      await choose('Access scope', 'Organization administrator')
      await page.evaluate(() => {
        window.accessRelease = window.platformFixture.app().mock.holdNext()
      })
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Stop waiting', exact: true }),
      ).toBeVisible()
      await page
        .getByRole('button', { name: 'Stop waiting', exact: true })
        .click()
      await expect(
        page.getByText(
          'The application stopped waiting. The command can still complete. Refresh to read the current result.',
          { exact: true },
        ),
      ).toBeVisible()
      await page.evaluate(() => window.accessRelease())
      await expect(
        page.getByText('The command completed.', { exact: true }),
      ).toHaveCount(0)
      await page
        .getByRole('button', { name: 'Refresh results', exact: true })
        .click()
      await page.waitForFunction(
        () =>
          window.platformFixture
            .app()
            .access.users()
            .find((user) => user.email === 'ann@example.test')?.orgAdmin ===
          true,
      )
      await initialize(
        '?screen=access&principal=00000000-0000-4000-8000-000000000001',
      )
      await page.evaluate(() => {
        const mock = window.platformFixture.app().mock
        window.accessInvoke = mock.transport.invoke.bind(mock.transport)
        let wrote = false
        mock.transport.invoke = async (request) => {
          if (wrote && request.operation.includes(':control/mine'))
            return {
              status: 'uncertain',
              reason: 'Scope read failed.',
              retryRefusal: null,
            }
          const outcome = await window.accessInvoke(request)
          if (request.method === 'POST') wrote = true
          return outcome
        }
      })
      await choose('Access scope', 'Organization administrator')
      await choose('Command', 'Revoke')
      await page
        .getByRole('button', { name: 'Apply access command', exact: true })
        .click()
      await expect(
        page.getByText('The command completed.', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('alert').filter({ hasText: 'Scope read failed.' }),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Create a project', exact: true }),
      ).toBeHidden()
      await expect(
        page.getByRole('button', { name: /^Access scope(?: |$)/ }),
      ).toBeHidden()
      await page.evaluate(() => {
        window.platformFixture.app().mock.transport.invoke = window.accessInvoke
      })
      await page.getByRole('button', { name: 'Retry', exact: true }).click()
      await expect(
        page.getByText('No access has been granted.', { exact: true }),
      ).toBeVisible()
    },
  )
  await record(
    'platform: compact rows, Surface 2 dividers and fixed structured controls',
    async () => {
      await initialize('?screen=users')
      const table = page.getByRole('table', { name: 'Users', exact: true })
      const read = () =>
        table.evaluate((node) => {
          const cell = node.querySelector('tbody td'),
            row = cell.parentElement,
            head = node.querySelector('th')
          return {
            height: row.getBoundingClientRect().height,
            padding: getComputedStyle(cell).paddingTop,
            row: getComputedStyle(cell).borderTopColor,
            column: getComputedStyle(cell).borderRightColor,
            head: getComputedStyle(head).borderRightColor,
            action: row.querySelector('button').getBoundingClientRect().height,
          }
        })
      const initial = await read()
      assert.ok(initial.action >= 26 && initial.action < initial.height)
      assert.deepEqual(
        { ...initial, action: undefined },
        {
          height: 32,
          padding: '1px',
          row: 'rgb(233, 236, 239)',
          column: 'rgb(233, 236, 239)',
          head: 'rgb(233, 236, 239)',
          action: undefined,
        },
      )
      const nav = page.getByRole('navigation', { name: 'Platform navigation' })
      assert.equal(
        await nav
          .getByRole('link', { name: 'Users', exact: true })
          .evaluate((node) => getComputedStyle(node).textTransform),
        'uppercase',
      )
      assert.equal(
        await table
          .getByText('Ann Example', { exact: true })
          .evaluate((node) => getComputedStyle(node).textTransform),
        'none',
      )
      const workspace = page.locator(
        '.platform-table-screen:not([hidden]) .table-workspace',
      )
      const original = await table.elementHandle(),
        frame = await workspace.boundingBox()
      await expect(workspace.locator('.table-workspace-resize')).toBeHidden()
      await expect(
        workspace.locator('.table-workspace-resize'),
      ).toHaveAttribute('aria-disabled', 'true')
      await expect(
        workspace.locator('.table-workspace-resize'),
      ).toHaveAttribute('tabindex', '-1')
      assert.equal(
        await workspace
          .locator('.table-scroll')
          .evaluate((node) => node.getBoundingClientRect().width),
        frame.width - 2,
      )
      await workspace
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      const pane = workspace.locator('.table-workspace-controls')
      await expect(pane).toBeVisible()
      const width = (await pane.boundingBox()).width
      await pane
        .getByRole('searchbox', { name: 'Search all columns', exact: true })
        .fill('Ann')
      await workspace
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      await workspace
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      assert.equal((await pane.boundingBox()).width, width)
      await expect(
        pane.getByRole('searchbox', {
          name: 'Search all columns',
          exact: true,
        }),
      ).toHaveValue('Ann')
      await workspace
        .getByRole('button', { name: 'Refresh results', exact: true })
        .click()
      await expect(
        table.getByText('Ann Example', { exact: true }),
      ).toBeVisible()
      await expect(table.getByText('Alex Admin', { exact: true })).toHaveCount(
        0,
      )
      assert.equal(
        await table.evaluate((node, previous) => node === previous, original),
        true,
      )
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Dark surfaces', exact: true })
        .click()
      const dark = await read()
      assert.equal(dark.row, 'rgb(52, 58, 64)')
      assert.equal(dark.column, dark.row)
      await page
        .getByRole('button', { name: 'Black / white surfaces', exact: true })
        .click()
      assert.equal((await read()).row, 'rgb(233, 236, 239)')
    },
  )
  await record(
    'platform: adjacent long headers keep their own sort indicators after resizing and alignment changes',
    async () => {
      await page.setViewportSize({ width: 1280, height: 844 })
      await initialize('?screen=members&project=billing')
      const table = page.getByRole('table', {
        name: 'Members · billing',
        exact: true,
      })
      const org = table.locator('[data-column-header="orgAdmin"]')
      const project = table.locator('[data-column-header="projectAdmin"]')
      const orgSort = org.getByRole('button', {
        name: 'Sort by Organization administrator',
        exact: true,
      })
      await expect(orgSort).toBeVisible()
      const contained = async () => {
        const geometry = await table
          .locator('th[data-column-header]')
          .evaluateAll((heads) =>
            heads
              .map((head) => {
                const button = head.querySelector('.column-sort')
                const mark = button?.querySelector('[aria-hidden="true"]')
                const label = button?.querySelector('.column-sort-label')
                if (!mark || !label) return undefined
                const cell = head.getBoundingClientRect(),
                  target = button.getBoundingClientRect(),
                  icon = mark.getBoundingClientRect()
                const style = getComputedStyle(label)
                return {
                  id: head.dataset.columnHeader,
                  cellLeft: cell.left,
                  cellRight: cell.right,
                  targetLeft: target.left,
                  targetRight: target.right,
                  iconLeft: icon.left,
                  iconRight: icon.right,
                  iconWidth: icon.width,
                  clipped:
                    style.overflow === 'hidden' &&
                    style.textOverflow === 'ellipsis',
                }
              })
              .filter(Boolean),
          )
        for (const item of geometry) {
          assert.ok(item.iconWidth > 0, JSON.stringify(item))
          assert.ok(
            item.iconLeft >= item.cellLeft && item.iconRight <= item.cellRight,
            JSON.stringify(item),
          )
          assert.ok(
            item.iconLeft >= item.targetLeft &&
              item.iconRight <= item.targetRight,
            JSON.stringify(item),
          )
          assert.equal(item.clipped, true)
        }
      }
      await contained()
      await page
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      await page
        .getByRole('complementary', { name: 'Table controls', exact: true })
        .getByText('Display columns', { exact: true })
        .click()
      for (const alignment of ['left', 'center', 'right']) {
        for (const name of [
          'Organization administrator',
          'Project administrator',
        ])
          await selectValue(
            choiceControl(page, { name: `${name} alignment`, exact: true }),
            alignment,
          )
        for (const width of [190, 80, 40]) {
          await page.evaluate((size) => {
            const table = window.platformFixture.app().access.membersTable
            table.getColumn('orgAdmin').setSize(size)
            table.getColumn('projectAdmin').setSize(size)
          }, width)
          await expect(org).toHaveAttribute('aria-sort', 'none')
          for (const sorted of ['none', 'ascending', 'descending']) {
            await expect(org).toHaveAttribute('aria-sort', sorted)
            await contained()
            await orgSort.locator('[aria-hidden="true"]').click()
            await expect(project).toHaveAttribute('aria-sort', 'none')
          }
        }
      }
      await page
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      const handle = page.getByRole('separator', {
        name: 'Resize Organization administrator column',
        exact: true,
      })
      await handle.focus()
      await handle.press('ArrowRight')
      await expect(handle).toHaveAttribute('aria-valuenow', '50')
      await contained()
      await orgSort.focus()
      await orgSort.press('Enter')
      await expect(org).toHaveAttribute('aria-sort', 'ascending')
      await expect(orgSort).toBeFocused()
      await expect(orgSort).toHaveCSS('outline-style', 'solid')
      await expect(orgSort).toHaveCSS('overflow', 'visible')
      await page.screenshot({ path: '/tmp/wfe-header-sort-resized.png' })
    },
  )
  await record(
    'platform: generated tables select data cells and copy application formatting without actions',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await initialize('?screen=users')
      await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write'])
      const table = page.getByRole('table', { name: 'Users', exact: true })
      const ids = await table
        .locator('tr[data-row]')
        .evaluateAll((nodes) =>
          nodes.slice(0, 2).map((node) => node.dataset.row),
        )
      const users = await page.evaluate(() =>
        window.platformFixture.app().access.users(),
      )
      const expected = ids
        .map((id) => users.find((user) => user.principalId === id))
        .map(
          (user) =>
            `${user.displayName}\t${user.email}\t${user.orgAdmin ? 'Yes' : 'No'}`,
        )
        .join('\n')
      await table
        .locator(`tr[data-row="${ids[0]}"] td[data-column="displayName"]`)
        .click()
      await table
        .locator(`tr[data-row="${ids[1]}"] td[data-column="orgAdmin"]`)
        .click({ modifiers: ['Shift'] })
      await expect(table.locator('td[data-cell-selection]')).toHaveCount(6)
      await expect(
        table.locator('td[data-column="actions"][data-cell-selection]'),
      ).toHaveCount(0)
      await page.keyboard.press('Control+c')
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        expected,
      )
      await page.screenshot({ path: '/tmp/wfe-platform-cell-selection.png' })
      await table.locator('tr[data-row]').first().getByRole('button').click()
      await expect
        .poll(() => new URL(page.url()).searchParams.get('screen'))
        .toBe('access')
    },
  )
  await record(
    'platform: organization workspace groups menus and reserves a full-width empty footer',
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await initialize('?screen=projects')
      const menu = page.getByRole('navigation', {
        name: 'Platform navigation',
        exact: true,
      })
      const context = page.getByRole('navigation', {
        name: 'Projects navigation',
        exact: true,
      })
      await expect(menu.getByRole('link')).toHaveText(['Projects', 'Users'])
      await expect(context.getByRole('link')).toHaveText([
        'All projects',
        'Create a project',
      ])
      await expect(page.getByRole('main')).toHaveCSS('color', 'rgb(73, 80, 87)')
      const bands = await page.locator('.ui-dashboard').evaluate((shell) => {
        const box = (selector) => {
          const rect = shell.querySelector(selector).getBoundingClientRect()
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          }
        }
        return {
          header: box('.ui-dashboard-header'),
          footer: box('.ui-dashboard-footer'),
          menu: box('.ui-dashboard-navigation'),
          context: box('.ui-dashboard-context'),
          main: box('main'),
        }
      })
      assert.equal(bands.header.left, 0)
      assert.equal(bands.header.right, 1280)
      assert.equal(bands.footer.left, 0)
      assert.equal(bands.footer.right, 1280)
      assert.equal(bands.footer.top, bands.main.bottom)
      assert.equal(bands.menu.right, bands.context.left)
      assert.equal(bands.context.right, bands.main.left)
      const workspaceBox = await page
        .locator('.platform-table-screen:not([hidden]) .table-workspace')
        .boundingBox()
      assert.equal(workspaceBox.x, bands.main.left)
      assert.equal(workspaceBox.y, bands.main.top)
      assert.equal(workspaceBox.x + workspaceBox.width, bands.main.right)
      assert.equal(workspaceBox.y + workspaceBox.height, bands.main.bottom)
      await expect(
        projects().locator('thead tr').first().locator('th').first(),
      ).toHaveAttribute('data-column', 'actions')
      const rowAction = openProject('billing')
      await expect(rowAction).toHaveText('')
      await expect(rowAction.locator('svg')).toHaveCount(1)

      await expect(
        page.getByRole('contentinfo', {
          name: 'Organization footer',
          exact: true,
        }),
      ).toHaveText('')
      await menu.getByRole('link', { name: 'Users', exact: true }).click()
      await expect(page.locator('.ui-dashboard-context')).toHaveCount(0)
      await expect(
        page.getByRole('table', { name: 'Users', exact: true }),
      ).toBeVisible()
      await menu.getByRole('link', { name: 'Projects', exact: true }).click()
      await openProject('billing').click()
      const projectMenu = page.getByRole('navigation', {
        name: 'Project navigation',
        exact: true,
      })
      await expect(projectMenu.getByRole('link')).toHaveText([
        'Environments',
        'Members',
      ])
      await projectMenu
        .getByRole('link', { name: 'Members', exact: true })
        .click()
      await expect(
        page.getByRole('table', { name: 'Members · billing', exact: true }),
      ).toBeVisible()
      await page.setViewportSize({ width: 320, height: 844 })
      const toggle = page.getByRole('button', {
        name: 'Context menu',
        exact: true,
      })
      await toggle.click()
      await expect(projectMenu).toBeVisible()
      await page
        .getByRole('button', { name: 'Navigation', exact: true })
        .click()
      await expect(menu).toBeVisible()
      await expect(projectMenu).toBeHidden()
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      await page.setViewportSize({ width: 1280, height: 844 })
    },
  )
  await record(
    'platform: current access, full-height forms and shared submit spacing',
    async () => {
      const principal = '00000000-0000-4000-8000-000000000002'
      const geometry = async () =>
        page.locator('.platform-form-page').evaluate((panel) => {
          const main = panel.parentElement
          const rect = panel.getBoundingClientRect()
          const area = main.getBoundingClientRect()
          const style = getComputedStyle(main)
          const form = panel.querySelector('form')
          const grid = form.querySelector('.ui-form-layout')
          const submit = form.querySelector('[type="submit"]')
          return {
            height: rect.height,
            available:
              area.height -
              parseFloat(style.paddingTop) -
              parseFloat(style.paddingBottom),
            gap:
              submit.getBoundingClientRect().top -
              grid.getBoundingClientRect().bottom,
            padding: parseFloat(getComputedStyle(panel).paddingLeft),
            compactSubmit:
              submit.getBoundingClientRect().width <
              form.getBoundingClientRect().width,
            bodyOverflow: document.documentElement.scrollWidth > innerWidth,
          }
        })
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 844 })
        for (const query of [
          '?screen=create',
          `?screen=access&principal=${principal}`,
        ]) {
          await initialize(query)
          await expect(page.locator('.platform-form-page form')).toBeVisible()
          await page.waitForFunction(
            () => !window.platformFixture.app().access.grantsState().loading,
          )
          const dimensions = await geometry()
          assert.ok(
            Math.abs(dimensions.height - dimensions.available) < 2,
            JSON.stringify(dimensions),
          )
          assert.ok(dimensions.gap >= 6, JSON.stringify(dimensions))
          assert.ok(dimensions.padding >= 8)
          assert.equal(dimensions.compactSubmit, true)
          assert.equal(dimensions.bodyOverflow, false)
          await page
            .getByRole('button', {
              name: query.includes('access')
                ? 'Apply access command'
                : 'Create a project',
              exact: true,
            })
            .scrollIntoViewIfNeeded()
        }
      }
      const summary = page.getByRole('region', {
        name: 'Current platform access',
        exact: true,
      })
      await expect(summary).toContainText('billing')
      await expect(summary).toContainText('dev')
      await expect(summary).toContainText('None reported')
      await expect(page.locator('[data-platform-command]')).toContainText(
        'Ann Example',
      )
      await page.screenshot({
        path: '/tmp/wfe-access-summary-phone.png',
        fullPage: true,
      })
      await page.setViewportSize({ width: 1280, height: 844 })
    },
  )
  await record(
    'platform: phone navigation, contained scrolling, appearance drafts and disposal',
    async () => {
      await page.addInitScript(() => {
        const listeners = new Set(),
          add = window.addEventListener,
          remove = window.removeEventListener
        window.addEventListener = function (type, listener, ...rest) {
          if (type === 'popstate') listeners.add(listener)
          return add.call(this, type, listener, ...rest)
        }
        window.removeEventListener = function (type, listener, ...rest) {
          if (type === 'popstate') listeners.delete(listener)
          return remove.call(this, type, listener, ...rest)
        }
        window.platformPopListeners = () => listeners.size
      })
      await initialize('?screen=create')
      const input = page.getByRole('textbox', { name: 'Project', exact: true })
      await input.fill('retained draft')
      const original = await input.elementHandle()
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Dark surfaces', exact: true })
        .click()
      await expect(input).toHaveValue('retained draft')
      assert.equal(
        await input.evaluate((node, before) => node === before, original),
        true,
      )
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click()
      await page.setViewportSize({ width: 320, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      await page
        .getByRole('button', { name: 'Navigation', exact: true })
        .click()
      await page
        .getByRole('navigation', { name: 'Platform navigation' })
        .getByRole('link', { name: 'Projects', exact: true })
        .click()
      await expect(projects()).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Platform navigation' }),
      ).not.toBeVisible()
      await expect(page.locator('[data-platform-heading]')).toBeFocused()
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      assert.equal(
        await projects().evaluate(
          (node) =>
            node.closest('.table-scroll').scrollWidth >
            node.closest('.table-scroll').clientWidth,
        ),
        true,
      )
      const listeners = await page.evaluate(() => window.platformPopListeners())
      const link = await openProject('billing').elementHandle()
      await page.evaluate(() => window.platformFixture.stop())
      await link.evaluate((node) => node.click())
      await page.evaluate(() => window.dispatchEvent(new Event('popstate')))
      assert.equal(await page.locator('#root').textContent(), '')
      assert.equal(
        await page.evaluate(() => window.platformPopListeners()),
        listeners - 1,
      )
    },
  )
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: '/tmp/wfe-platform-first-failure.png' })
    report.snapshot = await page.locator('body').ariaSnapshot()
  } catch {
    /* The browser can already be closed. */
  }
  throw error
} finally {
  await writeFile(
    process.env.BENCH_OUTPUT ?? '/tmp/wfe-platform-browser.json',
    JSON.stringify(report, null, 2),
  )
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
