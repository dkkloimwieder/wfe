import { createEffect, createSignal, createUniqueId, untrack } from 'solid-js'
import { Calendar } from './Calendar'
import { Popover } from './Popover'
import { Button, Input } from './NativeFields'
import { parseDate } from '../utils/date'
import type { CalendarProps } from './Calendar'

export type DatePickerProps = Pick<
  CalendarProps,
  | 'value'
  | 'min'
  | 'max'
  | 'isDateDisabled'
  | 'locale'
  | 'startOfWeek'
  | 'initialMonth'
> & {
  label: string
  clearLabel?: string
  disabled?: boolean
  onValueChange: (value: string | undefined) => void
}

export function DatePicker(props: DatePickerProps) {
  const id = createUniqueId()
  const errorId = createUniqueId()
  const [draft, setDraft] = createSignal(untrack(() => props.value ?? ''))
  const [invalid, setInvalid] = createSignal(false)
  const [open, setOpen] = createSignal(false)
  const [initialMonth, setInitialMonth] = createSignal(
    untrack(() => props.value ?? props.initialMonth ?? '1970-01-01'),
  )
  let input!: HTMLInputElement
  let calendar: HTMLDivElement | undefined
  createEffect(
    () => props.value,
    (value) => {
      setDraft(value ?? '')
      setInvalid(false)
    },
  )
  createEffect(
    () => props.disabled,
    (disabled) => {
      if (disabled) setOpen(false)
    },
  )
  function accepted(value: string) {
    return Boolean(
      parseDate(value) &&
      (!props.min || value >= props.min) &&
      (!props.max || value <= props.max) &&
      !props.isDateDisabled?.(value),
    )
  }
  function change(value: string) {
    if (props.disabled) return
    setDraft(value)
    const valid = !value || accepted(value)
    setInvalid(!valid)
    if (valid) props.onValueChange(value || undefined)
  }
  return (
    <div class="table-filter ui-date-picker" data-ui="">
      <label for={id}>{props.label}</label>
      <Popover
        open={open()}
        onOpenChange={(value) => {
          if (props.disabled) return
          if (value)
            setInitialMonth(
              props.value ??
                props.initialMonth ??
                new Date().toISOString().slice(0, 10),
            )
          setOpen(value)
        }}
      >
        <div class="filter-input">
          <Input
            id={id}
            type="text"
            value={draft()}
            placeholder="YYYY-MM-DD"
            aria-invalid={invalid() ? 'true' : undefined}
            aria-describedby={invalid() ? errorId : undefined}
            disabled={props.disabled}
            ref={(node) => {
              input = node
            }}
            onValueChange={change}
            onBlur={() => {
              if (!invalid()) setDraft(props.value ?? '')
            }}
            onKeyDown={(event) => {
              if (event.isComposing) return
              if (event.key === 'Escape' && !open()) {
                event.preventDefault()
                event.stopPropagation()
                setDraft(props.value ?? '')
                setInvalid(false)
              }
            }}
          />
          <Popover.Trigger
            type="button"
            disabled={props.disabled}
            class="ui-date-trigger"
            aria-label={`Open ${props.label} calendar`}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3h10v11H3zM5 1v4m6-4v4M3 6h10" />
            </svg>
          </Popover.Trigger>
          <Button
            type="button"
            class="clear-input"
            aria-label={props.clearLabel ?? `Clear ${props.label}`}
            disabled={props.disabled || (!draft() && !props.value)}
            onClick={() => {
              if (props.disabled) return
              input.focus({ preventScroll: true })
              change('')
            }}
          >
            ×
          </Button>
        </div>
        <Popover.Portal>
          <Popover.Content
            class="ui-date-popup"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              queueMicrotask(() =>
                (
                  calendar?.querySelector<HTMLButtonElement>(
                    '[tabindex="0"]',
                  ) ?? calendar
                )?.focus(),
              )
            }}
          >
            <Popover.Title class="sr-only">
              {props.label} calendar
            </Popover.Title>
            <Calendar
              value={props.value}
              initialMonth={initialMonth()}
              min={props.min}
              max={props.max}
              disabled={props.disabled}
              isDateDisabled={props.isDateDisabled}
              locale={props.locale}
              startOfWeek={props.startOfWeek}
              ref={(node) => {
                calendar = node
              }}
              onValueChange={(value) => {
                if (props.disabled) return
                change(value)
                setDraft(props.value ?? '')
                setOpen(false)
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover>
      <span id={errorId} class="ui-field-error" hidden={!invalid()}>
        Enter an available date as YYYY-MM-DD.
      </span>
    </div>
  )
}
