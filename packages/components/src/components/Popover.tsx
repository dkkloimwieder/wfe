import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/popover'
import { untrack } from 'solid-js'
import { PopupScope, createPopupScope, usePopupScope } from './popupScope'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export function PopoverRoot(props: Core.PopoverRootProps) {
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
export function PopoverContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.PopoverContentProps<T> & { class?: ClassValue }
  >,
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
export function PopoverTitle<T extends ValidComponent = 'h2'>(
  props: PolymorphicProps<
    T,
    Core.PopoverTitleProps<T> & { class?: ClassValue }
  >,
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
export function PopoverDescription<T extends ValidComponent = 'p'>(
  props: PolymorphicProps<
    T,
    Core.PopoverDescriptionProps<T> & { class?: ClassValue }
  >,
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
export function PopoverPortal(props: Core.PopoverPortalProps) {
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
export type * from '../internal/controls/popover'
