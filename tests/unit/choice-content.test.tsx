import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { Combobox, Select, type SelectContentProps } from '@wfe/components'
import { choiceContentHandlers } from '../../packages/components/src/components/choiceContent'
import { createChoiceScope } from '../../packages/components/src/components/choiceScope'
import { Popper } from '../../packages/components/src/vendor/kobalte/core/src/popper'
import type { JSX } from '@solidjs/web'

type FocusOutsideEvent = Parameters<
  NonNullable<SelectContentProps['onFocusOutside']>
>[0]
type PointerDownOutsideEvent = Parameters<
  NonNullable<SelectContentProps['onPointerDownOutside']>
>[0]

afterEach(cleanup)

test('popup positions on open and applies observer updates once on the next frame', async () => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
  })
  let deliver: (() => void) | undefined
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        deliver = () => callback([], this)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  const anchor = document.createElement('button')
  document.body.append(anchor)
  using bounds = vi.spyOn(anchor, 'getBoundingClientRect')
  try {
    const h = render(() => (
      <Popper
        anchorRef={() => anchor}
        contentRef={() => undefined}
        observeAnchorLayout={false}
      >
        <Popper.Positioner>Options</Popper.Positioner>
      </Popper>
    ))
    expect(bounds).toHaveBeenCalled()
    const popup = h.getByText('Options')
    await waitFor(() => expect(popup.style.transform).not.toBe(''))
    bounds.mockClear()
    deliver!()
    deliver!()
    expect(bounds).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)

    vi.advanceTimersToNextFrame()
    expect(bounds).toHaveBeenCalled()

    deliver!()
    h.unmount()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    cleanup()
    anchor.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})

test('choice autofocus waits for a rendered frame and cancels on controlled reopen', () => {
  vi.useFakeTimers()
  try {
    const [open, setOpen] = createSignal(false)
    let scope!: ReturnType<typeof createChoiceScope>
    const h = render(() => {
      scope = createChoiceScope({
        get open() {
          return open()
        },
      })
      return <button ref={scope.setControl}>Choose</button>
    })
    flush()
    const trigger = h.getByRole('button', { name: 'Choose' })
    const close = () => {
      const event = new Event('close', { cancelable: true })
      scope.closeAutoFocus(event)
      expect(event.defaultPrevented).toBe(true)
    }

    close()
    expect(document.activeElement).toBe(document.body)
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(document.body)
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(trigger)

    trigger.blur()
    close()
    vi.advanceTimersToNextFrame()
    setOpen(true)
    flush()
    setOpen(false)
    flush()
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(document.body)
  } finally {
    vi.useRealTimers()
  }
})

test('choice content preserves caller-first cancellation and reads replacement callbacks', () => {
  const order: string[] = []
  const scope = {
    outside: () => order.push('outside'),
    tab: (event: KeyboardEvent) => order.push(`tab:${event.defaultPrevented}`),
    closeAutoFocus: (event: Event) =>
      order.push(`close:${event.defaultPrevented}`),
  }
  const props = {
    onPointerDownOutside: (event: PointerDownOutsideEvent) => {
      order.push('pointer')
      event.preventDefault()
    },
    onFocusOutside: (_event: FocusOutsideEvent) => {
      order.push('focus')
    },
    onCloseAutoFocus: (event: Event) => {
      order.push('caller-close')
      event.preventDefault()
    },
  }
  const handlers = choiceContentHandlers<HTMLElement>(props, scope)
  handlers.onPointerDownOutside(
    new CustomEvent('pointer-outside', {
      cancelable: true,
    }),
  )
  expect(order).toEqual(['pointer'])
  props.onPointerDownOutside = () => {
    order.push('replacement')
  }
  handlers.onPointerDownOutside(
    new CustomEvent('pointer-outside', {
      cancelable: true,
    }),
  )
  handlers.onFocusOutside(
    new CustomEvent('focus-outside', { cancelable: true }),
  )
  handlers.onCloseAutoFocus(new Event('close', { cancelable: true }))
  expect(order).toEqual([
    'pointer',
    'replacement',
    'outside',
    'focus',
    'outside',
    'caller-close',
    'close:true',
  ])
})

for (const family of ['select', 'combobox'] as const) {
  test(`${family} content retains polymorphic refs, live slots and latest native key callbacks`, () => {
    const [status, setStatus] = createSignal('Loading options')
    const [footer, setFooter] = createSignal(true)
    const first = vi.fn()
    const tuple = vi.fn((_payload: string, event: KeyboardEvent) =>
      event.preventDefault(),
    )
    const [keydown, setKeydown] = createSignal<
      JSX.EventHandlerUnion<HTMLElement, KeyboardEvent>
    >(() => first)
    let mounts = 0
    let cleanups = 0
    let content: HTMLElement | undefined
    function Footer() {
      mounts++
      onCleanup(() => {
        cleanups++
      })
      return <input aria-label="Footer draft" />
    }
    const h = render(() => {
      if (family === 'select')
        return (
          <Select<string> options={['Alpha']} defaultValue="Alpha" open>
            <Select.Trigger aria-label="Choice">Alpha</Select.Trigger>
            <Select.Content
              as="section"
              data-testid="content"
              ref={(node) => (content = node)}
              status={status()}
              footer={footer() ? <Footer /> : undefined}
              onKeyDown={keydown()}
            >
              <Select.Listbox />
            </Select.Content>
          </Select>
        )
      return (
        <Combobox<string> options={['Alpha']} defaultValue="Alpha" open>
          <Combobox.Input aria-label="Choice" />
          <Combobox.Content
            as="section"
            data-testid="content"
            ref={(node) => (content = node)}
            status={status()}
            footer={footer() ? <Footer /> : undefined}
            onKeyDown={keydown()}
          >
            <Combobox.Listbox />
          </Combobox.Content>
        </Combobox>
      )
    })
    flush()
    const initialMounts = mounts
    expect(initialMounts).toBeGreaterThan(0)
    const node = h.getByTestId('content')
    const draft = h.getByRole<HTMLInputElement>('textbox', {
      name: 'Footer draft',
    })
    expect(node).toBe(content)
    expect(node.tagName).toBe('SECTION')
    fireEvent.input(draft, { target: { value: 'Keep this draft' } })
    fireEvent.keyDown(node, { key: 'q' })
    expect(first).toHaveBeenCalledTimes(1)
    setStatus('Options ready')
    setKeydown([tuple, 'current'])
    flush()
    expect(h.getByTestId('content')).toBe(node)
    expect(h.getByRole('status').textContent).toBe('Options ready')
    expect(h.getByRole('textbox', { name: 'Footer draft' })).toBe(draft)
    expect(draft.value).toBe('Keep this draft')
    const event = new KeyboardEvent('keydown', {
      key: 'q',
      cancelable: true,
      bubbles: true,
    })
    node.dispatchEvent(event)
    expect(tuple).toHaveBeenCalledExactlyOnceWith('current', event)
    expect(event.defaultPrevented).toBe(true)
    expect(first).toHaveBeenCalledTimes(1)
    expect(mounts).toBe(initialMounts)
    setFooter(false)
    flush()
    expect(h.queryByRole('textbox', { name: 'Footer draft' })).toBeNull()
    h.unmount()
    expect(cleanups).toBe(mounts)
  })
}
