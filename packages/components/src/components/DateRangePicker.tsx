import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  omit,
  onSettled,
  untrack,
} from 'solid-js'
import { Button } from './NativeFields'
import { Popover } from './Popover'
import { RangeCalendar } from './Calendar'
import type { RangeCalendarProps, CalendarRange } from './Calendar'
import { calendarRangeValue } from '../internal/calendarRange'
import {
  createCompoundField,
  createCompoundFieldTarget,
} from '../internal/compoundField'
import {
  renderAfterRegistration,
  renderCompoundFieldRoot,
} from '../internal/fieldRendering'
import { resolveDatePickerMessages } from './dateMessages'
import type { DatePickerMessages } from './dateMessages'
import { dateFormatter } from '../utils/intlFormat'
import { parseDate } from '../utils/date'

export type DateRangePickerProps = Omit<
  RangeCalendarProps,
  'onValueChange' | 'ref' | 'label' | 'messages'
> & {
  label: string
  messages?: Partial<DatePickerMessages>
  name?: string
  id?: string
  invalid?: boolean
  clearLabel?: string
  'aria-describedby'?: string
  onValueChange: (value: CalendarRange | undefined) => void
  ref?: (node: HTMLButtonElement) => void
}

/** One range grid inside the shared popup, with application-owned acceptance. */
export function DateRangePicker(props: DateRangePickerProps) {
  const messages = resolveDatePickerMessages(() => props.messages)
  const state = createCompoundField(props)
  const target = createCompoundFieldTarget({
    get id() {
      return props.id
    },
    get 'aria-label'() {
      return props.label
    },
    get 'aria-describedby'() {
      return props['aria-describedby']
    },
  })
  const generated = createUniqueId()
  const id = () => target.id ?? props.id ?? `date-range-${generated}`
  const value = createMemo(() => calendarRangeValue(props.value))
  const [open, setOpen] = createSignal(false)
  let trigger: HTMLButtonElement | undefined
  let calendar: HTMLDivElement | undefined
  let alive = true
  let pendingFocus: { owned: boolean; previous: Element | null } | undefined
  onSettled(() => () => {
    alive = false
    pendingFocus = undefined
  })
  const display = createMemo(() => {
    const range = value()
    if (!range) return ''
    const formatter = dateFormatter(props.locale ?? 'en-US', {
      calendar: 'gregory',
      dateStyle: 'medium',
      timeZone: 'UTC',
    })
    return range.end
      ? formatter.formatRange(parseDate(range.start)!, parseDate(range.end)!)
      : `${formatter.format(parseDate(range.start)!)}…`
  })
  function closeAccepted() {
    const active = trigger?.ownerDocument.activeElement
    const owned =
      pendingFocus?.owned ?? Boolean(calendar?.contains(active ?? null))
    if (
      alive &&
      trigger?.isConnected &&
      !trigger.disabled &&
      owned &&
      (calendar?.contains(active ?? null) ||
        (active === trigger.ownerDocument.body &&
          pendingFocus?.previous &&
          !pendingFocus.previous.isConnected))
    )
      trigger.focus({ preventScroll: true })
    pendingFocus = undefined
    setOpen(false)
  }
  createEffect(
    () => [value()?.start, value()?.end] as const,
    ([start, end], previous) => {
      if (end && (start !== previous?.[0] || end !== previous?.[1]))
        untrack(() => {
          if (open()) closeAccepted()
        })
    },
  )
  createEffect(
    () => state.disabled() || state.readonly(),
    (blocked) => {
      if (blocked) {
        pendingFocus = undefined
        setOpen(false)
      }
    },
  )
  const calendarProps = omit(
    props,
    'id',
    'name',
    'label',
    'messages',
    'invalid',
    'clearLabel',
    'aria-describedby',
    'ref',
    'onValueChange',
    'value',
  )
  return renderCompoundFieldRoot(() =>
    renderAfterRegistration(() => (
      <span class="ui-date-range-picker" data-ui="">
        <Popover
          open={open()}
          onOpenChange={(next) =>
            untrack(() => {
              if (!next) {
                pendingFocus = undefined
                setOpen(false)
              } else if (!state.disabled() && !state.readonly()) setOpen(true)
            })
          }
        >
          <Popover.Trigger
            as={Button}
            {...target}
            id={id()}
            aria-label={[props.label, display()].filter(Boolean).join(': ')}
            disabled={state.disabled()}
            aria-disabled={state.readonly() ? 'true' : undefined}
            aria-invalid={
              state.validationState() === 'invalid' ? 'true' : undefined
            }
            data-readonly={state.readonly() ? '' : undefined}
            ref={[
              untrack(() => props.ref),
              (node) => {
                trigger = node
              },
            ]}
          >
            {props.label}
            {display() ? `: ${display()}` : ''}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              class="ui-date-popup ui-date-range-popup"
              style={{ '--ui-calendar-month-count': props.numberOfMonths ?? 2 }}
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                queueMicrotask(() =>
                  untrack(() => {
                    if (
                      alive &&
                      open() &&
                      !state.disabled() &&
                      !state.readonly()
                    )
                      (
                        calendar?.querySelector<HTMLElement>(
                          '[data-date][tabindex="0"]',
                        ) ?? calendar
                      )?.focus()
                  }),
                )
              }}
              onCloseAutoFocus={(event) => {
                const active = trigger?.ownerDocument.activeElement
                if (
                  active &&
                  active !== trigger?.ownerDocument.body &&
                  active !== trigger &&
                  !calendar?.contains(active)
                )
                  event.preventDefault()
              }}
            >
              <Popover.Title class="sr-only">
                {messages.calendarTitle(props.label)}
              </Popover.Title>
              <RangeCalendar
                {...calendarProps}
                messages={props.messages}
                value={value()}
                label={messages.calendarTitle(props.label)}
                disabled={state.disabled()}
                readonly={state.readonly()}
                ref={(node) => {
                  calendar = node
                }}
                onValueChange={(next) =>
                  untrack(() => {
                    if (state.disabled() || state.readonly()) return
                    const previous =
                      calendar?.ownerDocument.activeElement ?? null
                    pendingFocus = next.end
                      ? {
                          previous,
                          owned: Boolean(
                            previous && calendar?.contains(previous),
                          ),
                        }
                      : undefined
                    props.onValueChange(next)
                  })
                }
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover>
        <Button
          aria-label={props.clearLabel ?? messages.clearDate(props.label)}
          disabled={state.disabled() || state.readonly() || !value()}
          onClick={() => {
            if (state.disabled() || state.readonly()) return
            trigger?.focus({ preventScroll: true })
            props.onValueChange(undefined)
          }}
        >
          ×
        </Button>
        <Show when={props.name && value()}>
          <input
            type="hidden"
            name={props.name}
            value={value()?.start ?? ''}
            disabled={state.disabled()}
          />
          <input
            type="hidden"
            name={props.name}
            value={value()?.end ?? ''}
            disabled={state.disabled()}
          />
        </Show>
      </span>
    )),
  )
}
