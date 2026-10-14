import { createEventListener } from '@solid-primitives/event-listener'
import { createRoot, onCleanup, untrack } from 'solid-js'
import type { Accessor } from 'solid-js'

// Native reset applies default checked values after dispatching its event.
export function createNativeFormResetListener(
  element: Accessor<HTMLElement | undefined>,
  handler: () => void,
) {
  const pending = new Set<ReturnType<typeof setTimeout>>()
  const form = () => {
    const node = element()
    if (!node) return undefined
    if (node.matches('input, select, textarea, button'))
      return (node as HTMLInputElement).form ?? undefined
    return node.closest<HTMLFormElement>('form') ?? undefined
  }
  // The event primitive skips its effect on the server. Keep that DOM-only
  // work in its own scope so sibling hydration keys stay consistent.
  const release = createRoot((dispose) => {
    createEventListener(form, 'reset', (event) => {
      const timer = setTimeout(() => {
        pending.delete(timer)
        untrack(() => {
          if (!event.defaultPrevented && element()?.isConnected) handler()
        })
      }, 0)
      pending.add(timer)
    })
    return dispose
  })
  onCleanup(release)
  onCleanup(() => {
    for (const timer of pending) clearTimeout(timer)
    pending.clear()
  })
}
