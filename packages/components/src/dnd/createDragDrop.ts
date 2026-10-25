import {
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import {
  DragDropManager,
  AutoScroller,
  Cursor,
  PreventSelection,
  PointerSensor,
  KeyboardSensor,
} from '../vendor/dnd-kit/dom/src/core/index'
import { effect as engineEffect } from '../vendor/dnd-kit/state/src/index'
import { setDragDropInternal } from './internal'
import { observeDragGeometry } from './geometry'
import { createDragKeyboard } from './keyboard'
import type { Registration } from './internal'
import type {
  DragDropId,
  DragDropEvent,
  DropRequest,
  DragDropOptions,
  DragDropScope,
  DragOperation,
  DragDropInput,
} from './types'

export function createDragDrop<D = unknown>(
  options: DragDropOptions<D> = {},
): DragDropScope<D> {
  const [manager, setManager] = createSignal<DragDropManager>()
  const [operation, setOperation] = createSignal<DragOperation<D> | null>(
    null,
    { ownedWrite: true },
  )
  const sources = new Map<DragDropId, Registration<D>>()
  const targets = new Map<DragDropId, Registration<D>>()
  // Engine callbacks and disposal can arrive inside another reactive owner's cleanup.
  // This private bridge signal is the only state written by those callbacks.
  let observer: MutationObserver | undefined
  let releaseEngine: (() => void) | undefined
  let alive = true
  let disabled = false
  let current: DragOperation<D> | null = null
  let terminal = true
  let input: DragDropInput = 'pointer'
  const listeners = new Set<(event: DragDropEvent<D>) => void>()
  function notify(event: DragDropEvent<D>, callback: () => void) {
    let failed = false
    let failure: unknown
    for (const run of [...listeners]
      .map((listener) => () => listener(event))
      .concat(callback)) {
      try {
        run()
      } catch (error) {
        if (!failed) {
          failed = true
          failure = error
        }
      }
    }
    if (failed) throw failure
  }
  function notifyIntermediate(event: DragDropEvent<D>, callback: () => void) {
    try {
      notify(event, callback)
    } catch (error) {
      // Preserve the initiating failure even if the consumer's cancellation handler
      // also fails. cancel() still releases the engine in its finally block.
      try {
        cancel()
      } catch {
        /* the original callback failure takes precedence */
      }
      throw error
    }
  }
  function validate(sourceId: DragDropId, targetId?: DragDropId) {
    const source = sources.get(sourceId)
    if (
      !alive ||
      disabled ||
      !source ||
      source.disabled ||
      !source.element?.isConnected
    )
      return false
    if (targetId === undefined) return true
    const target = targets.get(targetId)
    return (
      !!target &&
      !target.disabled &&
      !!target.element?.isConnected &&
      untrack(() => target.accepts?.(source.item) ?? true)
    )
  }
  function publish(value: DragOperation<D> | null) {
    current = value
    setOperation(value)
  }
  function finish(canceled: boolean) {
    if (terminal) return
    terminal = true
    observer?.disconnect()
    const value = current
    publish(null)
    if (!value) return
    if (
      !canceled &&
      value.target &&
      validate(value.source.id, value.target.id)
    ) {
      const request = { ...value, target: value.target }
      notify({ type: 'drop', operation: request }, () =>
        untrack(() => options.onDrop)?.(request),
      )
    } else
      notify({ type: 'cancel', operation: value }, () =>
        untrack(() => options.onCancel)?.(value),
      )
  }
  function cancel() {
    try {
      finish(true)
    } finally {
      const engine = untrack(manager)
      if (engine) {
        try {
          if (!engine.dragOperation.status.idle)
            engine.actions.stop({ canceled: true })
        } finally {
          // Sensors can own activation constraints before an engine operation exists.
          for (const sensor of engine.sensors) {
            if (
              sensor instanceof PointerSensor ||
              sensor instanceof KeyboardSensor
            )
              sensor.cancel()
          }
        }
      }
    }
  }
  function invalidate() {
    const state = untrack(manager)?.dragOperation
    if (current && !validate(current.source.id, current.target?.id)) cancel()
    else if (
      state &&
      !state.status.idle &&
      state.source &&
      !validate(state.source.id, state.target?.id)
    )
      cancel()
  }
  const scope: DragDropScope<D> = {
    operation,
    cancel,
    subscribe(listener) {
      if (!alive) return () => {}
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    requestDrop(sourceId, targetId) {
      if (
        !validate(sourceId, targetId) ||
        !terminal ||
        !untrack(manager)?.dragOperation.status.idle
      )
        return false
      const source = sources.get(sourceId)!
      const target = targets.get(targetId)!
      const request: DropRequest<D> = {
        source: { ...source.item },
        target: { ...target.item },
        input: 'menu',
        point: null,
      }
      notify({ type: 'drop', operation: request }, () =>
        untrack(() => options.onDrop)?.(request),
      )
      return true
    },
  }
  setDragDropInternal(scope, {
    manager,
    sources,
    targets,
    alive: () => alive,
    disabled: () => disabled,
    validate,
    invalidate,
  })
  createDragKeyboard(scope, {
    get navigate() {
      return options.navigate
    },
  })
  createEffect(
    () => ({ disabled: !!options.disabled, revision: options.revision }),
    (next, previous) => {
      disabled = next.disabled
      if (disabled || (previous && next.revision !== previous.revision))
        cancel()
    },
  )
  createEffect(
    () => ({ engine: manager(), autoScroll: options.autoScroll ?? 'both' }),
    (next, previous) => {
      if (!next.engine) return
      if (previous?.engine && next.autoScroll !== previous.autoScroll) cancel()
      const plugin = next.engine.registry.plugins.get(AutoScroller)
      plugin?.configure({
        threshold: {
          x:
            next.autoScroll === false || next.autoScroll === 'vertical'
              ? 0
              : 0.2,
          y:
            next.autoScroll === false || next.autoScroll === 'horizontal'
              ? 0
              : 0.2,
        },
      })
    },
  )
  function dispose() {
    if (!alive) return
    alive = false
    try {
      cancel()
    } finally {
      try {
        releaseEngine?.()
      } finally {
        listeners.clear()
        sources.clear()
        targets.clear()
      }
    }
  }
  // One idempotent disposer owns both the pre-mount lifetime and mounted resources.
  // A throwing consumer cancellation cannot skip a later owner cleanup callback.
  onCleanup(dispose)
  onSettled(() => {
    if (!alive) return
    const engine = new DragDropManager({
      plugins: [AutoScroller, Cursor, PreventSelection],
    })
    const stopGeometry = observeDragGeometry(engine)
    function snapshot(): DragOperation<D> | null {
      const state = engine.dragOperation
      const source = state.source && sources.get(state.source.id)
      const target = state.target && targets.get(state.target.id)
      if (!source) return null
      const point = state.position.current
      return {
        source: { ...source.item },
        target: target ? { ...target.item } : null,
        input,
        point: { x: point.x, y: point.y },
      }
    }
    const remove = [
      engine.monitor.addEventListener('beforedragstart', (event) => {
        if (!event.operation.source || !validate(event.operation.source.id))
          event.preventDefault()
      }),
      engine.monitor.addEventListener('dragstart', (event) => {
        if (!alive) return
        if (!event.operation.source || !validate(event.operation.source.id)) {
          cancel()
          return
        }
        observer?.observe(document.documentElement, {
          childList: true,
          subtree: true,
        })
        input = event.nativeEvent?.type.startsWith('key')
          ? 'keyboard'
          : 'pointer'
        terminal = false
        publish(snapshot())
        const value = current
        if (value)
          notifyIntermediate({ type: 'start', operation: value }, () =>
            untrack(() => options.onStart)?.(value),
          )
      }),
      engine.monitor.addEventListener('dragover', () => {
        if (!alive || terminal) return
        publish(snapshot())
        invalidate()
        const value = current
        if (value)
          notifyIntermediate({ type: 'over', operation: value }, () =>
            untrack(() => options.onOver)?.(value),
          )
      }),
      engine.monitor.addEventListener('dragend', (event) => {
        if (!alive) return
        if (!terminal) publish(snapshot())
        finish(event.canceled)
      }),
    ]
    const stopBridge = engineEffect(() => {
      const value = snapshot()
      if (alive && !terminal) publish(value)
    })
    observer =
      typeof MutationObserver === 'undefined'
        ? undefined
        : new MutationObserver(invalidate)
    releaseEngine = () => {
      observer?.disconnect()
      stopBridge()
      stopGeometry()
      remove.forEach((dispose) => dispose())
      engine.destroy()
    }
    setManager(engine)
    return dispose
  })
  return scope
}
