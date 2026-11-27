import { afterEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@solidjs/testing-library'
import { createSignal, flush, onCleanup, Show } from 'solid-js'
import { AlertDialog, Dialog, Sheet, Theme } from '@wfe/components'

afterEach(cleanup)

async function openAlert() {
  const changes = vi.fn()
  const cancel = vi.fn()
  const action = vi.fn()
  const pointerOutside = vi.fn()
  const view = render(() => (
    <AlertDialog onOpenChange={changes}>
      <AlertDialog.Trigger>Review changes</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay data-testid="alert-overlay" />
        <AlertDialog.Content onPointerDownOutside={pointerOutside}>
          <AlertDialog.Title>Apply changes?</AlertDialog.Title>
          <AlertDialog.Description>
            Review the current changes.
          </AlertDialog.Description>
          <AlertDialog.Cancel onClick={cancel}>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action onClick={action}>Apply</AlertDialog.Action>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  ))
  const trigger = view.getByRole('button', { name: 'Review changes' })
  trigger.focus()
  fireEvent.click(trigger)
  flush()
  const content = await screen.findByRole('alertdialog')
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Cancel' }),
    ),
  )
  return { action, cancel, changes, content, pointerOutside, trigger }
}

test('AlertDialog stays open on pointer down, click, and focus outside', async () => {
  const { changes, content, pointerOutside, trigger } = await openAlert()
  const overlay = screen.getByTestId('alert-overlay')
  fireEvent.pointerDown(overlay, { pointerType: 'mouse', button: 0 })
  flush()
  expect(pointerOutside).toHaveBeenCalledOnce()
  expect(screen.getByRole('alertdialog')).toBe(content)
  fireEvent.click(overlay)
  trigger.focus()
  fireEvent.click(trigger)
  flush()
  expect(screen.getByRole('alertdialog')).toBe(content)
  expect(changes.mock.calls).toEqual([[true]])
})

test('AlertDialog Escape activates the Cancel button and restores trigger focus', async () => {
  const { cancel, action, changes, trigger } = await openAlert()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), {
    key: 'Escape',
    code: 'Escape',
  })
  flush()
  await waitFor(() => {
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
  expect(cancel).toHaveBeenCalledOnce()
  expect(action).not.toHaveBeenCalled()
  expect(changes.mock.calls).toEqual([[true], [false]])
})

for (const name of ['Cancel', 'Apply'] as const) {
  test(`AlertDialog closes when the user clicks ${name}`, async () => {
    const { cancel, action, changes } = await openAlert()
    fireEvent.click(screen.getByRole('button', { name }))
    flush()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(changes.mock.calls).toEqual([[true], [false]])
    expect(name === 'Apply' ? action : cancel).toHaveBeenCalledOnce()
  })
}

test('AlertDialog Action can keep the dialog open while the application saves', async () => {
  const submit = vi.fn((event: MouseEvent) => event.preventDefault())
  render(() => (
    <AlertDialog defaultOpen>
      <AlertDialog.Content>
        <AlertDialog.Title>Save record?</AlertDialog.Title>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action onClick={submit}>Save</AlertDialog.Action>
      </AlertDialog.Content>
    </AlertDialog>
  ))
  flush()
  fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
  flush()
  expect(submit).toHaveBeenCalledOnce()
  expect(screen.getByRole('alertdialog')).toBeDefined()
})

test('Sheet can opt into a wide side panel and return to the default', async () => {
  const [size, setSize] = createSignal<'default' | 'wide' | undefined>()
  const h = render(() => (
    <Sheet>
      <Sheet.Trigger>Open sheet</Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.Content side="left" size={size()}>
          <Sheet.Title>Contact details</Sheet.Title>
          <Sheet.CloseButton>Close</Sheet.CloseButton>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  ))
  fireEvent.click(h.getByRole('button', { name: 'Open sheet' }))
  const sheet = await screen.findByRole('dialog', { name: 'Contact details' })
  expect(sheet.getAttribute('data-side')).toBe('left')
  expect(sheet.hasAttribute('data-size')).toBe(false)
  setSize('wide')
  flush()
  expect(sheet.getAttribute('data-size')).toBe('wide')
  expect(sheet.hasAttribute('size')).toBe(false)
  setSize('default')
  flush()
  expect(sheet.hasAttribute('data-size')).toBe(false)
})

for (const [name, Family] of [
  ['Dialog', Dialog],
  ['Sheet', Sheet],
] as const) {
  test(`${name} honors explicit focus targets and caller autofocus cancellation`, async () => {
    let target: HTMLInputElement | undefined
    let restore: HTMLHeadingElement | undefined
    let cancel: HTMLButtonElement | undefined
    let prevent = false
    const h = render(() => (
      <>
        <h2 ref={restore} tabindex={-1}>
          Record summary
        </h2>
        <Family>
          <Family.Trigger>Open editor</Family.Trigger>
          <Family.Portal>
            <Family.Content
              initialFocus={() => target}
              restoreFocus={() => restore}
              onOpenAutoFocus={(event) => {
                if (prevent) {
                  event.preventDefault()
                  cancel?.focus()
                }
              }}
            >
              <Family.Title>Record editor</Family.Title>
              <Family.CloseButton ref={cancel} aria-label="Close editor">
                Close editor
              </Family.CloseButton>
              <input ref={target} aria-label="Name" />
            </Family.Content>
          </Family.Portal>
        </Family>
      </>
    ))
    const opener = h.getByRole('button', { name: 'Open editor' })
    opener.focus()
    fireEvent.click(opener)
    flush()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Name' }),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))
    flush()
    await waitFor(() => expect(document.activeElement).toBe(restore))
    prevent = true
    opener.focus()
    fireEvent.click(opener)
    flush()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Close editor' }),
      ),
    )
  })

  test(`${name} focuses the replacement view on key changes while open`, async () => {
    using warnings = vi.spyOn(console, 'warn')
    const [editing, setEditing] = createSignal(false)
    let edit: HTMLButtonElement | undefined
    let field: HTMLInputElement | undefined
    let outside: HTMLInputElement | undefined
    const [target, setTarget] = createSignal<'inside' | 'outside'>('inside')
    const h = render(() => (
      <>
        <input ref={outside} aria-label="Outside" />
        <Family>
          <Family.Trigger>Open record</Family.Trigger>
          <Family.Portal>
            <Family.Content
              focusKey={[editing(), target()]}
              initialFocus={() =>
                target() === 'outside' ? outside : editing() ? field : edit
              }
            >
              <Family.Title>Record</Family.Title>
              <Show
                when={editing()}
                fallback={
                  <button ref={edit} onClick={() => setEditing(true)}>
                    Edit name
                  </button>
                }
              >
                <input ref={field} aria-label="New name" />
                <button onClick={() => setEditing(false)}>Review name</button>
              </Show>
              <Family.CloseButton aria-label="Done">Done</Family.CloseButton>
            </Family.Content>
          </Family.Portal>
        </Family>
      </>
    ))
    const trigger = h.getByRole('button', { name: 'Open record' })
    trigger.focus()
    fireEvent.click(trigger)
    flush()
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).toBe(edit))
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }))
    flush()
    expect(document.activeElement).toBe(field)
    setTarget('outside')
    flush()
    expect(document.activeElement).toBe(field)
    setTarget('inside')
    fireEvent.click(screen.getByRole('button', { name: 'Review name' }))
    flush()
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(document.activeElement).toBe(edit)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    flush()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    setEditing(true)
    flush()
    expect(document.activeElement).toBe(trigger)
    expect(warnings).not.toHaveBeenCalled()
  })
}

for (const [name, Family] of [
  ['Dialog', Dialog],
  ['AlertDialog', AlertDialog],
  ['Sheet', Sheet],
] as const) {
  for (const explicit of [false, true]) {
    test(`${name} keeps nested scope ownership and honors explicit portal mount=${explicit}`, async () => {
      const [present, setPresent] = createSignal(true)
      const disposed = vi.fn()
      const requests = vi.fn()
      let target!: HTMLDivElement
      function Contents() {
        onCleanup(disposed)
        return (
          <Family.Content>
            <Family.Title>Review details</Family.Title>
            <Family.Description>Review the current record.</Family.Description>
            <Family.CloseButton aria-label="Close review">
              Close review
            </Family.CloseButton>
          </Family.Content>
        )
      }
      const h = render(() => (
        <div data-ui="" data-testid="outer">
          <div ref={target} data-testid="explicit" />
          <div data-ui="" data-testid="inner">
            <Show when={present()}>
              <Family onOpenChange={requests}>
                <Family.Trigger>Open review</Family.Trigger>
                <Family.Portal mount={explicit ? target : undefined}>
                  <Contents />
                </Family.Portal>
              </Family>
            </Show>
          </div>
        </div>
      ))
      flush()
      const trigger = h.getByRole('button', { name: 'Open review' })
      trigger.focus()
      fireEvent.click(trigger)
      flush()
      const close = h.getByRole('button', { name: 'Close review' })
      const owner = h.getByTestId(explicit ? 'explicit' : 'inner')
      expect(owner.contains(close)).toBe(true)
      expect(requests).toHaveBeenLastCalledWith(true)
      fireEvent.click(close)
      flush()
      await waitFor(() => expect(document.activeElement).toBe(trigger))
      expect(requests).toHaveBeenLastCalledWith(false)
      fireEvent.click(trigger)
      flush()
      expect(
        owner.contains(h.getByRole('button', { name: 'Close review' })),
      ).toBe(true)
      const before = disposed.mock.calls.length
      setPresent(false)
      flush()
      expect(h.queryByRole('button', { name: 'Close review' })).toBeNull()
      expect(disposed.mock.calls.length).toBe(before + 1)
    })
  }
}

for (const [name, Family] of [
  ['Dialog', Dialog],
  ['AlertDialog', AlertDialog],
  ['Sheet', Sheet],
] as const) {
  test(`${name} mounts an unscoped dialog outside its trigger`, async () => {
    const h = render(() => (
      <Family>
        <Family.Trigger>Open unscoped review</Family.Trigger>
        <Family.Portal>
          <Family.Content>
            <Family.Title>Unscoped review</Family.Title>
            <Family.Description>Review the current record.</Family.Description>
            <Family.CloseButton aria-label="Close unscoped review" />
          </Family.Content>
        </Family.Portal>
      </Family>
    ))
    flush()
    const trigger = h.getByRole('button', { name: 'Open unscoped review' })
    trigger.focus()
    fireEvent.click(trigger)
    flush()
    const close = screen.getByRole('button', { name: 'Close unscoped review' })
    expect(trigger.contains(close)).toBe(false)
    expect(document.body.contains(close)).toBe(true)
    fireEvent.click(close)
    flush()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Close unscoped review' }),
      ).toBeNull()
      expect(document.activeElement).toBe(trigger)
    })
  })
}

for (const [name, Family] of [
  ['Dialog', Dialog],
  ['AlertDialog', AlertDialog],
  ['Sheet', Sheet],
] as const) {
  test(`${name} keeps a triggerless controlled portal in its nearest Theme`, async () => {
    const [open, setOpen] = createSignal(false)
    const [present, setPresent] = createSignal(true)
    const h = render(() => (
      <Theme id="outer-theme">
        <button onClick={() => setOpen(true)}>Open controlled review</button>
        <Theme id="inner-theme">
          <Show when={present()}>
            <Family open={open()} onOpenChange={setOpen}>
              <Family.Portal>
                <Family.Content>
                  <Family.Title>Controlled review</Family.Title>
                  <Family.Description>
                    Review the current record.
                  </Family.Description>
                  <Family.CloseButton aria-label="Close controlled review">
                    Close controlled review
                  </Family.CloseButton>
                </Family.Content>
              </Family.Portal>
            </Family>
          </Show>
        </Theme>
      </Theme>
    ))
    flush()
    const opener = h.getByRole('button', { name: 'Open controlled review' })
    opener.focus()
    fireEvent.click(opener)
    flush()
    const close = screen.getByRole('button', {
      name: 'Close controlled review',
    })
    expect(close.closest('[data-ui-theme-owner]')?.id).toBe('inner-theme')
    fireEvent.click(close)
    flush()
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Close controlled review' }),
      ).toBeNull(),
    )
    fireEvent.click(opener)
    flush()
    expect(
      screen
        .getByRole('button', { name: 'Close controlled review' })
        .closest('[data-ui-theme-owner]')?.id,
    ).toBe('inner-theme')
    setPresent(false)
    flush()
    expect(document.querySelector('.ui-dialog-portal')).toBeNull()
  })
}

test('an initially open triggerless dialog adopts its Theme without replacing content', () => {
  const [mode, setMode] = createSignal<'light' | 'dark'>('light')
  const h = render(() => (
    <Theme id="initial-theme" mode={mode()}>
      <Dialog open>
        <Dialog.Portal>
          <Dialog.Content>
            <Dialog.Title>Initial review</Dialog.Title>
            <Dialog.Description>Review the current record.</Dialog.Description>
            <input aria-label="Draft" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Theme>
  ))
  flush()
  const draft = h.getByRole('textbox', { name: 'Draft' })
  expect(draft.closest('[data-ui-theme-owner]')?.id).toBe('initial-theme')
  fireEvent.input(draft, { target: { value: 'Keep this draft' } })
  setMode('dark')
  flush()
  expect(h.getByRole('textbox', { name: 'Draft' })).toBe(draft)
  expect((draft as HTMLInputElement).value).toBe('Keep this draft')
})
