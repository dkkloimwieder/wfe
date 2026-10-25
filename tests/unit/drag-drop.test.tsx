import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, waitFor } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import {
  createDragDrop,
  createDraggable,
  createDroppable,
} from '../../packages/components/src/dnd'
import type {
  DragDropScope,
  DragDropOptions,
  DragKeyboardOptions,
  DraggableOptions,
} from '../../packages/components/src/dnd'
import { getDragDropInternal } from '../../packages/components/src/dnd/internal'

beforeEach(() => {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => document.body,
  })
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
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
})
afterEach(async () => {
  cleanup()
  await Promise.resolve()
  await Promise.resolve()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'getAnimations')
  Reflect.deleteProperty(document, 'elementFromPoint')
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  Reflect.deleteProperty(document.body, 'setPointerCapture')
})

function fixture(
  keyboard = true,
  navigate?: DragKeyboardOptions<string>['navigate'],
  activation?: DraggableOptions<string>['activation'],
) {
  const onStart = vi.fn()
  const onOver = vi.fn()
  const onDrop = vi.fn()
  const onCancel = vi.fn()
  const [autoScroll, setAutoScroll] =
    createSignal<DragDropOptions['autoScroll']>('both')
  const [revision, setRevision] = createSignal(0)
  const [disabled, setDisabled] = createSignal(false)
  const [accept, setAccept] = createSignal(true)
  let scope!: DragDropScope<string>
  const view = render(() => {
    scope = createDragDrop<string>({
      get autoScroll() {
        return autoScroll()
      },
      get revision() {
        return revision()
      },
      navigate,
      onStart,
      onOver,
      onDrop,
      onCancel,
    })
    const source = createDraggable(scope, {
      id: 'source',
      keyboard,
      activation,
      label: 'Source',
      data: 'record',
      get disabled() {
        return disabled()
      },
    })
    const target = createDroppable(scope, {
      id: 'target',
      label: 'Target',
      data: 'lane',
      get accepts() {
        const allowed = accept()
        return () => allowed
      },
    })
    return (
      <>
        <button
          ref={(element) => {
            source.ref(element)
            source.handleRef(element)
          }}
        >
          Source
        </button>
        <div ref={target.ref}>Target</div>
      </>
    )
  })
  flush()
  return {
    scope,
    view,
    onStart,
    onOver,
    onDrop,
    onCancel,
    setDisabled,
    setRevision,
    setAutoScroll,
    setAccept,
  }
}

test('menu moves dispatch a typed request without moving application DOM', () => {
  const { scope, view, onDrop } = fixture()
  const original = view.container.innerHTML
  expect(scope.requestDrop('source', 'target')).toBe(true)
  expect(onDrop).toHaveBeenCalledTimes(1)
  expect(onDrop).toHaveBeenCalledWith({
    source: { id: 'source', label: 'Source', data: 'record' },
    target: { id: 'target', label: 'Target', data: 'lane' },
    input: 'menu',
    point: null,
  })
  expect(view.container.innerHTML).toBe(original)
  expect(scope.operation()).toBe(null)
})

test('disabled, rejected, missing and disposed registrations cannot request moves', () => {
  const { scope, view, onDrop, setDisabled, setAccept } = fixture()
  expect(scope.requestDrop('missing', 'target')).toBe(false)
  setDisabled(true)
  flush()
  expect(scope.requestDrop('source', 'target')).toBe(false)
  setDisabled(false)
  setAccept(false)
  flush()
  expect(scope.requestDrop('source', 'target')).toBe(false)
  setAccept(true)
  flush()
  view.unmount()
  expect(scope.requestDrop('source', 'target')).toBe(false)
  expect(onDrop).not.toHaveBeenCalled()
})

test('disconnected elements cannot receive menu requests', () => {
  const { scope, view, onDrop } = fixture()
  view.getByText('Target').remove()
  expect(scope.requestDrop('source', 'target')).toBe(false)
  expect(onDrop).not.toHaveBeenCalled()
})

test('engine terminal callbacks dispatch only once and cancellation is separate', () => {
  const { scope, onDrop, onCancel } = fixture()
  const internal = getDragDropInternal(scope)
  const engine = internal.manager()!
  engine.dragOperation.sourceIdentifier = 'source'
  engine.dragOperation.targetIdentifier = 'target'
  const operation = engine.dragOperation
  engine.monitor.dispatch('dragstart', { cancelable: false, operation })
  engine.monitor.dispatch('dragend', {
    operation,
    canceled: false,
    suspend: () => ({ resume() {}, abort() {} }),
  })
  engine.monitor.dispatch('dragend', {
    operation,
    canceled: false,
    suspend: () => ({ resume() {}, abort() {} }),
  })
  expect(onDrop).toHaveBeenCalledTimes(1)
  engine.monitor.dispatch('dragstart', { cancelable: false, operation })
  scope.cancel()
  scope.cancel()
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onDrop).toHaveBeenCalledTimes(1)
})

test('duplicate source identifiers fail rather than replacing another registration', () => {
  const view = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <Duplicates />
    </Errored>
  ))
  function Duplicates() {
    const scope = createDragDrop<string>()
    const first = createDraggable(scope, {
      id: 'same',
      label: 'First',
      data: 'a',
    })
    const second = createDraggable(scope, {
      id: 'same',
      label: 'Second',
      data: 'b',
    })
    return (
      <>
        <button ref={first.ref}>First</button>
        <button ref={second.ref}>Second</button>
      </>
    )
  }
  flush()
  expect(view.getByRole('alert').textContent).toContain(
    'Duplicate draggable id: same',
  )
})

test('a pending engine initialization cannot race a menu move or outlive unmount', async () => {
  const { scope, view, onDrop, onCancel } = fixture()
  const engine = getDragDropInternal(scope).manager()!
  const controller = engine.actions.start({
    source: 'source',
    coordinates: { x: 1, y: 1 },
  })
  expect(scope.requestDrop('source', 'target')).toBe(false)
  view.unmount()
  await Promise.resolve()
  expect(controller.signal.aborted).toBe(true)
  expect(scope.operation()).toBe(null)
  expect(onDrop).not.toHaveBeenCalled()
  expect(onCancel).not.toHaveBeenCalled()
})

test('virtual collision geometry follows engine motion without moving source DOM', async () => {
  const { scope, view } = fixture()
  const source = view.getByText('Source')
  vi.spyOn(source, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(10, 20, 40, 30),
  )
  const engine = getDragDropInternal(scope).manager()!
  engine.actions.start({ source: 'source', coordinates: { x: 15, y: 25 } })
  await Promise.resolve()
  expect(engine.dragOperation.shape?.current.boundingRectangle.left).toBe(10)
  engine.actions.move({ by: { x: 50, y: 60 } })
  await Promise.resolve()
  expect(engine.dragOperation.shape?.current.boundingRectangle.left).toBe(60)
  expect(engine.dragOperation.shape?.current.boundingRectangle.top).toBe(80)
  expect(source.style.transform).toBe('')
  expect(source.style.translate).toBe('')
  scope.cancel()
})

test('a throwing final callback cannot prevent engine reset', async () => {
  const { scope, onDrop } = fixture()
  const engine = getDragDropInternal(scope).manager()!
  engine.actions.start({ source: 'source', coordinates: { x: 1, y: 1 } })
  await Promise.resolve()
  engine.dragOperation.targetIdentifier = 'target'
  onDrop.mockImplementationOnce(() => {
    throw new Error('consumer failure')
  })
  expect(() => engine.actions.stop()).toThrow('consumer failure')
  await Promise.resolve()
  await Promise.resolve()
  expect(engine.dragOperation.status.idle).toBe(true)
  expect(scope.requestDrop('source', 'target')).toBe(true)
})

test('pointer pickup and release use mounted sensors when keyboard is disabled', async () => {
  class Pointer extends MouseEvent {
    readonly pointerId = 1
    readonly pointerType = 'mouse'
    readonly isPrimary = true
  }
  vi.stubGlobal('PointerEvent', Pointer)
  Object.defineProperty(document.body, 'setPointerCapture', {
    configurable: true,
    value() {},
  })
  const { scope, view, onCancel } = fixture(false)
  const source = view.getByText('Source')
  source.dispatchEvent(
    new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    }),
  )
  await Promise.resolve()
  flush()
  expect(scope.operation()).toBe(null)
  source.dispatchEvent(
    new Pointer('pointerdown', { button: 0, bubbles: true, cancelable: true }),
  )
  await Promise.resolve()
  flush()
  expect(scope.operation()?.input).toBe('pointer')
  document.body.dispatchEvent(
    new Pointer('pointerup', { button: 0, bubbles: true, cancelable: true }),
  )
  // Release flushes its final coordinates and collision result before stopping.
  await waitFor(() => {
    flush()
    expect(scope.operation()).toBe(null)
  })
  expect(onCancel).toHaveBeenCalledTimes(1)
  Reflect.deleteProperty(document.body, 'setPointerCapture')
})

test('subscribers distinguish accepted moves and cancellation, and unsubscribe', () => {
  const { scope } = fixture()
  const listener = vi.fn()
  const unsubscribe = scope.subscribe(listener)
  scope.requestDrop('source', 'target')
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'drop' }),
  )
  unsubscribe()
  scope.requestDrop('source', 'target')
  expect(listener).toHaveBeenCalledTimes(1)
})

test.each(['start', 'over', 'subscriber'] as const)(
  'a throwing %s callback releases the active engine and preserves its error',
  async (kind) => {
    const { scope, onStart, onOver, onCancel } = fixture()
    const engine = getDragDropInternal(scope).manager()!
    const controller = engine.actions.start({
      source: 'source',
      coordinates: { x: 1, y: 1 },
    })
    if (kind === 'over') await Promise.resolve()
    const failure = () => {
      throw new Error('first failure')
    }
    if (kind === 'start') onStart.mockImplementationOnce(failure)
    else if (kind === 'over') onOver.mockImplementationOnce(failure)
    else
      scope.subscribe((event) => {
        if (event.type === 'start') failure()
      })
    onCancel.mockImplementationOnce(() => {
      throw new Error('secondary cancellation failure')
    })
    const invoke = () =>
      kind === 'over'
        ? engine.monitor.dispatch('dragover', {
            operation: engine.dragOperation,
            cancelable: true,
            defaultPrevented: false,
            preventDefault() {},
          })
        : engine.monitor.dispatch('dragstart', {
            operation: engine.dragOperation,
            cancelable: false,
          })
    expect(invoke).toThrow('first failure')
    expect(controller.signal.aborted).toBe(true)
    await Promise.resolve()
    await Promise.resolve()
    flush()
    expect(engine.dragOperation.status.idle).toBe(true)
    expect(scope.operation()).toBe(null)
    expect(onCancel).toHaveBeenCalledTimes(1)
  },
)

test('a custom keyboard navigation failure cancels and restores collision observation', async () => {
  const { scope } = fixture(true, () => {
    throw new Error('navigation failed')
  })
  const engine = getDragDropInternal(scope).manager()!
  const controller = engine.actions.start({
    source: 'source',
    event: new KeyboardEvent('keydown', { key: ' ' }),
    coordinates: { x: 1, y: 1 },
  })
  await Promise.resolve()
  flush()
  expect(() =>
    engine.actions.move({
      by: { x: 10, y: 0 },
      event: new KeyboardEvent('keydown', { key: 'ArrowRight' }),
    }),
  ).toThrow('navigation failed')
  expect(controller.signal.aborted).toBe(true)
  await Promise.resolve()
  await Promise.resolve()
  flush()
  expect(engine.dragOperation.status.idle).toBe(true)
  expect(engine.collisionObserver.disabled).toBe(false)
})

test.each(['cancel', 'disabled', 'revision'] as const)(
  '%s cancels pending pointer activation before an engine operation exists',
  async (reason) => {
    vi.useFakeTimers()
    class Pointer extends MouseEvent {
      readonly pointerId = 7
      readonly pointerType = 'mouse'
      readonly isPrimary = true
    }
    vi.stubGlobal('PointerEvent', Pointer)
    Object.defineProperty(document.body, 'setPointerCapture', {
      configurable: true,
      value() {},
    })
    const { scope, view, onStart, setDisabled, setRevision } = fixture(
      true,
      undefined,
      { delay: 500, tolerance: 5 },
    )
    const engine = getDragDropInternal(scope).manager()!
    const start = vi.spyOn(engine.actions, 'start')
    const source = view.getByText('Source')
    try {
      source.dispatchEvent(
        new Pointer('pointerdown', {
          button: 0,
          clientX: 20,
          bubbles: true,
          cancelable: true,
        }),
      )
      expect(engine.dragOperation.status.idle).toBe(true)
      if (reason === 'disabled') setDisabled(true)
      else if (reason === 'revision') setRevision(1)
      else scope.cancel()
      flush()
      await vi.advanceTimersByTimeAsync(600)
      expect(start).not.toHaveBeenCalled()
      expect(onStart).not.toHaveBeenCalled()
      setDisabled(false)
      flush()
      source.dispatchEvent(
        new Pointer('pointerdown', {
          button: 0,
          clientX: 40,
          bubbles: true,
          cancelable: true,
        }),
      )
      await vi.advanceTimersByTimeAsync(600)
      flush()
      expect(start).toHaveBeenCalledTimes(1)
      expect(onStart).toHaveBeenCalledTimes(1)
    } finally {
      scope.cancel()
      await vi.advanceTimersByTimeAsync(100)
      vi.useRealTimers()
    }
  },
)

test('a throwing cancellation on owner disposal still destroys the mounted manager', async () => {
  const { scope, view, onCancel } = fixture()
  const engine = getDragDropInternal(scope).manager()!
  const destroy = vi.spyOn(engine, 'destroy')
  const controller = engine.actions.start({
    source: 'source',
    coordinates: { x: 1, y: 1 },
  })
  await Promise.resolve()
  flush()
  onCancel.mockImplementationOnce(() => {
    throw new Error('disposal callback failure')
  })
  expect(() => view.unmount()).toThrow('disposal callback failure')
  expect(controller.signal.aborted).toBe(true)
  expect(destroy).toHaveBeenCalledTimes(1)
  expect(scope.requestDrop('source', 'target')).toBe(false)
})

test('changing auto-scroll axes cancels the active drag without requesting a drop', async () => {
  const { scope, setAutoScroll, onCancel, onDrop } = fixture()
  const engine = getDragDropInternal(scope).manager()!
  engine.actions.start({ source: 'source', coordinates: { x: 1, y: 1 } })
  await Promise.resolve()
  await Promise.resolve()
  flush()
  expect(scope.operation()?.source.id).toBe('source')
  setAutoScroll('horizontal')
  flush()
  await Promise.resolve()
  await Promise.resolve()
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onDrop).not.toHaveBeenCalled()
  expect(scope.operation()).toBe(null)
  expect(engine.dragOperation.status.idle).toBe(true)
})
