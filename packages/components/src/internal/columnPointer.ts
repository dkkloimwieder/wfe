import { createEffect, onSettled } from 'solid-js'

type Activity = 'start' | 'end' | 'cancel'

/** Own transient column gesture resources; consumers retain their distinct geometry. */
export function createColumnPointer<T extends { pointerId: number }>(options: {
  disabled: () => boolean
  cleanup: (value: T) => void
  escape?: () => void
  activity?: (event: Activity, listeners: number) => void
}) {
  let current: T | undefined
  let target: HTMLElement | undefined
  let disposed = false
  let removals: Array<() => void> = []
  function release(event: 'end' | 'cancel') {
    const value = current
    const handle = target
    if (!value || !handle) return
    current = undefined
    target = undefined
    const registered = removals
    removals = []
    for (const remove of registered) remove()
    options.cleanup(value)
    if (handle.hasPointerCapture(value.pointerId))
      handle.releasePointerCapture(value.pointerId)
    options.activity?.(event, -registered.length)
    return value
  }
  const cancel = () => {
    release('cancel')
  }
  const matches = (event: PointerEvent) =>
    current?.pointerId === event.pointerId
  function canStart(event: PointerEvent) {
    return (
      !disposed &&
      !current &&
      !options.disabled() &&
      event.button === 0 &&
      event.isPrimary
    )
  }
  function start(
    event: PointerEvent,
    handle: HTMLElement,
    createValue: () => T,
    scroll?: (value: T) =>
      | {
          target: HTMLElement
          changed: () => void
        }
      | undefined,
  ) {
    if (!canStart(event)) return false
    event.preventDefault()
    event.stopPropagation()
    handle.focus({ preventScroll: true })
    handle.setPointerCapture(event.pointerId)
    current = createValue()
    target = handle
    const doc = handle.ownerDocument
    const win = doc.defaultView!
    function listen(
      node: EventTarget,
      name: string,
      listener: EventListener,
      capture = false,
    ) {
      node.addEventListener(name, listener, capture)
      removals.push(() => node.removeEventListener(name, listener, capture))
    }
    listen(win, 'blur', cancel)
    listen(doc, 'visibilitychange', () => {
      if (doc.hidden) cancel()
    })
    listen(
      doc,
      'keydown',
      (event) => {
        const key = event as KeyboardEvent
        if (key.key !== 'Escape' || key.isComposing || !current) return
        key.preventDefault()
        key.stopPropagation()
        options.escape?.()
        cancel()
      },
      true,
    )
    const scrolling = scroll?.(current)
    if (scrolling) listen(scrolling.target, 'scroll', scrolling.changed)
    options.activity?.('start', removals.length)
    return true
  }
  createEffect(options.disabled, (disabled) => {
    if (disabled) cancel()
  })
  onSettled(() => () => {
    disposed = true
    cancel()
  })
  return {
    get current() {
      return current
    },
    canStart,
    start,
    cancel,
    finish: () => release('end'),
    cancelPointer: (event: PointerEvent) => {
      if (matches(event)) cancel()
    },
    matches,
  }
}
