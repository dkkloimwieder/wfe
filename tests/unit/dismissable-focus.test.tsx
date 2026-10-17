import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { flush } from 'solid-js'
import { DismissableLayer } from '../../packages/components/src/vendor/kobalte/core/src/dismissable-layer/dismissable-layer'

afterEach(() => {
  cleanup()
  flush()
  vi.useRealTimers()
})

function outsideButton() {
  const node = document.createElement('button')
  document.body.append(node)
  return node
}

test('outside focus dismisses immediately while pointer dismissal still waits for opening to finish', () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const outside = outsideButton()
  const mounted = render(() => (
    <DismissableLayer onDismiss={dismiss}>
      <button>Inside</button>
    </DismissableLayer>
  ))
  flush()
  try {
    outside.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
    )
    expect(dismiss).not.toHaveBeenCalled()
    outside.focus()
    expect(dismiss).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(0)
    outside.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
    )
    expect(dismiss).toHaveBeenCalledTimes(2)
  } finally {
    mounted.unmount()
    flush()
    outside.remove()
  }
})

test('immediate focus handling preserves exclusions and caller prevention', () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const outside = outsideButton()
  const excluded = outsideButton()
  const focus = vi.fn((event: Event) => event.preventDefault())
  const mounted = render(() => (
    <DismissableLayer
      excludedElements={[() => excluded]}
      onFocusOutside={focus}
      onDismiss={dismiss}
    >
      <button>Inside</button>
    </DismissableLayer>
  ))
  flush()
  try {
    excluded.focus()
    expect(focus).not.toHaveBeenCalled()
    outside.focus()
    expect(focus).toHaveBeenCalledTimes(1)
    expect(focus.mock.calls[0]?.[0].defaultPrevented).toBe(true)
    expect(dismiss).not.toHaveBeenCalled()
  } finally {
    mounted.unmount()
    flush()
    outside.remove()
    excluded.remove()
  }
})

test('disposal before opening settles removes the immediate focus handler and pending pointer handler', () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const outside = outsideButton()
  const mounted = render(() => (
    <DismissableLayer onDismiss={dismiss}>
      <button>Inside</button>
    </DismissableLayer>
  ))
  flush()
  mounted.unmount()
  flush()
  try {
    vi.advanceTimersByTime(0)
    outside.focus()
    outside.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
    )
    expect(dismiss).not.toHaveBeenCalled()
  } finally {
    outside.remove()
  }
})
