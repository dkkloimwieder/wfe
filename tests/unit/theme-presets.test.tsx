import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Theme } from '../../packages/components/src/theme/Theme'
import type { ThemeOptions } from '../../packages/components/src/theme/Theme'
import { DisclosureIndicator } from '../../packages/components/src/components/DisclosureIndicator'
import * as decorations from '../../packages/components/src/theme/decorations'

type Controller = ReturnType<typeof decorations.decorateActions>
const controllers: Array<{ node: HTMLDivElement; controller: Controller }> = []

beforeEach(() => {
  controllers.length = 0
  vi.spyOn(decorations, 'decorateActions').mockImplementation((node) => {
    const controller = { configure: vi.fn(), dispose: vi.fn() }
    controllers.push({ node, controller })
    return controller
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test.each(['vanilla', 'laser'] as const)(
  '%s does not initialize decoration work when mode or geometry changes',
  (preset) => {
    const [mode, setMode] =
      createSignal<NonNullable<ThemeOptions['mode']>>('light')
    const [rotation, setRotation] = createSignal(1)
    const h = render(() => (
      <Theme
        preset={preset}
        mode={mode()}
        decorationGeometry={{ rotationReduction: rotation() }}
      >
        <button type="button">
          Open <DisclosureIndicator />
        </button>
      </Theme>
    ))
    flush()
    expect(decorations.decorateActions).not.toHaveBeenCalled()
    expect(h.container.querySelector('pattern')).toBeNull()
    expect(h.container.querySelector('.ui-disclosure-decoration')).toBeNull()
    for (const next of ['dark', 'monochrome', 'light'] as const) {
      setMode(next)
      setRotation(2)
      flush()
      expect(decorations.decorateActions).not.toHaveBeenCalled()
    }
    expect(h.getByRole('button', { name: 'Open' })).toBeTruthy()
  },
)

test('preset changes retain the input and focus while starting and disposing decoration work', () => {
  const [preset, setPreset] =
    createSignal<NonNullable<ThemeOptions['preset']>>('vanilla')
  const h = render(() => (
    <Theme preset={preset()}>
      <input aria-label="Draft" defaultValue="Initial" />
      <button type="button">
        Open <DisclosureIndicator />
      </button>
    </Theme>
  ))
  const input = h.getByRole('textbox') as HTMLInputElement
  input.value = 'Unsubmitted draft'
  input.focus()
  flush()
  expect(controllers).toHaveLength(0)

  setPreset('default')
  flush()
  expect(controllers).toHaveLength(1)
  expect(controllers[0]!.controller.configure).toHaveBeenCalled()
  expect(h.container.querySelector('.ui-disclosure-decoration')).not.toBeNull()
  expect(h.getByRole('textbox')).toBe(input)
  expect(input.value).toBe('Unsubmitted draft')
  expect(document.activeElement).toBe(input)

  setPreset('vanilla')
  flush()
  expect(controllers[0]!.controller.dispose).toHaveBeenCalledOnce()
  expect(h.container.querySelector('.ui-disclosure-decoration')).toBeNull()
  expect(h.container.querySelector('pattern')).toBeNull()
  expect(h.getByRole('textbox')).toBe(input)
  expect(input.value).toBe('Unsubmitted draft')
  expect(document.activeElement).toBe(input)

  setPreset('laser')
  flush()
  expect(controllers).toHaveLength(1)
  expect(h.getByRole('textbox')).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(input.value).toBe('Unsubmitted draft')

  setPreset('default')
  flush()
  expect(controllers).toHaveLength(2)
  h.unmount()
  expect(controllers[0]!.controller.dispose).toHaveBeenCalledOnce()
  expect(controllers[1]!.controller.dispose).toHaveBeenCalledOnce()
})

test('nested themes own their disclosure markup and decoration controllers', () => {
  const [outer, setOuter] =
    createSignal<NonNullable<ThemeOptions['preset']>>('default')
  const h = render(() => (
    <Theme id="outer" preset={outer()}>
      <button type="button" aria-label="Outer">
        <DisclosureIndicator />
      </button>
      <Theme id="middle" preset="vanilla">
        <button type="button" aria-label="Middle">
          <DisclosureIndicator />
        </button>
        <Theme id="inner">
          <button type="button" aria-label="Inner">
            <DisclosureIndicator />
          </button>
        </Theme>
      </Theme>
    </Theme>
  ))
  flush()
  const glyph = (name: string) =>
    h.getByRole('button', { name }).querySelector('.ui-disclosure-decoration')
  expect(glyph('Outer')).not.toBeNull()
  expect(glyph('Middle')).toBeNull()
  expect(glyph('Inner')).not.toBeNull()
  expect(controllers.map(({ node }) => node.id).sort()).toEqual([
    'inner',
    'outer',
  ])
  const inner = controllers.find(({ node }) => node.id === 'inner')!
  const outerController = controllers.find(({ node }) => node.id === 'outer')!
  setOuter('vanilla')
  flush()
  expect(glyph('Outer')).toBeNull()
  expect(glyph('Middle')).toBeNull()
  expect(glyph('Inner')).not.toBeNull()
  expect(outerController.controller.dispose).toHaveBeenCalledOnce()
  expect(inner.controller.dispose).not.toHaveBeenCalled()
  expect(
    h.container.querySelector('#inner')!.getAttribute('data-ui-preset'),
  ).toBe('default')
})

test('an omitted preset preserves the default controller lifecycle', () => {
  const h = render(() => (
    <Theme>
      <button type="button">Action</button>
    </Theme>
  ))
  flush()
  expect(controllers).toHaveLength(1)
  expect(controllers[0]!.node.getAttribute('data-ui-preset')).toBe('default')
  h.unmount()
  expect(controllers[0]!.controller.dispose).toHaveBeenCalledOnce()
})
