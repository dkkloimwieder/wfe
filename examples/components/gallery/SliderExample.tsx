import { createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  Field,
  HelpText,
  Label,
  RangeSlider,
  Slider,
} from '@wfe/components'
import type { GalleryState } from './catalog'

export function SliderExample(props: { state?: GalleryState }) {
  const [accept, setAccept] = createSignal(true)
  const [volume, setVolume] = createSignal(30)
  const [range, setRange] = createSignal<[number, number]>([20, 80])
  const [rtl, setRtl] = createSignal(5)
  const [vertical, setVertical] = createSignal(50)
  const [request, setRequest] = createSignal('No slider change requested')
  const [commit, setCommit] = createSignal('No slider change committed')
  const [submitted, setSubmitted] = createSignal('No form submitted')
  const disabled = () => props.state === 'disabled'
  const readonly = () => props.state === 'readonly'
  return (
    <section class="example-stack" aria-label="Slider review">
      <p>
        Use the arrow keys, Home, End, Page Up, or Page Down. Drag a thumb or
        select a point on the track.
      </p>
      <Checkbox checked={accept()} onCheckedChange={setAccept}>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Accept slider changes</Checkbox.Label>
      </Checkbox>
      <form
        class="example-stack"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setSubmitted(
            `Volume ${data.get('volume') ?? 'omitted'}; range ${data.getAll('range').join(' to ') || 'omitted'}`,
          )
        }}
      >
        <Field
          disabled={disabled()}
          readonly={readonly()}
          invalid={props.state === 'invalid'}
        >
          <Label>Volume</Label>
          <Slider
            value={volume()}
            name="volume"
            getValueText={(n) => `${n} percent`}
            onValueChange={(next) => {
              setRequest(`Volume ${next}`)
              if (accept()) setVolume(next)
            }}
            onValueCommit={(next) => setCommit(`Volume ${next}`)}
          />
          <HelpText>
            Each arrow step changes the accepted volume by one percent.
          </HelpText>
        </Field>
        <Field
          disabled={disabled()}
          readonly={readonly()}
          invalid={props.state === 'invalid'}
        >
          <Label>Operating range</Label>
          <RangeSlider
            value={range()}
            name="range"
            thumbLabels={['Minimum', 'Maximum']}
            onValueChange={(next) => {
              setRequest(`Range ${next.join(' to ')}`)
              if (accept()) setRange(next)
            }}
            onValueCommit={(next) => setCommit(`Range ${next.join(' to ')}`)}
          />
          <HelpText>
            The two thumbs keep their order. Rejected requests preserve the
            accepted range.
          </HelpText>
        </Field>
        <Button type="submit">Submit slider values</Button>
      </form>
      <Field disabled={disabled()} readonly={readonly()}>
        <Label>RTL position</Label>
        <Slider
          value={rtl()}
          min={0}
          max={10}
          direction="rtl"
          onValueChange={(next) => {
            setRequest(`RTL ${next}`)
            if (accept()) setRtl(next)
          }}
        />
      </Field>
      <Field disabled={disabled()} readonly={readonly()}>
        <Label>Vertical level</Label>
        <Slider
          value={vertical()}
          orientation="vertical"
          onValueChange={(next) => {
            setRequest(`Vertical ${next}`)
            if (accept()) setVertical(next)
          }}
        />
      </Field>
      <output data-slider-request aria-live="polite">
        {request()}
      </output>
      <output data-slider-commit>{commit()}</output>
      <output aria-label="Slider form result">{submitted()}</output>
    </section>
  )
}
