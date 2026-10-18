import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { Resizable, ResizeHandle } from '@wfe/components/resizable'
import { TableWorkspace } from '@wfe/components/table'
beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('local resizing preserves pane identity and drafts through orientation changes', () => {
  const [orientation, setOrientation] = createSignal<'horizontal' | 'vertical'>(
    'horizontal',
  )
  const change = vi.fn()
  const h = render(() => (
    <Resizable
      primaryLabel="Filters"
      primary={<input />}
      orientation={orientation()}
      defaultSize={30}
      onSizeChange={change}
    >
      <p>Results</p>
    </Resizable>
  ))
  const handle = h.getByRole('separator')
  const input = h.container.querySelector('input')!
  input.value = 'Retained'
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('31')
  expect(change.mock.calls).toEqual([[31]])
  setOrientation('vertical')
  flush()
  fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('41')
  fireEvent.keyDown(handle, { key: 'Home' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('10')
  fireEvent.keyDown(handle, { key: 'End' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('90')
  expect(h.container.querySelector('input')).toBe(input)
  expect(input.value).toBe('Retained')
})

test('controlled sizing can reject requests without moving panes or echoing prop changes', () => {
  const [size, setSize] = createSignal(40)
  const change = vi.fn()
  const h = render(() => (
    <Resizable
      size={size()}
      onSizeChange={change}
      primaryLabel="Navigation"
      primary="Navigation"
    >
      Content
    </Resizable>
  ))
  const handle = h.getByRole('separator')
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('40')
  expect(change.mock.calls).toEqual([[41]])
  setSize(60)
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('60')
  expect(change).toHaveBeenCalledTimes(1)
  expect(handle.getAttribute('aria-controls')).toBe(
    h.getByRole('region', { name: 'Navigation' }).id,
  )
})

test('caller cancellation, reversed direction, disabled state and detached events retain ownership', () => {
  const change = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  const h = render(() => (
    <ResizeHandle
      aria-label="Controls"
      aria-controls="controls"
      value={30}
      reverse
      disabled={disabled()}
      getAvailableSize={() => 1000}
      onValueChange={change}
      onKeyDown={(event) => {
        if (event.key === 'Home') event.preventDefault()
      }}
    />
  ))
  const handle = h.getByRole('separator')
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  flush()
  expect(change.mock.calls).toEqual([[29]])
  fireEvent.keyDown(handle, { key: 'Home' })
  flush()
  fireEvent.keyDown(handle, { key: 'ArrowRight', ctrlKey: true })
  flush()
  expect(change).toHaveBeenCalledTimes(1)
  setDisabled(true)
  flush()
  expect(handle.getAttribute('tabindex')).toBe('-1')
  fireEvent.keyDown(handle, { key: 'End' })
  flush()
  h.unmount()
  fireEvent.keyDown(handle, { key: 'End' })
  expect(change).toHaveBeenCalledTimes(1)
})

test('table sizing requests are controlled and initial construction does not request a size', () => {
  const change = vi.fn()
  const [size, setSize] = createSignal(25)
  const h = render(() => (
    <TableWorkspace
      controls="Filters"
      controlsSize={size()}
      onControlsSizeChange={change}
    >
      <input />
    </TableWorkspace>
  ))
  const handle = h.getByRole('separator')
  expect(change).not.toHaveBeenCalled()
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  flush()
  expect(change.mock.calls).toEqual([[26]])
  expect(handle.getAttribute('aria-valuenow')).toBe('25')
  setSize(35)
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('35')
})
for (const invalid of [NaN, Infinity, -1, 101]) {
  test('reject nonfinite or invalid percentage ' + String(invalid), () => {
    const h = render(() => (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <Resizable
          primaryLabel="Navigation"
          primary="Navigation"
          size={invalid}
        >
          Content
        </Resizable>
      </Errored>
    ))
    expect(h.getByRole('alert').textContent).toContain('finite percentage')
  })
}
test('reactive bounds and control modes report errors without silently resizing', () => {
  const [size, setSize] = createSignal<number | undefined>(30)
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <Resizable primaryLabel="Navigation" primary="Navigation" size={size()}>
        Content
      </Resizable>
    </Errored>
  ))
  setSize(undefined)
  flush()
  expect(h.getByRole('alert').textContent).toContain('control mode')
})

test('fractional bounds stay valid after rounding at the endpoint', () => {
  const h = render(() => (
    <Resizable
      primaryLabel="Navigation"
      primary="Navigation"
      defaultSize={30}
      maxSize={33.33336}
    >
      Content
    </Resizable>
  ))
  const handle = h.getByRole('separator')
  fireEvent.keyDown(handle, { key: 'End' })
  flush()
  expect(Number(handle.getAttribute('aria-valuenow'))).toBe(33.33336)
})
