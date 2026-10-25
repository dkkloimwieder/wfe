import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { TableColumnResize } from '@wfe/components/table'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function dispatch(node: HTMLElement, type: string, x = 20, id = 7) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
  })
  Object.defineProperties(event, {
    pointerId: { value: id },
    isPrimary: { value: true },
  })
  node.dispatchEvent(event)
  flush()
}
function mount(scrolled = true) {
  const [disabled, setDisabled] = createSignal(false)
  const [size, setSize] = createSignal(100)
  const change = vi.fn((value: number) => setSize(value))
  const activity = vi.fn()
  const h = render(() => (
    <div class={scrolled ? 'table-scroll' : undefined}>
      <div>
        <div data-column-header="a">
          <TableColumnResize
            label="Name"
            size={size()}
            min={50}
            max={300}
            disabled={disabled()}
            onSizeChange={change}
            onActivity={activity}
          />
        </div>
        <div data-column-header="b" />
      </div>
    </div>
  ))
  flush()
  const handle = h.getByRole('separator', { name: 'Resize Name column' })
  let captured: number | undefined
  const capture = vi.fn((id: number) => {
    captured = id
  })
  const release = vi.fn(() => {
    captured = undefined
  })
  Object.defineProperties(handle, {
    setPointerCapture: { configurable: true, value: capture },
    hasPointerCapture: {
      configurable: true,
      value: (id: number) => captured === id,
    },
    releasePointerCapture: { configurable: true, value: release },
  })
  const menu = h.container.querySelector<HTMLElement>('[popover]')
  if (menu)
    Object.defineProperty(menu, 'hidePopover', {
      configurable: true,
      value: vi.fn(),
    })
  for (const [index, node] of Array.from(
    h.container.querySelectorAll<HTMLElement>('[data-column-header]'),
  ).entries())
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
      left: index * 100,
      right: (index + 1) * 100,
      width: 100,
    } as DOMRect)
  const scroll = h.container.firstElementChild as HTMLElement
  vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 300,
    width: 300,
  } as DOMRect)
  return {
    ...h,
    handle,
    scroll,
    setDisabled,
    setSize,
    size,
    change,
    activity,
    capture,
    release,
  }
}

{
  test.each([
    'pointercancel',
    'lostpointercapture',
    'Escape',
    'blur',
    'hidden',
    'disabled',
    'configuration',
    'dispose',
  ] as const)(
    'resize releases the active pointer and listeners on %s',
    (reason) => {
      const h = mount()
      const winAdd = vi.spyOn(window, 'addEventListener')
      const docAdd = vi.spyOn(document, 'addEventListener')
      const scrollAdd = vi.spyOn(h.scroll, 'addEventListener')
      const winRemove = vi.spyOn(window, 'removeEventListener')
      const docRemove = vi.spyOn(document, 'removeEventListener')
      const scrollRemove = vi.spyOn(h.scroll, 'removeEventListener')
      dispatch(h.handle, 'pointerdown')
      const registrations = [
        ...winAdd.mock.calls.filter(([type]) => type === 'blur'),
        ...docAdd.mock.calls.filter(
          ([type]) => type === 'keydown' || type === 'visibilitychange',
        ),
        ...scrollAdd.mock.calls.filter(([type]) => type === 'scroll'),
      ]
      expect(h.capture).toHaveBeenCalledExactlyOnceWith(7)
      expect(h.activity.mock.calls).toEqual([['start', registrations.length]])
      dispatch(h.handle, 'pointercancel', 20, 8)
      expect(h.release).not.toHaveBeenCalled()
      if (reason === 'Escape') {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            isComposing: true,
            bubbles: true,
          }),
        )
        expect(h.release).not.toHaveBeenCalled()
        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        })
        document.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
      } else if (reason === 'blur') window.dispatchEvent(new Event('blur'))
      else if (reason === 'hidden') {
        vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
        document.dispatchEvent(new Event('visibilitychange'))
      } else if (reason === 'disabled') h.setDisabled(true)
      else if (reason === 'configuration') {
        h.setSize(120)
      } else if (reason === 'dispose') h.unmount()
      else dispatch(h.handle, reason)
      flush()
      expect(h.release).toHaveBeenCalledTimes(1)
      expect(h.activity.mock.calls).toEqual([
        ['start', registrations.length],
        ['cancel', -registrations.length],
      ])
      expect(winRemove.mock.calls.filter(([type]) => type === 'blur')).toEqual(
        winAdd.mock.calls.filter(([type]) => type === 'blur'),
      )
      expect(
        docRemove.mock.calls.filter(
          ([type]) => type === 'keydown' || type === 'visibilitychange',
        ),
      ).toEqual(
        docAdd.mock.calls.filter(
          ([type]) => type === 'keydown' || type === 'visibilitychange',
        ),
      )
      expect(
        scrollRemove.mock.calls.filter(([type]) => type === 'scroll'),
      ).toEqual(scrollAdd.mock.calls.filter(([type]) => type === 'scroll'))
      dispatch(h.handle, 'pointerup', 160)
      window.dispatchEvent(new Event('blur'))
      expect(h.change).not.toHaveBeenCalled()
      expect(h.release).toHaveBeenCalledTimes(1)
    },
  )
}

test('resize retains scroll delta geometry', () => {
  const resize = mount()
  dispatch(resize.handle, 'pointerdown')
  dispatch(resize.handle, 'pointermove', 60)
  expect(resize.size()).toBe(140)
  resize.scroll.scrollLeft = 30
  resize.scroll.dispatchEvent(new Event('scroll'))
  flush()
  expect(resize.size()).toBe(170)
  dispatch(resize.handle, 'pointerup', 60)
  expect(resize.activity.mock.calls.at(-1)).toEqual(['end', -4])
  expect(resize.release).toHaveBeenCalledTimes(1)
})

test('resize without a scroll container reports only the listeners it owns', () => {
  const h = mount(false)
  dispatch(h.handle, 'pointerdown')
  dispatch(h.handle, 'pointerup')
  expect(h.activity.mock.calls).toEqual([
    ['start', 3],
    ['end', -3],
  ])
})

{
  test('resize captures configuration after a focus handler publishes new values', () => {
    const h = mount()
    h.handle.addEventListener(
      'focus',
      () => {
        h.setSize(150)
        flush()
      },
      { once: true },
    )
    dispatch(h.handle, 'pointerdown')
    dispatch(h.handle, 'pointerup', 160)
    expect(h.size()).toBe(290)
    expect(h.activity.mock.calls.at(-1)).toEqual(['end', -4])
    expect(h.release).toHaveBeenCalledTimes(1)
  })
}

{
  test('resize releases capture without double completion from synchronous lost capture', () => {
    const h = mount()
    h.release.mockImplementation(() => {
      dispatch(h.handle, 'lostpointercapture')
    })
    dispatch(h.handle, 'pointerdown')
    dispatch(h.handle, 'pointerup', 160)
    expect(h.release).toHaveBeenCalledTimes(1)
    expect(
      h.activity.mock.calls.filter(
        ([event]) => event === 'end' || event === 'cancel',
      ),
    ).toEqual([['end', -4]])
    expect(h.change).toHaveBeenCalledTimes(1)
  })
}

test('resize follows the retained handle into its new scroller after focus', () => {
  const h = mount()
  const nextScroller = document.createElement('div')
  nextScroller.className = 'table-scroll'
  nextScroller.scrollLeft = 40
  h.container.append(nextScroller)
  const oldAdd = vi.spyOn(h.scroll, 'addEventListener')
  const nextAdd = vi.spyOn(nextScroller, 'addEventListener')
  const nextRemove = vi.spyOn(nextScroller, 'removeEventListener')
  h.handle.addEventListener('focus', () => nextScroller.append(h.handle), {
    once: true,
  })
  dispatch(h.handle, 'pointerdown')
  expect(h.capture).toHaveBeenCalledExactlyOnceWith(7)
  expect(oldAdd.mock.calls.filter(([type]) => type === 'scroll')).toEqual([])
  const registrations = nextAdd.mock.calls.filter(([type]) => type === 'scroll')
  expect(registrations).toHaveLength(1)
  dispatch(h.handle, 'pointermove', 60)
  expect(h.size()).toBe(140)
  nextScroller.scrollLeft = 70
  nextScroller.dispatchEvent(new Event('scroll'))
  flush()
  expect(h.size()).toBe(170)
  h.scroll.scrollLeft = 100
  h.scroll.dispatchEvent(new Event('scroll'))
  flush()
  expect(h.size()).toBe(170)
  dispatch(h.handle, 'pointercancel')
  expect(nextRemove.mock.calls.filter(([type]) => type === 'scroll')).toEqual(
    registrations,
  )
  expect(h.release).toHaveBeenCalledTimes(1)
  expect(h.activity.mock.calls.at(-1)).toEqual(['cancel', -4])
  nextScroller.scrollLeft = 90
  nextScroller.dispatchEvent(new Event('scroll'))
  flush()
  expect(h.size()).toBe(170)
})
