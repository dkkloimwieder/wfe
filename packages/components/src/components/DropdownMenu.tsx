import { Icon } from './Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/dropdown-menu'
import { untrack } from 'solid-js'
import { usePopupScope } from './popupScope'
import { popupPortalFrame, popupRoot } from './popupPresentation'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type DropdownMenuRootProps = Core.DropdownMenuRootProps
export function DropdownMenuRoot(props: DropdownMenuRootProps) {
  return popupRoot(() => <Core.Root {...props} />)
}
export type DropdownMenuTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuTriggerProps<T> & ButtonAppearanceProps
export function DropdownMenuTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, DropdownMenuTriggerProps<T>>,
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
export type DropdownMenuContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuContentProps<T> & { class?: ClassValue }
export function DropdownMenuContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu', props.class)}
    />
  )
}
export type DropdownMenuSubContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuSubContentProps<T> & { class?: ClassValue }
export function DropdownMenuSubContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>,
) {
  const Primitive = Core.SubContent as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu', props.class)}
    />
  )
}
export type DropdownMenuItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuItemProps<T> & { class?: ClassValue }
export function DropdownMenuItem<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuItemProps<T>>,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-item', props.class)}
    />
  )
}
export type DropdownMenuCheckboxItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuCheckboxItemProps<T> & { class?: ClassValue }
export function DropdownMenuCheckboxItem<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuCheckboxItemProps<T>>,
) {
  const Primitive = Core.CheckboxItem as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-item', props.class)}
    />
  )
}
export type DropdownMenuRadioItemProps<
  TValue = string,
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuRadioItemProps<T, TValue> & { class?: ClassValue }
export function DropdownMenuRadioItem<
  TValue = string,
  T extends ValidComponent = 'div',
>(props: PolymorphicProps<T, DropdownMenuRadioItemProps<TValue, T>>) {
  const Primitive = Core.RadioItem as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-item', props.class)}
    />
  )
}
export type DropdownMenuSubTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuSubTriggerProps<T> & { class?: ClassValue }
export function DropdownMenuSubTrigger<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuSubTriggerProps<T>>,
) {
  const Primitive = Core.SubTrigger as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-item', props.class)}
    />
  )
}
export type DropdownMenuGroupLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuGroupLabelProps<T> & { class?: ClassValue }
export function DropdownMenuGroupLabel<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuGroupLabelProps<T>>,
) {
  const Primitive = Core.GroupLabel as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-label', props.class)}
    />
  )
}
export type DropdownMenuItemDescriptionProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuItemDescriptionProps<T> & { class?: ClassValue }
export function DropdownMenuItemDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuItemDescriptionProps<T>>,
) {
  const Primitive = Core.ItemDescription as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-popup-description', props.class)}
    />
  )
}
export type DropdownMenuSeparatorProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuSeparatorProps<T> & { class?: ClassValue }
export function DropdownMenuSeparator<T extends ValidComponent = 'hr'>(
  props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>,
) {
  const Primitive = Core.Separator as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-separator', props.class)}
    />
  )
}
export type DropdownMenuPortalProps = Core.DropdownMenuPortalProps
export function DropdownMenuPortal(props: DropdownMenuPortalProps) {
  const scope = usePopupScope()
  return (
    <Core.Portal {...props} mount={props.mount ?? scope.mount()}>
      {popupPortalFrame(props)}
    </Core.Portal>
  )
}
export type DropdownMenuIconProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.DropdownMenuIconProps<T> & { class?: ClassValue }
export function DropdownMenuIcon<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<T, DropdownMenuIconProps<T>>,
) {
  const Primitive = Core.Icon as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('ui-choice-icon', props.class)}>
      {props.children ?? <Icon name="chevron-down" />}
    </Primitive>
  )
}

export const DropdownMenu = /* @__PURE__ */ Object.assign(DropdownMenuRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Arrow: Core.Arrow,
  Group: Core.Group,
  Icon: DropdownMenuIcon,
  ItemIndicator: Core.ItemIndicator,
  ItemLabel: Core.ItemLabel,
  RadioGroup: Core.RadioGroup,
  Sub: Core.Sub,
  Root: DropdownMenuRoot,
  Portal: DropdownMenuPortal,
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  SubContent: DropdownMenuSubContent,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioItem: DropdownMenuRadioItem,
  SubTrigger: DropdownMenuSubTrigger,
  GroupLabel: DropdownMenuGroupLabel,
  ItemDescription: DropdownMenuItemDescription,
  Separator: DropdownMenuSeparator,
})
// Explicit compatibility exports retain the previously available primitive types.
export type {
  DropdownMenuArrowCommonProps,
  DropdownMenuArrowOptions,
  DropdownMenuArrowProps,
  DropdownMenuArrowRenderProps,
  DropdownMenuCheckboxItemCommonProps,
  DropdownMenuCheckboxItemOptions,
  DropdownMenuCheckboxItemRenderProps,
  DropdownMenuContentCommonProps,
  DropdownMenuContentOptions,
  DropdownMenuContentRenderProps,
  DropdownMenuGroupCommonProps,
  DropdownMenuGroupLabelCommonProps,
  DropdownMenuGroupLabelOptions,
  DropdownMenuGroupLabelRenderProps,
  DropdownMenuGroupOptions,
  DropdownMenuGroupProps,
  DropdownMenuGroupRenderProps,
  DropdownMenuIconCommonProps,
  DropdownMenuIconOptions,
  DropdownMenuIconRenderProps,
  DropdownMenuItemCommonProps,
  DropdownMenuItemDescriptionCommonProps,
  DropdownMenuItemDescriptionOptions,
  DropdownMenuItemDescriptionRenderProps,
  DropdownMenuItemIndicatorCommonProps,
  DropdownMenuItemIndicatorOptions,
  DropdownMenuItemIndicatorProps,
  DropdownMenuItemIndicatorRenderProps,
  DropdownMenuItemLabelCommonProps,
  DropdownMenuItemLabelOptions,
  DropdownMenuItemLabelProps,
  DropdownMenuItemLabelRenderProps,
  DropdownMenuItemOptions,
  DropdownMenuItemRenderProps,
  DropdownMenuRadioGroupCommonProps,
  DropdownMenuRadioGroupOptions,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioGroupRenderProps,
  DropdownMenuRadioItemCommonProps,
  DropdownMenuRadioItemOptions,
  DropdownMenuRadioItemPRenderrops,
  DropdownMenuRootOptions,
  DropdownMenuSeparatorCommonProps,
  DropdownMenuSeparatorOptions,
  DropdownMenuSeparatorRenderProps,
  DropdownMenuSubContentCommonProps,
  DropdownMenuSubContentOptions,
  DropdownMenuSubContentRenderProps,
  DropdownMenuSubOptions,
  DropdownMenuSubProps,
  DropdownMenuSubTriggerCommonProps,
  DropdownMenuSubTriggerOptions,
  DropdownMenuSubTriggerRenderProps,
  DropdownMenuTriggerCommonProps,
  DropdownMenuTriggerOptions,
  DropdownMenuTriggerRenderProps,
  Arrow,
  CheckboxItem,
  Content,
  Group,
  GroupLabel,
  Icon,
  Item,
  ItemDescription,
  ItemIndicator,
  ItemLabel,
  Portal,
  RadioGroup,
  RadioItem,
  Root,
  Separator,
  Sub,
  SubContent,
  SubTrigger,
  Trigger,
} from '../internal/controls/dropdown-menu'
