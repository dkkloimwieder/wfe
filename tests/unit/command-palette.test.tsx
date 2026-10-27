import { afterEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@solidjs/testing-library'
import { createSignal, flush, Show } from 'solid-js'
import { CommandPalette, createCommandShortcut, Dialog } from '@wfe/components'

afterEach(cleanup)
const items = [{ id: 'create', label: 'Create record' }]

function press(target: EventTarget = document, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  flush()
  return event
}

test('optional shortcut opens search and selection closes the palette', async () => {
  const warnings = vi.spyOn(console, 'warn')
  const selected = vi.fn()
  const h = render(() => (
    <CommandPalette
      title="Commands"
      label="Search commands"
      items={items}
      trigger="Open commands"
      shortcut
      onSelect={selected}
    />
  ))
  const trigger = h.getByRole('button', { name: 'Open commands' })
  trigger.focus()
  press(trigger)
  const input = await screen.findByRole('combobox', { name: 'Search commands' })
  expect(
    warnings.mock.calls.filter((args) =>
      args.some((value) => String(value).includes('STRICT_READ_UNTRACKED')),
    ),
  ).toEqual([])
  warnings.mockRestore()
  await waitFor(() => expect(document.activeElement).toBe(input))
  fireEvent.keyDown(input, { key: 'Enter' })
  flush()
  expect(selected).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(trigger))
})

test('shortcut is opt-in and does not steal editing or composition keystrokes', async () => {
  const h = render(() => (
    <>
      <input aria-label="Editor" />
      <CommandPalette
        title="Commands"
        label="Search commands"
        items={items}
        trigger="Open commands"
        shortcut
      />
    </>
  ))
  await Promise.resolve()
  flush()
  const editor = h.getByLabelText('Editor')
  expect(press(editor).defaultPrevented).toBe(false)
  expect(press(document, { isComposing: true }).defaultPrevented).toBe(false)
  expect(press(document, { repeat: true }).defaultPrevented).toBe(false)
  expect(screen.queryByRole('dialog')).toBeNull()
  h.unmount()
  const off = render(() => (
    <CommandPalette title="Off" label="Search" items={items} />
  ))
  expect(press().defaultPrevented).toBe(false)
  expect(off.queryByRole('dialog')).toBeNull()
})

test('controlled open requests do not bypass application rejection', async () => {
  const changed = vi.fn()
  const h = render(() => (
    <CommandPalette
      title="Commands"
      label="Search"
      items={items}
      open={false}
      onOpenChange={changed}
      trigger="Open"
    />
  ))
  fireEvent.click(h.getByRole('button', { name: 'Open' }))
  flush()
  expect(changed).toHaveBeenCalledWith(true)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('palette can retain itself after an action and a custom trigger restores focus', async () => {
  const [open, setOpen] = createSignal(false)
  const h = render(() => (
    <>
      <button onClick={() => setOpen(true)}>External opener</button>
      <CommandPalette
        title="Commands"
        label="Search"
        items={items}
        open={open()}
        onOpenChange={setOpen}
        closeOnSelect={false}
      />
    </>
  ))
  const trigger = h.getByRole('button', { name: 'External opener' })
  trigger.focus()
  fireEvent.click(trigger)
  flush()
  const input = await screen.findByRole('combobox')
  await waitFor(() => expect(document.activeElement).toBe(input))
  fireEvent.keyDown(input, { key: 'Enter' })
  flush()
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Close command palette' }))
  flush()
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(trigger))
})

test('shortcut chooses one eligible owner and releases it on disposal', async () => {
  const first = vi.fn(),
    second = vi.fn()
  const [visible, setVisible] = createSignal(true)
  function Owner(props: { run: () => void }) {
    createCommandShortcut({ onTrigger: () => props.run() })
    return null
  }
  const h = render(() => (
    <>
      <Owner run={first} />
      <Show when={visible()}>
        <Owner run={second} />
      </Show>
    </>
  ))
  flush()
  press()
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledTimes(1)
  setVisible(false)
  flush()
  press(document, { ctrlKey: false, metaKey: true })
  expect(first).toHaveBeenCalledTimes(1)
  h.unmount()
  expect(press().defaultPrevented).toBe(false)
  expect(first).toHaveBeenCalledTimes(1)
})

test('shortcut configuration is reactive and honors cancellation and scope', () => {
  const called = vi.fn()
  const [enabled, setEnabled] = createSignal(false)
  const [key, setKey] = createSignal('p')
  function Owner() {
    createCommandShortcut({
      get enabled() {
        return enabled()
      },
      get key() {
        return key()
      },
      onTrigger: called,
      when: (event) => !(event.target as Element)?.closest?.('[data-editor]'),
    })
    return (
      <div data-editor="" tabindex={0}>
        Scoped editor
      </div>
    )
  }
  const h = render(() => <Owner />)
  expect(press(document, { key: 'p' }).defaultPrevented).toBe(false)
  setEnabled(true)
  flush()
  expect(
    press(h.getByText('Scoped editor'), { key: 'p' }).defaultPrevented,
  ).toBe(false)
  const canceled = new KeyboardEvent('keydown', {
    key: 'p',
    ctrlKey: true,
    cancelable: true,
  })
  canceled.preventDefault()
  document.dispatchEvent(canceled)
  expect(called).not.toHaveBeenCalled()
  press(document, { key: 'p' })
  expect(called).toHaveBeenCalledTimes(1)
  setKey('k')
  flush()
  expect(press(document, { key: 'p' }).defaultPrevented).toBe(false)
  press()
  expect(called).toHaveBeenCalledTimes(2)
})

test('nested palette Escape preserves the owning dialog and global shortcut does not steal another dialog', async () => {
  render(() => (
    <>
      <CommandPalette
        title="Global commands"
        label="Global search"
        items={items}
        shortcut
      />
      <Dialog defaultOpen>
        <Dialog.Portal>
          <Dialog.Content>
            <Dialog.Title>Editor dialog</Dialog.Title>
            <CommandPalette
              title="Editor commands"
              label="Editor search"
              items={items}
              trigger="Open editor commands"
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  ))
  const trigger = await screen.findByRole('button', {
    name: 'Open editor commands',
  })
  trigger.focus()
  expect(press(trigger).defaultPrevented).toBe(false)
  expect(screen.queryByRole('dialog', { name: 'Global commands' })).toBeNull()
  fireEvent.click(trigger)
  flush()
  const input = await screen.findByRole('combobox', { name: 'Editor search' })
  await waitFor(() => expect(document.activeElement).toBe(input))
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Editor commands' }),
    ).toBeNull(),
  )
  expect(screen.getByRole('dialog', { name: 'Editor dialog' })).toBeTruthy()
  await waitFor(() => expect(document.activeElement).toBe(trigger))
})

test('an external accepted opening replaces the opener from a rejected request', async () => {
  const [open, setOpen] = createSignal(false)
  render(() => (
    <>
      <button onClick={() => setOpen(true)}>Accepted opener</button>
      <CommandPalette
        title="Commands"
        label="Search"
        items={items}
        open={open()}
        onOpenChange={(next) => {
          if (!next) setOpen(false)
        }}
        trigger="Rejected opener"
      />
    </>
  ))
  const rejected = screen.getByRole('button', { name: 'Rejected opener' })
  rejected.focus()
  fireEvent.click(rejected)
  flush()
  expect(screen.queryByRole('dialog')).toBeNull()
  const accepted = screen.getByRole('button', { name: 'Accepted opener' })
  accepted.focus()
  fireEvent.click(accepted)
  flush()
  const input = await screen.findByRole('combobox')
  await waitFor(() => expect(document.activeElement).toBe(input))
  fireEvent.click(screen.getByRole('button', { name: 'Close command palette' }))
  flush()
  await waitFor(() => expect(document.activeElement).toBe(accepted))
})

test('result updates preserve deliberate focus on the close control', async () => {
  const [current, setCurrent] = createSignal(items)
  render(() => (
    <CommandPalette
      title="Commands"
      label="Search"
      items={current()}
      trigger="Open"
    />
  ))
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  flush()
  const input = await screen.findByRole('combobox')
  await waitFor(() => expect(document.activeElement).toBe(input))
  const close = screen.getByRole('button', { name: 'Close command palette' })
  close.focus()
  setCurrent([{ id: 'next', label: 'Next result' }])
  flush()
  await waitFor(() =>
    expect(screen.getByRole('option', { name: 'Next result' })).toBeTruthy(),
  )
  expect(document.activeElement).toBe(close)
})
