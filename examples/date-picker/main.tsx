import { render } from '@solidjs/web'
import { OBSERVE, action, createSignal, flush, untrack } from 'solid-js'
import { DatePicker, Button, uiScope } from '@wfe/components'
import '@wfe/components/styles.css'

type State = {
  value?: string
  disabled: boolean
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
  snapshot = () => untrack(() => ({ ...state(), changes }))
  return (
    <main
      {...uiScope()}
      data-ui-portal-root=""
      style={{ padding: '12px', width: '22rem' }}
    >
      <DatePicker
        label="Review date"
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
      <Button type="button">After picker</Button>
    </main>
  )
}
function start() {
  stop()
  events.push(...(capture?.stop() ?? []))
  capture = OBSERVE?.diagnostics.capture()
  changes = 0
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
