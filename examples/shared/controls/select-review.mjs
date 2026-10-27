import { expect } from '@playwright/test'

export const choiceControl = (root, options) => {
  const buttons =
    typeof options.name === 'string'
      ? root
          .getByRole('button')
          .and(root.locator(`[aria-label=${JSON.stringify(options.name)}]`))
      : root.getByRole('button', options)
  return buttons.or(root.getByRole('combobox', options))
}

export async function choiceListbox(control) {
  await expect(control).toHaveAttribute('aria-controls', /.+/)
  const id = await control.getAttribute('aria-controls')
  return control.page().locator(`[id=${JSON.stringify(id)}]`)
}

export async function selectValue(control, value) {
  if (await control.evaluate((node) => node instanceof HTMLSelectElement)) {
    await control.selectOption(value)
    return
  }
  await control.click()
  const listbox = await choiceListbox(control)
  await listbox.locator(`[data-choice-value=${JSON.stringify(value)}]`).click()
  await expect(listbox).toHaveCount(0)
}

export async function controlValue(control) {
  return control.evaluate((node) =>
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
      ? node.value
      : node.dataset.value,
  )
}

export async function expectValue(control, value) {
  await expect.poll(() => controlValue(control)).toBe(value)
}

export async function choiceOptions(control) {
  await control.click()
  const listbox = await choiceListbox(control)
  const choices = await listbox.getByRole('option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: node.textContent.trim(),
      value: node.dataset.choiceValue,
      disabled: node.getAttribute('aria-disabled') === 'true',
    })),
  )
  await control.page().keyboard.press('Escape')
  return choices
}
