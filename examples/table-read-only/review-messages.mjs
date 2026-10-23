import assert from 'node:assert/strict'

export async function reviewMessages(page, url) {
  await page.goto(`${url}?messages`)
  const input = page.getByRole('textbox', { name: 'Artículo', exact: true })
  await input.fill('Lámpara')
  await input.evaluate((node) => {
    window.messageInput = node
  })
  await page
    .getByRole('button', { name: 'English / Español', exact: true })
    .click()
  await input.focus()
  const retained = await input.evaluate((node) => ({
    same: window.messageInput === node,
    value: node.value,
    focus: document.activeElement === node,
  }))
  assert.deepEqual(retained, { same: true, value: 'Lámpara', focus: true })
  assert.equal(
    await page
      .getByRole('button', { name: 'Refresh results', exact: true })
      .count(),
    1,
  )
  assert.equal(
    await page
      .getByRole('navigation', { name: 'Table pages', exact: true })
      .count(),
    1,
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Sort by Artículo', exact: true })
      .count(),
    1,
  )
  await page
    .getByRole('button', { name: 'English / Español', exact: true })
    .click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Actualizar resultados', exact: true })
      .count(),
    1,
  )
  assert.equal(
    await page
      .getByRole('navigation', { name: 'Páginas de tabla', exact: true })
      .count(),
    1,
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Ordenar por Artículo', exact: true })
      .count(),
    1,
  )
  assert.equal(
    await input.evaluate((node) => window.messageInput === node),
    true,
  )
}
