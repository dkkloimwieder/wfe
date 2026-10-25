import type { Accessor } from 'solid-js'
import type { DragKeyboardOptions } from './keyboard'

export type DragDropId = string | number
export type DragDropInput = 'pointer' | 'keyboard' | 'menu'
export interface DragDropItem<D = unknown> {
  readonly id: DragDropId
  readonly label: string
  readonly data: D
}
export interface DragOperation<D = unknown> {
  readonly source: DragDropItem<D>
  readonly target: DragDropItem<D> | null
  readonly input: DragDropInput
  readonly point: Readonly<{ x: number; y: number }> | null
}
export interface DropRequest<D = unknown> extends DragOperation<D> {
  readonly target: DragDropItem<D>
}
export interface DragDropOptions<D = unknown> {
  /** Edge auto-scroll axes; defaults to both. Changing this cancels an active drag. */
  autoScroll?: false | 'both' | 'horizontal' | 'vertical'
  navigate?: DragKeyboardOptions<D>['navigate']
  disabled?: boolean
  /** Change this token to cancel a drag after application layout/data invalidation. */
  revision?: unknown
  onStart?: (operation: DragOperation<D>) => void
  onOver?: (operation: DragOperation<D>) => void
  onDrop?: (request: DropRequest<D>) => void
  onCancel?: (operation: DragOperation<D>) => void
}
export type DragDropEvent<D = unknown> =
  | {
      readonly type: 'start' | 'over' | 'cancel'
      readonly operation: DragOperation<D>
    }
  | { readonly type: 'drop'; readonly operation: DropRequest<D> }
export interface DragDropScope<D = unknown> {
  subscribe(listener: (event: DragDropEvent<D>) => void): () => void
  readonly operation: Accessor<DragOperation<D> | null>
  cancel(): void
  /** Dispatch a validated move request without simulating a pointer drag. */
  requestDrop(source: DragDropId, target: DragDropId): boolean
}
export interface DraggableOptions<D = unknown> extends DragDropItem<D> {
  disabled?: boolean
  keyboard?: boolean
  activation?: { distance?: number; delay?: number; tolerance?: number }
}
export interface DroppableOptions<D = unknown> extends DragDropItem<D> {
  disabled?: boolean
  accepts?: (source: DragDropItem<D>) => boolean
  priority?: number
}
export interface DraggableRegistration {
  ref(element: HTMLElement | undefined): void
  handleRef(element: HTMLElement | undefined): void
  readonly dragging: Accessor<boolean>
}
export interface DroppableRegistration {
  ref(element: HTMLElement | undefined): void
  readonly targeted: Accessor<boolean>
}
