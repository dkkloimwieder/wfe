import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  Theme,
  themeStyle,
  themeSizing,
  uiScope,
  UI_DENSITIES,
  DashboardShell,
} from '@wfe/components'
import type { ThemeDensity as RootDensity } from '@wfe/components'
import type { ThemeDensity, ThemeProps } from '@wfe/components/theme'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('default and explicit density geometry follow their owning sizing records', () => {
  const geometryTokens = [
    '--ui-row-height',
    '--ui-control-height',
    '--ui-header-height',
    '--ui-table-control-height',
  ] as const
  const defaultStyle = themeStyle()
  const defaultGeometry = { ...uiScope().style, ...themeSizing }
  for (const token of geometryTokens) {
    expect(defaultStyle[token]).toBe(defaultGeometry[token])
  }
  for (const density of Object.keys(UI_DENSITIES) as Array<
    keyof typeof UI_DENSITIES
  >) {
    const style = themeStyle({ density })
    const geometry = uiScope(density).style
    for (const token of geometryTokens) {
      expect(style[token]).toBe(geometry[token])
    }
  }
})

test('reactive density retains content and inherited dashboard metadata without changing nested themes', () => {
  const [density, setDensity] = createSignal<ThemeDensity>('default')
  const h = render(() => (
    <Theme density={density()} id="outer">
      <DashboardShell id="inherited">
        <input aria-label="Draft" defaultValue="Retained" />
      </DashboardShell>
      <DashboardShell id="explicit" density="comfortable">
        Explicit
      </DashboardShell>
      <Theme id="inner">
        <span>Nested</span>
      </Theme>
    </Theme>
  ))
  const input = h.getByRole('textbox')
  input.focus()
  const outer = h.container.querySelector('#outer')!
  expect(outer.getAttribute('data-ui-density')).toBe('default')
  expect(
    h.container.querySelector('#inherited')!.hasAttribute('data-ui-density'),
  ).toBe(false)
  for (const value of ['compact', 'comfortable', 'default'] as const) {
    setDensity(value)
    flush()
    expect(outer.getAttribute('data-ui-density')).toBe(value)
    expect(h.getByRole('textbox')).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(
      h.container.querySelector('#explicit')!.getAttribute('data-ui-density'),
    ).toBe('comfortable')
    expect(
      h.container.querySelector('#inner')!.getAttribute('data-ui-density'),
    ).toBe('default')
  }
})

const rootDensity: RootDensity = 'default'
const subpathDensity: ThemeDensity = rootDensity
const supported: ThemeProps = { density: subpathDensity, children: null }
// @ts-expect-error Theme density is a finite UI profile contract.
const invalid: ThemeProps = { density: 'large', children: null }
void [supported, invalid]
