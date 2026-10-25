import { PortalOwner } from '../internal/portalOwner'
import { portalMount } from '../internal/portalMount'
import { createContext, onCleanup, useContext } from 'solid-js'

export function createDialogScope() {
  const owner = useContext(PortalOwner)
  let trigger: HTMLElement | undefined
  let content: HTMLElement | undefined
  let cancel: HTMLElement | undefined
  let origin =
    typeof document === 'undefined'
      ? undefined
      : (document.activeElement as HTMLElement | null)
  onCleanup(() => {
    trigger = content = cancel = undefined
    origin = undefined
  })
  return {
    setTrigger: (node: HTMLElement) => {
      trigger = node
    },
    setContent: (node: HTMLElement) => {
      content = node
    },
    setCancel: (node: HTMLElement) => {
      cancel = node
    },
    initialAlertFocus: (event: Event) => {
      if (event.defaultPrevented) return
      event.preventDefault()
      ;(cancel ?? content)?.focus({ preventScroll: true })
    },
    mount: () => {
      const mount = portalMount(trigger ?? owner?.() ?? origin)
      // A control boundary without a containing scope keeps the body fallback.
      return mount === trigger ? undefined : mount
    },
  }
}
export const DialogScope = createContext<ReturnType<
  typeof createDialogScope
> | null>(null)
export function useDialogScope() {
  const scope = useContext(DialogScope)
  if (!scope) throw new Error('Use dialog parts inside Dialog.Root')
  return scope
}
