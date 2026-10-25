import type { Accessor } from 'solid-js'
import type {
  DragDropScope,
  DragDropOptions,
  DraggableOptions,
  DraggableRegistration,
  DroppableRegistration,
} from '../dnd'
import type {
  SortableContainer,
  SortableDestination,
  SortableId,
  SortableMove,
} from './move'

export type SortableData = {
  readonly kind: 'item' | 'container'
  readonly id: SortableId
}
export interface SortableOptions {
  /** Accepted application state. Changes to membership or order cancel a drag. */
  containers: ReadonlyArray<SortableContainer>
  orientation?: 'vertical' | 'horizontal'
  autoScroll?: DragDropOptions['autoScroll']
  disabled?: boolean
  canMove?: (move: SortableMove) => boolean
  /** One final request. The application decides whether and when to accept it. */
  onMove: (move: SortableMove) => void
}
export interface SortableScope {
  readonly dragDrop: DragDropScope<SortableData>
  readonly preview: Accessor<SortableMove | null>
  cancel(): void
  /** Menu alternative using the same registered source, target and validation. */
  requestMove(item: SortableId, destination: SortableDestination): boolean
}
export interface SortableItemOptions {
  id: SortableId
  label: string
  disabled?: boolean
  keyboard?: boolean
  activation?: DraggableOptions<SortableData>['activation']
}
export interface SortableContainerOptions {
  id: SortableId
  label: string
  disabled?: boolean
}
export interface SortableItemRegistration extends DraggableRegistration {
  readonly targeted: DroppableRegistration['targeted']
}
