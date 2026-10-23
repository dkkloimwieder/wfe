import { createNativeListenerRef } from '../internal/nativeListenerLifetime'

type Handlers<T extends HTMLElement> = {
  [K in keyof HTMLElementEventMap]?: (
    event: HTMLElementEventMap[K] & { currentTarget: T },
  ) => void
}

/** Native listener repair: release handlers even if a browser event retains the node. */
export function nativeEvents<T extends HTMLElement>(handlers: Handlers<T>) {
  return createNativeListenerRef<T>(
    () => () => Object.entries(handlers) as Array<[string, EventListener]>,
  )
}
