import {
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import type { Accessor } from 'solid-js'
import type { SortableId } from './move'

/** Restore only a focused source's replacement after the requested order is accepted. */
export function createSortableFocus(revision: Accessor<string>) {
  type Pending = {
    id: SortableId
    from: string
    accepted: string
    element: HTMLElement
  }
  const [pending, setPending] = createSignal<Pending | null>(null, {
    ownedWrite: true,
  })
  const [version, setVersion] = createSignal(0, { ownedWrite: true })
  const nodes = new Map<SortableId, HTMLElement>()
  let alive = true
  createEffect(
    () => ({ pending: pending(), revision: revision(), version: version() }),
    ({ pending: request, revision: accepted }) => {
      if (!request || accepted === request.from) return
      if (accepted !== request.accepted) {
        setPending(null)
        return
      }
      const node = nodes.get(request.id)
      if (!node?.isConnected) return
      const document = node.ownerDocument
      const focused = document.activeElement
      setPending(null)
      if (
        focused === request.element ||
        focused === document.body ||
        focused === document.documentElement ||
        focused === null
      )
        node.focus({ preventScroll: true })
    },
  )
  onSettled(() => {
    if (typeof document === 'undefined') return
    const moved = (event: FocusEvent) => {
      const request = untrack(pending)
      if (
        request &&
        event.target !== request.element &&
        event.target !== document.body &&
        event.target !== document.documentElement
      )
        setPending(null)
    }
    document.addEventListener('focusin', moved)
    return () => document.removeEventListener('focusin', moved)
  })
  onCleanup(() => {
    alive = false
    nodes.clear()
  })
  return {
    clear() {
      setPending(null)
    },
    remember(id: SortableId, from: string, accepted: string) {
      const node = nodes.get(id)
      if (node && node.ownerDocument.activeElement === node)
        setPending({ id, from, accepted, element: node })
      else setPending(null)
    },
    register(id: SortableId, node: HTMLElement) {
      if (!alive) return () => {}
      nodes.set(id, node)
      setVersion((value) => value + 1)
      return () => {
        if (nodes.get(id) === node) nodes.delete(id)
        if (alive) setVersion((value) => value + 1)
      }
    },
  }
}
