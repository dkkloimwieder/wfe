import { omit } from 'solid-js'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/radio-group'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export function RadioGroupRoot<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupRootProps<T> &
      ControlDecorationProps & { class?: ClassValue }
  >,
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

export function RadioGroupItem<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupItemProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('ui-radio-item', props.class)} />
  )
}

export function RadioGroupItemInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupItemInputProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.ItemInput as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-toggle-input', props.class)}
    />
  )
}

export function RadioGroupItemControl<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupItemControlProps<T> & { class?: ClassValue }
  >,
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

export function RadioGroupItemIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupItemIndicatorProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.ItemIndicator as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-radio-indicator', props.class)}
    />
  )
}

export function RadioGroupLabel<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupLabelProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export function RadioGroupItemLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupItemLabelProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.ItemLabel as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export function RadioGroupDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupDescriptionProps & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export function RadioGroupItemDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupItemDescriptionProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.ItemDescription as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export function RadioGroupErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.RadioGroupErrorMessageProps<T> & { class?: ClassValue }
  >,
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
