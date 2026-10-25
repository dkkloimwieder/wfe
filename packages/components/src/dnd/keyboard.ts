import { createEffect, untrack } from 'solid-js'
import { getDragDropInternal } from './internal'
import { effect as engineEffect } from '../vendor/dnd-kit/state/src/index'
import type { DragDropId, DragDropItem, DragDropScope } from './types'

export type DragDirection = 'up' | 'down' | 'left' | 'right'
export type DragNavigation<D> = {
  readonly source: DragDropItem<D>
  readonly target: DragDropItem<D> | null
  readonly direction: DragDirection
  readonly targets: ReadonlyArray<DragDropItem<D>>
}
export type DragKeyboardOptions<D> = {
  /** Return a registered target, or null to stay in place. */
  navigate?: (request: DragNavigation<D>) => DragDropId | null
}

/** Add target-to-target navigation to the engine's pickup/drop keyboard sensor. */
export function createDragKeyboard<D>(
  scope: DragDropScope<D>,
  options: DragKeyboardOptions<D> = {},
) {
  const internal = getDragDropInternal(scope)
  let navigate: DragKeyboardOptions<D>['navigate']
  createEffect(
    () => options.navigate,
    (value) => {
      navigate = value
    },
  )
  createEffect(
    () => internal.manager(),
    (manager) => {
      if (!manager) return
      let keyboard = false
      let restoreCollision = false
      const reset = () => {
        keyboard = false
        if (restoreCollision) manager.collisionObserver.enable()
        restoreCollision = false
      }
      const disposers = [
        manager.monitor.addEventListener('dragstart', (event) => {
          keyboard = !!event.nativeEvent?.type.startsWith('key')
          if (keyboard && !manager.collisionObserver.disabled) {
            manager.collisionObserver.disable()
            restoreCollision = true
          }
        }),
        manager.monitor.addEventListener('dragmove', (event) => {
          if (
            !internal.alive() ||
            !keyboard ||
            !event.nativeEvent?.type.startsWith('key')
          )
            return
          event.preventDefault()
          const sourceId = event.operation.source?.id
          if (sourceId === undefined || !internal.validate(sourceId)) return
          const source = internal.sources.get(sourceId)!
          const target =
            event.operation.target &&
            internal.targets.get(event.operation.target.id)
          const by = event.by
          const direction: DragDirection | undefined = by?.x
            ? by.x > 0
              ? 'right'
              : 'left'
            : by?.y
              ? by.y > 0
                ? 'down'
                : 'up'
              : undefined
          if (!direction) return
          const eligible = [...internal.targets.values()].filter(
            (entry) =>
              entry !== target && internal.validate(sourceId, entry.item.id),
          )
          let destination: DragDropId | null = null
          const currentNavigate = navigate
          if (currentNavigate) {
            try {
              destination = untrack(() =>
                currentNavigate({
                  source: source.item,
                  target: target?.item ?? null,
                  direction,
                  targets: eligible.map((entry) => entry.item),
                }),
              )
            } catch (error) {
              try {
                scope.cancel()
              } finally {
                throw error
              }
            }
          } else {
            const origin = (
              target?.element ?? source.element
            )?.getBoundingClientRect()
            if (!origin) return
            const horizontal = direction === 'left' || direction === 'right'
            const sign = direction === 'left' || direction === 'up' ? -1 : 1
            const x = origin.left + origin.width / 2
            const y = origin.top + origin.height / 2
            let best = Infinity
            for (const entry of eligible) {
              const box = entry.element!.getBoundingClientRect()
              if (!box.width || !box.height) continue
              const dx = box.left + box.width / 2 - x
              const dy = box.top + box.height / 2 - y
              const forward = (horizontal ? dx : dy) * sign
              if (forward <= 1) continue
              const cross = Math.abs(horizontal ? dy : dx)
              const distance = forward + cross * 2
              if (distance < best) {
                best = distance
                destination = entry.item.id
              }
            }
          }
          if (destination === null || !internal.validate(sourceId, destination))
            return
          const node = internal.targets.get(destination)?.element
          if (!node) return
          node.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior: 'instant',
          })
          const box = node.getBoundingClientRect()
          manager.actions.setDropTarget(destination)
          // Do not redispatch dragmove: the sensor event already selected a target.
          manager.actions.move({
            to: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
            propagate: false,
          })
        }),
        manager.monitor.addEventListener('dragend', reset),
      ]
      const stopStatus = engineEffect(() => {
        if (manager.dragOperation.status.idle) reset()
      })
      return () => {
        stopStatus()
        for (const dispose of disposers) dispose()
        reset()
      }
    },
  )
}
