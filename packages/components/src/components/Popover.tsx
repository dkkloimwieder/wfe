import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/popover'
import { untrack } from 'solid-js'
import { PopupScope, createPopupScope, usePopupScope } from './popupScope'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type PopoverRootProps = Core.PopoverRootProps
export function PopoverRoot(props: PopoverRootProps) {
  const scope = createPopupScope()
  return (
    <PopupScope value={scope}>
      <Core.Root {...props} />
    </PopupScope>
  )
}
export type PopoverTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.PopoverTriggerProps<T> & ButtonAppearanceProps
export function PopoverTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, PopoverTriggerProps<T>>,
) {
  const attributes = buttonAttributes(props) as typeof props
  const Primitive = Core.Trigger as Component<typeof props>
  const scope = usePopupScope()
  return (
    <Primitive
      {...attributes}
      data-ui=""
      ref={[scope.setTrigger, untrack(() => props.ref)]}
    />
  )
}
export type PopoverContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.PopoverContentProps<T> & { class?: ClassValue }
export function PopoverContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, PopoverContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-popover', props.class)}
    />
  )
}
export type PopoverCloseButtonProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.PopoverCloseButtonProps<T> & ButtonAppearanceProps
export function PopoverCloseButton<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, PopoverCloseButtonProps<T>>,
) {
  const attributes = buttonAttributes(props) as typeof props
  const Primitive = Core.CloseButton as Component<typeof props>
  return <Primitive {...attributes} data-ui="" />
}
export type PopoverTitleProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.PopoverTitleProps<T> & { class?: ClassValue }
export function PopoverTitle<T extends ValidComponent = 'h2'>(
  props: PolymorphicProps<T, PopoverTitleProps<T>>,
) {
  const Primitive = Core.Title as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-popup-title', props.class)}
    />
  )
}
export type PopoverDescriptionProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.PopoverDescriptionProps<T> & { class?: ClassValue }
export function PopoverDescription<T extends ValidComponent = 'p'>(
  props: PolymorphicProps<T, PopoverDescriptionProps<T>>,
) {
  const Primitive = Core.Description as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-popup-description', props.class)}
    />
  )
}
export type PopoverPortalProps = Core.PopoverPortalProps
export function PopoverPortal(props: PopoverPortalProps) {
  const scope = usePopupScope()
  return (
    <Core.Portal {...props} mount={props.mount ?? scope.mount()}>
      <div data-ui="" class="ui-popup-portal" style={{ display: 'contents' }}>
        {props.children}
      </div>
    </Core.Portal>
  )
}
export const Popover = /* @__PURE__ */ Object.assign(PopoverRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Anchor: Core.Anchor,
  Arrow: Core.Arrow,
  Root: PopoverRoot,
  Portal: PopoverPortal,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  CloseButton: PopoverCloseButton,
  Title: PopoverTitle,
  Description: PopoverDescription,
})
// Explicit compatibility exports retain the previously available primitive types.
export type {
  PopoverAnchorCommonProps,
  PopoverAnchorOptions,
  PopoverAnchorProps,
  PopoverAnchorRenderProps,
  PopoverArrowCommonProps,
  PopoverArrowOptions,
  PopoverArrowProps,
  PopoverArrowRenderProps,
  PopoverCloseButtonCommonProps,
  PopoverCloseButtonOptions,
  PopoverCloseButtonRenderProps,
  PopoverContentCommonProps,
  PopoverContentOptions,
  PopoverContentRenderProps,
  PopoverDescriptionCommonProps,
  PopoverDescriptionOptions,
  PopoverDescriptionRenderProps,
  PopoverRootOptions,
  PopoverTitleCommonProps,
  PopoverTitleOptions,
  PopoverTitleRenderProps,
  PopoverTriggerCommonProps,
  PopoverTriggerOptions,
  PopoverTriggerRenderProps,
  Anchor,
  Arrow,
  CloseButton,
  Content,
  Description,
  Portal,
  Root,
  Title,
  Trigger,
  PopoverContextValue,
  usePopoverContext,
} from '../internal/controls/popover'
