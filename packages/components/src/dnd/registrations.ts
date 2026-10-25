import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import {
  Draggable,
  Droppable,
  PointerSensor,
  KeyboardSensor,
  PointerActivationConstraints,
} from '../vendor/dnd-kit/dom/src/core/index'
import { getDragDropInternal } from './internal'
import type { Registration } from './internal'
import type {
  DragDropScope,
  DraggableOptions,
  DroppableOptions,
  DraggableRegistration,
  DroppableRegistration,
} from './types'

export function createDraggable<D>(
  scope: DragDropScope<D>,
  options: DraggableOptions<D>,
): DraggableRegistration {
  const internal = getDragDropInternal(scope)
  const [element, setElement] = createSignal<HTMLElement>()
  const [handle, setHandle] = createSignal<HTMLElement>()
  let alive = true
  let registration: Registration<D> | undefined
  let entity: Draggable | undefined
  let previousKeyboard: boolean | undefined
  let previousActivation = ''
  function remove() {
    const previous = registration
    const previousEntity = entity
    if (!previous) return
    registration = undefined
    entity = undefined
    if (internal.sources.get(previous.item.id) === previous)
      internal.sources.delete(previous.item.id)
    try {
      internal.invalidate()
    } finally {
      previousEntity?.destroy()
    }
  }

  createEffect(
    () => ({
      manager: internal.manager(),
      element: element(),
      handle: handle(),
      id: options.id,
      label: options.label,
      data: options.data,
      disabled: !!options.disabled,
      keyboard: options.keyboard !== false,
      distance: options.activation?.distance,
      delay: options.activation?.delay,
      tolerance: options.activation?.tolerance,
    }),
    (next) => {
      if (!alive || !internal.alive()) return
      const activation = JSON.stringify([
        next.distance,
        next.delay,
        next.tolerance,
      ])
      if (
        registration &&
        (registration.item.id !== next.id ||
          registration.element !== next.element ||
          previousKeyboard !== next.keyboard ||
          previousActivation !== activation)
      )
        remove()
      if (!next.manager || !next.element?.isConnected) {
        remove()
        return
      }
      if (!registration) {
        if (internal.sources.has(next.id))
          throw new Error(`Duplicate draggable id: ${next.id}`)
        registration = {
          item: { id: next.id, label: next.label, data: next.data },
          element: next.element,
          disabled: next.disabled,
        }
        internal.sources.set(next.id, registration)
        previousKeyboard = next.keyboard
        previousActivation = activation
        const constraints = []
        if (next.distance !== undefined)
          constraints.push(
            new PointerActivationConstraints.Distance({ value: next.distance }),
          )
        if (next.delay !== undefined)
          constraints.push(
            new PointerActivationConstraints.Delay({
              value: next.delay,
              tolerance: next.tolerance ?? 5,
            }),
          )
        const pointer = constraints.length
          ? PointerSensor.configure({ activationConstraints: constraints })
          : PointerSensor
        entity = new Draggable(
          {
            id: next.id,
            register: false,
            element: next.element,
            handle: next.handle,
            disabled: next.disabled,
            sensors: next.keyboard ? [pointer, KeyboardSensor] : [pointer],
          },
          next.manager,
        )
        registration.entity = entity
        entity.register()
      }
      registration.item = { id: next.id, label: next.label, data: next.data }
      registration.disabled = next.disabled
      entity!.disabled = next.disabled
      entity!.handle = next.handle
      internal.invalidate()
    },
  )
  onCleanup(() => {
    alive = false
    remove()
  })
  return {
    ref: (value) => {
      if (alive) setElement(value)
    },
    handleRef: (value) => {
      if (alive) setHandle(value)
    },
    dragging: () => {
      const operation = scope.operation()
      return !!registration && operation?.source.id === registration.item.id
    },
  }
}

export function createDroppable<D>(
  scope: DragDropScope<D>,
  options: DroppableOptions<D>,
): DroppableRegistration {
  const internal = getDragDropInternal(scope)
  const activeSourceId = createMemo(() => scope.operation()?.source.id)
  const [element, setElement] = createSignal<HTMLElement>()
  let alive = true
  let registration: Registration<D> | undefined
  let entity: Droppable | undefined
  function remove() {
    const previous = registration
    const previousEntity = entity
    if (!previous) return
    registration = undefined
    entity = undefined
    if (internal.targets.get(previous.item.id) === previous)
      internal.targets.delete(previous.item.id)
    try {
      internal.invalidate()
    } finally {
      previousEntity?.destroy()
    }
  }

  createEffect(
    () => {
      const sourceId = activeSourceId()
      const active =
        sourceId === undefined
          ? undefined
          : internal.sources.get(sourceId)?.item
      return {
        manager: internal.manager(),
        element: element(),
        id: options.id,
        label: options.label,
        data: options.data,
        disabled: !!options.disabled,
        accepts: options.accepts,
        priority: options.priority,
        allowed: !active || (options.accepts?.(active) ?? true),
      }
    },
    (next) => {
      if (!alive || !internal.alive()) return
      if (
        registration &&
        (registration.item.id !== next.id ||
          registration.element !== next.element)
      )
        remove()
      if (!next.manager || !next.element?.isConnected) {
        remove()
        return
      }
      if (!registration) {
        if (internal.targets.has(next.id))
          throw new Error(`Duplicate droppable id: ${next.id}`)
        registration = {
          item: { id: next.id, label: next.label, data: next.data },
          element: next.element,
          disabled: next.disabled,
        }
        internal.targets.set(next.id, registration)
        entity = new Droppable(
          {
            id: next.id,
            register: false,
            element: next.element,
            disabled: next.disabled,
            collisionPriority: next.priority,
          },
          next.manager,
        )
        registration.entity = entity
        entity.register()
      }
      registration.item = { id: next.id, label: next.label, data: next.data }
      registration.disabled = next.disabled
      registration.accepts = next.accepts
      entity!.disabled = next.disabled
      entity!.collisionPriority = next.priority
      entity!.accept = (source) => internal.validate(source.id, next.id)
      internal.invalidate()
    },
  )
  onCleanup(() => {
    alive = false
    remove()
  })
  return {
    ref: (value) => {
      if (alive) setElement(value)
    },
    targeted: () => {
      const operation = scope.operation()
      return !!registration && operation?.target?.id === registration.item.id
    },
  }
}
