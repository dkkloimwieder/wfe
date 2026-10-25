import { createEffect, createSignal, onCleanup } from 'solid-js'
import { createDraggable } from '../dnd'
import { createDroppableRegistration } from '../dnd/registrations'
import { defaultCollisionDetection } from '../vendor/dnd-kit/collision/src/index'
import type { CollisionDetector } from '../vendor/dnd-kit/abstract/src/core/index'
import { getSortableInternal, sortableKey } from './internal'
import type {
  SortableContainerOptions,
  SortableItemOptions,
  SortableItemRegistration,
  SortableScope,
} from './types'
import type { DroppableRegistration } from '../dnd'

// Preserve pointer-over-shape preference before preferring an item within its list.
// Absolute item priorities would let a wide card overlapping the neighboring list
// defeat the container actually under the pointer.
const itemCollision: CollisionDetector = (input) => {
  const collision = defaultCollisionDetection(input)
  return collision
    ? { ...collision, priority: collision.priority * 2 + 1 }
    : null
}
const containerCollision: CollisionDetector = (input) => {
  const collision = defaultCollisionDetection(input)
  return collision ? { ...collision, priority: collision.priority * 2 } : null
}

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
  const target = createDroppableRegistration(
    scope.dragDrop,
    {
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
    },
    itemCollision,
  )
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
  return createDroppableRegistration(
    scope.dragDrop,
    {
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
    },
    containerCollision,
  )
}
