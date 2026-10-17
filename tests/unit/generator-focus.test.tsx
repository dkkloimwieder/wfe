import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import {
  action,
  createRoot,
  createSignal,
  createRenderEffect,
  flush,
} from 'solid-js'
import { preserveReorderFocus } from '../../packages/generator/src/reorderFocus'
import { FocusApp } from '../../examples/generator/FocusApp'
import type { createFocusApplication } from '../../examples/generator/FocusApp'
beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function mount() {
  let app!: ReturnType<typeof createFocusApplication>
  const mounted = render(() => (
    <FocusApp
      ready={(value) => {
        app = value
      }}
    />
  ))
  flush()
  return { ...mounted, app }
}
test('actual moves retain native and custom control identity, focus and selection', () => {
  const h = mount()
  for (const label of ['Title', 'Notes', 'Extra']) {
    const input = h.getByLabelText(label) as HTMLInputElement
    for (const move of [h.app.moveFields, h.app.movePanels])
      for (const reverse of [true, false]) {
        input.focus()
        input.setSelectionRange(2, 6, 'backward')
        move(reverse)
        flush()
        expect(h.getByLabelText(label)).toBe(input)
        expect(document.activeElement).toBe(input)
        expect([
          input.selectionStart,
          input.selectionEnd,
          input.selectionDirection,
        ]).toEqual([2, 6, 'backward'])
      }
  }
})
test('a later explicit focus target wins and removed controls stay removed', () => {
  const h = mount()
  const input = h.getByLabelText('Notes') as HTMLTextAreaElement
  input.focus()
  h.app.movePanels(true)
  h.getByRole('button', { name: 'Elsewhere' }).focus()
  flush()
  expect(document.activeElement).toBe(
    h.getByRole('button', { name: 'Elsewhere' }),
  )
  input.focus()
  h.app.movePanels(false)
  h.app.remove()
  flush()
  expect(input.isConnected).toBe(false)
  expect(document.activeElement).not.toBe(input)
})
test('disposing reordered views removes their document focus listeners', () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const h = mount()
  const listeners = add.mock.calls
    .filter(([type]) => type === 'focusin')
    .map(([, listener]) => listener)
  expect(listeners.length).toBeGreaterThanOrEqual(2)
  h.getByLabelText('Notes').focus()
  h.app.movePanels(true)
  cleanup()
  flush()
  for (const listener of listeners)
    expect(
      remove.mock.calls.some(
        ([type, removed]) => type === 'focusin' && removed === listener,
      ),
    ).toBe(true)
})

for (const attribute of ['hidden', 'inert', 'aria-hidden', 'id'])
  test(`focus eligibility excludes ${attribute} changes during rendering`, () => {
    const root = document.createElement('div')
    root.id = 'focus-eligibility'
    const input = document.createElement('input')
    root.append(input)
    document.body.append(root)
    const owned = createRoot((dispose) => {
      const [order, setOrder] = createSignal(['first', 'second'])
      preserveReorderFocus(root.id, order)
      createRenderEffect(order, (_next, previous) => {
        if (!previous) return
        input.blur()
        root.setAttribute(
          attribute,
          attribute === 'id' ? 'another-owner' : 'true',
        )
      })
      return { dispose, setOrder }
    })
    // eslint-disable-next-line require-yield -- Dispose through the synchronous action boundary.
    const stop = action(function* () {
      owned.dispose()
    })
    try {
      flush()
      input.focus()
      owned.setOrder(['second', 'first'])
      flush()
      expect(input.isConnected).toBe(true)
      expect(document.activeElement).not.toBe(input)
    } finally {
      stop()
      flush()
      root.remove()
    }
  })
