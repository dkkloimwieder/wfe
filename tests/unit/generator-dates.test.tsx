import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { createForm } from '@wfe/form'
import { FormView } from '@wfe/generator'
import type { FormDescription } from '@wfe/generator'
afterEach(cleanup)
function mount() {
  const [values, setValues] = createSignal({
    date: '2024-02-29',
    instant: '2024-02-29T14:15:16.123Z',
  })
  const [state, setState] = createSignal({
    disabled: false,
    readonly: false,
    removed: false,
    error: false,
  })
  let validations = 0,
    submissions = 0
  const view = render(() => {
    const form = createForm<ReturnType<typeof values>>({
      values,
      defaults: values,
      onValuesChange: setValues,
      validate: () => {
        validations++
        return state().error ? { fields: { date: 'Application error' } } : {}
      },
      onSubmit: () => {
        submissions++
        return { ok: true }
      },
    })
    const description = () =>
      ({
        id: 'dates',
        fields: [
          ...(state().removed
            ? []
            : ([
                {
                  field: 'date',
                  label: 'Date',
                  control: 'date',
                  dateFormat: 'dd/MM/yyyy',
                },
              ] as const)),
          {
            field: 'instant',
            label: 'Instant',
            control: 'datetime',
            timeZone: 'UTC',
          },
        ],
        submit: { id: 'submit', label: 'Submit' },
      }) as const satisfies FormDescription<ReturnType<typeof values>>
    return (
      <FormView
        description={description()}
        bindings={{
          form,
          disabled: () => state().disabled,
          readOnly: () => state().readonly,
        }}
      />
    )
  })
  return {
    ...view,
    values,
    setState,
    snapshot: () => ({ validations, submissions }),
  }
}
async function submit(view: ReturnType<typeof mount>) {
  fireEvent.submit(view.container.querySelector('form')!)
  flush()
  await Promise.resolve()
  flush()
  await Promise.resolve()
  flush()
}
test('invalid date drafts block application validation and reset restores submission', async () => {
  const view = mount()
  const date = view.getByRole('textbox', { name: 'Date' })
  fireEvent.input(date, { target: { value: '30/02/2024' } })
  flush()
  await submit(view)
  expect(view.snapshot()).toEqual({ validations: 0, submissions: 0 })
  expect(document.activeElement).toBe(date)
  expect(view.values().date).toBe('2024-02-29')
  fireEvent.keyDown(date, { key: 'Escape' })
  flush()
  await submit(view)
  expect(view.snapshot()).toEqual({ validations: 1, submissions: 1 })
})
test('invalid datetime drafts block application validation and preserve the accepted instant', async () => {
  const view = mount()
  const time = view.getByRole('textbox', { name: 'Instant' })
  fireEvent.input(time, { target: { value: '2024-02-29 25:00' } })
  flush()
  await submit(view)
  expect(view.snapshot()).toEqual({ validations: 0, submissions: 0 })
  expect(document.activeElement).toBe(time)
  expect(view.values().instant).toBe('2024-02-29T14:15:16.123Z')
  fireEvent.keyDown(time, { key: 'Escape' })
  flush()
  await submit(view)
  expect(view.snapshot()).toEqual({ validations: 1, submissions: 1 })
})
test('locked and removed fields release draft blocks while application errors permit retry', async () => {
  const view = mount()
  const date = view.getByRole('textbox', { name: 'Date' })
  fireEvent.input(date, { target: { value: '30/02/2024' } })
  flush()
  view.setState({
    disabled: true,
    readonly: false,
    removed: false,
    error: false,
  })
  flush()
  await submit(view)
  expect(view.snapshot().submissions).toBe(1)
  view.setState({
    disabled: false,
    readonly: false,
    removed: true,
    error: true,
  })
  flush()
  await submit(view)
  expect(view.snapshot().validations).toBe(2)
  expect(view.snapshot().submissions).toBe(1)
  view.setState({
    disabled: false,
    readonly: false,
    removed: true,
    error: false,
  })
  flush()
  await submit(view)
  expect(view.snapshot()).toEqual({ validations: 3, submissions: 2 })
})

test('generated time fields preserve invalid drafts, forward messages, and submit canonical values', async () => {
  const [values, setValues] = createSignal({ time: '14:15:16' })
  const [invalidMessage, setInvalidMessage] = createSignal(
    'Choose a valid time',
  )
  let validations = 0
  const submitted: string[] = []
  const view = render(() => {
    const form = createForm<ReturnType<typeof values>>({
      values,
      defaults: () => ({ time: '14:15:16' }),
      onValuesChange: setValues,
      validate: () => {
        validations++
        return {}
      },
      onSubmit: () => {
        submitted.push(values().time)
        return { ok: true }
      },
    })
    const description = {
      id: 'time',
      fields: [
        {
          field: 'time',
          label: 'Appointment time',
          control: 'time',
          timeFormat: 'hh:mm:ss a',
          locale: 'en-US',
          min: '09:00:00',
          max: '17:00:00',
        },
      ],
      submit: { id: 'submit', label: 'Submit' },
    } as const satisfies FormDescription<ReturnType<typeof values>>
    return (
      <FormView
        description={description}
        bindings={{ form }}
        controlMessages={{
          timePicker: { invalidTime: () => invalidMessage() },
        }}
      />
    )
  })
  flush()
  const input = view.getByRole('textbox', {
    name: 'Appointment time',
  }) as HTMLInputElement
  expect(input.value).toBe('02:15:16 PM')
  fireEvent.input(input, { target: { value: '08:30:00 AM' } })
  flush()
  expect(values().time).toBe('14:15:16')
  expect(input.validationMessage).toBe('Choose a valid time')
  setInvalidMessage('Time is outside the allowed range')
  flush()
  expect(input.validationMessage).toBe('Time is outside the allowed range')
  const submitTime = async () => {
    fireEvent.submit(view.container.querySelector('form')!)
    flush()
    await Promise.resolve()
    flush()
    await Promise.resolve()
    flush()
  }
  await submitTime()
  expect(validations).toBe(0)
  expect(submitted).toEqual([])
  expect(document.activeElement).toBe(input)
  fireEvent.input(input, { target: { value: '03:45:20 PM' } })
  flush()
  expect(values().time).toBe('15:45:20')
  await submitTime()
  expect(submitted).toEqual(['15:45:20'])
  fireEvent.input(input, { target: { value: '' } })
  flush()
  expect(values().time).toBe('')
  await submitTime()
  expect(submitted).toEqual(['15:45:20', ''])
})
