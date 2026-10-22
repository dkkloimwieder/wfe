import { CompoundControl, ControlFrame } from '../internal/controlDecoration'
import type {
  ControlDecorationProps,
  NativeControlFrameProps,
} from '../internal/controlDecoration'
import { Show } from 'solid-js'
import { ValueDisplay } from './ValueDisplay'
import type { ValueFormat, ValueFormatOptions } from '../utils/valueFormat'
import { styledClasses } from '../internal/classes'
import { restoreTextValue } from '../internal/controlledText'
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
import type { ComponentProps, JSX } from '@solidjs/web'

export type FieldProps = JSX.HTMLAttributes<HTMLDivElement> &
  ControlDecorationProps & {
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
    'decoration',
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
        data-ui-control-decoration={
          props.decoration === false ? 'none' : props.decoration
        }
        data-invalid={props.invalid ? '' : undefined}
        class={styledClasses('ui-field', props.class)}
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
      class={styledClasses('ui-label', props.class)}
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
      class={styledClasses('ui-help', props.class)}
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
      class={styledClasses('ui-field-error', props.class)}
      ref={[props.ref, events]}
    />
  )
}

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> &
  NativeControlFrameProps & {
    invalid?: boolean
    onValueChange?: (value: string, event: InputEvent) => void
  }
export type TextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> &
  NativeControlFrameProps & {
    invalid?: boolean
    onValueChange?: (value: string, event: InputEvent) => void
  }
type TextElement = HTMLInputElement | HTMLTextAreaElement
type TextProps<T extends TextElement> = JSX.HTMLAttributes<T> &
  NativeControlFrameProps & {
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
    'decoration',
    'frameClass',
    'frameStyle',
    'onValueChange',
    ...nativeEventProps,
  )
  const restoreValue = (element: T) => {
    restoreTextValue(
      element,
      untrack(() => props.value),
    )
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
    <ControlFrame
      decoration={props.decoration}
      frameClass={props.frameClass}
      frameStyle={props.frameStyle}
      hidden={
        Boolean(props.hidden && props.hidden !== 'until-found') ||
        props.type === 'hidden'
      }
    >
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
        class={styledClasses('ui-input', props.class)}
        ref={[props.ref, state.events]}
      />
    </ControlFrame>
  ))
}
export function Textarea(props: TextareaProps) {
  const state = textControl<HTMLTextAreaElement>(props)
  return renderAfterRegistration(() => (
    <ControlFrame
      decoration={props.decoration}
      frameClass={props.frameClass}
      frameStyle={props.frameStyle}
      hidden={Boolean(props.hidden && props.hidden !== 'until-found')}
    >
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
        class={styledClasses('ui-textarea', props.class)}
        ref={[props.ref, state.events]}
      />
    </ControlFrame>
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
export type ButtonLinkProps = Omit<ComponentProps<'a'>, 'href'> &
  ButtonAppearanceProps & { href: string }
export function ButtonLink(props: ButtonLinkProps) {
  const attributes = buttonAttributes(omit(props, 'ref', ...nativeEventProps))
  const events = ownedElementEvents(props)
  return <a {...attributes} ref={[props.ref, events]} />
}
export type IconButtonProps = ButtonProps & { 'aria-label': string }
export function IconButton(props: IconButtonProps) {
  return (
    <Button {...props} class={styledClasses('ui-icon-button', props.class)} />
  )
}
export type FieldSetProps = JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>
export function FieldSet(props: FieldSetProps) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <fieldset
      {...attributes}
      data-ui=""
      class={styledClasses('ui-field-set', props.class)}
      ref={[props.ref, events]}
    />
  )
}
export type InputGroupProps = JSX.HTMLAttributes<HTMLDivElement> &
  ControlDecorationProps
export function InputGroup(props: InputGroupProps) {
  const attributes = omit(props, 'decoration', 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <CompoundControl value={true}>
      <div
        {...attributes}
        data-ui-control-surface=""
        data-ui-control-decoration={
          props.decoration === false ? 'none' : props.decoration
        }
        class={styledClasses('ui-input-group', props.class)}
        ref={[props.ref, events]}
      />
    </CompoundControl>
  )
}

export type NativeSelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> &
  NativeControlFrameProps & {
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
    'decoration',
    'frameClass',
    'frameStyle',
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
    <ControlFrame
      decoration={props.decoration}
      frameClass={props.frameClass}
      frameStyle={props.frameStyle}
      hidden={Boolean(props.hidden && props.hidden !== 'until-found')}
    >
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
        class={styledClasses('ui-native-select', props.class)}
        ref={[props.ref, events]}
      />
    </ControlFrame>
  ))
}

export type FieldValueProps = Omit<
  JSX.OutputHTMLAttributes<HTMLOutputElement>,
  'value' | 'children'
> &
  ValueFormatOptions & { value: unknown; format?: ValueFormat }

/** A named read-only value that shares the surrounding Field associations. */
export function FieldValue(props: FieldValueProps) {
  const field = useContext(FieldContext)
  const generated = `field-value-${createUniqueId()}`
  const id = () => props.id || field?.baseControlId() || generated
  field?.registerControl(id)
  const rest = omit(
    props,
    'value',
    'format',
    'locale',
    'dateFormat',
    'timeFormat',
    'timeZone',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  return renderAfterRegistration(() => (
    <output
      {...rest}
      id={id()}
      aria-live={props['aria-live'] ?? 'off'}
      aria-invalid={
        props['aria-invalid'] ?? (field?.invalid() ? 'true' : undefined)
      }
      aria-describedby={
        [field?.describedBy(), props['aria-describedby']]
          .filter(Boolean)
          .join(' ') || undefined
      }
      class={styledClasses('ui-field-value', props.class)}
      ref={[props.ref, events]}
    >
      <Show when={props.format} keyed fallback={String(props.value ?? '')}>
        {(format) => (
          <ValueDisplay
            value={props.value}
            format={format}
            locale={props.locale}
            dateFormat={props.dateFormat}
            timeFormat={props.timeFormat}
            timeZone={props.timeZone}
          />
        )}
      </Show>
    </output>
  ))
}
