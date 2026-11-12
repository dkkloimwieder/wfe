import { createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  Field,
  HelpText,
  Input,
  Label,
  Toggle,
  ToggleGroup,
} from '@wfe/components'
import type { GalleryState } from './catalog'
const views = [
  { value: 'list', label: 'List' },
  { value: 'timeline', label: 'Timeline', disabled: true },
  { value: 'board', label: 'Board' },
]
const formats = [
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'underline', label: 'Underline', disabled: true },
]
export function ToggleExample(props: { state?: GalleryState }) {
  const [accept, setAccept] = createSignal(true)
  const [pin, setPin] = createSignal(false)
  const [view, setView] = createSignal<string | undefined>('list')
  const [format, setFormat] = createSignal<string[]>(['bold'])
  const [request, setRequest] = createSignal('No toggle change requested')
  const [submitted, setSubmitted] = createSignal('No form submitted')
  const disabled = () => props.state === 'disabled'
  const readonly = () => props.state === 'readonly'
  return (
    <section class="example-stack" aria-label="Toggle review">
      <p>
        Use Space or Enter to toggle a button. Arrow keys, Home, and End move
        within a group without selecting.
      </p>
      <Checkbox checked={accept()} onCheckedChange={setAccept}>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Accept toggle changes</Checkbox.Label>
      </Checkbox>
      <form
        class="example-stack"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setSubmitted(
            `Pin ${data.get('pin') ?? 'off'}; view ${data.get('view') ?? 'none'}; format ${data.getAll('format').join(',') || 'none'}`,
          )
        }}
      >
        <Toggle
          pressed={pin()}
          disabled={disabled()}
          readonly={readonly()}
          name="pin"
          value="yes"
          onPressedChange={(next) => {
            setRequest(`Pin ${next ? 'on' : 'off'}`)
            if (accept()) setPin(next)
          }}
        >
          Pin record
        </Toggle>
        <Field disabled={disabled()} readonly={readonly()}>
          <Label>View selector</Label>
          <ToggleGroup
            items={views}
            value={view()}
            allowEmpty={false}
            name="view"
            onValueChange={(next) => {
              setRequest(`View ${next ?? 'none'}`)
              if (accept()) setView(next)
            }}
          />
          <HelpText>One view stays selected. Timeline is unavailable.</HelpText>
        </Field>
        <Field disabled={disabled()} readonly={readonly()}>
          <Label>Text formatting</Label>
          <ToggleGroup
            multiple
            items={formats}
            value={format()}
            name="format"
            onValueChange={(next) => {
              setRequest(`Format ${next.join(',') || 'none'}`)
              if (accept()) setFormat(next)
            }}
          />
          <HelpText>Formatting buttons toggle independently.</HelpText>
        </Field>
        <Button type="submit">Submit toggle values</Button>
      </form>
      <Input
        aria-label="Retained toggle draft"
        placeholder="Keep a draft while changing views"
      />
      <Button onClick={() => setView('board')}>Select board externally</Button>
      <output data-toggle-request aria-live="polite">
        {request()}
      </output>
      <output aria-label="Toggle form result">{submitted()}</output>
    </section>
  )
}
