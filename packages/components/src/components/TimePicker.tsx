import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  Show,
  untrack,
  useContext,
} from 'solid-js'
import {
  ControlSurface,
  type ControlDecorationProps,
} from '../internal/controlDecoration'
import { FieldContext } from '../internal/fieldContext'
import { iconClock } from '../icons'
import {
  formatTimeInput,
  parseTimeInput,
  timeInputPattern,
  type TimeInputFormat,
} from '../utils/dateTime'
import { Button, Input } from './NativeFields'
import { Icon } from './Icon'
import { Popover } from './Popover'
import { TimeSelection } from './TimeSelection'
import {
  resolveTimePickerMessages,
  timePickerMessages,
  type TimePickerMessages,
} from './dateMessages'

export type TimePickerProps = ControlDecorationProps & {
  messages?: Partial<TimePickerMessages>
  label: string
  id?: string
  name?: string
  value?: string
  onValueChange: (value: string | undefined) => void
  onValidityChange?: (valid: boolean) => void
  timeView?: 'columns' | 'clock'
  timeFormat?: TimeInputFormat
  locale?: string
  min?: string
  max?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  invalid?: boolean
  'aria-describedby'?: string
  clearLabel?: string
}

const pad = (value: number) => String(value).padStart(2, '0')
type Clock = { hour: number; minute: number; second?: number }
function canonicalParts(value: string | undefined): Clock | undefined {
  if (value === undefined) return undefined
  if (!/^[0-9]{2}:[0-9]{2}(?::[0-9]{2})?$/.test(value))
    throw new RangeError(
      'Time value requires HH:mm or HH:mm:ss without a timezone',
    )
  const parsed = parseTimeInput(
    value,
    value.length === 8 ? 'HH:mm:ss' : 'HH:mm',
  )
  if (!parsed)
    throw new RangeError('Time value must contain a valid clock time')
  return parsed
}
function seconds(value: Clock) {
  return value.hour * 3600 + value.minute * 60 + (value.second ?? 0)
}
function format(value: Clock, pattern: TimeInputFormat, locale?: string) {
  return formatTimeInput(
    { date: '1970-01-01', ...value, second: value.second ?? 0, millisecond: 0 },
    pattern,
    locale,
  )
}

export function TimePicker(props: TimePickerProps) {
  const messages = resolveTimePickerMessages(() => props.messages)
  const field = useContext(FieldContext)
  const generated = createUniqueId()
  const errorId = createUniqueId()
  const id = () => props.id ?? field?.baseControlId() ?? generated
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const pattern = () => timeInputPattern(props.timeFormat)
  const accepted = createMemo(() => canonicalParts(props.value))
  const bounds = createMemo(() => ({
    min: canonicalParts(props.min),
    max: canonicalParts(props.max),
  }))
  const display = () => {
    const value = accepted()
    return value ? format(value, pattern(), props.locale) : ''
  }
  const [localDraft, setLocalDraft] = createSignal(untrack(display))
  const draft = localDraft
  const presentation = createMemo(
    () => [display(), props.timeFormat, props.locale] as const,
    {
      equals: (left, right) =>
        left.every((value, index) => value === right[index]),
    },
  )
  createEffect(presentation, ([value]) => {
    setLocalDraft(value)
  })
  function withPrecision(value: Clock): Clock {
    return { ...value, second: value.second ?? accepted()?.second }
  }
  function inRange(value: Clock) {
    const { min, max } = bounds()
    return (
      (!min || seconds(value) >= seconds(min)) &&
      (!max || seconds(value) <= seconds(max))
    )
  }
  const invalid = createMemo(() => {
    if (!draft().trim()) return false
    const parsed = parseTimeInput(draft(), pattern(), props.locale)
    return !parsed || !inRange(withPrecision(parsed))
  })
  const localInvalid = invalid
  const error = () => messages.invalidTime(pattern())
  let input: HTMLInputElement | undefined
  let trigger: HTMLButtonElement | undefined
  let popup: HTMLDivElement | undefined
  let alive = true
  onCleanup(() => {
    alive = false
  })
  createEffect(
    () => ({
      message: localInvalid()
        ? error() || timePickerMessages.invalidTime(pattern())
        : '',
    }),
    ({ message }) => {
      input?.setCustomValidity(message)
    },
  )
  const valid = createMemo(() =>
    Boolean(disabled() || readonly() || !invalid()),
  )
  createEffect(valid, (value) => {
    props.onValidityChange?.(value)
  })
  const [open, setOpen] = createSignal(false)
  const [hour, setHour] = createSignal(0)
  const [minute, setMinute] = createSignal(0)
  const [second, setSecond] = createSignal(0)
  createEffect(
    () => Boolean(disabled() || readonly()),
    (locked) => {
      if (locked) setOpen(false)
    },
  )
  function change(value: string) {
    if (disabled() || readonly()) return
    setLocalDraft(value)
    if (!value.trim()) {
      props.onValueChange(undefined)
      return
    }
    const parsed = parseTimeInput(value, pattern(), props.locale)
    if (!parsed) return
    const next = withPrecision(parsed)
    if (!inRange(next)) return
    props.onValueChange(
      `${pad(next.hour)}:${pad(next.minute)}${next.second === undefined ? '' : ':' + pad(next.second)}`,
    )
  }
  function changeOpen(value: boolean) {
    if (value && (disabled() || readonly())) return
    if (value) {
      const seed = parseTimeInput(draft(), pattern(), props.locale) ??
        accepted() ??
        bounds().min ?? { hour: 0, minute: 0 }
      setHour(seed.hour)
      setMinute(seed.minute)
      setSecond(seed.second ?? accepted()?.second ?? 0)
    }
    setOpen(value)
  }
  const selected = () => ({
    hour: hour(),
    minute: minute(),
    second: pattern().includes(':ss') ? second() : accepted()?.second,
  })
  function apply() {
    if (disabled() || readonly() || !inRange(selected())) return
    const previousFocus = popup?.ownerDocument.activeElement
    const owned = Boolean(previousFocus && popup?.contains(previousFocus))
    change(format(selected(), pattern(), props.locale))
    setLocalDraft(display())
    const active = trigger?.ownerDocument.activeElement
    if (
      alive &&
      trigger?.isConnected &&
      !trigger.disabled &&
      owned &&
      (popup?.contains(active ?? null) ||
        (active === trigger.ownerDocument.body && !previousFocus?.isConnected))
    )
      trigger.focus({ preventScroll: true })
    setOpen(false)
  }
  return (
    <div class="ui-date-picker ui-time-picker" data-ui="">
      <Show when={!field}>
        <label for={id()} class="ui-label">
          {props.label}
        </label>
      </Show>
      <Popover open={open()} onOpenChange={changeOpen}>
        <ControlSurface class="ui-input-affix" decoration={props.decoration}>
          <Input
            id={id()}
            type="text"
            value={draft()}
            placeholder={pattern()}
            disabled={disabled()}
            readonly={readonly()}
            required={props.required ?? field?.required()}
            invalid={localInvalid() || (props.invalid ?? field?.invalid())}
            data-ui-invalid-input={localInvalid() ? '' : undefined}
            data-date-invalid={localInvalid() ? '' : undefined}
            aria-describedby={
              [props['aria-describedby'], localInvalid() ? errorId : undefined]
                .filter(Boolean)
                .join(' ') || undefined
            }
            ref={(node) => {
              input = node
            }}
            onValueChange={change}
            onBlur={() => {
              if (!invalid()) setLocalDraft(display())
            }}
            onKeyDown={(event) => {
              if (event.isComposing) return
              if (
                event.key === 'ArrowDown' &&
                event.altKey &&
                !disabled() &&
                !readonly()
              ) {
                event.preventDefault()
                changeOpen(true)
              }
              if (event.key === 'Escape' && !open()) {
                event.preventDefault()
                event.stopPropagation()
                setLocalDraft(display())
              }
            }}
          />
          <Popover.Trigger
            type="button"
            class="ui-date-trigger"
            disabled={disabled() || readonly()}
            aria-label={messages.openTimePicker(props.label)}
            ref={(node) => {
              trigger = node
            }}
          >
            <Icon glyph={iconClock} />
          </Popover.Trigger>
          <Button
            type="button"
            class="ui-input-clear"
            aria-label={props.clearLabel ?? messages.clearTime(props.label)}
            disabled={disabled() || readonly() || (!draft() && !props.value)}
            onClick={() => {
              if (disabled() || readonly()) return
              input?.focus({ preventScroll: true })
              change('')
            }}
          >
            <Icon name="cross" />
          </Button>
        </ControlSurface>
        <Popover.Portal>
          <Popover.Content
            class="ui-date-popup ui-time-popup"
            ref={(node) => {
              popup = node
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              queueMicrotask(() => {
                if (alive && open() && !disabled() && !readonly())
                  popup
                    ?.querySelector<HTMLElement>(
                      '[role=slider], [role=option][tabindex="0"]',
                    )
                    ?.focus()
              })
            }}
          >
            <Popover.Title>
              {messages.timePickerTitle(props.label)}
            </Popover.Title>
            <FieldContext value={null}>
              <TimeSelection
                value={{ hour: hour(), minute: minute(), second: second() }}
                timeView={props.timeView}
                timeFormat={props.timeFormat}
                locale={props.locale}
                messages={props.messages}
                disabled={disabled()}
                readonly={readonly()}
                label={props.label}
                onValueChange={(value) => {
                  setHour(value.hour)
                  setMinute(value.minute)
                  setSecond(value.second)
                }}
              />
              <Button
                type="button"
                disabled={disabled() || readonly() || !inRange(selected())}
                onClick={apply}
              >
                {messages.applyTime}
              </Button>
            </FieldContext>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
      <Show when={props.name}>
        <input
          type="hidden"
          name={props.name}
          value={props.value ?? ''}
          disabled={disabled()}
        />
      </Show>
      <span id={errorId} class="ui-field-error" hidden={!localInvalid()}>
        {error()}
      </span>
    </div>
  )
}
