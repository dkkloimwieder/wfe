import { render } from '@solidjs/web'
import { OBSERVE, action, createSignal, flush, untrack } from 'solid-js'
import {
  DatePicker,
  Button,
  Field,
  Label,
  HelpText,
  FieldError,
  uiScope,
} from '@wfe/components'
import '@wfe/components/styles.css'
import { nativeEvents } from '@wfe/components/events'

type State = {
  value?: string
  disabled: boolean
  readonly?: boolean
  required?: boolean
  invalid?: boolean
  invalidOverride?: boolean
  dateFormat?: string
  locale?: string
  min?: string
  max?: string
  excluded: string[]
  accept: boolean
}
let update: (next: Partial<State>) => void
let snapshot: () => unknown
let release: (() => void) | undefined
let capture:
  ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']> | undefined
const events: unknown[] = []
let changes = 0
let submits = 0
let intrinsicValid = true
// eslint-disable-next-line require-yield -- Disposal follows the qualified synchronous action path.
const dispose = action(function* () {
  release?.()
})
function stop() {
  dispose()
  flush()
  release = undefined
}
function App() {
  const [state, setState] = createSignal<State>({
    value: '2024-02-29',
    min: '2024-01-01',
    max: '2028-12-31',
    disabled: false,
    excluded: [],
    accept: true,
  })
  update = (next) => setState((old) => ({ ...old, ...next }))
  snapshot = () =>
    untrack(() => ({ ...state(), changes, submits, intrinsicValid }))
  return (
    <main
      {...uiScope()}
      data-ui-portal-root=""
      style={{ padding: '12px', width: '22rem' }}
    >
      <form
        id="date-test-form"
        ref={nativeEvents<HTMLFormElement>({
          submit: (event) => {
            event.preventDefault()
            submits++
          },
        })}
      >
        <Field
          controlId="review-date"
          readonly={state().readonly}
          required={state().required}
          invalid={state().invalid}
        >
          <Label>Review date</Label>
          <DatePicker
            invalid={state().invalidOverride}
            name="reviewDate"
            onValidityChange={(valid) => {
              intrinsicValid = valid
            }}
            label="Review date"
            dateFormat={state().dateFormat}
            locale={state().locale}
            clearLabel="Clear review date"
            value={state().value}
            disabled={state().disabled}
            min={state().min}
            max={state().max}
            isDateDisabled={(value) => state().excluded.includes(value)}
            onValueChange={(value) => {
              changes++
              if (state().accept) update({ value })
            }}
          />
          <HelpText>Date entry help</HelpText>
          <FieldError>Application date validation</FieldError>
        </Field>
      </form>
      <Button type="button">After picker</Button>
    </main>
  )
}
function start() {
  stop()
  events.push(...(capture?.stop() ?? []))
  capture = OBSERVE?.diagnostics.capture()
  changes = 0
  submits = 0
  intrinsicValid = true
  release = render(App, document.getElementById('root')!)
  flush()
}
const api = {
  start,
  stop,
  set: (next: Partial<State>) => {
    update(next)
    flush()
  },
  snapshot: () => snapshot(),
  diagnostics: () => {
    events.push(...(capture?.stop() ?? []))
    return events.splice(0)
  },
}
declare global {
  interface Window {
    datePickerFixture: typeof api
  }
}
window.datePickerFixture = api
start()
