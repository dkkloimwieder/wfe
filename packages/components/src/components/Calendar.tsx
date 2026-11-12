import { resolveCalendarMessages, type CalendarMessages } from './dateMessages'
import {
  calendarRangeValue,
  selectCalendarRange,
} from '../internal/calendarRange'
import type { CalendarRange } from '../internal/calendarRange'
export type { CalendarRange } from '../internal/calendarRange'
import { Icon } from './Icon'
import {
  For,
  omit,
  onSettled,
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

export type RangeCalendarProps = Omit<
  CalendarProps,
  'value' | 'onValueChange'
> & {
  value?: CalendarRange
  onValueChange: (value: CalendarRange) => void
  numberOfMonths?: 1 | 2 | 3
  readonly?: boolean
}

/** Date-only selection uses one grid and navigation implementation. */
export function Calendar(props: CalendarProps) {
  return <CalendarView {...props} />
}
export function RangeCalendar(props: RangeCalendarProps) {
  const value = createMemo(() => calendarRangeValue(props.value))
  return (
    <CalendarView
      {...omit(props, 'value', 'onValueChange')}
      value={value()?.end ?? value()?.start}
      numberOfMonths={props.numberOfMonths ?? 2}
      selected={(day) =>
        Boolean(
          value() &&
          day >= value()!.start &&
          day <= (value()!.end ?? value()!.start),
        )
      }
      rangeStart={value()?.start}
      rangeEnd={value()?.end}
      onValueChange={(day) => {
        if (!props.readonly)
          props.onValueChange(selectCalendarRange(value(), day))
      }}
    />
  )
}

type CalendarViewProps = CalendarProps & {
  numberOfMonths?: number
  readonly?: boolean
  selected?: (day: string) => boolean
  rangeStart?: string
  rangeEnd?: string
}
function CalendarView(props: CalendarViewProps) {
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
  let alive = true
  onSettled(() => () => {
    alive = false
  })
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
  const monthCount = createMemo(() => {
    const count = props.numberOfMonths ?? 1
    if (!Number.isInteger(count) || count < 1 || count > 3)
      throw new RangeError('Calendars support one to three visible months')
    return count
  })
  const monthViews = createMemo(() =>
    Array.from({ length: monthCount() }, (_, index) => {
      const first = modifyDate(parseDate(month())!, { month: index })
      if (!isSupportedDateYear(first.getUTCFullYear())) return undefined
      const value = dateValue(first)
      const offset = (first.getUTCDay() - start() + 7) % 7
      return {
        value,
        weeks: Array.from({ length: 6 }, (_, week) =>
          Array.from({ length: 7 }, (_, day) =>
            utcDate(
              first.getUTCFullYear(),
              first.getUTCMonth(),
              1 - offset + week * 7 + day,
            ),
          ),
        ),
      }
    }).filter((view): view is NonNullable<typeof view> => view !== undefined),
  )
  const visibleDays = createMemo(() =>
    monthViews().flatMap((view) =>
      view.weeks
        .flat()
        .filter(
          (day) =>
            monthCount() === 1 ||
            dateValue(day).slice(0, 7) === view.value.slice(0, 7),
        ),
    ),
  )
  const selected = (value: string) =>
    props.selected?.(value) ?? props.value === value
  function showDate(value: string, force = false) {
    const target = value.slice(0, 7) + '-01'
    const views = monthViews()
    if (force || target < month()) setMonth(target)
    else if (target > views.at(-1)!.value) {
      const first = modifyDate(parseDate(target)!, { month: 1 - monthCount() })
      setMonth(
        isSupportedDateYear(first.getUTCFullYear())
          ? dateValue(first)
          : '0001-01-01',
      )
    }
  }
  const tabDay = createMemo(() => {
    const all = visibleDays()
    return (
      all.find((day) => dateValue(day) === focused() && !disabled(day)) ??
      all.find((day) => !disabled(day))
    )
  })
  createEffect(
    () => props.value,
    (value) => {
      if (!parseDate(value)) return
      const previous = untrack(() => host?.ownerDocument.activeElement)
      const owned = previous && untrack(() => host?.contains(previous))
      setFocused(value!)
      untrack(() => showDate(value!))
      if (owned && previous) focusDate(value!, previous)
    },
  )
  function focusDate(value: string, previous?: Element) {
    queueMicrotask(() =>
      untrack(() => {
        if (!alive || !host?.isConnected || props.disabled) return
        if (
          previous &&
          (previous.isConnected ||
            host.ownerDocument.activeElement !== host.ownerDocument.body)
        )
          return
        host.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)?.focus()
      }),
    )
  }
  function move(day: Date, focus = true, forceMonth = false) {
    if (!isSupportedDateYear(day.getUTCFullYear())) return
    const value = dateValue(day)
    showDate(value, forceMonth)
    setFocused(value)
    if (focus) focusDate(value)
  }
  function MonthGrid(monthProps: { value: string }) {
    const weeks = () =>
      monthViews().find((view) => view.value === monthProps.value)?.weeks ?? []
    const visible = (day: Date) =>
      monthCount() === 1 ||
      dateValue(day).slice(0, 7) === monthProps.value.slice(0, 7)
    return (
      <table
        class="ui-table"
        role="grid"
        aria-label={
          monthCount() > 1
            ? [props.label, formatter().format(parseDate(monthProps.value)!)]
                .filter(Boolean)
                .join(' ')
            : props.label
        }
        aria-multiselectable={props.selected ? 'true' : undefined}
        aria-readonly={props.readonly ? 'true' : undefined}
        aria-describedby={help}
        aria-labelledby={props.label || monthCount() > 1 ? undefined : title}
      >
        <Show when={monthCount() > 1}>
          <caption>{formatter().format(parseDate(monthProps.value)!)}</caption>
        </Show>
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
          <For each={weeks()}>
            {(week) => (
              <tr>
                <For each={week}>
                  {(day) => {
                    const value = dateValue(day)
                    return (
                      <td
                        role="gridcell"
                        aria-selected={
                          visible(day)
                            ? selected(value)
                              ? 'true'
                              : 'false'
                            : undefined
                        }
                        aria-disabled={
                          visible(day) && disabled(day) ? 'true' : undefined
                        }
                      >
                        <Show when={visible(day)}>
                          <Button
                            type="button"
                            data-date={value}
                            data-outside={
                              value.slice(0, 7) !== monthProps.value.slice(0, 7)
                                ? ''
                                : undefined
                            }
                            data-selected={selected(value) ? '' : undefined}
                            data-range-start={
                              props.rangeStart === value ? '' : undefined
                            }
                            data-range-end={
                              props.rangeEnd === value ? '' : undefined
                            }
                            data-readonly={props.readonly ? '' : undefined}
                            aria-label={label(day)}
                            tabindex={
                              tabDay() && dateValue(tabDay()!) === value
                                ? 0
                                : -1
                            }
                            disabled={disabled(day)}
                            ref={nativeEvents<HTMLButtonElement>({
                              click: () => {
                                if (!disabled(day) && !props.readonly)
                                  props.onValueChange(value)
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
                            <span class="ui-calendar-day-number">
                              {day.getUTCDate()}
                            </span>
                          </Button>
                        </Show>
                      </td>
                    )
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    )
  }
  return (
    <div
      class="ui-calendar"
      style={{ '--ui-calendar-month-count': monthCount() }}
      data-range={props.selected ? '' : undefined}
      data-multiple-months={monthCount() > 1 ? '' : undefined}
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
              true,
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
            {monthViews().length > 1
              ? formatter().formatRange(
                  parseDate(month())!,
                  parseDate(monthViews().at(-1)!.value)!,
                )
              : formatter().format(parseDate(month())!)}
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
              true,
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
                      true,
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
                      move(first, false, true)
                      queueMicrotask(() => {
                        if (alive && host.isConnected)
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
        <Show
          when={monthCount() === 1}
          fallback={
            <div class="ui-calendar-pages">
              <For each={monthViews().map((view) => view.value)}>
                {(value) => <MonthGrid value={value} />}
              </For>
            </div>
          }
        >
          <MonthGrid value={month()} />
        </Show>
      </Show>
    </div>
  )
}
