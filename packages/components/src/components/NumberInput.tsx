import {
  resolveNumberInputMessages,
  numberInputMessages,
  type NumberInputMessages,
} from './inputMessages'
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
  messages?: Partial<NumberInputMessages>
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
  const messages = resolveNumberInputMessages(() => props.messages)
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
  type Issue =
    | { kind: 'requiredError' | 'invalidError' }
    | { kind: 'minimumError' | 'maximumError'; limit: number }
  function draftIssue(raw: string): Issue | undefined {
    const text = raw.trim()
    if (!text)
      return props.allowEmpty === false ? { kind: 'requiredError' } : undefined
    const value = parseNumberInput(text)
    if (value === undefined) return { kind: 'invalidError' }
    const { min, max } = bounds()
    if (min !== undefined && value < min)
      return { kind: 'minimumError', limit: min }
    if (max !== undefined && value > max)
      return { kind: 'maximumError', limit: max }
    return undefined
  }
  const issue = createMemo(() => draftIssue(draft()))
  function describe(
    value: Issue | undefined,
    catalog: Readonly<NumberInputMessages>,
  ): string {
    if (!value) return ''
    return 'limit' in value
      ? catalog[value.kind](value.limit)
      : catalog[value.kind]
  }
  const message = () => describe(issue(), messages)
  createEffect(canonical, (value) => {
    const echo =
      requested &&
      Object.is(requested.value, value) &&
      untrack(draft) === requested.text
    if (!echo) setDraft(String(value ?? ''))
    requested = undefined
  })
  createEffect(
    () =>
      disabled() || readonly()
        ? ''
        : message() || describe(issue(), numberInputMessages),
    (text) => input?.setCustomValidity(text),
  )
  const valid = createMemo(() => Boolean(disabled() || readonly() || !issue()))
  createEffect(valid, (value) => {
    untrack(() => props.onValidityChange?.(value))
  })
  function reset() {
    requested = undefined
    setDraft(String(canonical() ?? ''))
  }
  function change(text: string, event: InputEvent) {
    if (disabled() || readonly()) return
    const empty = !text.trim()
    const local = empty ? '' : text
    setDraft(local)
    if (empty ? props.allowEmpty === false : Boolean(draftIssue(text))) return
    const value = empty ? undefined : parseNumberInput(text)
    requested = { value, text: local }
    props.onValueChange(value, event)
  }
  const attributes = omit(
    props,
    'messages',
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
        data-ui-invalid-input={issue() ? '' : undefined}
        invalid={Boolean(issue()) || (props.invalid ?? field?.invalid())}
        aria-invalid={issue() ? 'true' : props['aria-invalid']}
        aria-describedby={
          [props['aria-describedby'], issue() ? errorId : undefined]
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
                issue()
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
      <span id={errorId} class="ui-field-error" hidden={!issue()}>
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

export type { NumberInputMessages } from './inputMessages'
