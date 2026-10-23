import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/tooltip'
import { untrack } from 'solid-js'
import { PopupScope, createPopupScope, usePopupScope } from './popupScope'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type TooltipRootProps = Core.TooltipRootProps
export function TooltipRoot(props: TooltipRootProps) {
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
export type TooltipContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.TooltipContentProps<T> & { class?: ClassValue }
export function TooltipContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, TooltipContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-tooltip', props.class)}
    />
  )
}
export type TooltipPortalProps = Core.TooltipPortalProps
export function TooltipPortal(props: TooltipPortalProps) {
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
// Explicit compatibility exports retain the previously available primitive types.
export type {
  TooltipArrowCommonProps,
  TooltipArrowOptions,
  TooltipArrowProps,
  TooltipArrowRenderProps,
  TooltipContentCommonProps,
  TooltipContentOptions,
  TooltipContentRenderProps,
  TooltipRootOptions,
  TooltipTriggerCommonProps,
  TooltipTriggerOptions,
  TooltipTriggerRenderProps,
  Arrow,
  Content,
  Portal,
  Root,
  Trigger,
  TooltipContextValue,
  useTooltipContext,
} from '../internal/controls/tooltip'
