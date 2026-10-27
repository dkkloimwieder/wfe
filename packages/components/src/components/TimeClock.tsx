import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Show,
  untrack,
} from 'solid-js'
import {
  formatTimeInput,
  timeInputPattern,
  type TimeInputFormat,
} from '../utils/dateTime'
import { Button, Input } from './NativeFields'
import {
  resolveTimeClockMessages,
  type TimeClockMessages,
} from './timeClockMessages'

export type ClockValue = { hour: number; minute: number; second: number }
type ClockUnit = keyof ClockValue
export type TimeClockProps = {
  value: ClockValue
  onValueChange: (value: ClockValue) => void
  timeFormat?: TimeInputFormat
  locale?: string
  messages?: Partial<TimeClockMessages>
  disabled?: boolean
  readonly?: boolean
  label?: string
  ref?: (node: HTMLDivElement) => void
}
const ticks = Array.from({ length: 12 }, (_, index) => index)
const pad = (value: number) => String(value).padStart(2, '0')

/** Shared wall-clock selection. The owner validates bounds and commits its value. */
export function TimeClock(props: TimeClockProps) {
  const messages = resolveTimeClockMessages(() => props.messages)
  const helpId = createUniqueId()
  const [requestedUnit, setUnit] = createSignal<ClockUnit>('hour')
  const pattern = () => timeInputPattern(props.timeFormat)
  const twelve = () => pattern().startsWith('hh')
  const unit = () =>
    requestedUnit() === 'second' && !pattern().includes(':ss')
      ? 'minute'
      : requestedUnit()
  const label = () => messages[unit()]
  const locked = () => props.disabled || props.readonly
  const minimum = () => (unit() === 'hour' && twelve() ? 1 : 0)
  const maximum = () => (unit() === 'hour' ? (twelve() ? 12 : 23) : 59)
  const displayed = () =>
    unit() === 'hour' && twelve()
      ? props.value.hour % 12 || 12
      : props.value[unit()]
  const units = createMemo<ClockUnit[]>(() =>
    pattern().includes(':ss')
      ? ['hour', 'minute', 'second']
      : ['hour', 'minute'],
  )
  const periodLabels = () =>
    [0, 12].map((hour) =>
      formatTimeInput(
        { date: '1970-01-01', hour, minute: 0, second: 0, millisecond: 0 },
        'hh:mm a',
        props.locale,
      ).slice(6),
    )
  const currentText = () =>
    unit() === 'hour' && twelve()
      ? `${pad(displayed())} ${periodLabels()[props.value.hour < 12 ? 0 : 1]}`
      : pad(displayed())
  const radius = () =>
    unit() === 'hour' &&
    !twelve() &&
    (props.value.hour === 0 || props.value.hour > 12)
      ? 28
      : 41
  const angle = () =>
    (unit() === 'hour'
      ? (props.value.hour % 12) / 12
      : props.value[unit()] / 60) * 360
  function point(degrees: number, distance: number) {
    const radians = (degrees * Math.PI) / 180
    return {
      left: `${50 + Math.sin(radians) * distance}%`,
      top: `${50 - Math.cos(radians) * distance}%`,
    }
  }
  function setPart(part: ClockUnit, value: number) {
    if (
      locked() ||
      !Number.isInteger(value) ||
      value < (part === 'hour' && twelve() ? 1 : 0) ||
      value > (part === 'hour' ? (twelve() ? 12 : 23) : 59)
    )
      return
    const next =
      part === 'hour' && twelve()
        ? (value % 12) + (props.value.hour >= 12 ? 12 : 0)
        : value
    props.onValueChange({ ...props.value, [part]: next })
  }
  function setCurrent(value: number) {
    setPart(unit(), value)
  }
  function advance() {
    if (unit() === 'hour') setUnit('minute')
    else if (unit() === 'minute' && pattern().includes(':ss')) setUnit('second')
  }
  function pick(event: PointerEvent, face: HTMLDivElement) {
    const rect = face.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = (event.clientX - rect.left - rect.width / 2) / rect.width
    const y = (event.clientY - rect.top - rect.height / 2) / rect.height
    const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1
    if (unit() !== 'hour') setCurrent(Math.round(turn * 60) % 60)
    else {
      const hour = Math.round(turn * 12) % 12
      const inner = !twelve() && Math.hypot(x, y) < 0.345
      setCurrent(inner ? (hour === 0 ? 0 : hour + 12) : hour || 12)
    }
  }
  let pointer: number | null = null
  return (
    <div
      class="ui-time-clock"
      data-ui=""
      role="group"
      aria-label={props.label}
      ref={props.ref}
    >
      <div class="ui-time-clock-units" role="group">
        <For each={units()}>
          {(part) => (
            <ClockUnitInput
              label={messages[part]}
              value={
                part === 'hour' && twelve()
                  ? props.value.hour % 12 || 12
                  : props.value[part]
              }
              min={part === 'hour' && twelve() ? 1 : 0}
              max={part === 'hour' ? (twelve() ? 12 : 23) : 59}
              active={unit() === part}
              disabled={props.disabled}
              readonly={props.readonly}
              onFocus={() => setUnit(part)}
              onValueChange={(value) => setPart(part, value)}
            />
          )}
        </For>
      </div>
      <div
        class="ui-time-clock-face"
        role="slider"
        tabindex={props.disabled ? -1 : 0}
        aria-label={label()}
        aria-valuemin={minimum()}
        aria-valuemax={maximum()}
        aria-valuenow={displayed()}
        aria-valuetext={currentText()}
        aria-describedby={helpId}
        aria-disabled={props.disabled ? 'true' : undefined}
        aria-readonly={props.readonly ? 'true' : undefined}
        data-unit={unit()}
        onKeyDown={(event) => {
          if (locked() || event.isComposing) return
          let next: number
          if (event.key === 'Home') next = minimum()
          else if (event.key === 'End') next = maximum()
          else if (
            ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(
              event.key,
            )
          ) {
            const delta =
              event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1
            const count = maximum() - minimum() + 1
            next =
              ((displayed() - minimum() + delta + count) % count) + minimum()
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            advance()
            return
          } else return
          event.preventDefault()
          setCurrent(next)
        }}
        onPointerDown={(event) => {
          if (locked() || event.button !== 0) return
          event.preventDefault()
          pointer = event.pointerId
          event.currentTarget.focus({ preventScroll: true })
          event.currentTarget.setPointerCapture?.(event.pointerId)
          pick(event, event.currentTarget)
        }}
        onPointerMove={(event) => {
          if (!locked() && pointer === event.pointerId)
            pick(event, event.currentTarget)
        }}
        onPointerUp={(event) => {
          if (pointer !== event.pointerId) return
          pointer = null
          if (event.currentTarget.hasPointerCapture?.(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
          if (locked()) return
          pick(event, event.currentTarget)
          advance()
        }}
        onPointerCancel={() => {
          pointer = null
        }}
        onLostPointerCapture={() => {
          pointer = null
        }}
      >
        <span
          class="ui-time-clock-hand"
          aria-hidden="true"
          style={{ height: `${radius()}%`, transform: `rotate(${angle()}deg)` }}
        />
        <span
          class="ui-time-clock-selected"
          aria-hidden="true"
          style={point(angle(), radius())}
        />
        <For each={ticks}>
          {(index) => (
            <span
              class="ui-time-clock-number"
              aria-hidden="true"
              style={point(index * 30, 41)}
            >
              {unit() === 'hour' ? index || 12 : pad(index * 5)}
            </span>
          )}
        </For>
        <Show when={unit() === 'hour' && !twelve()}>
          <For each={ticks}>
            {(index) => (
              <span
                class="ui-time-clock-number"
                data-inner=""
                aria-hidden="true"
                style={point(index * 30, 28)}
              >
                {index ? index + 12 : '00'}
              </span>
            )}
          </For>
        </Show>
        <span class="ui-time-clock-center" aria-hidden="true" />
      </div>
      <Show when={twelve()}>
        <div
          class="ui-time-clock-period"
          role="group"
          aria-label={messages.period}
        >
          <For each={[0, 1]}>
            {(period) => (
              <Button
                type="button"
                aria-pressed={
                  (props.value.hour < 12 ? 0 : 1) === period ? 'true' : 'false'
                }
                disabled={props.disabled || props.readonly}
                onClick={() => {
                  if (!locked())
                    props.onValueChange({
                      ...props.value,
                      hour: (props.value.hour % 12) + period * 12,
                    })
                }}
              >
                {periodLabels()[period]}
              </Button>
            )}
          </For>
        </div>
      </Show>
      <span class="sr-only" id={helpId}>
        {messages.clockInstructions(label())}
      </span>
    </div>
  )
}

/** Each unit retains its text draft while its controlled number is accepted. */
function ClockUnitInput(props: {
  label: string
  value: number
  min: number
  max: number
  active: boolean
  disabled?: boolean
  readonly?: boolean
  onFocus: () => void
  onValueChange: (value: number) => void
}) {
  const id = createUniqueId()
  const [draft, setDraft] = createSignal(untrack(() => pad(props.value)))
  const value = createMemo(() => props.value)
  let editing = false
  let requested: number | undefined
  createEffect(value, (next) => {
    if (!editing || next !== requested) setDraft(pad(next))
  })
  function restore() {
    requested = undefined
    setDraft(pad(props.value))
  }
  return (
    <div class="ui-time-clock-unit" data-active={props.active ? '' : undefined}>
      <label class="ui-label" for={id}>
        {props.label}
      </label>
      <Input
        id={id}
        type="text"
        inputmode="numeric"
        value={draft()}
        disabled={props.disabled}
        readonly={props.readonly}
        onFocus={() => {
          editing = true
          props.onFocus()
        }}
        onBlur={() => {
          editing = false
          restore()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.isComposing) {
            event.preventDefault()
            event.stopPropagation()
            restore()
          }
        }}
        onValueChange={(text) => {
          if (props.disabled || props.readonly) return
          setDraft(text)
          requested = undefined
          if (!/^[0-9]{1,2}$/.test(text)) return
          const next = Number(text)
          if (next < props.min || next > props.max) return
          requested = next
          props.onValueChange(next)
        }}
      />
    </div>
  )
}
