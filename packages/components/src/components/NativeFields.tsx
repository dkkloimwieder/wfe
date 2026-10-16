import { buttonAttributes } from '../internal/buttonPresentation'
import type { ButtonAppearanceProps } from '../internal/buttonPresentation'
export type { ButtonTone, ButtonVariant } from '../internal/buttonPresentation'
import { FieldContext } from '../internal/fieldContext'
import type { FieldState } from '../internal/fieldContext'
import { renderAfterRegistration } from '../internal/fieldRendering'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import {
  createSignal,
  createUniqueId,
  merge,
  omit,
  onCleanup,
  untrack,
  useContext,
} from 'solid-js'
import { isServer } from '@solidjs/web'
import type { JSX } from '@solidjs/web'

export type FieldProps = JSX.HTMLAttributes<HTMLDivElement> & {
  controlId?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  invalid?: boolean
}
export function Field(props: FieldProps) {
  const generated = `field-${createUniqueId()}`
  const [control, setControl] = createSignal<(() => string) | undefined>(
    undefined,
    { ownedWrite: true },
  )
  const [descriptions, setDescriptions] = createSignal<
    Array<{ id: () => string; error: boolean }>
  >([], { ownedWrite: true })
  let serverControl: (() => string) | undefined
  const serverDescriptions: Array<{ id: () => string; error: boolean }> = []
  const baseId = () => props.controlId ?? `${props.id || generated}-control`
  const state: FieldState = {
    controlId: () => (isServer ? serverControl : control())?.() ?? baseId(),
    baseControlId: baseId,
    disabled: () => props.disabled,
    readonly: () => props.readonly,
    required: () => props.required,
    invalid: () => props.invalid,
    describedBy: () =>
      (isServer ? serverDescriptions : descriptions())
        .filter((entry) => !entry.error || props.invalid)
        .map((entry) => entry.id())
        .join(' ') || undefined,
    registerControl(id) {
      // Server field metadata is collected once without reactive writes.
      if (isServer) {
        serverControl = id
        return
      }
      setControl(() => id)
      onCleanup(() => {
        if (untrack(control) === id) setControl(undefined)
      })
    },
    registerDescription(id, error) {
      const entry = { id, error }
      if (isServer) {
        serverDescriptions.push(entry)
        return
      }
      setDescriptions((old) => [...old, entry])
      onCleanup(() =>
        setDescriptions((old) => old.filter((item) => item !== entry)),
      )
    },
  }
  const attributes = omit(
    props,
    'controlId',
    'disabled',
    'readonly',
    'required',
    'invalid',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  return (
    <FieldContext value={state}>
      <div
        {...attributes}
        id={props.id || generated}
        data-ui=""
        data-invalid={props.invalid ? '' : undefined}
        class={'ui-field ' + (props.class ?? '')}
        ref={[props.ref, events]}
      />
    </FieldContext>
  )
}

export type LabelProps = JSX.LabelHTMLAttributes<HTMLLabelElement>
export function Label(props: LabelProps) {
  const field = useContext(FieldContext)
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return renderAfterRegistration(() => (
    <label
      {...attributes}
      for={props.for ?? field?.controlId()}
      class={'ui-label ' + (props.class ?? '')}
      ref={[props.ref, events]}
    />
  ))
}
export type HelpTextProps = JSX.HTMLAttributes<HTMLDivElement>
export function HelpText(props: HelpTextProps) {
  const field = useContext(FieldContext)
  const generated = `help-${createUniqueId()}`
  const id = () => props.id || generated
  field?.registerDescription(id, false)
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      id={id()}
      class={'ui-help ' + (props.class ?? '')}
      ref={[props.ref, events]}
    />
  )
}
export type FieldErrorProps = JSX.HTMLAttributes<HTMLDivElement>
export function FieldError(props: FieldErrorProps) {
  const field = useContext(FieldContext)
  const generated = `error-${createUniqueId()}`
  const id = () => props.id || generated
  field?.registerDescription(id, true)
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      id={id()}
      hidden={props.hidden ?? (field ? !field.invalid() : undefined)}
      class={'ui-field-error ' + (props.class ?? '')}
      ref={[props.ref, events]}
    />
  )
}

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
  onValueChange?: (value: string, event: InputEvent) => void
}
export type TextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
  onValueChange?: (value: string, event: InputEvent) => void
}
type TextElement = HTMLInputElement | HTMLTextAreaElement
type TextProps<T extends TextElement> = JSX.HTMLAttributes<T> & {
  value?: InputProps['value'] | TextareaProps['value']
  disabled?: InputProps['disabled']
  readonly?: InputProps['readonly']
  required?: InputProps['required']
  invalid?: boolean
  onValueChange?: (value: string, event: InputEvent) => void
}
function textControl<T extends TextElement>(props: TextProps<T>) {
  const field = useContext(FieldContext)
  const generated = `input-${createUniqueId()}`
  const id = () => props.id || field?.baseControlId() || generated
  field?.registerControl(id)
  const attributes = omit(
    props,
    'ref',
    'invalid',
    'onValueChange',
    ...nativeEventProps,
  )
  const restoreValue = (element: T) => {
    const accepted = untrack(() => props.value)
    if (accepted != null && element.value !== String(accepted))
      element.value = String(accepted)
  }
  const events = ownedElementEvents(
    merge(props, {
      onInput(event: InputEvent & { currentTarget: T; target: T & Element }) {
        if (
          !callHandler(
            event,
            props.onInput as JSX.EventHandlerUnion<T, InputEvent>,
          )
        )
          props.onValueChange?.(event.currentTarget.value, event)
        if (props.onInput || props.onValueChange)
          restoreValue(event.currentTarget)
      },
      onChange(event: Event & { currentTarget: T; target: T & Element }) {
        callHandler(event, props.onChange as JSX.EventHandlerUnion<T, Event>)
        restoreValue(event.currentTarget)
      },
    }),
  )
  return {
    attributes,
    events,
    id,
    disabled: () => props.disabled ?? field?.disabled(),
    readonly: () => props.readonly ?? field?.readonly(),
    required: () => props.required ?? field?.required(),
    invalid: () => props.invalid ?? field?.invalid(),
    describedBy: () =>
      [field?.describedBy(), props['aria-describedby']]
        .filter(Boolean)
        .join(' ') || undefined,
  }
}
export function Input(props: InputProps) {
  const state = textControl<HTMLInputElement>(props)
  return renderAfterRegistration(() => (
    <input
      {...state.attributes}
      id={state.id()}
      disabled={state.disabled()}
      readonly={state.readonly()}
      required={state.required()}
      aria-invalid={
        props['aria-invalid'] ?? (state.invalid() ? 'true' : undefined)
      }
      aria-describedby={state.describedBy()}
      class={'ui-input ' + (props.class ?? '')}
      ref={[props.ref, state.events]}
    />
  ))
}
export function Textarea(props: TextareaProps) {
  const state = textControl<HTMLTextAreaElement>(props)
  return renderAfterRegistration(() => (
    <textarea
      {...state.attributes}
      id={state.id()}
      disabled={state.disabled()}
      readonly={state.readonly()}
      required={state.required()}
      aria-invalid={
        props['aria-invalid'] ?? (state.invalid() ? 'true' : undefined)
      }
      aria-describedby={state.describedBy()}
      class={'ui-textarea ' + (props.class ?? '')}
      ref={[props.ref, state.events]}
    />
  ))
}
export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonAppearanceProps
export function Button(props: ButtonProps) {
  const attributes = buttonAttributes(omit(props, 'ref', ...nativeEventProps))
  const events = ownedElementEvents(props)
  return (
    <button
      {...attributes}
      type={props.type ?? 'button'}
      ref={[props.ref, events]}
    />
  )
}
export type IconButtonProps = ButtonProps & { 'aria-label': string }
export function IconButton(props: IconButtonProps) {
  return <Button {...props} class={'ui-icon-button ' + (props.class ?? '')} />
}
export type FieldSetProps = JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>
export function FieldSet(props: FieldSetProps) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <fieldset
      {...attributes}
      data-ui=""
      class={'ui-field-set ' + (props.class ?? '')}
      ref={[props.ref, events]}
    />
  )
}
export type InputGroupProps = JSX.HTMLAttributes<HTMLDivElement>
export function InputGroup(props: InputGroupProps) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      class={'ui-input-group ' + (props.class ?? '')}
      ref={[props.ref, events]}
    />
  )
}

export type NativeSelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
  onValueChange?: (value: string, event: Event) => void
}
/** Compatibility control for native browser integration. Use SelectField in normal interfaces. */
export function NativeSelect(props: NativeSelectProps) {
  const field = useContext(FieldContext)
  const generated = `select-${createUniqueId()}`
  const id = () => props.id || field?.baseControlId() || generated
  field?.registerControl(id)
  const attributes = omit(
    props,
    'ref',
    'invalid',
    'onValueChange',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(
    merge(props, {
      onKeyDown(
        event: KeyboardEvent & {
          currentTarget: HTMLSelectElement
          target: HTMLSelectElement
        },
      ) {
        callHandler(
          event,
          props.onKeyDown as JSX.EventHandlerUnion<
            HTMLSelectElement,
            KeyboardEvent
          >,
        )
        // The browser closes its picker. The same Escape must not close its parent.
        if (event.key === 'Escape' && event.target instanceof HTMLOptionElement)
          event.stopPropagation()
      },
      onChange(
        event: Event & {
          currentTarget: HTMLSelectElement
          target: HTMLSelectElement
        },
      ) {
        if (
          !callHandler(
            event,
            props.onChange as JSX.EventHandlerUnion<HTMLSelectElement, Event>,
          ) &&
          !event.currentTarget.matches(':disabled')
        )
          props.onValueChange?.(event.currentTarget.value, event)
        const value = props.value
        if (typeof value === 'string' || typeof value === 'number')
          event.currentTarget.value = String(value)
        else if (Array.isArray(value)) {
          const values = new Set(value.map(String))
          for (const option of event.currentTarget.options)
            option.selected = values.has(option.value)
        }
      },
    }),
  )
  return renderAfterRegistration(() => (
    <select
      {...attributes}
      id={id()}
      disabled={props.disabled ?? field?.disabled()}
      required={props.required ?? field?.required()}
      aria-describedby={
        [field?.describedBy(), props['aria-describedby']]
          .filter(Boolean)
          .join(' ') || undefined
      }
      aria-invalid={
        props['aria-invalid'] ??
        ((props.invalid ?? field?.invalid()) ? 'true' : undefined)
      }
      class={'ui-native-select ' + (props.class ?? '')}
      ref={[props.ref, events]}
    />
  ))
}
