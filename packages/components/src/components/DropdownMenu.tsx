import { Icon } from './Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
import * as Core from '../internal/controls/dropdown-menu'
import { untrack } from 'solid-js'
import { PopupScope, createPopupScope, usePopupScope } from './popupScope'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export function DropdownMenuRoot(props: Core.DropdownMenuRootProps) {
  const scope = createPopupScope()
  return (
    <PopupScope value={scope}>
      <Core.Root {...props} />
    </PopupScope>
  )
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
export function DropdownMenuContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuContentProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuSubContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuSubContentProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuItem<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuItemProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuCheckboxItem<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuCheckboxItemProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuRadioItem<
  TValue = string,
  T extends ValidComponent = 'div',
>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuRadioItemProps<T, TValue> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.RadioItem as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-menu-item', props.class)}
    />
  )
}
export function DropdownMenuSubTrigger<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuSubTriggerProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuGroupLabel<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuGroupLabelProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuItemDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuItemDescriptionProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuSeparator<T extends ValidComponent = 'hr'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuSeparatorProps<T> & { class?: ClassValue }
  >,
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
export function DropdownMenuPortal(props: Core.DropdownMenuPortalProps) {
  const scope = usePopupScope()
  return (
    <Core.Portal {...props} mount={props.mount ?? scope.mount()}>
      <div data-ui="" class="ui-popup-portal" style={{ display: 'contents' }}>
        {props.children}
      </div>
    </Core.Portal>
  )
}
export function DropdownMenuIcon<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<
    T,
    Core.DropdownMenuIconProps<T> & { class?: ClassValue }
  >,
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
export type * from '../internal/controls/dropdown-menu'
