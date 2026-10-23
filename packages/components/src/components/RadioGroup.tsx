import { omit } from 'solid-js'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/radio-group'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type RadioGroupRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupRootProps<T> &
  ControlDecorationProps & { class?: ClassValue }
export function RadioGroupRoot<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupRootProps<T>>,
) {
  const Primitive = Core.Root as Component<typeof props>
  return (
    <Primitive
      {...(omit(props, 'decoration') as typeof props)}
      data-ui=""
      data-ui-control-decoration={
        props.decoration === false ? 'none' : props.decoration
      }
      class={styledClasses('ui-radio-group', props.class)}
    />
  )
}

export type RadioGroupItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupItemProps<T> & { class?: ClassValue }
export function RadioGroupItem<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupItemProps<T>>,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('ui-radio-item', props.class)} />
  )
}

export type RadioGroupItemInputProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupItemInputProps<T> & { class?: ClassValue }
export function RadioGroupItemInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, RadioGroupItemInputProps<T>>,
) {
  const Primitive = Core.ItemInput as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-toggle-input', props.class)}
    />
  )
}

export type RadioGroupItemControlProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupItemControlProps<T> & { class?: ClassValue }
export function RadioGroupItemControl<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupItemControlProps<T>>,
) {
  const Primitive = Core.ItemControl as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui-control-surface=""
      class={styledClasses('ui-radio-control', props.class)}
    />
  )
}

export type RadioGroupItemIndicatorProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupItemIndicatorProps<T> & { class?: ClassValue }
export function RadioGroupItemIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupItemIndicatorProps<T>>,
) {
  const Primitive = Core.ItemIndicator as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-radio-indicator', props.class)}
    />
  )
}

export type RadioGroupLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupLabelProps<T> & { class?: ClassValue }
export function RadioGroupLabel<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<T, RadioGroupLabelProps<T>>,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export type RadioGroupItemLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupItemLabelProps<T> & { class?: ClassValue }
export function RadioGroupItemLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, RadioGroupItemLabelProps<T>>,
) {
  const Primitive = Core.ItemLabel as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export type RadioGroupDescriptionProps = Core.RadioGroupDescriptionProps & {
  class?: ClassValue
}
export function RadioGroupDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupDescriptionProps>,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export type RadioGroupItemDescriptionProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupItemDescriptionProps<T> & { class?: ClassValue }
export function RadioGroupItemDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupItemDescriptionProps<T>>,
) {
  const Primitive = Core.ItemDescription as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export type RadioGroupErrorMessageProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.RadioGroupErrorMessageProps<T> & { class?: ClassValue }
export function RadioGroupErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, RadioGroupErrorMessageProps<T>>,
) {
  const Primitive = Core.ErrorMessage as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-field-error', props.class)}
    />
  )
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
  ItemInput: RadioGroupItemInput,
  ItemControl: RadioGroupItemControl,
  ItemIndicator: RadioGroupItemIndicator,
  Label: RadioGroupLabel,
  ItemLabel: RadioGroupItemLabel,
  Description: RadioGroupDescription,
  ItemDescription: RadioGroupItemDescription,
  ErrorMessage: RadioGroupErrorMessage,
})
