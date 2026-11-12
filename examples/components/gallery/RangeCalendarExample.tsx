import { createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  DateRangePicker,
  Field,
  HelpText,
  Input,
  Label,
  RangeCalendar,
  ToggleGroup,
} from '@wfe/components'
import type { CalendarRange } from '@wfe/components'
import type { GalleryState } from './catalog'
export function RangeCalendarExample(props: { state?: GalleryState }) {
  const [accept, setAccept] = createSignal(true)
  const [range, setRange] = createSignal<CalendarRange>()
  const [booking, setBooking] = createSignal<CalendarRange | undefined>({
    start: '2026-11-05',
    end: '2026-11-10',
  })
  const [months, setMonths] = createSignal<1 | 2>(2)
  const [locale, setLocale] = createSignal('en-US')
  const [request, setRequest] = createSignal('No range change requested')
  const [submitted, setSubmitted] = createSignal('No form submitted')
  const disabled = () => props.state === 'disabled'
  const readonly = () => props.state === 'readonly'
  const text = (value: CalendarRange | undefined) =>
    value ? `${value.start} to ${value.end ?? '…'}` : 'Empty range'
  return (
    <section
      class="example-stack gallery-example-fill"
      style={{ 'max-width': '100%' }}
      aria-label="Calendar range review"
    >
      <p>
        Select a start date, then an end date. November 12 is unavailable as an
        endpoint. The application decides which complete intervals to accept.
      </p>
      <Checkbox checked={accept()} onCheckedChange={setAccept}>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Accept range changes</Checkbox.Label>
      </Checkbox>
      <ToggleGroup
        aria-label="Visible months"
        items={[
          { value: 'one', label: 'One month' },
          { value: 'two', label: 'Two months' },
        ]}
        value={months() === 1 ? 'one' : 'two'}
        allowEmpty={false}
        onValueChange={(next) => {
          if (next) setMonths(next === 'one' ? 1 : 2)
        }}
      />
      <Button
        onClick={() =>
          setLocale((value) => (value === 'en-US' ? 'fr-FR' : 'en-US'))
        }
      >
        {locale() === 'en-US' ? 'Use French locale' : 'Use English locale'}
      </Button>
      <div data-range-inline>
        <RangeCalendar
          label="Inline range"
          value={range()}
          initialMonth="2026-11-01"
          min="2026-11-01"
          max="2027-01-20"
          locale={locale()}
          numberOfMonths={months()}
          disabled={disabled()}
          readonly={readonly()}
          isDateDisabled={(value) => value === '2026-11-12'}
          onValueChange={(next) => {
            setRequest(`Calendar ${text(next)}`)
            if (accept()) setRange(next)
          }}
        />
      </div>
      <output data-range-value>{text(range())}</output>
      <form
        class="example-stack"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(
            new FormData(event.currentTarget).getAll('booking').join(' to ') ||
              'No range submitted',
          )
        }}
      >
        <Field disabled={disabled()} readonly={readonly()}>
          <Label>Booking window</Label>
          <DateRangePicker
            label="Booking range"
            name="booking"
            value={booking()}
            initialMonth="2026-11-01"
            min="2026-11-01"
            max="2027-01-20"
            locale={locale()}
            numberOfMonths={months()}
            isDateDisabled={(value) => value === '2026-11-12'}
            onValueChange={(next) => {
              setRequest(`Picker ${text(next)}`)
              if (accept()) setBooking(next)
            }}
          />
          <HelpText>
            The picker closes after an accepted complete range. Rejected
            proposals keep the accepted dates.
          </HelpText>
        </Field>
        <Input
          aria-label="Retained range draft"
          placeholder="Keep a planning note while selecting dates"
        />
        <Button type="submit">Submit range values</Button>
      </form>
      <output data-range-request aria-live="polite">
        {request()}
      </output>
      <output aria-label="Range form result">{submitted()}</output>
    </section>
  )
}
