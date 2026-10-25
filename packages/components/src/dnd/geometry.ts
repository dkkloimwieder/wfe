import type { DragDropManager } from '../vendor/dnd-kit/dom/src/core/index'
import { DOMRectangle } from '../vendor/dnd-kit/dom/src/utilities/index'
import { Rectangle } from '../vendor/dnd-kit/geometry/src/index'
import { effect, untracked } from '../vendor/dnd-kit/state/src/index'

/** Keep collision geometry without moving or cloning a Solid-owned element. */
export function observeDragGeometry(manager: DragDropManager): () => void {
  return effect(() => {
    const operation = manager.dragOperation
    const initialized = operation.status.initialized
    const element = operation.source?.element
    if (!initialized || !element?.isConnected) return undefined
    const measured = new DOMRectangle(element)
    // Pointer coordinates and collision rectangles are viewport coordinates. Scrolling
    // moves targets, not the virtual dragged rectangle pinned to the current pointer.
    let base = Rectangle.from(measured.boundingRectangle)
    const update = () => {
      const { x, y } = operation.transform
      untracked(() => {
        operation.shape = base.translate(x, y)
      })
    }
    const stop = effect(update)
    const resize =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => {
            const bounds = new DOMRectangle(element)
            base = new Rectangle(
              base.left,
              base.top,
              bounds.width,
              bounds.height,
            )
            update()
          })
    resize?.observe(element)
    return () => {
      resize?.disconnect()
      stop()
    }
  })
}
