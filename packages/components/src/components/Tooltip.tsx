import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/tooltip'
import { untrack } from 'solid-js'
import { PopupScope, createPopupScope, usePopupScope } from './popupScope'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export function TooltipRoot(props: Core.TooltipRootProps) {
  const scope = createPopupScope()
  return (
    <PopupScope value={scope}>
      <Core.Root {...props} />
    </PopupScope>
  )
}
export type TooltipTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.TooltipTriggerProps<T> & ButtonAppearanceProps
export function TooltipTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, TooltipTriggerProps<T>>,
) {
  const attributes = buttonAttributes(props) as typeof props
  const Primitive = Core.Trigger as Component<typeof props>
  const scope = usePopupScope()
  return (
    <Primitive
      {...attributes}
      type={
        props.type ??
        (props.as == null || props.as === 'button' ? 'button' : undefined)
      }
      data-ui=""
      ref={[scope.setTrigger, untrack(() => props.ref)]}
    />
  )
}
export function TooltipContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, Core.TooltipContentProps<T> & { class?: string }>,
) {
  const Primitive = Core.Content as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={'ui-tooltip ' + (props.class ?? '')}
    />
  )
}
export function TooltipPortal(props: Core.TooltipPortalProps) {
  const scope = usePopupScope()
  return (
    <Core.Portal {...props} mount={props.mount ?? scope.mount()}>
      <div data-ui="" class="ui-popup-portal" style={{ display: 'contents' }}>
        {props.children}
      </div>
    </Core.Portal>
  )
}
export const Tooltip = /* @__PURE__ */ Object.assign(TooltipRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Arrow: Core.Arrow,
  Root: TooltipRoot,
  Portal: TooltipPortal,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
})
export type * from '../internal/controls/tooltip'
