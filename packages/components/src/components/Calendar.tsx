import {
  For,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  untrack,
} from 'solid-js'
import { Button } from './NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import { parseDate, dateValue } from '../utils/date'
import { utcDate, modifyDate } from '../vendor/corvu-calendar/utils'
import { navigateDay } from '../vendor/corvu-calendar/navigation'

export type CalendarProps = {
  value?: string
  onValueChange: (value: string) => void
  initialMonth?: string
  locale?: string
  startOfWeek?: number
  direction?: 'ltr' | 'rtl'
  min?: string
  max?: string
  disabled?: boolean
  isDateDisabled?: (value: string) => boolean
  label?: string
  ref?: (node: HTMLDivElement) => void
}

/** A single-date calendar. Values contain a date, without a time or timezone. */
export function Calendar(props: CalendarProps) {
  const initial = untrack(
    () => props.value ?? props.initialMonth ?? '1970-01-01',
  )
  const [focused, setFocused] = createSignal(
    parseDate(initial) ? initial : '1970-01-01',
  )
  const [month, setMonth] = createSignal(
    untrack(() => focused().slice(0, 7) + '-01'),
  )
  const title = createUniqueId()
  const help = createUniqueId()
  let host!: HTMLDivElement
  const start = () => Math.max(0, Math.min(6, props.startOfWeek ?? 1))
  const disabled = (day: Date) => {
    const value = dateValue(day)
    return Boolean(
      props.disabled ||
      day.getUTCFullYear() < 1 ||
      day.getUTCFullYear() > 9999 ||
      (props.min && value < props.min) ||
      (props.max && value > props.max) ||
      props.isDateDisabled?.(value),
    )
  }
  const formatter = () =>
    new Intl.DateTimeFormat(props.locale ?? 'en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  const label = (day: Date) =>
    new Intl.DateTimeFormat(props.locale ?? 'en-US', {
      dateStyle: 'full',
      timeZone: 'UTC',
    }).format(day)
  const days = createMemo(() => {
    const first = parseDate(month())!
    const offset = (first.getUTCDay() - start() + 7) % 7
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) =>
        utcDate(
          first.getUTCFullYear(),
          first.getUTCMonth(),
          1 - offset + week * 7 + day,
        ),
      ),
    )
  })
  const tabDay = createMemo(() => {
    const all = days().flat()
    return (
      all.find((day) => dateValue(day) === focused() && !disabled(day)) ??
      all.find((day) => !disabled(day))
    )
  })
  createEffect(
    () => props.value,
    (value) => {
      if (!parseDate(value)) return
      setFocused(value!)
      setMonth(value!.slice(0, 7) + '-01')
    },
  )
  function move(day: Date, focus = true) {
    if (day.getUTCFullYear() < 1 || day.getUTCFullYear() > 9999) return
    const value = dateValue(day)
    setMonth(value.slice(0, 7) + '-01')
    setFocused(value)
    if (focus)
      queueMicrotask(() => {
        if (host?.isConnected && !props.disabled)
          host
            .querySelector<HTMLButtonElement>(`[data-date="${value}"]`)
            ?.focus()
      })
  }
  return (
    <div
      class="ui-calendar"
      tabindex={-1}
      data-ui=""
      dir={props.direction}
      ref={[
        (node) => {
          host = node
        },
        props.ref,
      ]}
    >
      <div class="ui-calendar-navigation">
        <Button
          type="button"
          aria-label="Previous month"
          disabled={props.disabled || month().startsWith('0001-01')}
          onClick={() =>
            move(modifyDate(parseDate(month())!, { month: -1 }), false)
          }
        >
          ‹
        </Button>
        <span id={title} class="ui-label" aria-live="polite">
          {formatter().format(parseDate(month())!)}
        </span>
        <Button
          type="button"
          aria-label="Next month"
          disabled={props.disabled || month().startsWith('9999-12')}
          onClick={() =>
            move(modifyDate(parseDate(month())!, { month: 1 }), false)
          }
        >
          ›
        </Button>
      </div>
      <p id={help} class="sr-only">
        Use arrow keys for days, Home and End for the week, and Page Up or Page
        Down for months. Hold Shift for years.
      </p>
      <table
        role="grid"
        aria-label={props.label}
        aria-describedby={help}
        aria-labelledby={props.label ? undefined : title}
      >
        <thead>
          <tr>
            <For each={Array.from({ length: 7 }, (_, index) => index)}>
              {(index) => (
                <th scope="col">
                  {new Intl.DateTimeFormat(props.locale ?? 'en-US', {
                    weekday: 'short',
                    timeZone: 'UTC',
                  }).format(utcDate(2024, 0, 7 + ((start() + index) % 7)))}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={days()}>
            {(week) => (
              <tr>
                <For each={week}>
                  {(day) => {
                    const value = dateValue(day)
                    return (
                      <td
                        role="gridcell"
                        aria-selected={props.value === value ? 'true' : 'false'}
                        aria-disabled={disabled(day) ? 'true' : undefined}
                      >
                        <Button
                          type="button"
                          data-date={value}
                          data-outside={
                            value.slice(0, 7) !== month().slice(0, 7)
                              ? ''
                              : undefined
                          }
                          data-selected={props.value === value ? '' : undefined}
                          aria-label={label(day)}
                          tabindex={
                            tabDay() && dateValue(tabDay()!) === value ? 0 : -1
                          }
                          disabled={disabled(day)}
                          ref={nativeEvents<HTMLButtonElement>({
                            click: () => {
                              if (!disabled(day)) props.onValueChange(value)
                            },
                            focus: () => setFocused(value),
                            keydown: (event) => {
                              const next = navigateDay(
                                day,
                                event.key,
                                event.shiftKey,
                                start(),
                                props.direction === 'rtl',
                                disabled,
                              )
                              if (
                                /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown)$/.test(
                                  event.key,
                                )
                              ) {
                                event.preventDefault()
                                event.stopPropagation()
                                if (next) move(next)
                              }
                            },
                          })}
                        >
                          {day.getUTCDate()}
                        </Button>
                      </td>
                    )
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}
