import { createMemo, untrack } from 'solid-js'
import { createDragDrop } from '../dnd'
import type { DragNavigation, DragOperation } from '../dnd'
import { moveSortableItem } from './move'
import { createSortableFocus } from './focus'
import type { SortableDestination, SortableId, SortableMove } from './move'
import { setSortableInternal, sortableKey } from './internal'
import type { SortableData, SortableOptions, SortableScope } from './types'

/** Controlled sorting: only the caller changes accepted membership and order. */
export function createSortable(options: SortableOptions): SortableScope {
  const state = createMemo(() => {
    const containers = options.containers
    const containerIds = new Set<SortableId>()
    const itemIds = new Set<SortableId>()
    for (const container of containers) {
      sortableKey('container', container.id)
      if (containerIds.has(container.id))
        throw new Error(`Duplicate sortable container: ${container.id}`)
      containerIds.add(container.id)
      for (const item of container.items) {
        sortableKey('item', item)
        if (itemIds.has(item))
          throw new Error(`Duplicate sortable item: ${item}`)
        itemIds.add(item)
      }
    }
    return {
      containers,
      revision: JSON.stringify(containers.map(({ id, items }) => [id, items])),
    }
  })
  const focus = createSortableFocus(() => state().revision)
  const elements = new Map<SortableId, HTMLElement>()
  let startedRevision: string | undefined
  function proposal(
    itemId: SortableId,
    destination: SortableDestination,
  ): SortableMove | null {
    const containers = state().containers
    const source = containers.find((container) =>
      container.items.includes(itemId),
    )
    if (!source) return null
    const move = {
      itemId,
      source: { containerId: source.id, index: source.items.indexOf(itemId) },
      destination,
    }
    if (moveSortableItem(containers, move) === containers) return null
    if (options.disabled || !(options.canMove?.(move) ?? true)) return null
    return move
  }
  function destination(target: SortableData): SortableDestination | null {
    if (target.kind === 'container')
      return state().containers.some((container) => container.id === target.id)
        ? { containerId: target.id, beforeId: null }
        : null
    const container = state().containers.find((entry) =>
      entry.items.includes(target.id),
    )
    return container ? { containerId: container.id, beforeId: target.id } : null
  }
  function resolve(
    operation: DragOperation<SortableData>,
  ): SortableMove | null {
    if (operation.input !== 'menu' && startedRevision !== state().revision)
      return null
    if (operation.source.data.kind !== 'item' || !operation.target) return null
    const target = operation.target.data
    const where = destination(target)
    if (!where) return null
    if (
      operation.input === 'pointer' &&
      operation.point &&
      target.kind === 'item'
    ) {
      const rect = elements.get(target.id)?.getBoundingClientRect()
      const horizontal = options.orientation === 'horizontal'
      if (
        rect &&
        (horizontal
          ? operation.point.x > rect.left + rect.width / 2
          : operation.point.y > rect.top + rect.height / 2)
      ) {
        const container = state().containers.find(
          (entry) => entry.id === where.containerId,
        )!
        const next = container.items
          .slice(container.items.indexOf(target.id) + 1)
          .find((id) => id !== operation.source.data.id)
        return proposal(operation.source.data.id, {
          containerId: where.containerId,
          beforeId: next ?? null,
        })
      }
    }
    return proposal(operation.source.data.id, where)
  }
  function navigate(request: DragNavigation<SortableData>): string | null {
    const containers = state().containers
    const source = containers.find((container) =>
      container.items.includes(request.source.data.id),
    )
    if (!source) return null
    const current = request.target
      ? destination(request.target.data)
      : {
          containerId: source.id,
          beforeId: source.items[source.items.indexOf(request.source.data.id)]!,
        }
    if (!current) return null
    let containerIndex = containers.findIndex(
      (container) => container.id === current.containerId,
    )
    const container = containers[containerIndex]
    if (!container) return null
    const items = container.items.filter((id) => id !== request.source.data.id)
    let index =
      current.beforeId === null ? items.length : items.indexOf(current.beforeId)
    if (index < 0) index = source.items.indexOf(request.source.data.id)
    const horizontal = options.orientation === 'horizontal'
    const along = horizontal
      ? request.direction === 'left' || request.direction === 'right'
      : request.direction === 'up' || request.direction === 'down'
    const step =
      request.direction === 'left' || request.direction === 'up' ? -1 : 1
    const eligible = new Set(request.targets.map((target) => target.id))
    function candidate(container: (typeof containers)[number], index: number) {
      const ids = container.items.filter((id) => id !== request.source.data.id)
      const beforeId = ids[index] ?? null
      const key =
        beforeId === null
          ? sortableKey('container', container.id)
          : sortableKey('item', beforeId)
      return eligible.has(key) &&
        !options.disabled &&
        (options.canMove?.({
          itemId: request.source.data.id,
          source: {
            containerId: source!.id,
            index: source!.items.indexOf(request.source.data.id),
          },
          destination: { containerId: container.id, beforeId },
        }) ??
          true)
        ? key
        : null
    }
    if (along) {
      for (
        let next = index + step;
        next >= 0 && next <= items.length;
        next += step
      ) {
        const key = candidate(container, next)
        if (key !== null) return key
      }
    } else {
      for (
        containerIndex += step;
        containerIndex >= 0 && containerIndex < containers.length;
        containerIndex += step
      ) {
        const nextContainer = containers[containerIndex]!
        const count = nextContainer.items.filter(
          (id) => id !== request.source.data.id,
        ).length
        const preferred = Math.min(index, count)
        const positions = Array.from(
          { length: count + 1 },
          (_, index) => index,
        ).sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred))
        for (const position of positions) {
          const key = candidate(nextContainer, position)
          if (key !== null) return key
        }
      }
    }
    return null
  }
  const dragDrop = createDragDrop<SortableData>({
    get autoScroll() {
      return options.autoScroll
    },
    get disabled() {
      return options.disabled
    },
    get revision() {
      return state().revision
    },
    navigate,
    onStart() {
      focus.clear()
      startedRevision = state().revision
    },
    onDrop(operation) {
      const move = resolve(operation)
      if (move)
        untrack(() => {
          if (operation.input !== 'pointer') {
            const accepted = moveSortableItem(state().containers, move)
            focus.remember(
              move.itemId,
              state().revision,
              JSON.stringify(accepted.map(({ id, items }) => [id, items])),
            )
          }
          options.onMove(move)
        })
    },
  })
  const scope: SortableScope = {
    dragDrop,
    preview: createMemo(() => {
      const operation = dragDrop.operation()
      return operation ? resolve(operation) : null
    }),
    cancel: dragDrop.cancel,
    requestMove(item, where) {
      if (!proposal(item, where)) return false
      const target =
        where.beforeId === null
          ? sortableKey('container', where.containerId)
          : sortableKey('item', where.beforeId)
      return dragDrop.requestDrop(sortableKey('item', item), target)
    },
  }
  setSortableInternal(scope, {
    elements,
    registerFocus: focus.register,
    hasItem: (id) =>
      state().containers.some((container) => container.items.includes(id)),
    hasContainer: (id) =>
      state().containers.some((container) => container.id === id),
    accepts(item, target) {
      const where = destination(target)
      if (
        !where ||
        !state().containers.some((container) => container.items.includes(item))
      )
        return false
      const source = state().containers.find((container) =>
        container.items.includes(item),
      )!
      const positions = [where]
      if (target.kind === 'item') {
        const container = state().containers.find(
          (entry) => entry.id === where.containerId,
        )!
        const next = container.items
          .slice(container.items.indexOf(target.id) + 1)
          .find((id) => id !== item)
        positions.push({
          containerId: where.containerId,
          beforeId: next ?? null,
        })
      }
      // Collision candidates include either pointer side. Exact placement is
      // validated again by preview, keyboard navigation and the final request.
      return (
        !options.disabled &&
        positions.some(
          (destination) =>
            options.canMove?.({
              itemId: item,
              source: {
                containerId: source.id,
                index: source.items.indexOf(item),
              },
              destination,
            }) ?? true,
        )
      )
    },
  })
  return scope
}
