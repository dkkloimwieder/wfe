import {
  resolveDateTimePickerMessages,
  dateTimePickerMessages,
  type DateTimePickerMessages,
} from './dateMessages'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  untrack,
  useContext,
  Show,
} from 'solid-js'
import { DatePickerControl as DatePicker } from './DatePicker'
import { TimePickerControl } from './TimePicker'
import { createTimeZone } from '../internal/timeZone'
import { FieldContext } from '../internal/fieldContext'
import { ownsFocus } from '../internal/ownedFocus'
import { nativeEvents } from '../utils/nativeEvents'
import {
  dateTimeParts,
  formatTimeInput,
  normalizeInstant,
  resolveDateTimeInput,
  timeInputPattern,
} from '../utils/dateTime'
import type { DateInputFormat } from '../utils/dateFormat'
import type { TimeInputFormat, DateTimeDisambiguation } from '../utils/dateTime'

export type DateTimePickerProps = ControlDecorationProps & {
  messages?: Partial<DateTimePickerMessages>
  label: string
  timeLabel?: string
  id?: string
  name?: string
  value?: string
  onValueChange: (value: string | undefined) => void
  onValidityChange?: (valid: boolean) => void
  dateFormat?: DateInputFormat
  timeFormat?: TimeInputFormat
  locale?: string
  timeZone?: 'browser' | (string & {})
  disambiguation?: DateTimeDisambiguation
  min?: string
  max?: string
  startOfWeek?: number
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  invalid?: boolean
  'aria-describedby'?: string
}

export function DateTimePicker(props: DateTimePickerProps) {
  const messages = resolveDateTimePickerMessages(() => props.messages)
  const field = useContext(FieldContext)
  const generated = createUniqueId()
  const errorId = createUniqueId()
  const id = () => props.id ?? field?.baseControlId() ?? generated
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const required = () => props.required ?? field?.required()
  const zone = createTimeZone(() => props.timeZone, 'browser')
  const accepted = createMemo(() =>
    props.value ? normalizeInstant(props.value) : undefined,
  )
  const bounds = createMemo(() => ({
    min: props.min ? normalizeInstant(props.min) : undefined,
    max: props.max ? normalizeInstant(props.max) : undefined,
  }))
  const presentation = createMemo(
    () => {
      const format = timeInputPattern(props.timeFormat)
      const value = accepted(),
        timeZone = zone()
      const parts =
        value && timeZone ? dateTimeParts(value, timeZone) : undefined
      return {
        value,
        date: parts?.date,
        time: parts ? formatTimeInput(parts, format, props.locale) : '',
        dateFormat: props.dateFormat,
        locale: props.locale,
        zone: timeZone,
        format,
      }
    },
    {
      equals: (left, right) =>
        left.value === right.value &&
        left.date === right.date &&
        left.time === right.time &&
        left.dateFormat === right.dateFormat &&
        left.locale === right.locale &&
        left.zone === right.zone &&
        left.format === right.format,
    },
  )
  const initial = untrack(presentation)
  const [date, setDate] = createSignal(initial.date)
  const [time, setTime] = createSignal(initial.time)
  const [dateValid, setDateValid] = createSignal(true)
  const [resetVersion, setResetVersion] = createSignal(0)
  createEffect(presentation, (value) => {
    setResetVersion((version) => version + 1)
    setDate(value.date)
    setTime(value.time)
  })
  const candidate = (nextDate: string | undefined, nextTime: string) => {
    const timeZone = zone()
    if (!timeZone || !nextDate || !nextTime.trim()) return undefined
    return resolveDateTimeInput(
      nextDate,
      nextTime,
      timeZone,
      props.timeFormat,
      props.locale,
      props.disambiguation,
      accepted(),
    )
  }
  const inRange = (value: string) => {
    const { min, max } = bounds()
    return (!min || value >= min) && (!max || value <= max)
  }
  const invalid = createMemo(() => {
    if (!zone()) return false
    if (!dateValid()) return true
    if (!date() && !time().trim()) return false
    const value = candidate(date(), time())
    return !value || !inRange(value)
  })
  let timeInput: HTMLInputElement | undefined
  createEffect(
    () =>
      invalid()
        ? messages.invalidDateTime || dateTimePickerMessages.invalidDateTime
        : '',
    (message) => timeInput?.setCustomValidity(message),
  )
  createEffect(
    () => Boolean(disabled() || readonly() || !invalid()),
    (valid) => {
      untrack(() => props.onValidityChange?.(valid))
    },
  )
  function request(nextDate: string | undefined, nextTime: string) {
    if (disabled() || readonly() || !zone()) return
    const value = candidate(nextDate, nextTime)
    if (value && inRange(value)) props.onValueChange(value)
  }
  function restore() {
    setResetVersion((version) => version + 1)
    const value = presentation()
    setDate(value.date)
    setTime(value.time)
  }
  let root: HTMLDivElement | undefined
  let calendar: HTMLDivElement | undefined
  let timePopup: HTMLDivElement | undefined
  function focusout(event: FocusEvent) {
    if (
      event.relatedTarget instanceof Node &&
      (root?.contains(event.relatedTarget) ||
        calendar?.contains(event.relatedTarget) ||
        ownsFocus(timePopup, event.relatedTarget))
    )
      return
    if (!invalid()) restore()
  }
  const events = nativeEvents<HTMLDivElement>({
    focusout,
    keydown(event) {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      restore()
    },
  })
  return (
    <div
      class="ui-datetime-picker"
      data-ui-control-decoration={
        props.decoration === false ? 'none' : props.decoration
      }
      data-ui=""
      role="group"
      aria-label={props.label}
      ref={(node) => {
        root = node
        events(node)
      }}
    >
      <DatePicker
        messages={props.messages}
        id={id()}
        label={props.label}
        resetVersion={resetVersion()}
        onDraftReset={restore}
        onCalendarSelect={() =>
          root
            ?.querySelector<HTMLInputElement>('input')
            ?.focus({ preventScroll: true })
        }
        onCalendarRef={(node) => {
          calendar = node
        }}
        onPopupFocusOut={focusout}
        value={date()}
        dateFormat={props.dateFormat}
        locale={props.locale}
        startOfWeek={props.startOfWeek}
        disabled={disabled() || !zone()}
        readonly={readonly()}
        required={required()}
        invalid={invalid() || (props.invalid ?? field?.invalid())}
        aria-describedby={
          [props['aria-describedby'], invalid() ? errorId : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        }
        onValidityChange={setDateValid}
        onValueChange={(value) => {
          if (disabled() || readonly() || !zone()) return
          setDate(value)
          if (!value) {
            setTime('')
            props.onValueChange(undefined)
          } else request(value, time())
        }}
      />
      <FieldContext value={null}>
        <TimePickerControl
          messages={props.messages}
          label={props.timeLabel ?? messages.time}
          labelHidden={Boolean(field)}
          id={`${id()}-time`}
          draftValue={time()}
          onDraftChange={(value) => {
            if (disabled() || readonly() || !zone()) return
            setTime(value)
            if (!value.trim() && !date()) props.onValueChange(undefined)
            else request(date(), value)
          }}
          onValueChange={() => {}}
          onDraftReset={restore}
          resetVersion={resetVersion()}
          externalValidation
          draftInvalid={invalid()}
          inputRef={(node) => {
            timeInput = node
          }}
          onPopupRef={(node) => {
            timePopup = node
          }}
          onPopupFocusOut={focusout}
          timeFormat={props.timeFormat}
          locale={props.locale}
          decoration={props.decoration}
          disabled={disabled() || !zone()}
          readonly={readonly()}
          required={required()}
          invalid={invalid() || (props.invalid ?? field?.invalid())}
          aria-describedby={
            [
              field?.describedBy(),
              props['aria-describedby'],
              invalid() ? errorId : undefined,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
      </FieldContext>
      <span class="ui-help ui-datetime-zone">
        {zone() ?? messages.pendingTimezone}
      </span>
      <span id={errorId} class="ui-field-error" hidden={!invalid()}>
        {messages.invalidDateTime}
      </span>
      <Show when={props.name}>
        <input
          type="hidden"
          name={props.name}
          value={accepted() ?? ''}
          disabled={disabled()}
        />
      </Show>
    </div>
  )
}
