import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Field, FieldValue, Label } from '@wfe/components'
import { FieldValue as SubpathFieldValue } from '@wfe/components/fields'
import {
  TableColumnFilter,
  TableDateFilter,
  TableHeaderFilter,
} from '@wfe/components/table'
import type { GeneratorControlMessages } from '@wfe/generator'
import {
  NestedMessagesReview,
  nestedMessages,
} from '../../examples/generator/NestedMessagesReview'
import type { createNestedMessagesApplication } from '../../examples/generator/NestedMessagesReview'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mount() {
  let app!: ReturnType<typeof createNestedMessagesApplication>
  const h = render(() => (
    <NestedMessagesReview
      ready={(value) => {
        app = value
      }}
    />
  ))
  flush()
  return { ...h, app }
}

/**
 * The text input that the one label with this text names. A role query
 * computes accessible names across the whole review page, about 300 ms each
 * in jsdom, and eight of them pushed this test past its timeout under load.
 */
function labelled(container: HTMLElement, text: string): HTMLInputElement {
  const labels = [...container.querySelectorAll('label')].filter(
    (node) => node.textContent === text,
  )
  expect(labels).toHaveLength(1)
  const input = labels[0]!.control
  expect(input).toBeInstanceOf(HTMLInputElement)
  expect((input as HTMLInputElement).type).toBe('text')
  return input as HTMLInputElement
}

test('direct and repeated date and number invalid drafts retain focus and accepted values while messages change', () => {
  const h = mount()
  const original = JSON.stringify(h.app.values())
  for (const [label, draft, spanish, french] of [
    ['Nested date', '31/02/2024', 'Fecha inválida', 'Date invalide'],
    ['Repeated date', '31/02/2024', 'Fecha inválida', 'Date invalide'],
    ['Nested amount', '-1', 'Mínimo: 0', 'Minimum: 0'],
    ['Repeated amount', '-1', 'Mínimo: 0', 'Minimum: 0'],
  ] as const) {
    h.app.setFrench(false)
    flush()
    const input = labelled(h.container, label)
    fireEvent.input(input, { target: { value: draft } })
    input.focus()
    flush()
    expect(input.validationMessage).toBe(spanish)
    h.app.setFrench(true)
    flush()
    expect(labelled(h.container, label)).toBe(input)
    expect(input.value).toBe(draft)
    expect(input.validationMessage).toBe(french)
    expect(document.activeElement).toBe(input)
  }
  expect(JSON.stringify(h.app.values())).toBe(original)
  expect(h.app.requests()).toBe(0)
})

test('direct and repeated datetime fields forward time labels and invalid feedback without requesting values', () => {
  const h = mount()
  for (const label of ['Nested instant', 'Repeated instant']) {
    h.app.setFrench(false)
    flush()
    const group = h.getByRole('group', { name: label })
    const time = within(group).getByRole('textbox', {
      name: 'Hora',
    }) as HTMLInputElement
    fireEvent.input(time, { target: { value: '99:99' } })
    time.focus()
    flush()
    expect(time.validationMessage).toBe('Instante inválido')
    h.app.setFrench(true)
    flush()
    expect(within(group).getByRole('textbox', { name: 'Heure' })).toBe(time)
    expect(time.value).toBe('99:99')
    expect(time.validationMessage).toBe('Instant invalide')
    expect(document.activeElement).toBe(time)
  }
  expect(h.app.requests()).toBe(0)
})

test('standard table filter and generated formatted values use child messages while explicit labels remain unchanged', () => {
  const h = mount()
  const active = h.getByLabelText('Nested active')
  const detail = h.getByLabelText('Detail active')
  const empty = h.getByLabelText('Detail blank')
  const cells = h.container.querySelectorAll('[data-nested-table] tbody td')
  expect(active.textContent).toBe('Sí')
  expect(detail.textContent).toBe('Sí')
  expect(empty.textContent).toBe('Vacío')
  expect(cells[0]?.textContent).toBe('Sí')
  expect(cells[1]?.textContent).toBe('Vacío')
  const start = h.getByRole('textbox', {
    name: 'Record date start',
  }) as HTMLInputElement
  expect(
    h.getByRole('button', { name: 'Abrir Record date start' }),
  ).toBeTruthy()
  fireEvent.input(start, { target: { value: '2024-02-29' } })
  flush()
  expect(
    h.getByRole('button', { name: 'Clear Record date start' }),
  ).toBeTruthy()
  start.focus()
  expect(document.activeElement).toBe(start)
  h.app.setFrench(true)
  flush()
  expect(
    h.getByRole('button', { name: 'Ouvrir Record date start' }),
  ).toBeTruthy()
  expect(h.getByRole('textbox', { name: 'Record date start' })).toBe(start)
  expect(document.activeElement).toBe(start)
  expect(h.getByLabelText('Nested active')).toBe(active)
  expect(detail.textContent).toBe('Oui')
  expect(empty.textContent).toBe('Vide')
  expect(h.container.querySelectorAll('[data-nested-table] tbody td')[0]).toBe(
    cells[0],
  )
  expect(cells[0]?.textContent).toBe('Oui')
  expect(h.app.requests()).toBe(0)
  const requests = h.app.requests()
  const retained = h.getByRole('textbox', { name: 'Nested date' })
  h.unmount()
  fireEvent.input(retained, { target: { value: '01/03/2024' } })
  flush()
  expect(h.app.requests()).toBe(requests)
  expect(detail.textContent).toBe('Oui')
})

test('FieldValue root and fields subpath forward empty messages without native attributes', () => {
  const [messages, setMessages] = createSignal({ emptyValue: 'Vacío' })
  const h = render(() => (
    <>
      <Field>
        <Label>Unformatted</Label>
        <FieldValue value={null} messages={messages()} />
      </Field>
      <Field>
        <Label>Formatted</Label>
        <SubpathFieldValue value="" format="short-hash" messages={messages()} />
      </Field>
    </>
  ))
  const empty = h.getByLabelText('Unformatted')
  expect(empty.textContent).toBe('Vacío')
  setMessages({ emptyValue: 'Vide' })
  flush()
  expect(h.getByLabelText('Unformatted')).toBe(empty)
  expect(empty.textContent).toBe('Vide')
  expect(h.getByLabelText('Formatted').textContent).toBe('Vide')
  expect(empty.hasAttribute('messages')).toBe(false)
})

function publicTypes() {
  const messages = nestedMessages(false)
  void (
    <TableDateFilter
      label="Date"
      value={undefined}
      onValueChange={() => {}}
      datePickerMessages={messages.datePicker}
    />
  )
  void (
    <TableColumnFilter
      label="Date"
      config={{ kind: 'date-range' }}
      value={undefined}
      onValueChange={() => {}}
      datePickerMessages={messages.datePicker}
    />
  )
  void (
    <TableHeaderFilter
      columnId="date"
      columnLabel="Date"
      label="Date"
      config={{ kind: 'date-range' }}
      value={undefined}
      onValueChange={() => {}}
      datePickerMessages={messages.datePicker}
    />
  )
  // Legacy header props keep their callback contract and accept the common child catalog.
  void (
    <TableHeaderFilter
      columnId="legacy"
      columnLabel="Legacy"
      label="Legacy"
      value=""
      onValueChange={(value) => {
        const text: string = value
        void text
      }}
      datePickerMessages={messages.datePicker}
    />
  )
  // @ts-expect-error Catalog names are finite child control identifiers.
  const invalid: GeneratorControlMessages = { arbitrary: {} }
  const invalidChild: GeneratorControlMessages = {
    // @ts-expect-error Child catalogs retain their own typed keys.
    numberInput: { nextMonth: 'Wrong family' },
  }
  void [invalid, invalidChild]
}
void publicTypes

test('language changes do not accept a rejected generated date request', () => {
  const h = mount()
  h.app.setAccept(false)
  flush()
  const input = h.getByRole('textbox', {
    name: 'Nested date',
  }) as HTMLInputElement
  fireEvent.input(input, { target: { value: '01/03/2024' } })
  flush()
  expect(h.app.requests()).toBe(1)
  expect(h.app.values().date).toBe('2024-02-29')
  h.app.setFrench(true)
  flush()
  expect(h.app.requests()).toBe(1)
  expect(h.app.values().date).toBe('2024-02-29')
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(h.getByRole('textbox', { name: 'Nested date' })).toBe(input)
  expect(input.value).toBe('29/02/2024')
})

test('nested catalogs do not translate or replace application validation errors', async () => {
  const h = mount()
  h.app.setBusinessError(true)
  flush()
  const outcome = await h.app.form.submit()
  flush()
  expect(outcome.status).toBe('invalid')
  const error = h.getByText('Application validation detail')
  h.app.setFrench(true)
  flush()
  expect(h.getByText('Application validation detail')).toBe(error)
  expect(h.app.form.errors.fields?.date).toBe('Application validation detail')
  expect(h.app.requests()).toBe(0)
})
