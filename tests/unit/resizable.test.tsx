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
      controlsResizable
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

test('divider collapse retains local size, pane nodes and drafts, and Enter restores them', () => {
  const sizeChange = vi.fn()
  const collapseChange = vi.fn()
  const h = render(() => (
    <Resizable
      primaryLabel="Filters"
      primary={<input />}
      defaultSize={42}
      onSizeChange={sizeChange}
      onCollapsedChange={collapseChange}
    >
      Results
    </Resizable>
  ))
  const handle = h.getByRole('separator')
  const input = h.container.querySelector('input')!
  input.value = 'Retained draft'
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  flush()
  input.focus()
  fireEvent.doubleClick(handle)
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('0')
  expect(input.closest('[hidden]')).not.toBeNull()
  expect(document.activeElement).toBe(handle)
  for (const key of ['Home', 'End', 'ArrowLeft'])
    fireEvent.keyDown(handle, { key })
  flush()
  expect(sizeChange.mock.calls).toEqual([[43]])
  fireEvent.keyDown(handle, { key: 'Enter' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('43')
  expect(h.container.querySelector('input')).toBe(input)
  expect(input.value).toBe('Retained draft')
  expect(input.closest('[hidden]')).toBeNull()
  expect(collapseChange.mock.calls).toEqual([[true], [false]])
})

test('controlled collapse requests preserve application-owned size and accept independent updates', () => {
  const [closed, setClosed] = createSignal(false)
  const [size, setSize] = createSignal(37)
  const collapseChange = vi.fn()
  const sizeChange = vi.fn()
  const h = render(() => (
    <Resizable
      primaryLabel="Filters"
      primary="Filters"
      collapsed={closed()}
      onCollapsedChange={collapseChange}
      size={size()}
      onSizeChange={sizeChange}
    >
      Results
    </Resizable>
  ))
  const handle = h.getByRole('separator')
  fireEvent.doubleClick(handle)
  flush()
  expect(collapseChange.mock.calls).toEqual([[true]])
  expect(handle.getAttribute('aria-valuenow')).toBe('37')
  setClosed(true)
  setSize(51)
  flush()
  fireEvent.keyDown(handle, { key: 'Enter' })
  flush()
  expect(collapseChange.mock.calls).toEqual([[true], [false]])
  expect(handle.getAttribute('aria-valuenow')).toBe('0')
  setClosed(false)
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('51')
  expect(sizeChange).not.toHaveBeenCalled()
})

test('disabled and caller-cancelled divider toggles do not change collapse state', () => {
  const toggle = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  const h = render(() => (
    <ResizeHandle
      aria-label="Filters"
      aria-controls="filters"
      value={0}
      collapsed
      onToggle={toggle}
      onValueChange={() => {}}
      getAvailableSize={() => 100}
      disabled={disabled()}
      onDblClick={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault()
      }}
    />
  ))
  const handle = h.getByRole('separator')
  fireEvent.doubleClick(handle)
  fireEvent.keyDown(handle, { key: 'Enter' })
  setDisabled(true)
  flush()
  fireEvent.doubleClick(handle)
  fireEvent.keyDown(handle, { key: 'Enter' })
  expect(toggle).not.toHaveBeenCalled()
  h.unmount()
  fireEvent.doubleClick(handle)
  expect(toggle).not.toHaveBeenCalled()
})

test('table collapse and size requests remain independent and reopening retains the current size', () => {
  const [closed, setClosed] = createSignal(false)
  const collapseChange = vi.fn()
  const sizeChange = vi.fn()
  const h = render(() => (
    <TableWorkspace
      controlsResizable
      controls="Filters"
      controlsCollapsed={closed()}
      onControlsCollapsedChange={collapseChange}
      controlsSize={34}
      onControlsSizeChange={sizeChange}
    >
      Results
    </TableWorkspace>
  ))
  const handle = h.getByRole('separator')
  fireEvent.doubleClick(handle)
  flush()
  expect(collapseChange.mock.calls).toEqual([[true]])
  expect(handle.getAttribute('aria-valuenow')).toBe('34')
  setClosed(true)
  flush()
  fireEvent.keyDown(handle, { key: 'End' })
  fireEvent.keyDown(handle, { key: 'Enter' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('0')
  setClosed(false)
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('34')
  expect(sizeChange).not.toHaveBeenCalled()
  expect(collapseChange.mock.calls).toEqual([[true], [false]])
})

test('an initially closed pane mounts retained content and opens at its default size', () => {
  const h = render(() => (
    <Resizable
      primaryLabel="Filters"
      primary={<input />}
      defaultCollapsed
      defaultSize={46}
    >
      Results
    </Resizable>
  ))
  const handle = h.getByRole('separator')
  expect(handle.getAttribute('aria-valuenow')).toBe('0')
  expect(h.container.querySelector('input')?.closest('[hidden]')).not.toBeNull()
  fireEvent.keyDown(handle, { key: 'Enter', repeat: true })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('0')
  fireEvent.keyDown(handle, { key: 'Enter' })
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('46')
})

test('external collapse moves focus from a second linked popup to the retained divider', () => {
  const [closed, setClosed] = createSignal(false)
  const popup = document.createElement('button')
  popup.id = 'second-popup'
  document.body.append(popup)
  try {
    const h = render(() => (
      <Resizable
        primaryLabel="Filters"
        primary={
          <button aria-expanded="true" aria-controls="first-popup second-popup">
            Open choices
          </button>
        }
        collapsed={closed()}
      >
        Results
      </Resizable>
    ))
    popup.focus()
    expect(document.activeElement).toBe(popup)
    setClosed(true)
    flush()
    expect(document.activeElement).toBe(h.getByRole('separator'))
  } finally {
    popup.remove()
  }
})

test.each([undefined, false])(
  'fixed table controls keep the divider inert and retain drafts (%s)',
  (resizable) => {
    const change = vi.fn(),
      collapse = vi.fn()
    const h = render(() => (
      <TableWorkspace
        controlsResizable={resizable}
        controls={<input aria-label="Retained draft" />}
        onControlsSizeChange={change}
        onControlsCollapsedChange={collapse}
      >
        Results
      </TableWorkspace>
    ))
    const input = h.getByRole('textbox') as HTMLInputElement
    fireEvent.input(input, { target: { value: 'Keep this draft' } })
    const handle = h.getByRole('separator')
    expect(handle.getAttribute('aria-disabled')).toBe('true')
    expect(handle.getAttribute('tabindex')).toBe('-1')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    fireEvent.doubleClick(handle)
    flush()
    expect(change).not.toHaveBeenCalled()
    expect(collapse).not.toHaveBeenCalled()
    const toggle = h.getByRole('button', { name: 'Table controls' })
    fireEvent.click(toggle)
    flush()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    flush()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(h.getByRole('textbox')).toBe(input)
    expect(input.value).toBe('Keep this draft')
    expect(collapse.mock.calls).toEqual([[true], [false]])
    expect(change).not.toHaveBeenCalled()
  },
)
