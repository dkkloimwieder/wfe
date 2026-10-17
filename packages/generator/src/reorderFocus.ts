import { createEffect, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'

/** Keep browser focus when a keyed list physically moves its retained control. */
export function preserveReorderFocus(
  rootId: string,
  order: Accessor<readonly string[]>,
) {
  let alive = true
  let latestFocus: EventTarget | null = null
  onCleanup(() => {
    alive = false
  })
  if (typeof document === 'undefined') return
  const focus = (event: FocusEvent) => {
    latestFocus = event.target
  }
  document.addEventListener('focusin', focus)
  onCleanup(() => document.removeEventListener('focusin', focus))
  createEffect(
    () => {
      const identities = order()
      const active = document.activeElement
      const node =
        active && document.getElementById(rootId)?.contains(active)
          ? active
          : undefined
      return { identities, node, focus: latestFocus }
    },
    (next, previous) => {
      if (
        !previous ||
        (next.identities.length === previous.identities.length &&
          next.identities.every(
            (id, index) => id === previous.identities[index],
          ))
      )
        return
      const node = next.node
      if (
        !alive ||
        !(node instanceof HTMLElement) ||
        !node.isConnected ||
        !document.getElementById(rootId)?.contains(node) ||
        Boolean(node.closest('[inert], [hidden], [aria-hidden="true"]')) ||
        node.matches(':disabled') ||
        document.activeElement !== document.body ||
        latestFocus !== next.focus
      )
        return
      node.focus({ preventScroll: true })
    },
    { transparent: true },
  )
}
