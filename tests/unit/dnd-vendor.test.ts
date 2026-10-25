import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DragDropManager,
  Draggable,
} from '../../packages/components/src/vendor/dnd-kit/dom/src/core/index'
import { PointerSensor } from '../../packages/components/src/vendor/dnd-kit/dom/src/core/sensors/pointer/PointerSensor'
import { parseScale } from '../../packages/components/src/vendor/dnd-kit/dom/src/utilities/transform/parseScale'
import { parseTranslate } from '../../packages/components/src/vendor/dnd-kit/dom/src/utilities/transform/parseTranslate'
import { cloneElement } from '../../packages/components/src/vendor/dnd-kit/dom/src/utilities/element/cloneElement'

const cleanup: (() => void)[] = []
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((release) => release())
  vi.restoreAllMocks()
})

describe('vendored drag engine repairs', () => {
  it('shares the touch workaround across managers and releases the final binding', () => {
    const added = vi.spyOn(window, 'addEventListener')
    const removed = vi.spyOn(window, 'removeEventListener')
    const bind = () => {
      const manager = new DragDropManager({ plugins: [], sensors: [] })
      const source = new Draggable(
        { id: 'item', element: document.createElement('button') },
        undefined,
      )
      const sensor = new PointerSensor(manager)
      cleanup.push(() => {
        sensor.destroy()
        source.destroy()
        manager.destroy()
      })
      const release = sensor.bind(source)
      cleanup.push(release)
      return release
    }
    const first = bind()
    const second = bind()
    const touchAdds = () =>
      added.mock.calls.filter(([name]) => name === 'touchmove')
    const touchRemoves = () =>
      removed.mock.calls.filter(([name]) => name === 'touchmove')
    expect(touchAdds()).toHaveLength(1)
    expect(touchAdds()[0]?.[2]).toEqual({ capture: false, passive: false })
    first()
    first()
    expect(touchRemoves()).toHaveLength(0)
    second()
    expect(touchRemoves()).toHaveLength(1)
    const third = bind()
    expect(touchAdds()).toHaveLength(2)
    third()
    expect(touchRemoves()).toHaveLength(2)
  })

  it('keeps single-value CSS transform parsing behavior', () => {
    expect(parseScale('2')).toEqual({ x: 2, y: 2 })
    expect(parseTranslate('12')).toEqual({ x: 12, y: 0, z: 0 })
    expect(parseTranslate('invalid')).toBeNull()
  })

  it('skips a clone field with no corresponding original field', () => {
    const source = document.createElement('div')
    const clone = document.createElement('div')
    clone.innerHTML = '<input value="retained">'
    vi.spyOn(source, 'cloneNode').mockReturnValue(clone)
    expect(() => cloneElement(source)).not.toThrow()
    expect(clone.querySelector('input')?.value).toBe('retained')
  })
})

it('resets after a dragend callback throws', async () => {
  const manager = new DragDropManager({ plugins: [], sensors: [] })
  const source = new Draggable({ id: 'source', register: false }, manager)
  cleanup.push(() => {
    source.destroy()
    manager.destroy()
  })
  source.register()
  manager.actions.start({ source, coordinates: { x: 0, y: 0 } })
  await manager.renderer.rendering
  expect(manager.dragOperation.status.dragging).toBe(true)
  manager.monitor.addEventListener('dragend', () => {
    throw new Error('consumer failed')
  })
  expect(() => manager.actions.stop()).toThrow('consumer failed')
  await manager.renderer.rendering
  await manager.renderer.rendering
  expect(manager.dragOperation.status.idle).toBe(true)
  expect(manager.dragOperation.controller).toBeUndefined()
})

it('does not apply a queued move after cancellation', async () => {
  const manager = new DragDropManager({ plugins: [], sensors: [] })
  const source = new Draggable({ id: 'source', register: false }, manager)
  cleanup.push(() => {
    source.destroy()
    manager.destroy()
  })
  source.register()
  manager.actions.start({ source, coordinates: { x: 0, y: 0 } })
  await manager.renderer.rendering
  manager.actions.move({ to: { x: 99, y: 77 } })
  manager.actions.stop({ canceled: true })
  await manager.renderer.rendering
  expect(manager.dragOperation.position.current).toEqual({ x: 0, y: 0 })
  await manager.renderer.rendering
  expect(manager.dragOperation.status.idle).toBe(true)
})

async function pointerFixture() {
  class Pointer extends MouseEvent {
    readonly pointerId: number
    readonly pointerType = 'mouse'
    readonly isPrimary = true
    constructor(
      type: string,
      init: MouseEventInit & { pointerId?: number } = {},
    ) {
      super(type, { bubbles: true, cancelable: true, ...init })
      this.pointerId = init.pointerId ?? 1
    }
  }
  vi.stubGlobal('PointerEvent', Pointer)
  const captured = new Set<number>()
  const release = vi.fn((id: number) => {
    captured.delete(id)
  })
  for (const [name, value] of Object.entries({
    setPointerCapture: (id: number) => {
      captured.add(id)
    },
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: release,
  }))
    Object.defineProperty(document.body, name, { configurable: true, value })
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => null,
  })
  const element = document.createElement('button')
  document.body.append(element)
  const manager = new DragDropManager({ plugins: [], sensors: [] })
  const source = new Draggable(
    {
      id: 'pointer',
      register: false,
      element,
      sensors: [PointerSensor.configure({ activationConstraints: [] })],
    },
    manager,
  )
  source.register()
  cleanup.push(() => {
    source.destroy()
    manager.destroy()
    element.remove()
    for (const name of [
      'setPointerCapture',
      'hasPointerCapture',
      'releasePointerCapture',
    ])
      Reflect.deleteProperty(document.body, name)
    Reflect.deleteProperty(document, 'elementFromPoint')
    Reflect.deleteProperty(document, 'visibilityState')
    vi.unstubAllGlobals()
  })
  element.dispatchEvent(new Pointer('pointerdown', { button: 0 }))
  await manager.renderer.rendering
  expect(manager.dragOperation.status.dragging).toBe(true)
  return { Pointer, manager, element, release, captured }
}

it('filters unrelated pointers and ignores composing Escape', async () => {
  const { Pointer, manager, release } = await pointerFixture()
  const move = vi.spyOn(manager.actions, 'move')
  document.dispatchEvent(
    new Pointer('pointermove', { pointerId: 2, clientX: 90 }),
  )
  document.dispatchEvent(new Pointer('pointerup', { pointerId: 2 }))
  expect(move).not.toHaveBeenCalled()
  expect(manager.dragOperation.status.dragging).toBe(true)
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      isComposing: true,
      bubbles: true,
    }),
  )
  expect(manager.dragOperation.status.dragging).toBe(true)
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  )
  await manager.renderer.rendering
  await manager.renderer.rendering
  expect(manager.dragOperation.status.idle).toBe(true)
  expect(release).toHaveBeenCalledWith(1)
})

it.each(['blur', 'hidden', 'lostpointercapture', 'programmatic'] as const)(
  'releases capture and transient listeners on %s cancellation',
  async (reason) => {
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')
    const { Pointer, manager, release } = await pointerFixture()
    if (reason === 'blur') window.dispatchEvent(new Event('blur'))
    else if (reason === 'hidden') {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
    } else if (reason === 'lostpointercapture')
      document.body.dispatchEvent(new Pointer('lostpointercapture'))
    else manager.actions.stop({ canceled: true })
    await manager.renderer.rendering
    await manager.renderer.rendering
    expect(manager.dragOperation.status.idle).toBe(true)
    expect(release).toHaveBeenCalledWith(1)
    const bindings = added.mock.calls.filter(([name]) =>
      [
        'pointermove',
        'pointerup',
        'pointercancel',
        'visibilitychange',
      ].includes(name),
    )
    expect(bindings.length).toBeGreaterThan(0)
    for (const [name, listener] of bindings)
      expect(
        removed.mock.calls.some(
          ([removedName, removedListener]) =>
            removedName === name && removedListener === listener,
        ),
      ).toBe(true)
  },
)

async function scrollFixture() {
  const manager = new DragDropManager({ plugins: [], sensors: [] })
  const source = new Draggable({ id: 'scroll', register: false }, manager)
  source.register()
  cleanup.push(() => {
    source.destroy()
    manager.destroy()
  })
  manager.actions.start({ source, coordinates: { x: 50, y: 95 } })
  await manager.renderer.rendering
  return manager
}

it('clears delayed scroll collision work when destroyed', async () => {
  vi.useFakeTimers()
  cleanup.unshift(() => vi.useRealTimers())
  const manager = await scrollFixture()
  const update = vi.spyOn(manager.collisionObserver, 'forceUpdate')
  document.dispatchEvent(new Event('scroll'))
  manager.destroy()
  const calls = update.mock.calls.length
  vi.advanceTimersByTime(50)
  expect(update).toHaveBeenCalledTimes(calls)
})

it.each(['cancel', 'destroy'] as const)(
  'does not execute queued element scrolling after %s',
  async (reason) => {
    const { Scroller } =
      await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/Scroller')
    const { scheduler } =
      await import('../../packages/components/src/vendor/dnd-kit/dom/src/utilities/scheduling/scheduler')
    const tasks: (() => void)[] = []
    vi.spyOn(scheduler, 'schedule').mockImplementation((task) => {
      tasks.push(task)
      return Promise.resolve()
    })
    const manager = await scrollFixture()
    const scroller = manager.registry.plugins.get(Scroller)!
    const element = document.createElement('div')
    for (const [name, value] of Object.entries({
      clientHeight: 100,
      clientWidth: 100,
      scrollHeight: 500,
      scrollWidth: 100,
    }))
      Object.defineProperty(element, name, { value })
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, 100),
    )
    scroller.getScrollableElements = () => new Set([element])
    expect(scroller.scroll({ by: { x: 0, y: 1 } })).toBe(true)
    expect(tasks.length).toBeGreaterThan(0)
    if (reason === 'cancel') manager.actions.stop({ canceled: true })
    else manager.destroy()
    tasks.splice(0).forEach((task) => task())
    expect(element.scrollTop).toBe(0)
  },
)

it('disposes the scroll intent subscription', async () => {
  const { ScrollIntentTracker } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/ScrollIntent')
  const manager = await scrollFixture()
  const tracker = new ScrollIntentTracker(manager)
  const current = tracker.current
  tracker.destroy()
  manager.dragOperation.reset()
  expect(tracker.current).toBe(current)
})

it('does not invoke a queued auto-scroll callback after plugin disposal', async () => {
  vi.useFakeTimers()
  cleanup.unshift(() => vi.useRealTimers())
  const { Scroller } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/Scroller')
  const { AutoScroller } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/AutoScroller')
  const { scheduler } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/utilities/scheduling/scheduler')
  const tasks: (() => void)[] = []
  vi.spyOn(scheduler, 'schedule').mockImplementation((task) => {
    tasks.push(task)
    return Promise.resolve()
  })
  const manager = await scrollFixture()
  const scroller = manager.registry.plugins.get(Scroller)!
  const scroll = vi.spyOn(scroller, 'scroll').mockReturnValue(true)
  const auto = new AutoScroller(manager)
  vi.advanceTimersByTime(10)
  expect(tasks.length).toBeGreaterThan(0)
  auto.destroy()
  const calls = scroll.mock.calls.length
  tasks.splice(0).forEach((task) => task())
  expect(scroll).toHaveBeenCalledTimes(calls)
  expect(scroller.autoScrolling).toBe(false)
})

it.each([true, false])(
  'uses release coordinates without waiting for animation frames (prior move: %s)',
  async (priorMove) => {
    const { scheduler } =
      await import('../../packages/components/src/vendor/dnd-kit/dom/src/utilities/scheduling/scheduler')
    vi.spyOn(scheduler, 'schedule').mockImplementation(() => Promise.resolve())
    const { Pointer, manager } = await pointerFixture()
    const ended = vi.fn()
    manager.monitor.addEventListener('dragend', ended)
    if (priorMove)
      document.dispatchEvent(
        new Pointer('pointermove', { clientX: 40, clientY: 30 }),
      )
    document.dispatchEvent(
      new Pointer('pointerup', { clientX: 99, clientY: 77 }),
    )
    await manager.renderer.rendering
    await manager.renderer.rendering
    expect(ended).toHaveBeenCalledTimes(1)
    expect(ended.mock.calls[0]![0].operation.position.current).toEqual({
      x: 99,
      y: 77,
    })
  },
)

it.each(['cancel', 'disable', 'unbind'] as const)(
  'releases pending pointer activation on %s',
  async (reason) => {
    const { PointerActivationConstraints } =
      await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/index')
    const { Pointer, manager, element } = await pointerFixture()
    manager.actions.stop({ canceled: true })
    await manager.renderer.rendering
    await manager.renderer.rendering
    const source = new Draggable(
      { id: 'pending', register: false, element },
      undefined,
    )
    const sensor = new PointerSensor(manager, {
      activationConstraints: [
        new PointerActivationConstraints.Distance({ value: 50 }),
      ],
    })
    const unbind = sensor.bind(source)
    cleanup.push(() => {
      unbind()
      sensor.destroy()
      source.destroy()
    })
    // The first fixture's binding is idle; disable its registered source to isolate this sensor.
    manager.registry.draggables.get('pointer')!.disabled = true
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')
    element.dispatchEvent(new Pointer('pointerdown'))
    expect(manager.dragOperation.status.idle).toBe(true)
    if (reason === 'cancel') sensor.cancel()
    else if (reason === 'disable') source.disabled = true
    else unbind()
    const moves = added.mock.calls.filter(([name]) => name === 'pointermove')
    expect(moves).toHaveLength(1)
    for (const [name, listener] of moves)
      expect(
        removed.mock.calls.some(
          ([removedName, removedListener]) =>
            removedName === name && removedListener === listener,
        ),
      ).toBe(true)
  },
)

it.each([false, true])(
  'cleans keyboard listeners on engine stop even with a throwing callback (%s)',
  async (throws) => {
    const { KeyboardSensor } =
      await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/index')
    const { manager, element } = await pointerFixture()
    manager.actions.stop({ canceled: true })
    await manager.renderer.rendering
    await manager.renderer.rendering
    Object.defineProperty(element, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
    Object.defineProperty(document, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
    const sensor = new KeyboardSensor(manager)
    const unbind = sensor.bind(manager.registry.draggables.get('pointer')!)
    cleanup.push(() => {
      unbind()
      sensor.destroy()
      Reflect.deleteProperty(document, 'getAnimations')
    })
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(manager.dragOperation.status.idle).toBe(true)
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true,
      }),
    )
    await manager.renderer.rendering
    expect(manager.dragOperation.status.dragging).toBe(true)
    if (throws)
      manager.monitor.addEventListener('dragend', () => {
        throw new Error('consumer failed')
      })
    if (throws)
      expect(() => manager.actions.stop({ canceled: true })).toThrow(
        'consumer failed',
      )
    else manager.actions.stop({ canceled: true })
    await manager.renderer.rendering
    await manager.renderer.rendering
    expect(manager.dragOperation.status.idle).toBe(true)
    const bindings = added.mock.calls.filter(([name]) => name === 'keydown')
    expect(bindings).toHaveLength(1)
    for (const [name, listener] of bindings)
      expect(
        removed.mock.calls.some(
          ([removedName, removedListener]) =>
            removedName === name && removedListener === listener,
        ),
      ).toBe(true)
  },
)

it('auto-scroll can depend on its active flag without cycling during effect cleanup', async () => {
  vi.useFakeTimers()
  cleanup.unshift(() => vi.useRealTimers())
  const { Scroller } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/Scroller')
  const { AutoScroller } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/AutoScroller')
  const manager = await scrollFixture()
  const scroller = manager.registry.plugins.get(Scroller)!
  // Real scrollable-element discovery reads this flag to retain outer ancestors.
  vi.spyOn(scroller, 'scroll').mockImplementation(() => {
    void scroller.autoScrolling
    return true
  })
  let auto: InstanceType<typeof AutoScroller> | undefined
  expect(() => {
    auto = new AutoScroller(manager)
  }).not.toThrow()
  expect(scroller.autoScrolling).toBe(true)
  manager.actions.stop({ canceled: true })
  await manager.renderer.rendering
  await manager.renderer.rendering
  expect(scroller.autoScrolling).toBe(false)
  auto?.destroy()
})

it('reusable constraints release completed controllers and ignore stale activation', async () => {
  const { ActivationController, ActivationConstraint } =
    await import('../../packages/components/src/vendor/dnd-kit/abstract/src/core/index')
  class Constraint extends ActivationConstraint<Event> {
    resets = 0
    abort() {
      this.resets++
    }
    onEvent(event: Event) {
      this.activate(event)
    }
  }
  const constraint = new Constraint({})
  const firstActivate = vi.fn()
  const secondActivate = vi.fn()
  const added = vi.spyOn(AbortSignal.prototype, 'addEventListener')
  const first = new ActivationController([constraint], firstActivate)
  const registration = added.mock.calls.find(([name]) => name === 'abort')
  expect(registration?.[2]).toEqual({ once: true })
  first.abort()
  expect(constraint.resets).toBe(1)
  constraint.activate(new Event('move'))
  first.activate(new Event('move'))
  expect(firstActivate).not.toHaveBeenCalled()
  const second = new ActivationController([constraint], secondActivate)
  first.onEvent(new Event('move'))
  expect(secondActivate).not.toHaveBeenCalled()
  second.onEvent(new Event('move'))
  expect(secondActivate).toHaveBeenCalledTimes(1)
  second.abort()
  expect(constraint.resets).toBe(2)
})

it('clears the pointer activation signal handler after a completed interaction', async () => {
  const { manager } = await pointerFixture()
  const sensor = manager.registry.sensors.get(PointerSensor)!
  // Retain the completed signal deliberately to verify that its event closure is released.
  class Inspection extends PointerSensor {
    static activation(sensor: PointerSensor) {
      return (sensor as Inspection).controller
    }
  }
  const activation = Inspection.activation(sensor)!
  expect(activation.signal.onabort).toBeTypeOf('function')
  manager.actions.stop({ canceled: true })
  expect(activation.signal.aborted).toBe(true)
  expect(activation.signal.onabort).toBeNull()
})

it('ignores bubbled implicit touch capture loss during transfer but cancels loss of owned capture', async () => {
  const { Pointer, manager, element, captured } = await pointerFixture()
  element.dispatchEvent(new Pointer('lostpointercapture'))
  expect(manager.dragOperation.status.dragging).toBe(true)
  expect(captured.has(1)).toBe(true)
  document.body.dispatchEvent(new Pointer('lostpointercapture'))
  await manager.renderer.rendering
  await manager.renderer.rendering
  expect(manager.dragOperation.status.idle).toBe(true)
  expect(captured.has(1)).toBe(false)
})

function stickyScrollFixture(position: 'sticky' | 'fixed') {
  const outer = document.createElement('div')
  outer.style.overflow = 'auto'
  const outerHeader = document.createElement('div')
  outerHeader.style.position = 'sticky'
  const inner = document.createElement('div')
  inner.style.overflow = 'auto'
  const header = document.createElement('div')
  header.style.position = position
  const button = document.createElement('button')
  header.append(button)
  inner.append(header)
  outerHeader.append(inner)
  outer.append(outerHeader)
  document.body.append(outer)
  cleanup.push(() => outer.remove())
  return { outer, inner, button }
}

it.each(['sticky', 'fixed'] as const)(
  'scroll ancestors traverse nested sticky headers and preserve fixed boundaries (%s)',
  async (position) => {
    const { getScrollableAncestors } =
      await import('../../packages/components/src/vendor/dnd-kit/dom/src/utilities/scroll/getScrollableAncestors')
    const { outer, inner, button } = stickyScrollFixture(position)
    const ancestors = getScrollableAncestors(button)
    expect(ancestors.has(inner)).toBe(position === 'sticky')
    expect(ancestors.has(outer)).toBe(position === 'sticky')
    if (position === 'sticky')
      expect([...ancestors].indexOf(inner)).toBeLessThan(
        [...ancestors].indexOf(outer),
      )
  },
)

it('discovers and scrolls the horizontal container behind a sticky header', async () => {
  const { Scroller } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/core/plugins/scrolling/Scroller')
  const { scheduler } =
    await import('../../packages/components/src/vendor/dnd-kit/dom/src/utilities/scheduling/scheduler')
  const tasks: (() => void)[] = []
  vi.spyOn(scheduler, 'schedule').mockImplementation((task) => {
    tasks.push(task)
    return Promise.resolve()
  })
  const manager = await scrollFixture()
  const { inner, button } = stickyScrollFixture('sticky')
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => button,
  })
  cleanup.push(() => Reflect.deleteProperty(document, 'elementFromPoint'))
  for (const [name, value] of Object.entries({
    clientHeight: 100,
    clientWidth: 100,
    scrollHeight: 100,
    scrollWidth: 500,
  }))
    Object.defineProperty(inner, name, { value })
  vi.spyOn(inner, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 100, 100),
  )
  manager.dragOperation.position.current = { x: 95, y: 50 }
  const scroller = manager.registry.plugins.get(Scroller)!
  expect(scroller.getScrollableElements()?.has(inner)).toBe(true)
  expect(scroller.scroll({ by: { x: 1, y: 0 } })).toBe(true)
  tasks.splice(0).forEach((task) => task())
  expect(inner.scrollLeft).toBeGreaterThan(0)
})
