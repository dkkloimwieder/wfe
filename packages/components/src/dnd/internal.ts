import type { Accessor } from 'solid-js'
import type {
  DragDropManager,
  Draggable,
  Droppable,
} from '../vendor/dnd-kit/dom/src/core/index'
import type { DragDropId, DragDropItem, DragDropScope } from './types'

export interface Registration<D> {
  item: DragDropItem<D>
  element: HTMLElement | undefined
  disabled: boolean
  accepts?: (source: DragDropItem<D>) => boolean
  entity?: Draggable | Droppable
}
export interface DragDropInternal<D> {
  manager: Accessor<DragDropManager | undefined>
  sources: Map<DragDropId, Registration<D>>
  targets: Map<DragDropId, Registration<D>>
  alive(): boolean
  disabled(): boolean
  validate(source: DragDropId, target?: DragDropId): boolean
  invalidate(): void
}
const internals = new WeakMap<object, unknown>()
export function setDragDropInternal<D>(
  scope: DragDropScope<D>,
  internal: DragDropInternal<D>,
) {
  internals.set(scope, internal)
}
export function getDragDropInternal<D>(
  scope: DragDropScope<D>,
): DragDropInternal<D> {
  const internal = internals.get(scope)
  if (!internal) throw new Error('Unknown drag-and-drop scope')
  return internal as DragDropInternal<D>
}
