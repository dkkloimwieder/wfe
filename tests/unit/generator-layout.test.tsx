import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush, onCleanup } from 'solid-js'
import { FieldGroup, FormGrid, NumberInput } from '@wfe/components'
import { createForm } from '@wfe/form'
import { FormView } from '@wfe/generator'
import type { FormDescription } from '@wfe/generator'

afterEach(cleanup)
type Values = { name: string; amount: number; notes: string }
const fields = [
  { field: 'name', label: 'Name', control: 'text', span: 'full' },
  { field: 'amount', label: 'Amount', control: 'custom' },
  { field: 'notes', label: 'Notes', control: 'textarea', span: 2 },
] as const
const grouped: FormDescription<Values> = {
  id: 'layout',
  fields,
  layout: {
    columns: 2,
    groups: [
      {
        id: 'identity',
        title: 'Identity',
        help: 'Shared details',
        columns: 2,
        fields: ['name', 'amount'],
      },
      { id: 'extra', title: 'Extra', columns: 2, fields: ['notes'] },
    ],
  },
  submit: { id: 'save', label: 'Save' },
}
function mount(initial = grouped) {
  const [description, setDescription] = createSignal(initial)
  const [values, setValues] = createSignal<Values>({
    name: 'Name',
    amount: 2,
    notes: 'Notes',
  })
  let mounts = 0,
    disposals = 0,
    submissions = 0
  const h = render(() => {
    const form = createForm({
      values,
      defaults: values,
      onValuesChange: setValues,
      validate: () => ({}),
      onSubmit: () => {
        submissions++
        return { ok: true }
      },
    })
    const Custom = (props: {
      value: number
      onValueChange: (value: number) => void
    }) => {
      mounts++
      onCleanup(() => {
        disposals++
      })
      return (
        <NumberInput
          value={props.value}
          allowEmpty={false}
          onValueChange={(value) => {
            if (value !== undefined) props.onValueChange(value)
          }}
        />
      )
    }
    return (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <FormView
          description={description()}
          bindings={{ form, fields: { amount: Custom } }}
        />
      </Errored>
    )
  })
  return {
    ...h,
    setDescription,
    description,
    values,
    counts: () => ({ mounts, disposals, submissions }),
  }
}
function update(h: ReturnType<typeof mount>, next: FormDescription<Values>) {
  h.setDescription(next)
  flush()
}

test('native groups expose labels, help and Field metadata', () => {
  const h = mount()
  const group = h.getByRole('group', { name: 'Identity' })
  const help = document.getElementById(group.getAttribute('aria-describedby')!)
  expect(help?.textContent).toBe('Shared details')
  expect(group.contains(h.getByLabelText('Name'))).toBe(true)
  expect(
    h
      .getByLabelText('Notes')
      .closest('[data-form-span]')
      ?.getAttribute('data-form-span'),
  ).toBe('2')
  expect(h.counts()).toEqual({ mounts: 1, disposals: 0, submissions: 0 })
})

test('group and field reorder preserve custom owners, numeric drafts and metadata updates', () => {
  const h = mount()
  const input = h.getByLabelText('Amount') as HTMLInputElement
  fireEvent.input(input, { target: { value: '3.50' } })
  flush()
  for (const text of ['3.50', '3.']) {
    fireEvent.input(input, { target: { value: text } })
    flush()
    update(h, {
      ...grouped,
      fields: [...fields].reverse(),
      layout: {
        columns: 1,
        groups: [...grouped.layout!.groups!].reverse().map((group) => ({
          ...group,
          title: `${group.title} revised`,
          help: 'Updated help',
          fields: [...group.fields].reverse(),
        })),
      },
    })
    expect(h.getByLabelText('Amount')).toBe(input)
    expect(input.value).toBe(text)
    expect(h.values().amount).toBe(3.5)
    update(h, grouped)
  }
  fireEvent.submit(h.container.querySelector('form')!)
  flush()
  expect(h.counts().submissions).toBe(0)
  expect(document.activeElement).toBe(input)
  h.unmount()
  expect(h.counts().mounts).toBe(1)
  expect(h.counts().disposals).toBe(1)
  fireEvent.input(input, { target: { value: '99' } })
  flush()
  expect(h.values().amount).toBe(3.5)
})

test('flat descriptions retain controls when optional column layout changes', () => {
  const flat = {
    ...grouped,
    fields: fields.map(({ span: _span, ...field }) => field),
    layout: undefined,
  }
  const h = mount(flat)
  const input = h.getByLabelText('Amount') as HTMLInputElement
  fireEvent.input(input, { target: { value: '-' } })
  flush()
  for (const layout of [
    { columns: 3 as const },
    { columns: 2 as const },
    undefined,
  ]) {
    update(h, { ...flat, layout })
    expect(h.getByLabelText('Amount')).toBe(input)
    expect(input.value).toBe('-')
  }
  expect(h.counts().mounts).toBe(1)
})

for (const [name, layout, message] of [
  [
    'unknown',
    {
      groups: [
        { id: 'g', title: 'Group', fields: ['name', 'amount', 'missing'] },
      ],
    },
    'every described field',
  ],
  [
    'missing',
    { groups: [{ id: 'g', title: 'Group', fields: ['name'] }] },
    'every described field',
  ],
  [
    'duplicate reference',
    {
      groups: [{ id: 'g', title: 'Group', fields: ['name', 'name', 'notes'] }],
    },
    'duplicate grouped field',
  ],
  [
    'duplicate group',
    {
      groups: [
        { id: 'g', title: 'Group', fields: ['name'] },
        { id: 'g', title: 'Other', fields: ['amount', 'notes'] },
      ],
    },
    'duplicate form group',
  ],
  [
    'blank group title',
    { groups: [{ id: 'g', title: ' ', fields: ['name', 'amount', 'notes'] }] },
    'require a title',
  ],
  ['invalid columns', { columns: 4 }, 'form column count'],
  [
    'invalid group columns',
    {
      groups: [
        {
          id: 'g',
          title: 'Group',
          columns: 0,
          fields: ['name', 'amount', 'notes'],
        },
      ],
    },
    'group column count',
  ],
  [
    'oversized group span',
    {
      groups: [
        {
          id: 'g',
          title: 'Group',
          columns: 2,
          span: 2,
          fields: ['name', 'amount', 'notes'],
        },
      ],
    },
    'group span',
  ],
  [
    'oversized field span',
    {
      groups: [
        { id: 'g', title: 'Group', fields: ['name', 'amount', 'notes'] },
      ],
    },
    'span for field',
  ],
] as const)
  test(`runtime rejects ${name}`, () => {
    const h = mount({
      ...grouped,
      layout,
    } as unknown as FormDescription<Values>)
    expect(h.getByRole('alert').textContent).toContain(message)
  })

test('retained membership and grouped mode changes require an explicit remount', () => {
  const h = mount()
  update(h, {
    ...grouped,
    layout: {
      groups: [
        { id: 'identity', title: 'Identity', columns: 2, fields: ['name'] },
        {
          id: 'extra',
          title: 'Extra',
          columns: 2,
          fields: ['amount', 'notes'],
        },
      ],
    },
  })
  expect(h.getByRole('alert').textContent).toContain(
    'remount the form view to move field',
  )
  const flat = mount({ ...grouped, layout: { columns: 2 } })
  update(flat, grouped)
  expect(flat.getByRole('alert').textContent).toContain(
    'remount the form view to move field',
  )
})

test('removing groups disposes fields and releases membership for later re-addition', () => {
  const h = mount()
  update(h, { ...grouped, fields: [], layout: { groups: [] } })
  expect(h.queryByLabelText('Amount')).toBeNull()
  expect(h.counts().disposals).toBe(1)
  update(h, {
    ...grouped,
    layout: {
      groups: [
        {
          id: 'new',
          title: 'New',
          columns: 2,
          fields: ['name', 'amount', 'notes'],
        },
      ],
    },
  })
  expect(h.getByLabelText('Amount')).toBeTruthy()
  expect(h.counts().mounts).toBe(2)
})

test('direct shared grids and groups retain native attributes and help associations', () => {
  const h = render(() => (
    <FormGrid columns={2} class="caller-grid">
      <FieldGroup
        title="Direct group"
        help="Direct help"
        columns={2}
        span="full"
        disabled
        class="caller-group"
        aria-describedby="external"
      >
        <input aria-label="Direct input" />
      </FieldGroup>
    </FormGrid>
  ))
  const group = h.getByRole('group', {
    name: 'Direct group',
  }) as HTMLFieldSetElement
  expect(group.disabled).toBe(true)
  expect(group.classList.contains('ui-field-group')).toBe(true)
  expect(group.classList.contains('caller-group')).toBe(true)
  expect(group.getAttribute('aria-describedby')).toContain(
    'external field-group-help-',
  )
  expect(
    h.container
      .querySelector('.ui-form-layout')
      ?.classList.contains('caller-grid'),
  ).toBe(true)
})
