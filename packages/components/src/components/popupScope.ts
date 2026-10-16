import { portalMount } from '../internal/portalMount'
import { createContext, onCleanup, useContext } from 'solid-js'

export function createPopupScope() {
  let trigger: HTMLElement | undefined
  onCleanup(() => {
    trigger = undefined
  })
  return {
    setTrigger: (node: HTMLElement) => {
      trigger = node
    },
    mount: () => portalMount(trigger),
  }
}
export const PopupScope = createContext<ReturnType<
  typeof createPopupScope
> | null>(null)
export function usePopupScope() {
  const scope = useContext(PopupScope)
  if (!scope) throw new Error('Use popup parts inside their Root')
  return scope
}
