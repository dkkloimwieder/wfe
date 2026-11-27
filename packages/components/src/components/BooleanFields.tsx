import { omit, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Checkbox, type CheckboxRootProps } from './Checkbox'
import { Switch, type SwitchRootProps } from './Switch'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'

type BooleanFieldContent = {
  description?: JSX.Element
  'aria-describedby'?: string
  inputRef?: JSX.Ref<HTMLInputElement>
} & (
  | { label: JSX.Element; 'aria-label'?: string }
  | { label?: never; 'aria-label': string }
)

export type CheckboxFieldProps = Omit<
  PolymorphicProps<'div', CheckboxRootProps<'div'>>,
  'as' | 'children'
> &
  BooleanFieldContent
export type SwitchFieldProps = Omit<
  PolymorphicProps<'div', SwitchRootProps<'div'>>,
  'as' | 'children'
> &
  BooleanFieldContent

const fieldContent = [
  'label',
  'description',
  'aria-label',
  'aria-describedby',
  'inputRef',
] as const

/** A checkbox with its native input, label, and optional description. */
export function CheckboxField(props: CheckboxFieldProps) {
  const root = omit(props, ...fieldContent)
  return (
    <Checkbox {...root}>
      <Checkbox.Input
        aria-label={props['aria-label']}
        aria-describedby={props['aria-describedby']}
        ref={props.inputRef}
      />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Show when={props.label != null}>
        <Checkbox.Label>{props.label}</Checkbox.Label>
      </Show>
      <Show when={props.description != null}>
        <Checkbox.Description>{props.description}</Checkbox.Description>
      </Show>
    </Checkbox>
  )
}

/** A switch with its native input, label, and optional description. */
export function SwitchField(props: SwitchFieldProps) {
  const root = omit(props, ...fieldContent)
  return (
    <Switch {...root}>
      <Switch.Input
        aria-label={props['aria-label']}
        aria-describedby={props['aria-describedby']}
        ref={props.inputRef}
      />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Show when={props.label != null}>
        <Switch.Label>{props.label}</Switch.Label>
      </Show>
      <Show when={props.description != null}>
        <Switch.Description>{props.description}</Switch.Description>
      </Show>
    </Switch>
  )
}
