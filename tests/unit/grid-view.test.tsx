import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { GridView } from '@wfe/generator'
import type { GridDescription, GridBindings } from '@wfe/generator'

afterEach(cleanup)
const initial: GridDescription = {
  id: 'access',
  title: 'Capabilities',
  rows: [
    { id: 'a /[]', label: 'Alpha' },
    { id: 'b', label: 'Beta', disabled: true },
  ],
  columns: [
    { id: 'view', label: 'View', readOnly: true },
    { id: 'change', label: 'Change' },
  ],
}
async function settle() {
  flush()
  await Promise.resolve()
  flush()
}
function mount() {
  const [description, setDescription] = createSignal(initial)
  const [values, setValues] = createSignal<Readonly<Record<string, boolean>>>(
    {},
  )
  let accepting = false
  const change = vi.fn(
    (requested: { row: string; column: string; value: boolean }) => {
      if (accepting)
        setValues((old) => ({
          ...old,
          [JSON.stringify([requested.row, requested.column])]: requested.value,
        }))
    },
  )
  const [bindings, setBindings] = createSignal<GridBindings>({
    value: (row, column) => values()[JSON.stringify([row, column])] ?? false,
    onValueChange: change,
  })
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <GridView description={description()} bindings={bindings()} />
    </Errored>
  ))
  flush()
  return {
    ...h,
    description,
    setDescription,
    values,
    setValues,
    bindings,
    setBindings,
    change,
    accept: () => {
      accepting = true
    },
    cell: (name: string) =>
      h.getByRole('checkbox', { name, exact: true }) as HTMLInputElement,
  }
}

test('table supplies row/column labels and accepted values without initial requests', () => {
  const h = mount()
  expect(h.getByRole('table', { name: 'Capabilities' })).toBeTruthy()
  expect(h.getAllByRole('checkbox')).toHaveLength(4)
  expect(h.cell('Alpha Change').checked).toBe(false)
  expect(h.cell('Beta Change').disabled).toBe(true)
  expect(h.cell('Alpha View').getAttribute('aria-readonly')).toBe('true')
  expect(h.change).not.toHaveBeenCalled()
})
test('rejected change emits exactly one request and restores the accepted input', async () => {
  const h = mount()
  fireEvent.click(h.cell('Alpha Change'))
  await settle()
  expect(h.change).toHaveBeenCalledExactlyOnceWith({
    row: 'a /[]',
    column: 'change',
    value: true,
  })
  expect(h.cell('Alpha Change').checked).toBe(false)
})
test('accepted change and external values preserve the existing input node', async () => {
  const h = mount()
  h.accept()
  const input = h.cell('Alpha Change')
  fireEvent.click(input)
  await settle()
  expect(input.checked).toBe(true)
  expect(h.change).toHaveBeenCalledTimes(1)
  h.setValues({})
  await settle()
  expect(input.checked).toBe(false)
  expect(h.cell('Alpha Change')).toBe(input)
  expect(h.change).toHaveBeenCalledTimes(1)
})
test('disabled rows and read-only columns never request changes', async () => {
  const h = mount()
  h.accept()
  for (const name of ['Beta Change', 'Beta View', 'Alpha View'])
    fireEvent.click(h.cell(name))
  await settle()
  expect(h.change).not.toHaveBeenCalled()
  expect(h.cell('Alpha View').checked).toBe(false)
})
test('current metadata policy and current callback control retained cells', async () => {
  const h = mount()
  const input = h.cell('Alpha Change')
  const next = vi.fn()
  h.setBindings({ ...h.bindings(), onValueChange: next })
  h.setDescription({
    ...h.description(),
    columns: h
      .description()
      .columns.map((column) => ({ ...column, readOnly: true })),
  })
  await settle()
  fireEvent.click(input)
  await settle()
  expect(next).not.toHaveBeenCalled()
  h.setDescription({
    ...h.description(),
    columns: h
      .description()
      .columns.map((column) => ({ ...column, readOnly: false })),
  })
  await settle()
  fireEvent.click(input)
  await settle()
  expect(next).toHaveBeenCalledTimes(1)
  expect(h.change).not.toHaveBeenCalled()
  expect(h.cell('Alpha Change')).toBe(input)
})
test('immutable labels and row/column reorder preserve cell nodes and focus', async () => {
  const h = mount()
  const input = h.cell('Alpha Change')
  input.focus()
  h.setDescription({
    ...h.description(),
    rows: [...h.description().rows].reverse().map((row) => ({
      ...row,
      label: row.id === 'a /[]' ? 'Renamed' : row.label,
    })),
    columns: [...h.description().columns].reverse(),
  })
  await settle()
  expect(h.cell('Renamed Change')).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(h.getAllByRole('rowheader').map((node) => node.textContent)).toEqual([
    'Beta',
    'Renamed',
  ])
  expect(
    h.getAllByRole('columnheader').map((node) => node.textContent),
  ).toEqual(['', 'Change', 'View'])
})
test('removal and disposal release detached input interactions', async () => {
  const h = mount()
  const input = h.cell('Alpha Change')
  h.setDescription({ ...h.description(), rows: [initial.rows[1]!] })
  await settle()
  fireEvent.click(input)
  await settle()
  expect(input.isConnected).toBe(false)
  expect(h.change).not.toHaveBeenCalled()
  const retained = h.cell('Beta Change')
  h.unmount()
  fireEvent.click(retained)
  await settle()
  expect(h.change).not.toHaveBeenCalled()
})
test('empty rows and columns retain a named semantic table', async () => {
  const h = mount()
  h.setDescription({ id: 'access', rows: [], columns: [] })
  await settle()
  expect(h.getByRole('table', { name: 'access' })).toBeTruthy()
  expect(h.queryAllByRole('checkbox')).toHaveLength(0)
})
test.each([
  [
    'identity',
    (h: ReturnType<typeof mount>) =>
      h.setDescription({ ...h.description(), id: 'replacement' }),
  ],
  [
    'nonboolean value',
    (h: ReturnType<typeof mount>) =>
      h.setBindings({
        ...h.bindings(),
        value: (() => 'yes') as unknown as GridBindings['value'],
      }),
  ],
  [
    'getter',
    (h: ReturnType<typeof mount>) =>
      h.setBindings({
        ...h.bindings(),
        value: undefined,
      } as unknown as GridBindings),
  ],
  [
    'callback',
    (h: ReturnType<typeof mount>) =>
      h.setBindings({
        ...h.bindings(),
        onValueChange: undefined,
      } as unknown as GridBindings),
  ],
])('reports invalid grid %s', async (_label, update) => {
  const h = mount()
  update(h)
  await settle()
  expect(h.getByRole('alert').textContent).toContain('Generator:')
})

test('empty axes still validate binding functions and stable grid identity', async () => {
  const h = mount()
  h.setDescription({ id: 'access', rows: [], columns: [] })
  await settle()
  h.setBindings({ value: () => false } as unknown as GridBindings)
  await settle()
  expect(h.getByRole('alert').textContent).toContain('invalid grid bindings')
})
test('multiple grids use separate DOM associations for the same record keys', () => {
  const first = mount()
  const second = mount()
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  )
  const ids = [...inputs].map((node) => node.id)
  expect(new Set(ids).size).toBe(ids.length)
  const associations = [...inputs].map((node) =>
    node.getAttribute('aria-labelledby')!,
  )
  for (const references of associations) {
    const labels = references
      .split(' ')
      .map((id) => document.getElementById(id))
    expect(labels.every(Boolean)).toBe(true)
  }
  expect(new Set(associations).size).toBe(inputs.length)
  first.unmount()
  second.unmount()
})
test('removed columns release their controls while retained columns keep their inputs', async () => {
  const h = mount()
  const removed = h.cell('Alpha Change')
  const retained = h.cell('Alpha View')
  h.setDescription({ ...h.description(), columns: [initial.columns[0]!] })
  await settle()
  expect(h.cell('Alpha View')).toBe(retained)
  expect(removed.isConnected).toBe(false)
  fireEvent.click(removed)
  await settle()
  expect(h.change).not.toHaveBeenCalled()
})

test('arbitrary Unicode keys keep unique valid header associations', async () => {
  const h = mount()
  h.setDescription({
    id: 'access',
    rows: [
      { id: '\ud800', label: 'First' },
      { id: '\ud801', label: 'Second' },
    ],
    columns: [
      { id: '\udfff', label: 'View' },
      { id: '🔐', label: 'Change' },
    ],
  })
  await settle()
  const names = h
    .getAllByRole('checkbox')
    .map((input) => input.getAttribute('aria-labelledby')!)
  expect(new Set(names).size).toBe(4)
  for (const name of names)
    for (const id of name.split(' '))
      expect(document.getElementById(id)).not.toBeNull()
  expect(h.cell('First Change')).toBeTruthy()
})
