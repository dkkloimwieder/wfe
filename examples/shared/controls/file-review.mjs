import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function reviewFiles(page, api = 'client') {
  const root = page.locator('[data-file-review]')
  const input = root.locator('input[type=file]')
  const browse = root.getByRole('button', { name: 'Choose files', exact: true })
  const configure = (next) =>
    page.evaluate(
      ({ api, next }) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.files
          : window.fileFixture
        ).configure(next),
      { api, next },
    )
  const read = () =>
    page.evaluate(
      (api) =>
        (api === 'hydration'
          ? window.hydrationFixture.lifecycle.files
          : window.fileFixture
        ).read(),
      api,
    )
  const pick = (name, content = 'abc', mimeType = 'text/plain') =>
    input.setInputFiles({ name, mimeType, buffer: Buffer.from(content) })
  const reset = root.getByRole('button', { name: 'Reset attachments' })
  const drop = async (entries, kind = 'files') =>
    root.locator('.ui-file-input').evaluate(
      (node, { entries, kind }) => {
        const transfer = new DataTransfer()
        if (kind === 'text') transfer.setData('text/plain', 'A text draft')
        else
          for (const entry of entries)
            transfer.items.add(
              new File([entry.content ?? 'abc'], entry.name, {
                type: entry.type ?? 'text/plain',
              }),
            )
        const over = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        })
        node.dispatchEvent(over)
        const event = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        })
        node.dispatchEvent(event)
        return { over: over.defaultPrevented, drop: event.defaultPrevented }
      },
      { entries, kind },
    )
  assert.deepEqual(await read(), {
    names: [],
    requests: [],
    rejected: [],
    submissions: 0,
  })
  await root.getByRole('button', { name: 'Review record' }).click()
  await expect(browse).toBeFocused()
  const error = root.getByText('Choose a file.', { exact: true })
  await expect(root.locator('.ui-file-input')).toHaveCSS(
    'border-color',
    await error.evaluate((node) => getComputedStyle(node).color),
  )
  await expect(browse).toHaveAttribute('aria-invalid', 'true')
  await expect(root.getByText('Choose a file.', { exact: true })).toBeVisible()
  assert.equal((await read()).submissions, 0)
  const chooser = page.waitForEvent('filechooser')
  await browse.press('Space')
  await (
    await chooser
  ).setFiles({
    name: 'first.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('abc'),
  })
  await expect(root.getByText('first.txt', { exact: true })).toBeVisible()
  assert.equal(await input.evaluate((node) => node.files.length), 0)
  assert.equal(await input.evaluate((node) => node.checkValidity()), true)
  await root.getByRole('button', { name: 'Review record' }).click()
  assert.equal((await read()).submissions, 1)
  await input.dispatchEvent('cancel')
  assert.deepEqual((await read()).names, ['first.txt'])
  await configure({ accept: false })
  await pick('rejected-echo.txt')
  assert.deepEqual((await read()).names, ['first.txt'])
  await root.getByRole('button', { name: 'Remove first.txt' }).click()
  assert.deepEqual((await read()).names, ['first.txt'])
  await expect(browse).toBeFocused()
  const beforeReset = (await read()).requests.length
  await reset.click()
  await expect
    .poll(async () => (await read()).requests.length)
    .toBe(beforeReset + 1)
  assert.deepEqual((await read()).names, ['first.txt'])
  await configure({ cancelReset: true })
  await reset.click()
  await page.evaluate(() => new Promise((done) => setTimeout(done, 20)))
  assert.equal((await read()).requests.length, beforeReset + 1)
  await configure({ accept: true, cancelReset: false })
  await pick('first.txt')
  assert.deepEqual((await read()).names, ['first.txt', 'first.txt'])
  assert.equal(
    await root.getByRole('button', { name: 'Remove first.txt' }).count(),
    2,
  )
  await root.getByRole('button', { name: 'Remove first.txt' }).first().click()
  assert.deepEqual((await read()).names, ['first.txt'])
  await pick('large.txt', 'a'.repeat(1025))
  await expect(
    root
      .getByRole('status')
      .filter({ hasText: 'File exceeds the size limit.' }),
  ).toBeVisible()
  assert.deepEqual((await read()).names, ['first.txt'])
  assert.equal(await input.evaluate((node) => node.checkValidity()), true)
  assert.deepEqual(
    await drop([
      { name: 'image.png', type: 'image/png' },
      { name: 'wrong.bin', type: 'application/octet-stream' },
    ]),
    { over: true, drop: true },
  )
  assert.deepEqual((await read()).names, ['first.txt', 'image.png'])
  assert.ok((await read()).rejected.includes('type'))
  assert.deepEqual(await drop([], 'text'), { over: false, drop: false })
  await configure({ cancelDrop: true })
  const cancelCount = (await read()).requests.length
  assert.deepEqual(await drop([{ name: 'canceled.txt' }]), {
    over: true,
    drop: true,
  })
  assert.equal((await read()).requests.length, cancelCount)
  await configure({ cancelDrop: false })
  for (const lock of ['readonly', 'disabled']) {
    await configure({ [lock]: true })
    await expect(browse).toBeDisabled()
    const before = (await read()).requests.length
    assert.deepEqual(await drop([{ name: 'blocked.txt' }]), {
      over: true,
      drop: true,
    })
    assert.equal((await read()).requests.length, before)
    assert.equal(await input.evaluate((node) => node.checkValidity()), true)
    await configure({ [lock]: false })
  }
  await input.evaluate((node) => {
    const fieldset = document.createElement('fieldset')
    const root = node.closest('.ui-file-input')
    root.parentNode.insertBefore(fieldset, root)
    fieldset.append(root)
    fieldset.disabled = true
    fieldset.id = 'file-disabled-fieldset'
  })
  await expect(browse).toBeDisabled()
  const fieldsetRequests = (await read()).requests.length
  assert.deepEqual(await drop([{ name: 'fieldset-blocked.txt' }]), {
    over: true,
    drop: true,
  })
  assert.equal((await read()).requests.length, fieldsetRequests)
  await page.locator('#file-disabled-fieldset').evaluate((node) => {
    const legend = document.createElement('legend')
    node.prepend(legend)
    legend.append(node.querySelector('.ui-file-input'))
  })
  await expect(browse).toBeEnabled()
  assert.deepEqual(await drop([{ name: 'legend.txt' }]), {
    over: true,
    drop: true,
  })
  assert.equal((await read()).requests.length, fieldsetRequests + 1)
  await page.locator('#file-disabled-fieldset').evaluate((node) => {
    node.append(node.querySelector('.ui-file-input'))
    node.disabled = false
  })
  await expect(browse).toBeEnabled()
  await reset.click()
  await expect.poll(async () => (await read()).names.length).toBe(0)
  await configure({ multiple: false })
  assert.deepEqual(await drop([{ name: 'a.txt' }, { name: 'b.txt' }]), {
    over: true,
    drop: true,
  })
  assert.deepEqual((await read()).names, [])
  assert.deepEqual((await read()).rejected.slice(-2), ['multiple', 'multiple'])
  await pick('single.txt')
  await pick('replacement.txt')
  assert.deepEqual((await read()).names, ['replacement.txt'])
  await configure({ multiple: true })
  const longName = 'a'.repeat(180) + '.txt'
  await pick(longName)
  await page.setViewportSize({ width: 320, height: 844 })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await expect(root.getByText(longName, { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 720 })
  await configure({ maxFileSize: 0 })
  await root.locator('.ui-file-input').evaluate((node) => {
    const placeholder = document.createComment('standalone-file-test')
    node.before(placeholder)
    window.fileScopePlaceholder = placeholder
    document.body.append(node)
  })
  const standalone = page.locator('.ui-file-input')
  assert.equal(
    await standalone.evaluate(
      (node) => node.parentElement.closest('[data-ui]') === null,
    ),
    true,
  )
  const standaloneError = standalone.getByText(
    'The selected files do not meet the type or size limits.',
    { exact: true },
  )
  await expect(standalone).toHaveCSS(
    'border-color',
    await standaloneError.evaluate((node) => getComputedStyle(node).color),
  )
  await standalone.evaluate((node) =>
    window.fileScopePlaceholder.replaceWith(node),
  )
  await configure({ maxFileSize: 1024 })
  await root
    .getByRole('textbox', { name: 'Record name', exact: true })
    .fill('Retained record draft')
  await expect(
    root.getByRole('textbox', { name: 'Record name', exact: true }),
  ).toHaveValue('Retained record draft')
}
