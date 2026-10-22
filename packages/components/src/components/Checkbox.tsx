import { omit } from 'solid-js'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { Icon } from './Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/checkbox'
import type { Component } from 'solid-js'
import type { JSX, ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export function CheckboxRoot<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxRootProps<T> & ControlDecorationProps & { class?: ClassValue }
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
      class={styledClasses('ui-toggle ui-checkbox', props.class)}
    />
  )
}

export function CheckboxInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxInputProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Input as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-toggle-input', props.class)}
    />
  )
}

export function CheckboxControl<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxControlProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Control as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui-control-surface=""
      class={styledClasses('ui-check-control', props.class)}
    />
  )
}

export function CheckboxIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxIndicatorProps<T> & {
      class?: ClassValue
      children?: JSX.Element
    }
  >,
) {
  const Primitive = Core.Indicator as Component<typeof props>
  const context = Core.useCheckboxContext()
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-check-indicator', props.class)}
    >
      {props.children ?? (
        <Icon
          class="ui-check-mark"
          name={context.indeterminate() ? 'minus' : 'check'}
        />
      )}
    </Primitive>
  )
}

export function CheckboxLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxLabelProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export function CheckboxDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxDescriptionProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export function CheckboxErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.CheckboxErrorMessageProps<T> & { class?: ClassValue }
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

export const Checkbox = Object.assign(CheckboxRoot, {
  Root: CheckboxRoot,
  Input: CheckboxInput,
  Control: CheckboxControl,
  Indicator: CheckboxIndicator,
  Label: CheckboxLabel,
  Description: CheckboxDescription,
  ErrorMessage: CheckboxErrorMessage,
})
