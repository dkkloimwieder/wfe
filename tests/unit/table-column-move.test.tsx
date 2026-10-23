import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { flush } from 'solid-js'
import { TableColumnMove } from '@wfe/components/table'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function pointer(node: HTMLElement, type: string) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
  })
  Object.defineProperties(event, {
    pointerId: { value: 7 },
    isPrimary: { value: true },
  })
  node.dispatchEvent(event)
  flush()
  return event
}

for (const host of ['no header', 'no scroll container'] as const)
  test(`column movement with ${host} skips dragging and retains keyboard movement`, () => {
    const move = vi.fn()
    const activity = vi.fn()
    const errors: string[] = []
    const error = (event: ErrorEvent) => {
      errors.push(event.message)
      event.preventDefault()
    }
    window.addEventListener('error', error)
    const h = render(() => (
      <div>
        <input aria-label="Previous focus" />
        <div data-column-header={host === 'no header' ? undefined : 'a'}>
          <TableColumnMove
            id="a"
            label="Name"
            ids={['a', 'b']}
            onMove={move}
            onActivity={activity}
          />
        </div>
      </div>
    ))
    flush()
    const handle = h.getByRole('button', { name: 'Move Name column' })
    const menu = h.container.querySelector<HTMLElement>('[popover]')!
    const capture = vi.fn()
    Object.defineProperties(handle, {
      setPointerCapture: { configurable: true, value: capture },
      hasPointerCapture: { configurable: true, value: () => false },
    })
    Object.defineProperty(menu, 'hidePopover', {
      configurable: true,
      value: vi.fn(),
    })
    const previous = h.getByRole('textbox', { name: 'Previous focus' })
    previous.focus()
    const windowListeners = vi.spyOn(window, 'addEventListener')
    const documentListeners = vi.spyOn(document, 'addEventListener')
    try {
      const down = pointer(handle, 'pointerdown')
      pointer(handle, 'pointermove')
      pointer(handle, 'pointerup')
      expect(errors).toEqual([])
      expect(down.defaultPrevented).toBe(false)
      expect(capture).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(previous)
      expect(activity).not.toHaveBeenCalled()
      expect(move).not.toHaveBeenCalled()
      expect(windowListeners.mock.calls.some(([type]) => type === 'blur')).toBe(
        false,
      )
      expect(
        documentListeners.mock.calls.some(([type]) =>
          ['keydown', 'visibilitychange'].includes(type),
        ),
      ).toBe(false)
      handle.focus()
      fireEvent.keyDown(handle, { key: 'ArrowRight' })
      flush()
      expect(move.mock.calls).toEqual([[{ id: 'b', side: 'after' }]])
      h.unmount()
      pointer(handle, 'pointerdown')
      fireEvent.keyDown(handle, { key: 'ArrowRight' })
      expect(move).toHaveBeenCalledTimes(1)
      expect(capture).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('error', error)
    }
  })
