import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function reviewNativeTab(
  page,
  click,
  expectedUrl,
  assertDestination,
) {
  const context = page.context()
  const originalUrl = page.url()
  const pending = new Map()
  const failed = []
  const lifecycle = []
  const started = (request) =>
    pending.set(request, {
      method: request.method(),
      url: request.url(),
      type: request.resourceType(),
    })
  const finished = (request) => pending.delete(request)
  const rejected = (request) => {
    failed.push({
      ...pending.get(request),
      error: request.failure()?.errorText,
    })
    pending.delete(request)
  }
  const domReady = () => lifecycle.push('domcontentloaded')
  const loaded = () => lifecycle.push('load')
  let popup, timer, onPage, failure
  context.on('request', started)
  context.on('requestfinished', finished)
  context.on('requestfailed', rejected)
  const opened = new Promise((resolve, reject) => {
    onPage = (child) => {
      popup = child
      popup.on('domcontentloaded', domReady)
      popup.on('load', loaded)
      resolve(child)
    }
    context.once('page', onPage)
    timer = setTimeout(
      () => reject(new Error('Native click did not open a tab within 30000ms')),
      30000,
    )
  })
  try {
    await Promise.all([opened, click()])
    await popup.waitForURL(expectedUrl, { waitUntil: 'commit', timeout: 30000 })
    if (assertDestination) await assertDestination(popup)
    assert.equal(page.url(), originalUrl)
  } catch (error) {
    failure = new Error(
      `Native tab check failed: ${String(error)}. Diagnostics: ${JSON.stringify(
        {
          originalUrl,
          currentUrl: page.url(),
          expectedUrl,
          popupUrl: popup?.url(),
          lifecycle,
          pending: [...pending.values()],
          failed,
        },
      )}`,
      { cause: error },
    )
  } finally {
    clearTimeout(timer)
    context.off('page', onPage)
    context.off('request', started)
    context.off('requestfinished', finished)
    context.off('requestfailed', rejected)
    if (popup) {
      popup.off('domcontentloaded', domReady)
      popup.off('load', loaded)
      if (!popup.isClosed()) {
        try {
          await popup.close()
        } catch (cleanupError) {
          failure = failure
            ? new AggregateError(
                [failure, cleanupError],
                `${String(failure)}. Tab cleanup also failed: ${String(cleanupError)}`,
              )
            : cleanupError
        }
      }
    }
  }
  if (failure) throw failure
}

export async function reviewButtonLinks(page) {
  const section = page.locator('[data-button-link-review]')
  for (const variant of ['outline', 'filled', 'inverted', 'ghost']) {
    const link = section.locator(`#button-link-${variant}`)
    await expect(link).not.toHaveAttribute('role', 'button')
  }
  const link = section.locator('#button-link-outline')
  const original = page.url()
  await link.focus()
  await expect(link).toBeFocused()
  await link.press('Enter')
  await expect(page).toHaveURL(/#button-link-destination$/)
  await page.goBack()
  assert.equal(page.url(), original)
  const destination = await link.evaluate((node) => node.href)
  await reviewNativeTab(
    page,
    () => link.click({ modifiers: ['ControlOrMeta'] }),
    destination,
    (popup) =>
      expect(popup.locator('#button-link-destination')).toHaveText(
        'Link destination',
      ),
  )
  await reviewNativeTab(
    page,
    () => section.getByRole('link', { name: 'New tab destination' }).click(),
    'about:blank',
  )
  const downloadPromise = page.waitForEvent('download')
  await section.getByRole('link', { name: 'Download example' }).click()
  const download = await downloadPromise
  assert.equal(download.suggestedFilename(), 'example.txt')
  await download.delete()
}
