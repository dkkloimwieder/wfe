import { createEffect, createSignal, onCleanup } from 'solid-js'
import { createDraggable, createDroppable } from '../dnd'
import { getSortableInternal, sortableKey } from './internal'
import type {
  SortableContainerOptions,
  SortableItemOptions,
  SortableItemRegistration,
  SortableScope,
} from './types'
import type { DroppableRegistration } from '../dnd'

export function createSortableItem(
  scope: SortableScope,
  options: SortableItemOptions,
): SortableItemRegistration {
  const internal = getSortableInternal(scope)
  let alive = true
  onCleanup(() => {
    alive = false
  })
  const source = createDraggable(scope.dragDrop, {
    get id() {
      return sortableKey('item', options.id)
    },
    get label() {
      return options.label
    },
    get data() {
      return { kind: 'item' as const, id: options.id }
    },
    get disabled() {
      return options.disabled || !internal.hasItem(options.id)
    },
    get activation() {
      return options.activation
    },
    get keyboard() {
      return options.keyboard
    },
  })
  const target = createSortableTarget(scope, options)
  const [element, setElement] = createSignal<HTMLElement>()
  const [handle, setHandle] = createSignal<HTMLElement>()
  createEffect(
    () => ({ id: options.id, node: handle() ?? element() }),
    ({ id, node }) => (node ? internal.registerFocus(id, node) : undefined),
  )
  return {
    ref(value) {
      if (!alive) return
      setElement(value)
      source.ref(value)
      target.ref(value)
    },
    handleRef(value) {
      if (!alive) return
      setHandle(value)
      source.handleRef(value)
    },
    dragging: source.dragging,
    targeted: target.targeted,
  }
}

/** A sortable item's destination without a drag source, useful for external handles. */
export function createSortableTarget(
  scope: SortableScope,
  options: SortableItemOptions,
): DroppableRegistration {
  const internal = getSortableInternal(scope)
  let alive = true
  onCleanup(() => {
    alive = false
  })
  const target = createDroppable(scope.dragDrop, {
    get id() {
      return sortableKey('item', options.id)
    },
    get label() {
      return options.label
    },
    get data() {
      return { kind: 'item' as const, id: options.id }
    },
    get disabled() {
      return options.disabled || !internal.hasItem(options.id)
    },
    accepts: (item) =>
      item.data.kind === 'item' &&
      internal.accepts(item.data.id, { kind: 'item', id: options.id }),
    priority: 1,
  })
  const [element, setElement] = createSignal<HTMLElement>()
  createEffect(
    () => ({ id: options.id, element: element() }),
    ({ id, element: node }) => {
      if (!node) return undefined
      internal.elements.set(id, node)
      return () => {
        if (internal.elements.get(id) === node) internal.elements.delete(id)
      }
    },
  )
  return {
    ref(value) {
      if (!alive) return
      setElement(value)
      target.ref(value)
    },
    targeted: target.targeted,
  }
}

export function createSortableContainer(
  scope: SortableScope,
  options: SortableContainerOptions,
): DroppableRegistration {
  const internal = getSortableInternal(scope)
  return createDroppable(scope.dragDrop, {
    get id() {
      return sortableKey('container', options.id)
    },
    get label() {
      return options.label
    },
    get data() {
      return { kind: 'container' as const, id: options.id }
    },
    get disabled() {
      return options.disabled || !internal.hasContainer(options.id)
    },
    accepts: (item) =>
      item.data.kind === 'item' &&
      internal.accepts(item.data.id, { kind: 'container', id: options.id }),
    priority: 0,
  })
}
