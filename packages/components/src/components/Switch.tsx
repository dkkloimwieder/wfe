import { renderCompoundFieldRoot } from '../internal/fieldRendering'
import {
  createCompoundField,
  createCompoundFieldTarget,
} from '../internal/compoundField'
import type { CompoundFieldProps } from '../internal/compoundField'
import { omit } from 'solid-js'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/switch'
import type { Component } from 'solid-js'
import type { ValidComponent } from '@solidjs/web'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

export type SwitchRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchRootProps<T> &
  CompoundFieldProps & {
    onCheckedChange?: (checked: boolean) => void
  } & ControlDecorationProps & { class?: ClassValue }
export function SwitchRoot<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchRootProps<T>>,
) {
  const Primitive = Core.Root as Component<typeof props>
  const state = createCompoundField(props)
  return renderCompoundFieldRoot(() => (
    <Primitive
      {...(omit(
        props,
        'decoration',
        'readonly',
        'invalid',
        'onCheckedChange',
      ) as typeof props)}
      disabled={state.disabled()}
      required={state.required()}
      readOnly={state.readonly()}
      validationState={state.validationState()}
      onChange={(value) => (props.onCheckedChange ?? props.onChange)?.(value)}
      data-ui=""
      data-ui-control-decoration={
        props.decoration === false ? 'none' : props.decoration
      }
      class={styledClasses('ui-toggle ui-switch', props.class)}
    />
  ))
}

export type SwitchInputProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchInputProps<T> & { class?: ClassValue }
export function SwitchInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, SwitchInputProps<T>>,
) {
  const Primitive = Core.Input as Component<typeof props>
  const target = createCompoundFieldTarget(props)
  return (
    <Primitive
      {...props}
      {...target}
      class={styledClasses('ui-toggle-input', props.class)}
    />
  )
}

export type SwitchControlProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchControlProps<T> & { class?: ClassValue }
export function SwitchControl<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchControlProps<T>>,
) {
  const Primitive = Core.Control as Component<typeof props>
  return (
    <Primitive
      {...props}
      data-ui-control-surface=""
      class={styledClasses('ui-switch-control', props.class)}
    />
  )
}

export type SwitchThumbProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchThumbProps<T> & { class?: ClassValue }
export function SwitchThumb<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchThumbProps<T>>,
) {
  const Primitive = Core.Thumb as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-switch-thumb', props.class)}
    />
  )
}

export type SwitchLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchLabelProps<T> & { class?: ClassValue }
export function SwitchLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, SwitchLabelProps<T>>,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export type SwitchDescriptionProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchDescriptionProps<T> & { class?: ClassValue }
export function SwitchDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchDescriptionProps<T>>,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export type SwitchErrorMessageProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SwitchErrorMessageProps<T> & { class?: ClassValue }
export function SwitchErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchErrorMessageProps<T>>,
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
