import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  untrack,
  useContext,
} from 'solid-js'
import { FieldContext } from '../internal/fieldContext'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { Input, InputGroup } from './NativeFields'
import { Popover } from './Popover'

export type ColorPickerProps = ControlDecorationProps & {
  label: string
  value: string
  onValueChange: (value: string) => void
  id?: string
  name?: string
  form?: string
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  'aria-describedby'?: string
  messages?: Partial<{
    open: string
    title: string
    red: string
    green: string
    blue: string
    invalid: string
  }>
}

/** Opaque sRGB colors, with a local hex draft and application-owned value. */
export function ColorPicker(props: ColorPickerProps) {
  const field = useContext(FieldContext)
  const canonical = createMemo(() => {
    const text = props.value
    if (!/^#[\da-f]{6}$/i.test(text))
      throw new RangeError('ColorPicker value requires #RRGGBB')
    return text.toLowerCase()
  })
  const [draft, setDraft] = createSignal(untrack(canonical))
  const [open, setOpen] = createSignal(false)
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const invalid = () => !/^#[\da-f]{6}$/i.test(draft())
  const channels = createMemo(() =>
    [1, 3, 5].map((offset) =>
      parseInt(canonical().slice(offset, offset + 2), 16),
    ),
  )
  let input: HTMLInputElement | undefined
  createEffect(canonical, (value) => {
    setDraft(value)
  })
  createEffect(
    () =>
      disabled() || readonly() || !invalid()
        ? ''
        : (props.messages?.invalid ?? 'Enter a color as #RRGGBB.'),
    (text) => input?.setCustomValidity(text),
  )
  createEffect(
    () => Boolean(disabled() || readonly()),
    (blocked) => {
      if (blocked) setOpen(false)
    },
  )
  function change(text: string) {
    if (disabled() || readonly()) return
    setDraft(text)
    if (/^#[\da-f]{6}$/i.test(text)) props.onValueChange(text.toLowerCase())
  }
  function channel(index: number, value: number) {
    if (disabled() || readonly()) return
    const next = channels().map((old, position) =>
      position === index ? value : old,
    )
    props.onValueChange(
      '#' + next.map((value) => value.toString(16).padStart(2, '0')).join(''),
    )
  }
  const names = () => [
    props.messages?.red ?? 'Red',
    props.messages?.green ?? 'Green',
    props.messages?.blue ?? 'Blue',
  ]
  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <InputGroup
        class="ui-input-affix ui-color-picker"
        decoration={props.decoration}
      >
        <Input
          id={props.id}
          form={props.form}
          aria-label={props.label}
          aria-describedby={props['aria-describedby']}
          value={draft()}
          disabled={disabled()}
          readonly={readonly()}
          invalid={invalid() || (props.invalid ?? field?.invalid())}
          spellcheck={false}
          autocomplete="off"
          ref={(node) => {
            input = node
          }}
          onValueChange={change}
          onBlur={() => {
            if (!invalid()) setDraft(canonical())
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.isComposing) {
              event.preventDefault()
              event.stopPropagation()
              setDraft(canonical())
              setOpen(false)
            }
          }}
        />
        <Popover.Trigger
          type="button"
          class="ui-color-trigger"
          disabled={disabled() || readonly()}
          aria-label={props.messages?.open ?? `Choose ${props.label} color`}
        >
          <span
            class="ui-color-swatch"
            style={{ 'background-color': canonical() }}
          />
        </Popover.Trigger>
      </InputGroup>
      <Show when={props.name}>
        <input
          type="hidden"
          name={props.name}
          form={props.form}
          value={canonical()}
          disabled={disabled()}
        />
      </Show>
      <Popover.Portal>
        <Popover.Content class="ui-color-popup">
          <Popover.Title>{props.messages?.title ?? props.label}</Popover.Title>
          <For each={[0, 1, 2]}>
            {(index) => (
              <label class="ui-color-channel">
                <span>{names()[index]}</span>
                <input
                  type="range"
                  aria-label={names()[index]}
                  min="0"
                  max="255"
                  step="1"
                  value={channels()[index]}
                  disabled={disabled() || readonly()}
                  onInput={(event) => {
                    channel(index, Number(event.currentTarget.value))
                    event.currentTarget.value = String(channels()[index])
                  }}
                />
                <output>{channels()[index]}</output>
              </label>
            )}
          </For>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
