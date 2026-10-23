import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush, Errored } from 'solid-js'
import {
  Field,
  Label,
  HelpText,
  FieldError,
  FieldValue,
  ValueDisplay,
  Input,
} from '@wfe/components'
import type { ValueFormat, ValueFormatOptions } from '@wfe/components'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import type { NativeTable } from '@wfe/components/table'
import { FormView, TableView } from '@wfe/generator'
import type { FormDescription, TableDescription } from '@wfe/generator'

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
const settle = async () => {
  flush()
  await Promise.resolve()
  flush()
}
const initial = { hash: '0123456789abcdef', active: false, day: '2024-02-29' }
function mountForm() {
  const [values, setValues] = createSignal(initial)
  const [readOnly, setReadOnly] = createSignal(true)
  const [format, setFormat] = createSignal<ValueFormat>('short-hash')
  const [dateFormat, setDateFormat] = createSignal('dd/MM/yyyy')
  const requests = vi.fn((next: Readonly<typeof initial>) => setValues(next))
  const submit = vi.fn((_snapshot: Readonly<typeof initial>) => ({
    ok: true as const,
  }))
  let form!: ReturnType<typeof createForm<typeof initial>>
  const h = render(() => {
    form = createForm({
      values,
      defaults: () => initial,
      onValuesChange: requests,
      validate: () => ({}),
      onSubmit: submit,
    })
    return (
      <FormView
        description={
          {
            id: 'formats',
            fields: [
              {
                field: 'hash',
                control: 'text',
                format: format(),
                help: 'Full identifier',
              },
              {
                field: 'active',
                control: 'checkbox',
                format: 'boolean-symbol',
              },
              {
                field: 'day',
                control: 'text',
                format: 'date',
                formatOptions: { dateFormat: dateFormat() },
              },
            ],
            submit: { id: 'save' },
          } as const satisfies FormDescription<typeof initial>
        }
        bindings={{ form, readOnly }}
      />
    )
  })
  flush()
  return {
    ...h,
    form,
    values,
    setValues,
    requests,
    submit,
    setReadOnly,
    setFormat,
    setDateFormat,
  }
}
test('read-only fields share formats, visible labels and help associations', () => {
  const h = mountForm()
  const outputs = h.getAllByRole('status')
  expect(outputs).toHaveLength(3)
  expect(h.getByRole('status', { name: 'hash' }).textContent).toBe('01234567')
  expect(h.getByRole('img', { name: 'No' })).toBeTruthy()
  expect(h.getByRole('status', { name: 'day' }).textContent).toBe('29/02/2024')
  const hash = h.getByRole('status', { name: 'hash' })
  expect(hash.getAttribute('aria-live')).toBe('off')
  expect(
    document.getElementById(hash.getAttribute('aria-describedby')!)
      ?.textContent,
  ).toBe('Full identifier')
  expect(h.getByRole('img', { name: initial.hash })).toBe(
    h.getByTitle(initial.hash),
  )
  expect(h.requests).not.toHaveBeenCalled()
})
test('format and accepted value changes retain output owners and raw submission snapshots', async () => {
  const h = mountForm()
  const output = h.getByRole('status', { name: 'hash' })
  const day = h.getByRole('status', { name: 'day' })
  h.setFormat('boolean-text')
  h.setDateFormat('MM/dd/yyyy')
  await settle()
  expect(h.getByRole('status', { name: 'hash' })).toBe(output)
  expect(output.textContent).toBe(initial.hash)
  expect(h.getByRole('status', { name: 'day' })).toBe(day)
  expect(h.getByRole('status', { name: 'day' }).textContent).toBe('02/29/2024')
  h.setValues({ ...initial, active: true })
  await settle()
  expect(h.getByRole('img', { name: 'Yes' })).toBeTruthy()
  await h.form.submit()
  expect(h.submit).toHaveBeenCalledExactlyOnceWith(
    { ...initial, active: true },
    expect.anything(),
  )
  expect(h.requests).not.toHaveBeenCalled()
})
test('editable controls keep raw values and focus when unused display metadata changes', async () => {
  const h = mountForm()
  h.setReadOnly(false)
  await settle()
  const input = h.getByRole('textbox', { name: 'hash' }) as HTMLInputElement
  input.focus()
  h.setFormat('number-decimal')
  h.setDateFormat('MM/dd/yyyy')
  await settle()
  expect(h.getByRole('textbox', { name: 'hash' })).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(input.value).toBe(initial.hash)
  expect(h.getByRole('checkbox', { name: 'active' })).toBeTruthy()
  expect(h.requests).not.toHaveBeenCalled()
})
test('FieldValue preserves caller attributes and shared invalid/error relationships', async () => {
  const [invalid, setInvalid] = createSignal(false)
  const clicked = vi.fn()
  const h = render(() => (
    <Field invalid={invalid()}>
      <Label>Amount</Label>
      <FieldValue
        value={0}
        format="number-decimal"
        class="custom"
        onClick={clicked}
        aria-describedby="external"
      />
      <HelpText>Amount help</HelpText>
      <FieldError>Amount error</FieldError>
    </Field>
  ))
  flush()
  const output = h.getByRole('status', { name: 'Amount' })
  expect(output.classList.contains('custom')).toBe(true)
  expect(output.textContent).toBe('0.00')
  output.click()
  expect(clicked).toHaveBeenCalledTimes(1)
  setInvalid(true)
  await settle()
  expect(output.getAttribute('aria-invalid')).toBe('true')
  const ids = output.getAttribute('aria-describedby')!.split(' ')
  expect(ids).toContain('external')
  expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain(
    'Amount error',
  )
})
test('custom fields keep their component when read-only formats change', async () => {
  const [format, setFormat] = createSignal<ValueFormat>('short-hash')
  const Custom = (p: { id: string; value: string }) => (
    <Input id={p.id} value={`Custom ${p.value}`} readonly />
  )
  const h = render(() => {
    const form = createForm({
      values: () => ({ code: initial.hash }),
      defaults: () => ({ code: initial.hash }),
      onValuesChange() {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <FormView
        description={
          {
            id: 'custom',
            fields: [{ field: 'code', control: 'custom', format: format() }],
          } as const
        }
        bindings={{ form, readOnly: () => true, fields: { code: Custom } }}
      />
    )
  })
  const input = h.getByRole('textbox', { name: 'code' })
  setFormat('boolean-text')
  await settle()
  expect(h.getByRole('textbox', { name: 'code' })).toBe(input)
  expect((input as HTMLInputElement).value).toBe(`Custom ${initial.hash}`)
})
test('table format changes preserve raw data, aliases and custom cell precedence', async () => {
  const [format, setFormat] = createSignal<ValueFormat>('short-hash')
  const [alias, setAlias] = createSignal('Alias')
  const records = [
    { id: 'a', hash: initial.hash, active: true },
    { id: 'b', hash: 'abcdef0123456789', active: false },
  ]
  const Custom = (p: { value: unknown }) => (
    <span data-custom>{String(p.value)}</span>
  )
  let table!: NativeTable<(typeof records)[number]>
  const h = render(() => {
    table = createTable({
      source: {
        ids: () => records.map((r) => r.id),
        get: (id) => records.find((r) => r.id === id),
      },
      columns: [
        {
          id: 'hash',
          accessorKey: 'hash',
          sortFn: (a, b) => String(a).localeCompare(String(b)),
          filterFn: (value, query) => value === query,
        },
        { id: 'active', accessorKey: 'active' },
      ],
    })
    return (
      <TableView
        description={
          {
            id: 'table',
            columns: {
              hash: { label: 'Description', format: format() },
              active: { format: 'boolean-symbol', renderer: 'custom' },
            },
          } as const satisfies TableDescription
        }
        bindings={{
          table,
          headerAliases: () => ({ hash: alias() }),
          cells: { custom: Custom },
        }}
      />
    )
  })
  expect(h.getByTitle(initial.hash).textContent).toBe('01234567')
  expect(h.getByRole('columnheader', { name: /Alias/ })).toBeTruthy()
  const custom = h.container.querySelector('[data-custom]')
  setFormat('boolean-text')
  setAlias('Renamed')
  await settle()
  expect(h.container.querySelector('[data-custom]')).toBe(custom)
  expect(h.getByText(initial.hash)).toBeTruthy()
  expect(h.getByRole('columnheader', { name: /Renamed/ })).toBeTruthy()
  expect(table.getRow('a').getValue('hash')).toBe(initial.hash)
  expect(table.getRow('a').original).toEqual(records[0])
  table.setSorting([{ id: 'hash', desc: true }])
  await settle()
  expect(table.getRowIds()).toEqual(['b', 'a'])
  table.setColumnFilters([{ id: 'hash', value: initial.hash }])
  await settle()
  expect(table.getRowIds()).toEqual(['a'])
})
test('unsupported generator formats fail as description errors', () => {
  const h = render(() => {
    const form = createForm<{ code: string }>({
      values: () => ({ code: 'x' }),
      defaults: () => ({ code: 'x' }),
      onValuesChange() {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={{
            id: 'bad',
            fields: [
              { field: 'code', control: 'text', format: 'bad' as ValueFormat },
            ],
          }}
          bindings={{ form }}
        />
      </Errored>
    )
  })
  expect(h.getByRole('alert').textContent).toContain('unsupported format')
})
test('short hashes expose full text and retain short, empty and Unicode strings', () => {
  const h = render(() => (
    <>
      <ValueDisplay value="🐧🐧🐧🐧🐧🐧🐧🐧ab" format="short-hash" />
      <ValueDisplay value="abc" format="short-hash" />
      <ValueDisplay value={null} format="short-hash" />
      <ValueDisplay value="" format="short-hash" />
    </>
  ))
  expect(h.getByTitle('🐧🐧🐧🐧🐧🐧🐧🐧ab').textContent).toBe(
    '🐧🐧🐧🐧🐧🐧🐧🐧',
  )
  expect(h.getByTitle('abc').textContent).toBe('abc')
  expect(h.getAllByRole('img')).toHaveLength(2)
  expect(h.container.textContent).toBe('🐧🐧🐧🐧🐧🐧🐧🐧abc')
})

test.each([
  { value: 'replacement' },
  { format: 'boolean-text' },
  { id: 'wrong' },
  { locale: 1 },
])('rejects invalid runtime display options %j', (options) => {
  const h = render(() => {
    const form = createForm({
      values: () => ({ code: initial.hash }),
      defaults: () => ({ code: initial.hash }),
      onValuesChange() {},
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={{
            id: 'bad-options',
            fields: [
              {
                field: 'code',
                control: 'text',
                format: 'short-hash',
                formatOptions: options as ValueFormatOptions,
              },
            ],
          }}
          bindings={{ form, readOnly: () => true }}
        />
      </Errored>
    )
  })
  expect(h.getByRole('alert').textContent).toContain('format option')
  expect(h.container.querySelector('output#wrong')).toBeNull()
})
