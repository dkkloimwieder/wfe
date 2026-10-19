import { createSignal, flush } from 'solid-js'
import { NumberInput, Button, Field, Label, HelpText } from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'

type Configuration = {
  value: number | undefined
  min: number | undefined
  max: number | undefined
  accept: boolean
  disabled: boolean
  readonly: boolean
  required: boolean
  allowEmpty: boolean
  live: boolean
}
export const numberLifecycle = {
  configure: (_next: Partial<Configuration>) => {},
  read: () => ({
    value: 2 as number | undefined,
    requests: [] as Array<number | 'empty'>,
    validity: [] as boolean[],
    submissions: 0,
    refs: 0,
  }),
  stop: () => {},
}
/** Shared numeric behavior fixture for rendering and hydration. */
export function NumberControls() {
  const [state, setState] = createSignal<Configuration>({
    value: 2,
    min: undefined,
    max: undefined,
    accept: true,
    disabled: false,
    readonly: false,
    required: false,
    allowEmpty: true,
    live: false,
  })
  const requests: Array<number | 'empty'> = []
  const validity: boolean[] = []
  let submissions = 0,
    refs = 0
  numberLifecycle.configure = (next) => {
    setState((previous) => ({ ...previous, ...next }))
    flush()
  }
  numberLifecycle.read = () => ({
    value: state().value,
    requests: [...requests],
    validity: [...validity],
    submissions,
    refs,
  })
  return (
    <form
      id="number-review"
      class="example-stack"
      data-ui=""
      ref={nativeEvents<HTMLFormElement>({
        submit: (event) => {
          event.preventDefault()
          submissions++
        },
      })}
    >
      <Field
        disabled={state().disabled}
        readonly={state().readonly}
        required={state().required}
      >
        <Label>Numeric amount</Label>
        <NumberInput
          name="amount"
          value={state().value}
          min={state().min}
          max={state().max}
          allowEmpty={state().allowEmpty}
          class={['caller-number', { 'caller-live': state().live }]}
          onValueChange={(value) => {
            requests.push(value ?? 'empty')
            if (state().accept) setState((previous) => ({ ...previous, value }))
          }}
          onValidityChange={(value) => validity.push(value)}
          ref={() => {
            refs++
          }}
        />
        <HelpText>Enter a numeric value.</HelpText>
      </Field>
      <div class="example-actions">
        <Button type="submit">Submit numeric value</Button>
        <Button id="number-outside">Outside numeric field</Button>
      </div>
    </form>
  )
}
declare global {
  interface Window {
    numberFixture: typeof numberLifecycle
  }
}
