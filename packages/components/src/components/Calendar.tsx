import { resolveCalendarMessages, type CalendarMessages } from './dateMessages'
import { Icon } from './Icon'
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  untrack,
} from 'solid-js'
import { Button, Input } from './NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import {
  parseDate,
  dateValue,
  isSupportedDateYear,
  isDateWithinBounds,
} from '../utils/date'
import { dateFormatter } from '../utils/intlFormat'
import { utcDate, modifyDate } from '../vendor/corvu-calendar/utils'
import { navigateDay } from '../vendor/corvu-calendar/navigation'

export type CalendarProps = {
  messages?: Partial<CalendarMessages>
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
  const messages = resolveCalendarMessages(() => props.messages)
  const initial = untrack(
    () => props.value ?? props.initialMonth ?? '1970-01-01',
  )
  const [focused, setFocused] = createSignal(
    parseDate(initial) ? initial : '1970-01-01',
  )
  const [month, setMonth] = createSignal(
    untrack(() => focused().slice(0, 7) + '-01'),
  )
  const [choosing, setChoosing] = createSignal(false)
  const title = createUniqueId()
  let heading!: HTMLButtonElement
  const help = createUniqueId()
  let host!: HTMLDivElement
  const start = () => Math.max(0, Math.min(6, props.startOfWeek ?? 1))
  const disabled = (day: Date) => {
    const value = dateValue(day)
    return Boolean(
      props.disabled ||
      !isSupportedDateYear(day.getUTCFullYear()) ||
      !isDateWithinBounds(value, props.min, props.max) ||
      props.isDateDisabled?.(value),
    )
  }
  const formatter = () =>
    dateFormatter(props.locale ?? 'en-US', {
      calendar: 'gregory',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  const label = (day: Date) =>
    dateFormatter(props.locale ?? 'en-US', {
      calendar: 'gregory',
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
    if (!isSupportedDateYear(day.getUTCFullYear())) return
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
      onKeyDown={(event) => {
        if (choosing() && event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          setChoosing(false)
          heading.focus()
        }
      }}
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
          aria-label={
            choosing() ? messages.previousYear : messages.previousMonth
          }
          disabled={
            props.disabled ||
            (choosing()
              ? month().startsWith('0001-')
              : month().startsWith('0001-01'))
          }
          onClick={() =>
            move(
              modifyDate(
                parseDate(month())!,
                choosing() ? { year: -1 } : { month: -1 },
              ),
              false,
            )
          }
        >
          <span class="ui-icon-text-slot">
            <Icon name="chevron-left" />
          </span>
        </Button>
        <Button
          class="ui-calendar-heading ui-label"
          aria-describedby={title}
          aria-label={messages.chooseMonthYear}
          aria-expanded={choosing() ? 'true' : 'false'}
          disabled={props.disabled}
          ref={(node) => {
            heading = node
          }}
          onClick={() => setChoosing((value) => !value)}
        >
          <span id={title} aria-live="polite">
            {formatter().format(parseDate(month())!)}
          </span>
        </Button>
        <Button
          type="button"
          aria-label={choosing() ? messages.nextYear : messages.nextMonth}
          disabled={
            props.disabled ||
            (choosing()
              ? month().startsWith('9999-')
              : month().startsWith('9999-12'))
          }
          onClick={() =>
            move(
              modifyDate(
                parseDate(month())!,
                choosing() ? { year: 1 } : { month: 1 },
              ),
              false,
            )
          }
        >
          <span class="ui-icon-text-slot">
            <Icon name="chevron-right" />
          </span>
        </Button>
      </div>
      <p id={help} class="sr-only">
        {messages.keyboardHelp}
      </p>
      <Show
        when={!choosing()}
        fallback={
          <div class="ui-calendar-months">
            <label>
              {messages.year}
              <Input
                type="number"
                min="1"
                max="9999"
                step="1"
                value={Number(month().slice(0, 4))}
                disabled={props.disabled}
                onValueChange={(value) => {
                  const year = Number(value)
                  if (/^\d{1,4}$/.test(value) && isSupportedDateYear(year))
                    move(
                      utcDate(year, Number(month().slice(5, 7)) - 1, 1),
                      false,
                    )
                }}
              />
            </label>
            <div class="ui-calendar-month-grid">
              <For each={Array.from({ length: 12 }, (_, index) => index)}>
                {(index) => (
                  <Button
                    disabled={props.disabled}
                    onClick={() => {
                      const year = Number(month().slice(0, 4))
                      setChoosing(false)
                      const first = utcDate(year, index, 1)
                      move(first, false)
                      queueMicrotask(() => {
                        if (host.isConnected)
                          (
                            host.querySelector<HTMLButtonElement>(
                              '[data-date][tabindex="0"]',
                            ) ?? heading
                          ).focus()
                      })
                    }}
                  >
                    {dateFormatter(props.locale ?? 'en-US', {
                      calendar: 'gregory',
                      month: 'long',
                      timeZone: 'UTC',
                    }).format(utcDate(2024, index, 1))}
                  </Button>
                )}
              </For>
            </div>
          </div>
        }
      >
        <table
          class="ui-table"
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
                    {dateFormatter(props.locale ?? 'en-US', {
                      calendar: 'gregory',
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
                          aria-selected={
                            props.value === value ? 'true' : 'false'
                          }
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
                            data-selected={
                              props.value === value ? '' : undefined
                            }
                            aria-label={label(day)}
                            tabindex={
                              tabDay() && dateValue(tabDay()!) === value
                                ? 0
                                : -1
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
      </Show>
    </div>
  )
}
