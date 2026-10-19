import { Icon } from './Icon'
import {
  createEffect,
  createSignal,
  createMemo,
  onCleanup,
  createUniqueId,
  untrack,
  useContext,
  Show,
} from 'solid-js'
import { Calendar } from './Calendar'
import { Popover } from './Popover'
import { Button, Input } from './NativeFields'
import { FieldContext } from '../internal/fieldContext'
import {
  dateInputPattern,
  formatDateInput,
  parseDateInput,
} from '../utils/dateFormat'
import type { DateInputFormat } from '../utils/dateFormat'
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
  id?: string
  name?: string
  onValidityChange?: (valid: boolean) => void
  dateFormat?: DateInputFormat
  readonly?: boolean
  required?: boolean
  invalid?: boolean
  'aria-describedby'?: string
  clearLabel?: string
  disabled?: boolean
  onValueChange: (value: string | undefined) => void
}

export function DatePicker(props: DatePickerProps) {
  return <DatePickerControl {...props} />
}

/** Internal composition keeps local drafts inside the shared date control. */
export function DatePickerControl(
  props: DatePickerProps & {
    resetVersion?: number
    onDraftReset?: () => void
    onCalendarSelect?: () => void
    onCalendarRef?: (node: HTMLDivElement) => void
    onPopupFocusOut?: (event: FocusEvent) => void
  },
) {
  const field = useContext(FieldContext)
  const generated = createUniqueId()
  const id = () => props.id ?? field?.baseControlId() ?? generated
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const display = () =>
    formatDateInput(props.value, props.dateFormat, props.locale)
  const pattern = () => dateInputPattern(props.dateFormat, props.locale)
  const errorId = createUniqueId()
  const [draft, setDraft] = createSignal(untrack(display))
  const invalid = createMemo(() => {
    if (!draft().trim()) return false
    const parsed = parseDateInput(draft(), props.dateFormat, props.locale)
    return !parsed || !accepted(parsed)
  })
  const [open, setOpen] = createSignal(false)
  const [initialMonth, setInitialMonth] = createSignal(
    untrack(() => props.value ?? props.initialMonth ?? '1970-01-01'),
  )
  let input: HTMLInputElement | undefined
  let alive = true
  onCleanup(() => {
    alive = false
  })
  let calendar: HTMLDivElement | undefined
  const presentation = createMemo(
    () =>
      [display(), props.dateFormat, props.locale, props.resetVersion] as const,
    {
      equals: (left, right) =>
        left.every((value, index) => value === right[index]),
    },
  )
  createEffect(presentation, ([value]) => {
    setDraft(value)
  })
  createEffect(
    () => ({
      message: invalid()
        ? `Enter an available date as ${pattern().replace(/yyyy|dd/g, (token) => token.toUpperCase())}.`
        : '',
      valid: Boolean(disabled() || readonly() || !invalid()),
    }),
    ({ message, valid }) => {
      input?.setCustomValidity(message)
      untrack(() => props.onValidityChange?.(valid))
    },
  )
  createEffect(
    () => Boolean(disabled() || readonly()),
    (locked) => {
      if (locked) setOpen(false)
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
    if (disabled() || readonly()) return
    setDraft(value)
    const parsed = parseDateInput(value, props.dateFormat, props.locale)
    const empty = !value.trim()
    const valid = empty || Boolean(parsed && accepted(parsed))
    if (valid) props.onValueChange(empty ? undefined : parsed)
  }
  return (
    <div class="ui-date-picker" data-ui="">
      <Show when={!field}>
        <label for={id()} class="ui-label">
          {props.label}
        </label>
      </Show>
      <Popover
        open={open()}
        onOpenChange={(value) => {
          if (disabled() || readonly()) return
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
            id={id()}
            type="text"
            data-date-invalid={invalid() ? '' : undefined}
            data-ui-invalid-input={invalid() ? '' : undefined}
            value={draft()}
            placeholder={pattern().replace(/yyyy|dd/g, (token) =>
              token.toUpperCase(),
            )}
            invalid={invalid() || (props.invalid ?? field?.invalid())}
            aria-describedby={
              [props['aria-describedby'], invalid() ? errorId : undefined]
                .filter(Boolean)
                .join(' ') || undefined
            }
            disabled={disabled()}
            readonly={readonly()}
            required={props.required}
            ref={(node) => {
              input = node
            }}
            onValueChange={change}
            onBlur={() => {
              if (!invalid()) setDraft(display())
            }}
            onKeyDown={(event) => {
              if (event.isComposing) return
              if (event.key === 'Escape' && !open()) {
                event.preventDefault()
                event.stopPropagation()
                props.onDraftReset?.()
                setDraft(display())
              }
            }}
          />
          <Popover.Trigger
            type="button"
            disabled={disabled() || readonly()}
            class="ui-date-trigger"
            aria-label={`Open ${props.label} calendar`}
          >
            <Icon name="calendar" />
          </Popover.Trigger>
          <Button
            type="button"
            class="clear-input"
            aria-label={props.clearLabel ?? `Clear ${props.label}`}
            disabled={disabled() || readonly() || (!draft() && !props.value)}
            onClick={() => {
              if (disabled() || readonly()) return
              input?.focus({ preventScroll: true })
              change('')
            }}
          >
            <Icon name="cross" />
          </Button>
        </div>
        <Popover.Portal>
          <Popover.Content
            class="ui-date-popup"
            onFocusOut={props.onPopupFocusOut}
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              queueMicrotask(() => {
                if (!alive || !open() || disabled() || readonly()) return
                const target =
                  calendar?.querySelector<HTMLButtonElement>(
                    '[tabindex="0"]',
                  ) ?? calendar
                if (target?.isConnected) target.focus()
              })
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
              disabled={disabled()}
              isDateDisabled={props.isDateDisabled}
              locale={props.locale}
              startOfWeek={props.startOfWeek}
              ref={(node) => {
                calendar = node
                props.onCalendarRef?.(node)
              }}
              onValueChange={(value) => {
                if (disabled() || readonly()) return
                if (!accepted(value)) return
                props.onValueChange(value)
                props.onCalendarSelect?.()
                setDraft(display())
                setOpen(false)
              }}
            />
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
      <span id={errorId} class="ui-field-error" hidden={!invalid()}>
        Enter an available date as{' '}
        {pattern().replace(/yyyy|dd/g, (token) => token.toUpperCase())}.
      </span>
    </div>
  )
}
