import { createEffect, getOwner, onSettled } from 'solid-js'

type ListenerEntry = readonly [name: string, handler: EventListener]

/** Share lifetime only; callers decide when to capture handlers and what dispatch reads. */
export function createNativeListenerRef<T extends HTMLElement>(
  prepare: () => () => ReadonlyArray<ListenerEntry>,
  reactive = false,
) {
  if (!getOwner())
    throw new Error('Create native listeners inside a Solid owner')
  const readEntries = prepare()
  let element: T | undefined
  let mounted: T | undefined
  let entries: ReadonlyArray<ListenerEntry> = []
  const remove = () => {
    for (const [name, handler] of entries)
      mounted?.removeEventListener(name, handler)
  }
  const install = (next: ReadonlyArray<ListenerEntry>) => {
    remove()
    entries = next
    for (const [name, handler] of entries)
      mounted?.addEventListener(name, handler)
  }
  // Only owned props track their event-name inventory. Public nativeEvents
  // deliberately captures a fixed map at settlement.
  if (reactive)
    createEffect(readEntries, (next) => {
      if (mounted) install(next)
    })
  onSettled(() => {
    const node = element
    if (!node) return
    mounted = node
    install(readEntries())
    return () => {
      remove()
      mounted = undefined
      entries = []
      element = undefined
    }
  })
  return (node: T) => {
    element = node
  }
}
