import type { SortableId } from './move'
import type { SortableData, SortableScope } from './types'
export function sortableKey(
  kind: SortableData['kind'],
  id: SortableId,
): string {
  if (typeof id === 'number' && !Number.isFinite(id))
    throw new Error('Sortable numeric IDs must be finite')
  return `${kind}:${typeof id}:${id}`
}
interface SortableInternal {
  elements: Map<SortableId, HTMLElement>
  registerFocus(id: SortableId, node: HTMLElement): () => void
  hasItem(id: SortableId): boolean
  hasContainer(id: SortableId): boolean
  accepts(item: SortableId, target: SortableData): boolean
}
const internals = new WeakMap<SortableScope, SortableInternal>()
export function setSortableInternal(
  scope: SortableScope,
  internal: SortableInternal,
) {
  internals.set(scope, internal)
}
export function getSortableInternal(scope: SortableScope): SortableInternal {
  const internal = internals.get(scope)
  if (!internal) throw new Error('Unknown sortable scope')
  return internal
}
