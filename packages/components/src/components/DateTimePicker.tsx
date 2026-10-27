import {
  resolveDateTimePickerMessages,
  dateTimePickerMessages,
  type DateTimePickerMessages,
} from './dateMessages'
import {
  ControlSurface,
  type ControlDecorationProps,
} from '../internal/controlDecoration'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  useContext,
  Show,
} from 'solid-js'
import { Calendar } from './Calendar'
import { TimeSelection, type ClockValue } from './TimeSelection'
import { Popover } from './Popover'
import { Button, Input } from './NativeFields'
import { Icon } from './Icon'
import { createTimeZone } from '../internal/timeZone'
import { FieldContext } from '../internal/fieldContext'
import { ownsFocus } from '../internal/ownedFocus'
import { nativeEvents } from '../utils/nativeEvents'
import {
  dateTimeParts,
  formatTimeInput,
  normalizeInstant,
  parseTimeInput,
  resolveDateTimeInput,
  timeInputPattern,
} from '../utils/dateTime'
import {
  dateInputPattern,
  formatDateInput,
  parseDateInput,
  type DateInputFormat,
} from '../utils/dateFormat'
import type { TimeInputFormat, DateTimeDisambiguation } from '../utils/dateTime'

export type DateTimePickerProps = ControlDecorationProps & {
  messages?: Partial<DateTimePickerMessages>
  label: string
  /** Accessible label for the clock inside the combined popup. */
  timeLabel?: string
  id?: string
  name?: string
  value?: string
  onValueChange: (value: string | undefined) => void
  onValidityChange?: (valid: boolean) => void
  dateFormat?: DateInputFormat
  timeFormat?: TimeInputFormat
  /** Inline columns by default, or a staged calendar and analog clock. */
  timeView?: 'columns' | 'clock'
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

/** One instant input; calendar and clock edit a staged value until Apply. */
export function DateTimePicker(props: DateTimePickerProps) {
  const messages = resolveDateTimePickerMessages(() => props.messages)
  const field = useContext(FieldContext)
  const generated = createUniqueId()
  const errorId = createUniqueId()
  const popupErrorId = createUniqueId()
  const id = () => props.id ?? field?.baseControlId() ?? generated
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const zone = createTimeZone(() => props.timeZone, 'browser')
  const locked = () => disabled() || readonly() || !zone()
  const datePattern = () => dateInputPattern(props.dateFormat, props.locale)
  const timePattern = () => timeInputPattern(props.timeFormat)
  const accepted = createMemo(() =>
    props.value ? normalizeInstant(props.value) : undefined,
  )
  const bounds = createMemo(() => ({
    min: props.min ? normalizeInstant(props.min) : undefined,
    max: props.max ? normalizeInstant(props.max) : undefined,
  }))
  const display = () => {
    const value = accepted(),
      timeZone = zone()
    if (!value || !timeZone) return ''
    const parts = dateTimeParts(value, timeZone)
    return `${formatDateInput(parts.date, props.dateFormat, props.locale)} ${formatTimeInput(parts, props.timeFormat, props.locale)}`
  }
  const presentation = createMemo(
    () =>
      [
        display(),
        accepted(),
        zone(),
        datePattern(),
        timePattern(),
        props.locale,
      ] as const,
    {
      equals: (left, right) =>
        left.every((value, index) => value === right[index]),
    },
  )
  const [draft, setDraft] = createSignal(untrack(display))
  const [open, setOpen] = createSignal(false)
  const [step, setStep] = createSignal<'date' | 'time'>('date')
  const [popupDate, setPopupDate] = createSignal('1970-01-01')
  const [clock, setClock] = createSignal<ClockValue>({
    hour: 0,
    minute: 0,
    second: 0,
  })
  createEffect(presentation, ([value]) => {
    setDraft(value)
    setOpen(false)
  })
  createEffect(locked, (value) => {
    if (value) setOpen(false)
  })
  function parseDraft(value: string) {
    const text = value.trim()
    // The supported numeric date grammar has a fixed width, including literals.
    // Splitting at its width also supports date patterns containing spaces.
    const width = datePattern().length
    if (!/\s/.test(text.charAt(width))) return undefined
    const date = parseDateInput(
      text.slice(0, width),
      props.dateFormat,
      props.locale,
    )
    const time = text.slice(width).trim()
    const parts = parseTimeInput(time, props.timeFormat, props.locale)
    return date && parts ? { date, time, parts } : undefined
  }
  function candidate(date: string, time: string) {
    const timeZone = zone()
    return timeZone
      ? resolveDateTimeInput(
          date,
          time,
          timeZone,
          props.timeFormat,
          props.locale,
          props.disambiguation,
          accepted(),
        )
      : undefined
  }
  function inRange(value: string) {
    const { min, max } = bounds()
    return (!min || value >= min) && (!max || value <= max)
  }
  const invalid = createMemo(() => {
    if (!zone() || !draft().trim()) return false
    const parsed = parseDraft(draft())
    const value = parsed && candidate(parsed.date, parsed.time)
    return !value || !inRange(value)
  })
  let root: HTMLDivElement | undefined
  let input: HTMLInputElement | undefined
  let trigger: HTMLButtonElement | undefined
  let popup: HTMLDivElement | undefined
  const [calendarRoot, setCalendarRoot] = createSignal<HTMLDivElement>()
  const [clockRoot, setClockRoot] = createSignal<HTMLDivElement>()
  const columns = () => props.timeView !== 'clock'
  const showingTime = () => columns() || step() === 'time'
  const stageRoot = () =>
    !columns() && step() === 'time' ? clockRoot() : calendarRoot()
  let alive = true
  onCleanup(() => {
    alive = false
  })
  createEffect(
    () =>
      invalid()
        ? messages.invalidDateTime || dateTimePickerMessages.invalidDateTime
        : '',
    (message) => input?.setCustomValidity(message),
  )
  createEffect(
    () => Boolean(disabled() || readonly() || !invalid()),
    (valid) => {
      untrack(() => props.onValidityChange?.(valid))
    },
  )
  function restoreOutside(event: FocusEvent) {
    const next = event.relatedTarget
    if (next instanceof Node) {
      if (ownsFocus(root, next) || ownsFocus(popup, next)) return
    } else if (open()) {
      // Calendar redraws can remove the focused day before its replacement
      // receives focus. A null relatedTarget is not yet an outside transition.
      const previous = event.target instanceof Node ? event.target : undefined
      const document = previous?.ownerDocument
      queueMicrotask(() => {
        if (!alive || !document) return
        const active = document.activeElement
        if (ownsFocus(root, active) || ownsFocus(popup, active)) return
        if (
          open() &&
          previous &&
          !previous.isConnected &&
          active === document.body
        )
          return
        if (!invalid()) setDraft(display())
      })
      return
    }
    if (!invalid()) setDraft(display())
  }
  const events = nativeEvents<HTMLDivElement>({ focusout: restoreOutside })
  function change(value: string) {
    if (locked()) return
    setDraft(value)
    if (!value.trim()) {
      props.onValueChange(undefined)
      return
    }
    const parsed = parseDraft(value)
    const next = parsed && candidate(parsed.date, parsed.time)
    if (next && inRange(next)) props.onValueChange(next)
  }
  function changeOpen(value: boolean) {
    if (value) {
      if (locked()) return
      const timeZone = zone()!
      const base = dateTimeParts(
        accepted() ?? bounds().min ?? new Date().toISOString(),
        timeZone,
      )
      const parsed = parseDraft(draft())
      setPopupDate(parsed?.date ?? base.date)
      setClock({
        hour: parsed?.parts.hour ?? base.hour,
        minute: parsed?.parts.minute ?? base.minute,
        second: parsed?.parts.second ?? base.second,
      })
      setStep('date')
    }
    setOpen(value)
  }
  const popupCandidate = createMemo(() =>
    candidate(
      popupDate(),
      formatTimeInput(
        { date: popupDate(), ...clock(), millisecond: 0 },
        props.timeFormat,
        props.locale,
      ),
    ),
  )
  const popupValid = () => {
    const value = popupCandidate()
    return Boolean(value && inRange(value))
  }
  const boundDate = (side: 'min' | 'max') => {
    const value = bounds()[side],
      timeZone = zone()
    return value && timeZone ? dateTimeParts(value, timeZone).date : undefined
  }
  createEffect(
    () => ({ open: open(), step: step(), root: stageRoot() }),
    ({ open: isOpen, step: activeStep, root }) => {
      if (!isOpen || !root) return
      queueMicrotask(() => {
        if (
          !alive ||
          !open() ||
          locked() ||
          !root.isConnected ||
          step() !== activeStep
        )
          return
        const active = root.ownerDocument.activeElement
        if (
          active !== root.ownerDocument.body &&
          active !== trigger &&
          active !== input &&
          !popup?.contains(active)
        )
          return
        root
          .querySelector<HTMLElement>(
            activeStep === 'date'
              ? '[tabindex="0"]'
              : '[role="slider"], [role="option"][tabindex="0"]',
          )
          ?.focus()
      })
    },
  )
  function apply() {
    const value = popupCandidate()
    if (locked() || !value || !inRange(value)) return
    const previous = popup?.ownerDocument.activeElement
    const owned = Boolean(previous && popup?.contains(previous))
    props.onValueChange(value)
    setDraft(display())
    const active = trigger?.ownerDocument.activeElement
    if (
      alive &&
      trigger?.isConnected &&
      !trigger.disabled &&
      owned &&
      (popup?.contains(active ?? null) ||
        (active === trigger.ownerDocument.body && !previous?.isConnected))
    )
      trigger.focus({ preventScroll: true })
    setOpen(false)
  }
  return (
    <div
      class="ui-date-picker ui-datetime-picker"
      data-ui=""
      role="group"
      aria-label={props.label}
      ref={(node) => {
        root = node
        events(node)
      }}
    >
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
            placeholder={`${datePattern()} ${timePattern()}`}
            disabled={disabled() || !zone()}
            readonly={readonly()}
            required={props.required}
            invalid={invalid() || (props.invalid ?? field?.invalid())}
            data-ui-invalid-input={invalid() ? '' : undefined}
            data-date-invalid={invalid() ? '' : undefined}
            aria-describedby={
              [props['aria-describedby'], invalid() ? errorId : undefined]
                .filter(Boolean)
                .join(' ') || undefined
            }
            ref={(node) => {
              input = node
            }}
            onValueChange={change}
            onBlur={restoreOutside}
            onKeyDown={(event) => {
              if (event.isComposing) return
              if (event.key === 'ArrowDown' && event.altKey) {
                event.preventDefault()
                changeOpen(true)
              }
              if (event.key === 'Escape' && !open()) {
                event.preventDefault()
                event.stopPropagation()
                setDraft(display())
              }
            }}
          />
          <Popover.Trigger
            type="button"
            class="ui-date-trigger"
            disabled={locked()}
            aria-label={messages.openDateTimePicker(props.label)}
            ref={(node) => {
              trigger = node
            }}
          >
            <Icon name="calendar" />
          </Popover.Trigger>
          <Button
            type="button"
            class="ui-input-clear"
            aria-label={messages.clearDate(props.label)}
            disabled={locked() || (!draft() && !accepted())}
            onClick={() => {
              if (!locked()) {
                input?.focus({ preventScroll: true })
                change('')
              }
            }}
          >
            <Icon name="cross" />
          </Button>
        </ControlSurface>
        <Popover.Portal>
          <Popover.Content
            class="ui-date-popup ui-datetime-popup"
            ref={(node) => {
              popup = node
            }}
            onFocusOut={restoreOutside}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Popover.Title class="sr-only">
              {messages.dateTimePickerTitle(props.label)}
            </Popover.Title>
            <FieldContext value={null}>
              <Show when={!columns() && step() === 'time'}>
                <div>
                  <Button
                    type="button"
                    class="ui-icon-button"
                    aria-label={messages.backToDate}
                    onClick={() => setStep('date')}
                  >
                    <Icon name="chevron-left" />
                  </Button>
                </div>
              </Show>
              <div
                class="ui-datetime-stages"
                data-time-view={props.timeView ?? 'columns'}
              >
                <Show when={columns() || step() === 'date'}>
                  <Calendar
                    messages={props.messages}
                    value={popupDate()}
                    initialMonth={popupDate()}
                    min={boundDate('min')}
                    max={boundDate('max')}
                    disabled={locked()}
                    locale={props.locale}
                    startOfWeek={props.startOfWeek}
                    ref={setCalendarRoot}
                    onValueChange={(value) => {
                      if (!locked()) {
                        setPopupDate(value)
                        if (!columns()) setStep('time')
                      }
                    }}
                  />
                </Show>
                <Show when={showingTime()}>
                  <TimeSelection
                    value={clock()}
                    onValueChange={(value) => {
                      if (!locked()) setClock(value)
                    }}
                    timeView={props.timeView}
                    timeFormat={props.timeFormat}
                    locale={props.locale}
                    messages={props.messages}
                    label={props.timeLabel ?? messages.time}
                    disabled={locked()}
                    ref={setClockRoot}
                  />
                </Show>
              </div>
              <span class="ui-help ui-datetime-zone">
                {zone() ?? messages.pendingTimezone}
              </span>
              <span
                id={popupErrorId}
                class="ui-field-error"
                hidden={!showingTime() || popupValid()}
              >
                {messages.invalidDateTime}
              </span>
              <div class="ui-form-actions">
                <Button type="button" onClick={() => setOpen(false)}>
                  {messages.cancelDateTime}
                </Button>
                <Show when={showingTime()}>
                  <Button
                    type="button"
                    disabled={locked() || !popupValid()}
                    aria-describedby={!popupValid() ? popupErrorId : undefined}
                    onClick={apply}
                  >
                    {messages.applyDateTime}
                  </Button>
                </Show>
              </div>
            </FieldContext>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
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
