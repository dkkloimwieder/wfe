import { afterEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@solidjs/testing-library'
import { createSignal, flush, onCleanup, Show } from 'solid-js'
import { AlertDialog, Dialog, Sheet } from '@wfe/components'

afterEach(cleanup)

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
