import { getOwner, onSettled } from 'solid-js'

type ListenerEntry = readonly [name: string, handler: EventListener]

/** Share lifetime only; callers decide when to capture handlers and what dispatch reads. */
export function createNativeListenerRef<T extends HTMLElement>(
  prepare: () => () => ReadonlyArray<ListenerEntry>,
) {
  if (!getOwner())
    throw new Error('Create native listeners inside a Solid owner')
  const readEntries = prepare()
  let element: T | undefined
  onSettled(() => {
    const node = element
    if (!node) return
    const entries = readEntries()
    for (const [name, handler] of entries) node.addEventListener(name, handler)
    return () => {
      for (const [name, handler] of entries)
        node.removeEventListener(name, handler)
      element = undefined
    }
  })
  return (node: T) => {
    element = node
  }
}
