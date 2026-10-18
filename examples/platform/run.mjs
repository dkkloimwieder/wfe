import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium, expect } from '@playwright/test'
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
          .getByRole('link', { name: 'billing', exact: true })
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
      assert.equal(
        new URL(modified.href).searchParams.get('project'),
        'billing',
      )
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
