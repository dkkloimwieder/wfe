import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/switch'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export function SwitchRoot<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, Core.SwitchRootProps<T> & { class?: ClassValue }>,
) {
  const Primitive = Core.Root as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui=""
      class={styledClasses('ui-toggle ui-switch', props.class)}
    />
  )
}

export function SwitchInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, Core.SwitchInputProps<T> & { class?: ClassValue }>,
) {
  const Primitive = Core.Input as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-toggle-input', props.class)}
    />
  )
}

export function SwitchControl<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.SwitchControlProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Control as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-switch-control', props.class)}
    />
  )
}

export function SwitchThumb<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, Core.SwitchThumbProps<T> & { class?: ClassValue }>,
) {
  const Primitive = Core.Thumb as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-switch-thumb', props.class)}
    />
  )
}

export function SwitchLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, Core.SwitchLabelProps<T> & { class?: ClassValue }>,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export function SwitchDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.SwitchDescriptionProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export function SwitchErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.SwitchErrorMessageProps<T> & { class?: ClassValue }
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

export const Switch = Object.assign(SwitchRoot, {
  Root: SwitchRoot,
  Input: SwitchInput,
  Control: SwitchControl,
  Thumb: SwitchThumb,
  Label: SwitchLabel,
  Description: SwitchDescription,
  ErrorMessage: SwitchErrorMessage,
})
