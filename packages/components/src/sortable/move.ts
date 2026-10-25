export type SortableId = string | number

export type SortableContainer = {
  readonly id: SortableId
  readonly items: ReadonlyArray<SortableId>
}

export type SortableDestination = {
  readonly containerId: SortableId
  /** null appends after the final item. */
  readonly beforeId: SortableId | null
}

export type SortableMove = {
  readonly itemId: SortableId
  readonly source: { readonly containerId: SortableId; readonly index: number }
  readonly destination: SortableDestination
}

/** Apply a request to the caller's current IDs without mutating accepted state. */
export function moveSortableItem<T extends SortableContainer>(
  containers: ReadonlyArray<T>,
  move: SortableMove,
): ReadonlyArray<T> {
  const source = containers.find((item) => item.id === move.source.containerId)
  const target = containers.find(
    (item) => item.id === move.destination.containerId,
  )
  if (!source || !target || source.items[move.source.index] !== move.itemId)
    return containers
  if (new Set(containers.map((item) => item.id)).size !== containers.length)
    return containers
  const ids = containers.flatMap((item) => [...item.items])
  if (new Set(ids).size !== ids.length) return containers
  const before = move.destination.beforeId
  if (before === move.itemId) return containers
  if (before !== null && !target.items.includes(before)) return containers
  const remaining = source.items.filter((id) => id !== move.itemId)
  const destination = source === target ? remaining : [...target.items]
  const index =
    before === null ? destination.length : destination.indexOf(before)
  const next = [
    ...destination.slice(0, index),
    move.itemId,
    ...destination.slice(index),
  ]
  if (source === target && next.every((id, i) => id === source.items[i]))
    return containers
  return containers.map((container) => {
    if (container === target) return { ...container, items: next }
    if (container === source) return { ...container, items: remaining }
    return container
  })
}
