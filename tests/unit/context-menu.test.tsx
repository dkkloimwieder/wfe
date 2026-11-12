import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { ContextMenu } from '@wfe/components/context-menu'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('zero-duration menu mounting does not measure the document body', async () => {
  const measure = vi.spyOn(document.body, 'offsetHeight', 'get')
  const h = render(() => <Fixture />)
  flush()
  measure.mockClear()
  fireEvent.contextMenu(h.getByRole('group', { name: 'Record' }), {
    clientX: 80,
    clientY: 120,
  })
  await waitFor(() => expect(h.getByRole('menu')).toBeTruthy())
  expect(measure).not.toHaveBeenCalled()
})

test('force-mounted menus retain their content through accepted closing and reopening', () => {
  const [open, setOpen] = createSignal(true)
  const h = render(() => (
    <ContextMenu open={open()} onOpenChange={setOpen} forceMount>
      <ContextMenu.Trigger aria-label="Persistent record">
        Record
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.Item>Inspect</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  ))
  flush()
  const menu = h.container.ownerDocument.querySelector('.ui-menu')!
  const item = menu.querySelector('[role=menuitem]')
  setOpen(false)
  flush()
  expect(h.container.ownerDocument.querySelector('.ui-menu')).toBe(menu)
  expect(menu.hasAttribute('data-closed')).toBe(true)
  setOpen(true)
  flush()
  expect(menu.querySelector('[role=menuitem]')).toBe(item)
  expect(menu.hasAttribute('data-expanded')).toBe(true)
})

function Fixture(props: {
  disabled?: boolean
  prevent?: boolean
  change?: (open: boolean) => void
}) {
  return (
    <ContextMenu onOpenChange={props.change}>
      <ContextMenu.Trigger
        aria-label="Record"
        disabled={props.disabled}
        onContextMenu={(event) => {
          if (props.prevent) event.preventDefault()
        }}
      >
        Record text
        <input aria-label="Native draft" />
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content aria-label="Record actions">
          <ContextMenu.Item>Inspect</ContextMenu.Item>
          <ContextMenu.Item disabled>Delete</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  )
}

test('a nonmodal menu follows a new pointer position while retaining its content', async () => {
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024)
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(768)
  const h = render(() => (
    <ContextMenu modal={false}>
      <ContextMenu.Trigger aria-label="Moving anchor">
        Record
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.Item>Inspect</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  ))
  flush()
  const region = h.getByRole('group', { name: 'Moving anchor' })
  fireEvent.contextMenu(region, { clientX: 80, clientY: 120 })
  const menu = await h.findByRole('menu')
  const positioner = menu.closest<HTMLElement>('[data-popper-positioner]')!
  await waitFor(() => expect(positioner.style.transform).toContain('80px'))
  fireEvent.contextMenu(region, { clientX: 160, clientY: 240 })
  await waitFor(() => expect(positioner.style.transform).toContain('160px'))
  expect(h.getByRole('menu')).toBe(menu)
})

test('right-click and keyboard opening use the existing menu and return focus', async () => {
  const h = render(() => <Fixture />)
  flush()
  const region = h.getByRole('group', { name: 'Record' })
  fireEvent.contextMenu(region, { clientX: 80, clientY: 120 })
  await waitFor(() => expect(h.getByRole('menu')).toBeTruthy())
  await waitFor(() =>
    expect(document.activeElement).toBe(
      h.getByRole('menuitem', { name: 'Inspect' }),
    ),
  )
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(h.queryByRole('menu')).toBeNull())
  expect(document.activeElement).toBe(region)
  fireEvent.keyDown(region, { key: 'F10', shiftKey: true })
  await waitFor(() => expect(h.getByRole('menu')).toBeTruthy())
})

test('controlled opening can be rejected without taking focus or losing drafts', async () => {
  const requests = vi.fn()
  const h = render(() => (
    <ContextMenu open={false} onOpenChange={requests}>
      <ContextMenu.Trigger aria-label="Record">
        Record
        <input aria-label="Draft" />
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.Item>Inspect</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  ))
  flush()
  const draft = h.getByRole('textbox') as HTMLInputElement
  draft.value = 'Unsaved'
  draft.focus()
  fireEvent.contextMenu(h.getByRole('group'), { clientX: 40, clientY: 70 })
  flush()
  expect(requests.mock.calls).toEqual([[true]])
  expect(h.queryByRole('menu')).toBeNull()
  expect(document.activeElement).toBe(draft)
  expect(draft.value).toBe('Unsaved')
})

test.each(['disabled', 'prevented', 'editable'] as const)(
  '%s triggers preserve the native context menu',
  (kind) => {
    const requests = vi.fn()
    const h = render(() => (
      <Fixture
        disabled={kind === 'disabled'}
        prevent={kind === 'prevented'}
        change={requests}
      />
    ))
    flush()
    const target =
      kind === 'editable' ? h.getByRole('textbox') : h.getByRole('group')
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 70,
    })
    target.dispatchEvent(event)
    expect(requests).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(kind === 'prevented')
  },
)

function pointer(
  node: Element,
  type: string,
  values: Record<string, unknown> = {},
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, {
    pointerType: 'touch',
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: 40,
    clientY: 70,
    ...values,
  })
  node.dispatchEvent(event)
}

test('touch holds request opening once and movement cancels pending holds', () => {
  vi.useFakeTimers()
  const requests = vi.fn()
  const h = render(() => (
    <ContextMenu open={false} onOpenChange={requests}>
      <ContextMenu.Trigger>Record</ContextMenu.Trigger>
    </ContextMenu>
  ))
  flush()
  const region = h.getByRole('group')
  pointer(region, 'pointerdown')
  pointer(region, 'pointermove', { clientX: 60 })
  vi.advanceTimersByTime(700)
  expect(requests).not.toHaveBeenCalled()
  pointer(region, 'pointerdown')
  vi.advanceTimersByTime(600)
  expect(requests.mock.calls).toEqual([[true]])
  fireEvent.contextMenu(region, { clientX: 40, clientY: 70 })
  expect(requests).toHaveBeenCalledOnce()
})

test('unmount and reactive disabling cancel holds and release retained trigger handlers', () => {
  vi.useFakeTimers()
  const change = vi.fn()
  const caller = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  const h = render(() => (
    <ContextMenu open={false} onOpenChange={change}>
      <ContextMenu.Trigger disabled={disabled()} onContextMenu={caller}>
        Record
      </ContextMenu.Trigger>
    </ContextMenu>
  ))
  flush()
  const region = h.getByRole('group')
  pointer(region, 'pointerdown')
  setDisabled(true)
  flush()
  vi.advanceTimersByTime(700)
  expect(change).not.toHaveBeenCalled()
  setDisabled(false)
  flush()
  pointer(region, 'pointerdown')
  h.unmount()
  vi.advanceTimersByTime(700)
  fireEvent.contextMenu(region)
  expect(change).not.toHaveBeenCalled()
  expect(caller).not.toHaveBeenCalled()
})
