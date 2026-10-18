import { createSignal, untrack } from 'solid-js'
import {
  DateTimePicker,
  Field,
  Label,
  ValueDisplay,
  uiScope,
} from '@wfe/components'
export function HydrationApp(props: {
  ready?: (snapshot: () => unknown) => void
}) {
  const [value, setValue] = createSignal('2024-02-29T02:15:16.123Z')
  let requests = 0
  props.ready?.(() => untrack(() => ({ value: value(), requests })))
  const change = (next: string | undefined) => {
    requests++
    setValue(next ?? '')
  }
  return (
    <main {...uiScope()} data-ui-portal-root="">
      <Field controlId="system-date">
        <Label>System date</Label>
        <DateTimePicker
          label="System date"
          timeLabel="System time"
          value={value() || undefined}
          timeZone="America/New_York"
          dateFormat="dd/MM/yyyy"
          onValueChange={change}
        />
      </Field>
      <Field controlId="browser-date">
        <Label>Browser date</Label>
        <DateTimePicker
          label="Browser date"
          timeLabel="Browser time"
          value={value() || undefined}
          timeZone="browser"
          dateFormat="dd/MM/yyyy"
          onValueChange={change}
        />
      </Field>
      <p data-date-display="date">
        <ValueDisplay
          value="2024-02-29"
          format="date"
          dateFormat="dd/MM/yyyy"
          timeZone="America/New_York"
        />
      </p>
      <p data-date-display="system">
        <ValueDisplay
          value={value()}
          format="datetime"
          dateFormat="dd/MM/yyyy"
          timeZone="America/New_York"
        />
      </p>
      <p data-date-display="browser">
        <ValueDisplay
          value={value()}
          format="datetime"
          dateFormat="dd/MM/yyyy"
          timeZone="browser"
        />
      </p>
    </main>
  )
}
