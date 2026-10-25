import { createContext } from 'solid-js'
import type { Accessor } from 'solid-js'

/** The nearest Theme owns portals even when a control has no trigger. */
export const PortalOwner = createContext<Accessor<
  HTMLElement | undefined
> | null>(null)
