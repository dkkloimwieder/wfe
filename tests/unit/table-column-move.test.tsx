import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { TableColumnMove, moveColumn } from '@wfe/components/table'

class Pointer extends MouseEvent {
  readonly pointerType = 'mouse'
  readonly isPrimary = true
  readonly pointerId: number
  constructor(
    type: string,
    init: MouseEventInit & { pointerId?: number } = {},
  ) {
    super(type, init)
    this.pointerId = init.pointerId ?? 7
  }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('PointerEvent', Pointer)
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  vi.stubGlobal('IntersectionObserver', Observer)
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => document.body,
  })
  Object.defineProperty(document.body, 'setPointerCapture', {
    configurable: true,
    value() {},
  })
  Object.defineProperty(document.body, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  })
})
afterEach(async () => {
  cleanup()
  await vi.advanceTimersByTimeAsync(100)
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  for (const name of ['getAnimations', 'elementFromPoint'])
    Reflect.deleteProperty(document, name)
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  Reflect.deleteProperty(document.body, 'setPointerCapture')
  Reflect.deleteProperty(document.body, 'hasPointerCapture')
})
function dispatch(node: EventTarget, type: string, x = 20, pointerId = 7) {
  node.dispatchEvent(
    new Pointer(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: 15,
      pointerId,
    }),
  )
  flush()
}
async function settle() {
  await vi.advanceTimersByTimeAsync(50)
  flush()
}
function mount(withHeader = true) {
  const [disabled, setDisabled] = createSignal(false)
  const [ids, setIds] = createSignal(['a', 'b'])
  const move = vi.fn()
  const sort = vi.fn()
  const activity = vi.fn()
  const view = render(() => (
    <div class="consumer-scroll-container">
      <div>
        <div data-column-header={withHeader ? 'a' : undefined}>
          <TableColumnMove
            id="a"
            label="Name"
            ids={ids()}
            disabled={disabled()}
            onMove={move}
            onActivity={activity}
          />
          <button onClick={sort}>Sort Name</button>
        </div>
        <div data-column-header="b" />
      </div>
    </div>
  ))
  flush()
  for (const node of [
    document.body,
    view.container,
    ...view.container.querySelectorAll<HTMLElement>('div'),
  ]) {
    node.style.overflow = 'visible'
    node.style.overflowX = 'visible'
    node.style.overflowY = 'visible'
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 300, 40),
    )
  }
  for (const [index, node] of [
    ...view.container.querySelectorAll<HTMLElement>('[data-column-header]'),
  ].entries())
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(index * 100, 0, 100, 30),
    )
  const menu = view.container.querySelector<HTMLElement>('[popover]')!
  Object.defineProperty(menu, 'hidePopover', { configurable: true, value() {} })
  return {
    ...view,
    handle: view.getByRole('button', { name: 'Move Name column' }),
    move,
    sort,
    activity,
    setDisabled,
    setIds,
  }
}

test('a standalone control without a header keeps keyboard and menu movement', () => {
  const view = mount(false)
  dispatch(view.handle, 'pointerdown')
  dispatch(document, 'pointermove', 160)
  dispatch(document, 'pointerup', 160)
  expect(view.move).not.toHaveBeenCalled()
  expect(view.activity).not.toHaveBeenCalled()
  fireEvent.keyDown(view.handle, { key: 'ArrowRight' })
  flush()
  expect(view.move).toHaveBeenCalledExactlyOnceWith({ id: 'b', side: 'after' })
  view.unmount()
  fireEvent.keyDown(view.handle, { key: 'ArrowRight' })
  expect(view.move).toHaveBeenCalledTimes(1)
})

test('shared sorting works in a nonstandard host and commits only once on release', async () => {
  const view = mount()
  dispatch(view.handle, 'pointerdown')
  dispatch(document, 'pointermove', 160)
  await settle()
  expect(view.move).not.toHaveBeenCalled()
  expect(view.container.querySelectorAll('[data-column-drop]')).toHaveLength(1)
  dispatch(document, 'pointerup', 160)
  await settle()
  expect(view.move).toHaveBeenCalledExactlyOnceWith({ id: 'b', side: 'after' })
  expect(view.container.querySelector('[data-column-drop]')).toBeNull()
  dispatch(document, 'pointerup', 160)
  expect(view.move).toHaveBeenCalledTimes(1)
})

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
  'column movement cancels on %s without a later commit',
  async (reason) => {
    const view = mount()
    dispatch(view.handle, 'pointerdown')
    dispatch(document, 'pointermove', 160)
    await settle()
    dispatch(document, 'pointercancel', 160, 8)
    expect(view.activity.mock.calls.some(([event]) => event === 'cancel')).toBe(
      false,
    )
    if (reason === 'Escape')
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      )
    else if (reason === 'blur') window.dispatchEvent(new Event('blur'))
    else if (reason === 'hidden') {
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    } else if (reason === 'disabled') view.setDisabled(true)
    else if (reason === 'configuration') view.setIds(['b', 'a'])
    else if (reason === 'dispose') view.unmount()
    else dispatch(document.body, reason, 160)
    flush()
    await settle()
    dispatch(document, 'pointerup', 160)
    await settle()
    expect(view.move).not.toHaveBeenCalled()
    expect(
      view.activity.mock.calls.filter(([event]) => event === 'cancel'),
    ).toHaveLength(1)
    expect(view.container.querySelector('[data-column-drop]')).toBeNull()
  },
)

test('sort button activation never starts column movement', async () => {
  const view = mount()
  const sort = view.getByRole('button', { name: 'Sort Name' })
  dispatch(sort, 'pointerdown')
  dispatch(document, 'pointermove', 160)
  dispatch(document, 'pointerup', 160)
  fireEvent.click(sort)
  await settle()
  expect(view.sort).toHaveBeenCalledTimes(1)
  expect(view.move).not.toHaveBeenCalled()
  expect(view.activity).not.toHaveBeenCalled()
})

test('column requests preserve hidden columns in the full accepted order', () => {
  expect(
    moveColumn(['a', 'hidden', 'b', 'locked'], 'a', { id: 'b', side: 'after' }),
  ).toEqual(['hidden', 'b', 'a', 'locked'])
})

test('stale standalone source IDs cannot be reinserted by keyboard or move requests', () => {
  const view = mount()
  view.setIds(['b', 'c'])
  flush()
  fireEvent.keyDown(view.handle, { key: 'ArrowRight' })
  flush()
  expect(view.move).not.toHaveBeenCalled()
  const order = ['a', 'b']
  expect(moveColumn(order, 'missing', { id: 'b', side: 'before' })).toBe(order)
})
