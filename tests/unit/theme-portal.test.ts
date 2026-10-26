import { afterEach, expect, test } from 'vitest'
import { portalMount } from '../../packages/components/src/internal/portalMount'

const roots: HTMLElement[] = []
function element(
  parent?: HTMLElement,
  attributes: Record<string, string> = {},
) {
  const node = document.createElement('div')
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value)
  }
  if (parent) parent.append(node)
  else {
    document.body.append(node)
    roots.push(node)
  }
  return node
}
const themeAttributes = {
  'data-ui': '',
  'data-ui-portal-root': '',
  'data-ui-theme-owner': '',
}
afterEach(() => {
  for (const root of roots.splice(0)) root.remove()
})

for (const [name, attributes] of [
  ['dialog', { class: 'ui-dialog-portal' }],
  ['popover', { popover: 'manual' }],
] as const) {
  test(`a Theme inside a ${name} owns its popup mount`, () => {
    const outer = element(undefined, themeAttributes)
    const layer = element(outer, attributes)
    const inner = element(layer, themeAttributes)
    const control = element(inner, { 'data-ui': '' })
    const trigger = element(control)
    expect(portalMount(trigger)).toBe(inner)
    expect(portalMount(inner)).toBe(inner)
  })

  test(`a ${name} inside a Theme retains the popup in its layer`, () => {
    const theme = element(undefined, themeAttributes)
    const layer = element(theme, attributes)
    const control = element(layer, { 'data-ui': '' })
    const trigger = element(control)
    expect(portalMount(trigger)).toBe(layer)
  })
}

test('the nearest of multiple nested themes owns an ordinary popup', () => {
  const outer = element(undefined, themeAttributes)
  const inner = element(outer, themeAttributes)
  const control = element(inner, { 'data-ui': '' })
  expect(portalMount(element(control))).toBe(inner)
})

test('legacy data-ui scopes and unscoped anchors retain their fallback behavior', () => {
  const outer = element(undefined, { 'data-ui': '' })
  const control = element(outer, { 'data-ui': '' })
  expect(portalMount(element(control))).toBe(outer)
  expect(portalMount(element(outer))).toBe(outer)
  expect(portalMount(element())).toBeUndefined()
  expect(portalMount(undefined)).toBeUndefined()
  expect(portalMount(null)).toBeUndefined()
})
