import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  omit,
  onCleanup,
  untrack,
  useContext,
  Show,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Input } from './NativeFields'
import type { InputProps } from './NativeFields'
import { callHandler } from '../internal/events'
import { FieldContext } from '../internal/fieldContext'
import { parseNumberInput } from '../utils/numberInput'

export type NumberInputProps = Omit<
  InputProps,
  'value' | 'defaultValue' | 'onValueChange' | 'type' | 'min' | 'max' | 'step'
> & {
  value?: number
  defaultValue?: never
  type?: never
  step?: never
  min?: number
  max?: number
  allowEmpty?: boolean
  onValueChange: (value: number | undefined, event: InputEvent) => void
  onValidityChange?: (valid: boolean) => void
}

/** A controlled numeric value with a local text draft. */
export function NumberInput(props: NumberInputProps) {
  const field = useContext(FieldContext)
  const canonical = createMemo(() => {
    const value = props.value
    if (value !== undefined && !Number.isFinite(value))
      throw new Error('NumberInput value must be a finite number or undefined')
    return value
  })
  const [draft, setDraft] = createSignal(
    untrack(() => String(canonical() ?? '')),
  )
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const required = () => props.required ?? field?.required()
  const errorId = `number-error-${createUniqueId()}`
  let input: HTMLInputElement | undefined
  let requested: { value: number | undefined; text: string } | undefined
  const bounds = createMemo(() => {
    const { min, max } = props
    if (
      (min !== undefined && !Number.isFinite(min)) ||
      (max !== undefined && !Number.isFinite(max))
    )
      throw new Error('NumberInput bounds must be finite numbers')
    return { min, max }
  })
  function draftMessage(raw: string) {
    const text = raw.trim()
    if (!text) return props.allowEmpty === false ? 'Enter a number.' : ''
    const value = parseNumberInput(text)
    if (value === undefined) return 'Enter a complete, finite number.'
    const { min, max } = bounds()
    if (min !== undefined && value < min)
      return `Enter a number greater than or equal to ${min}.`
    if (max !== undefined && value > max)
      return `Enter a number less than or equal to ${max}.`
    return ''
  }
  const message = createMemo(() => draftMessage(draft()))
  createEffect(canonical, (value) => {
    const echo =
      requested &&
      Object.is(requested.value, value) &&
      untrack(draft) === requested.text
    if (!echo) setDraft(String(value ?? ''))
    requested = undefined
  })
  createEffect(
    () => ({ message: message(), locked: Boolean(disabled() || readonly()) }),
    ({ message, locked }) => {
      input?.setCustomValidity(locked ? '' : message)
      untrack(() => props.onValidityChange?.(locked || !message))
    },
  )
  function reset() {
    requested = undefined
    setDraft(String(canonical() ?? ''))
  }
  function change(text: string, event: InputEvent) {
    if (disabled() || readonly()) return
    const empty = !text.trim()
    const local = empty ? '' : text
    setDraft(local)
    if (empty ? props.allowEmpty === false : Boolean(draftMessage(text))) return
    const value = empty ? undefined : parseNumberInput(text)
    requested = { value, text: local }
    props.onValueChange(value, event)
  }
  const attributes = omit(
    props,
    'value',
    'defaultValue',
    'type',
    'step',
    'min',
    'max',
    'name',
    'allowEmpty',
    'onValueChange',
    'onValidityChange',
    'onBlur',
    'onKeyDown',
    'ref',
  )
  onCleanup(() => {
    input = undefined
    requested = undefined
  })
  return (
    <>
      <Input
        {...attributes}
        type="text"
        inputmode={props.inputmode ?? 'decimal'}
        value={draft()}
        disabled={disabled()}
        readonly={readonly()}
        required={required()}
        data-ui-invalid-input={message() ? '' : undefined}
        invalid={Boolean(message()) || (props.invalid ?? field?.invalid())}
        aria-invalid={message() ? 'true' : props['aria-invalid']}
        aria-describedby={
          [props['aria-describedby'], message() ? errorId : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        }
        ref={[
          props.ref,
          (node: HTMLInputElement) => {
            input = node
          },
        ]}
        onValueChange={change}
        onBlur={(event) => {
          if (
            callHandler(
              event,
              props.onBlur as JSX.EventHandlerUnion<
                HTMLInputElement,
                FocusEvent
              >,
            )
          )
            return
          const node = event.currentTarget
          // A keyed DOM move can blur a control before its owner restores focus.
          queueMicrotask(() =>
            untrack(() => {
              if (
                input !== node ||
                !node.isConnected ||
                node.ownerDocument.activeElement === node ||
                message()
              )
                return
              reset()
            }),
          )
        }}
        onKeyDown={(event) => {
          if (callHandler(event, props.onKeyDown) || event.isComposing) return
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            reset()
          }
        }}
      />
      <span id={errorId} class="ui-field-error" hidden={!message()}>
        {message()}
      </span>
      <Show when={props.name}>
        <input
          type="hidden"
          name={props.name}
          form={props.form}
          value={canonical() ?? ''}
          disabled={disabled()}
        />
      </Show>
    </>
  )
}
