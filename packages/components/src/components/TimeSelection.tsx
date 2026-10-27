import { createEffect, createMemo, createUniqueId, For, Show } from 'solid-js'
import { Button } from './NativeFields'
import { TimeClock, type ClockValue, type TimeClockProps } from './TimeClock'
import { resolveTimeClockMessages } from './timeClockMessages'
import { formatTimeInput, timeInputPattern } from '../utils/dateTime'

export type { ClockValue } from './TimeClock'
export type TimeSelectionProps = TimeClockProps & {
  timeView?: 'columns' | 'clock'
}
type Part = keyof ClockValue | 'period'
const pad = (value: number) => String(value).padStart(2, '0')
const hours24 = Array.from({ length: 24 }, (_, index) => index)
const hours12 = Array.from({ length: 12 }, (_, index) => index + 1)
const minutes = Array.from({ length: 60 }, (_, index) => index)
const periods = [0, 1]

/** One wall-clock value contract for inline time columns and the clock face. */
export function TimeSelection(props: TimeSelectionProps) {
  return (
    <Show
      when={props.timeView === 'clock'}
      fallback={<TimeColumns {...props} />}
    >
      <TimeClock {...props} />
    </Show>
  )
}
function TimeColumns(props: TimeClockProps) {
  const messages = resolveTimeClockMessages(() => props.messages)
  const twelve = () => timeInputPattern(props.timeFormat).startsWith('hh')
  const parts = createMemo<Part[]>(() => [
    'hour',
    'minute',
    ...(timeInputPattern(props.timeFormat).includes(':ss')
      ? ['second' as const]
      : []),
    ...(twelve() ? ['period' as const] : []),
  ])
  const periodLabels = () =>
    periods.map((period) =>
      formatTimeInput(
        {
          date: '1970-01-01',
          hour: period * 12,
          minute: 0,
          second: 0,
          millisecond: 0,
        },
        'hh:mm a',
        props.locale,
      ).slice(6),
    )
  function selected(part: Part) {
    if (part === 'period') return props.value.hour < 12 ? 0 : 1
    if (part === 'hour' && twelve()) return props.value.hour % 12 || 12
    return props.value[part]
  }
  function choose(part: Part, value: number) {
    if (props.disabled || props.readonly) return
    const next = { ...props.value }
    if (part === 'period') next.hour = (next.hour % 12) + value * 12
    else if (part === 'hour' && twelve())
      next.hour = (value % 12) + (next.hour >= 12 ? 12 : 0)
    else next[part] = value
    props.onValueChange(next)
  }
  return (
    <div
      class="ui-time-columns"
      data-ui=""
      role="group"
      aria-label={props.label}
      ref={props.ref}
    >
      <For each={parts()}>
        {(part) => (
          <TimeColumn
            label={messages[part]}
            value={selected(part)}
            options={
              part === 'hour'
                ? twelve()
                  ? hours12
                  : hours24
                : part === 'period'
                  ? periods
                  : minutes
            }
            text={(value) =>
              part === 'period' ? periodLabels()[value]! : pad(value)
            }
            disabled={props.disabled}
            readonly={props.readonly}
            onChange={(value) => choose(part, value)}
          />
        )}
      </For>
    </div>
  )
}
function TimeColumn(props: {
  label: string
  options: number[]
  value: number
  text: (value: number) => string
  disabled?: boolean
  readonly?: boolean
  onChange: (value: number) => void
}) {
  const id = createUniqueId()
  let list: HTMLDivElement | undefined
  createEffect(
    () => props.value,
    (value) => {
      const option = list?.querySelector<HTMLElement>(
        `[data-time-value="${value}"]`,
      )
      if (!list || !option) return
      const top = option.offsetTop
      if (top < list.scrollTop) list.scrollTop = top
      else if (top + option.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTop = top + option.offsetHeight - list.clientHeight
    },
  )
  return (
    <div class="ui-time-column">
      <span class="ui-label" id={id}>
        {props.label}
      </span>
      <div
        class="ui-time-column-list"
        role="listbox"
        aria-labelledby={id}
        aria-disabled={props.disabled || props.readonly ? 'true' : undefined}
        ref={(node) => {
          list = node
        }}
        onKeyDown={(event) => {
          if (props.disabled || event.isComposing) return
          const target =
            event.target instanceof HTMLElement
              ? event.target.closest<HTMLElement>('[data-time-value]')
              : null
          if (!target) return
          const index = props.options.indexOf(Number(target.dataset.timeValue))
          let next: number
          if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = props.options.length - 1
          else if (event.key === 'ArrowDown' || event.key === 'ArrowUp')
            next =
              (index +
                (event.key === 'ArrowDown' ? 1 : -1) +
                props.options.length) %
              props.options.length
          else return
          event.preventDefault()
          const value = props.options[next]!
          if (!props.readonly) props.onChange(value)
          list
            ?.querySelector<HTMLElement>(`[data-time-value="${value}"]`)
            ?.focus({ preventScroll: true })
        }}
      >
        <For each={props.options}>
          {(value) => (
            <Button
              type="button"
              variant="ghost"
              class="ui-time-option"
              role="option"
              aria-selected={props.value === value ? 'true' : 'false'}
              data-time-value={value}
              tabindex={!props.disabled && props.value === value ? 0 : -1}
              disabled={props.disabled}
              aria-disabled={props.readonly ? 'true' : undefined}
              onClick={() => {
                if (!props.disabled && !props.readonly) props.onChange(value)
              }}
            >
              {props.text(value)}
            </Button>
          )}
        </For>
      </div>
    </div>
  )
}
