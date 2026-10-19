import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup, Errored } from 'solid-js'
import { Button, Input } from '@wfe/components'
import { createForm } from '@wfe/form'
import { createTable, TableColumnResize } from '@wfe/components/table'
import type { NativeColumn } from '@wfe/components/table'
import { FormView, LayoutView, TableView } from '@wfe/generator'
import type {
  CustomCellProps,
  FormDescription,
  LayoutDescription,
  TableDescription,
} from '@wfe/generator'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('form descriptions preserve controls, accepted values, labels and actions across reorder', async () => {
  const warnings = vi.spyOn(console, 'warn')
  const [values, setValues] = createSignal({
    title: 'First',
    active: true,
    category: 'a',
    count: 2,
  })
  const [description, setDescription] = createSignal<
    FormDescription<ReturnType<typeof values>>
  >({
    id: 'editor',
    title: 'Editor',
    fields: [
      { field: 'title', label: 'Title', control: 'text', help: 'A title' },
      { field: 'active', label: 'Active', control: 'checkbox' },
      { field: 'category', label: 'Category', control: 'select' },
      { field: 'count', label: 'Count', control: 'custom' },
    ],
    submit: { id: 'save', label: 'Save' },
    actions: [{ id: 'extra', label: 'Extra' }],
  })
  const calls: number[] = []
  const [callback, setCallback] = createSignal(() => () => {
    calls.push(1)
  })
  let disposals = 0
  let form!: ReturnType<typeof createForm<ReturnType<typeof values>>>
  const Custom = (props: {
    id: string
    value: number
    onValueChange: (value: number) => void
  }) => {
    onCleanup(() => {
      disposals++
    })
    return (
      <Input
        id={props.id}
        value={props.value}
        onValueChange={(value) => props.onValueChange(Number(value))}
      />
    )
  }
  const mounted = render(() => {
    form = createForm({
      values,
      defaults: values,
      onValuesChange: setValues,
      validate: (snapshot) =>
        snapshot.title ? {} : { fields: { title: 'Required title' } },
      onSubmit: () => ({ ok: true }),
    })
    return (
      <FormView
        description={description()}
        bindings={{
          form,
          choices: { category: () => [{ value: 'a', label: 'Alpha' }] },
          fields: { count: Custom },
          actions: { extra: { run: callback() } },
        }}
      />
    )
  })
  const title = mounted.getByLabelText('Title') as HTMLInputElement
  const count = mounted.getByLabelText('Count')
  const check = mounted.getByLabelText('Active') as HTMLInputElement
  expect(check.type).toBe('checkbox')
  fireEvent.input(title, { target: { value: 'Changed' } })
  flush()
  expect(values().title).toBe('Changed')
  const descriptions = description()
  setDescription({
    ...descriptions,
    title: 'Renamed editor',
    fields: [...descriptions.fields]
      .reverse()
      .map((field) => ({ ...field, label: 'New ' + field.label })),
  })
  flush()
  expect(mounted.getByLabelText('New Title')).toBe(title)
  expect(mounted.getByLabelText('New Count')).toBe(count)
  expect(mounted.getByLabelText('New Active')).toBe(check)
  expect(title.value).toBe('Changed')
  fireEvent.click(mounted.getByText('Extra'))
  flush()
  setCallback(() => () => {
    calls.push(2)
  })
  flush()
  fireEvent.click(mounted.getByText('Extra'))
  flush()
  expect(calls).toEqual([1, 2])
  fireEvent.input(title, { target: { value: '' } })
  flush()
  await form.submit()
  flush()
  expect(title.getAttribute('aria-invalid')).toBe('true')
  expect(mounted.getByText('Required title').id).toBe(
    title.getAttribute('aria-describedby')?.split(' ').at(-1),
  )
  expect(disposals).toBe(0)
  mounted.unmount()
  expect(disposals).toBe(1)
  expect(warnings.mock.calls).toEqual([])
})

test('table uses the original engine and keeps custom cells on label and alias changes', () => {
  const warnings = vi.spyOn(console, 'warn')
  const [label, setLabel] = createSignal('Amount')
  const [alias, setAlias] = createSignal<string | undefined>()
  const [record, setRecord] = createSignal({ name: 'Ada', amount: 3 })
  let mounts = 0
  let disposed = 0
  const Custom = (props: { value: unknown }) => {
    mounts++
    onCleanup(() => {
      disposed++
    })
    const [draft, setDraft] = createSignal('Local draft')
    return (
      <>
        <strong>{String(props.value)}</strong>
        <Input
          aria-label="Cell draft"
          value={draft()}
          onValueChange={setDraft}
        />
      </>
    )
  }
  const description = (): TableDescription => ({
    id: 'records',
    title: 'Records',
    columns: {
      name: { label: 'Name' },
      amount: { label: label(), renderer: 'number' },
    },
    controls: { filtering: false, search: false, grouping: false },
  })
  let table!: ReturnType<
    typeof createTable<{ name: string; amount: number }, never>
  >
  const mounted = render(() => {
    table = createTable({
      source: { ids: () => ['a'], get: record },
      columns: [
        { id: 'name', accessorKey: 'name' },
        {
          id: 'amount',
          accessorKey: 'amount',
          sortFn: (a, b) => Number(a) - Number(b),
        },
      ],
    })
    return (
      <TableView
        description={description()}
        bindings={{
          table,
          cells: { number: Custom },
          headerAliases: () => ({ amount: alias() }),
        }}
      />
    )
  })
  const cell = mounted.container.querySelector('strong')!
  expect(cell.textContent).toBe('3')
  const draft = mounted.getByLabelText('Cell draft') as HTMLInputElement
  fireEvent.input(draft, { target: { value: 'Unsaved cell' } })
  flush()
  const initialMounts = mounts
  setLabel('Total')
  flush()
  setAlias('Value')
  flush()
  expect(mounted.container.querySelector('strong')).toBe(cell)
  setRecord({ name: 'Ada', amount: 9 })
  flush()
  expect(mounted.container.querySelector('strong')).toBe(cell)
  expect(cell.textContent).toBe('9')
  expect(mounted.getByLabelText('Cell draft')).toBe(draft)
  expect(draft.value).toBe('Unsaved cell')
  expect(mounts).toBe(initialMounts)
  table.setColumnOrder(['amount', 'name'])
  flush()
  expect(table.getVisibleColumns().map((column) => column.id)).toEqual([
    'amount',
    'name',
  ])
  expect(
    mounted.container.querySelector('tbody td')?.getAttribute('data-column'),
  ).toBe('amount')
  table.getColumn('amount')!.toggleVisibility(false)
  flush()
  expect(cell.isConnected).toBe(false)
  expect(disposed).toBe(initialMounts)
  table.getColumn('amount')!.toggleVisibility(true)
  flush()
  expect(mounted.container.querySelector('strong')).not.toBe(cell)
  expect(mounted.container.querySelector('strong')?.textContent).toBe('9')
  expect((mounted.getByLabelText('Cell draft') as HTMLInputElement).value).toBe(
    'Local draft',
  )
  expect(mounts).toBe(initialMounts + 1)
  mounted.unmount()
  expect(disposed).toBe(mounts)
  expect(warnings.mock.calls).toEqual([])
})

test('layout descriptions preserve panels and child owners across relabel and reorder', () => {
  const warnings = vi.spyOn(console, 'warn')
  const [description, setDescription] = createSignal<
    LayoutDescription<'first' | 'second'>
  >({
    id: 'workspace',
    columns: 2,
    panels: [
      { id: 'one', view: 'first', title: 'One' },
      { id: 'two', view: 'second', title: 'Two' },
    ],
  })
  let disposed = 0
  const First = () => {
    onCleanup(() => {
      disposed++
    })
    return <Input value="Draft" />
  }
  const bindings = { views: { first: First, second: () => 'Second' } }
  const mounted = render(() => (
    <LayoutView description={description()} bindings={bindings} />
  ))
  const input = mounted.container.querySelector('input')!
  const first = mounted.container.querySelector('[data-generator-panel="one"]')!
  setDescription((old) => ({
    ...old,
    title: 'Renamed',
    columns: 1,
    panels: [...old.panels]
      .reverse()
      .map((panel) => ({ ...panel, title: 'New ' + panel.title })),
  }))
  flush()
  expect(mounted.container.querySelector('input')).toBe(input)
  expect(mounted.container.querySelector('[data-generator-panel="one"]')).toBe(
    first,
  )
  expect(
    [...mounted.container.querySelectorAll('[data-generator-panel]')].map(
      (panel) => panel.getAttribute('data-generator-panel'),
    ),
  ).toEqual(['two', 'one'])
  expect(disposed).toBe(0)
  mounted.unmount()
  expect(disposed).toBe(1)
  expect(warnings.mock.calls).toEqual([])
})

test('an absent optional custom value is valid and receives undefined', () => {
  const mounted = render(() => {
    type Optional = { count?: number }
    const [values, setValues] = createSignal<Optional>({})
    const form = createForm<Optional>({
      values,
      defaults: () => ({}),
      onValuesChange: setValues,
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    const description = {
      id: 'optional',
      fields: [{ field: 'count', label: 'Optional count', control: 'custom' }],
    } as const
    return (
      <FormView
        description={description}
        bindings={{
          form,
          fields: {
            count: (props) => (
              <Input
                id={props.id}
                value={props.value ?? ''}
                onValueChange={() => props.onValueChange(3)}
              />
            ),
          },
        }}
      />
    )
  })
  expect(
    (mounted.getByLabelText('Optional count') as HTMLInputElement).value,
  ).toBe('')
})

for (const mode of [
  'duplicate',
  'control',
  'custom',
  'choices',
  'action',
  'replace-control',
] as const) {
  test(`invalid form description reports ${mode} through the application's error boundary`, () => {
    const [invalid, setInvalid] = createSignal(mode !== 'replace-control')
    const mounted = render(() => {
      const [values, setValues] = createSignal({ name: 'Draft' })
      const form = createForm({
        values,
        defaults: values,
        onValuesChange: setValues,
        validate: () => ({}),
        onSubmit: () => ({ ok: true }),
      })
      const description = () =>
        ({
          id: 'invalid',
          fields:
            mode === 'duplicate'
              ? [
                  { field: 'name', label: 'Name', control: 'text' },
                  { field: 'name', label: 'Duplicate', control: 'text' },
                ]
              : [
                  {
                    field: 'name',
                    label: 'Name',
                    control: invalid()
                      ? mode === 'custom'
                        ? 'custom'
                        : mode === 'choices'
                          ? 'select'
                          : mode === 'control'
                            ? 'unsupported'
                            : 'textarea'
                      : 'text',
                  },
                ],
          ...(mode === 'action'
            ? { actions: [{ id: 'missing', label: 'Missing' }] }
            : {}),
        }) as FormDescription<{ name: string }>
      return (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <FormView description={description()} bindings={{ form }} />
        </Errored>
      )
    })
    if (mode === 'replace-control') {
      setInvalid(true)
      flush()
    }
    expect(mounted.getByRole('alert').textContent).toContain('Generator:')
    expect(mounted.queryByLabelText('Name')).toBeNull()
  })
}

for (const mode of [
  'column',
  'alias',
  'renderer',
  'replace-renderer',
] as const) {
  test(`invalid table description reports ${mode}`, () => {
    const [changed, setChanged] = createSignal(false)
    const mounted = render(() => {
      const table = createTable({
        source: { ids: () => ['a'], get: () => ({ name: 'Ada' }) },
        columns: [{ id: 'name', accessorKey: 'name' }],
      })
      const A = (props: { value: unknown }) => String(props.value)
      const B = (props: { value: unknown }) => String(props.value)
      const description = (): TableDescription => ({
        id: 'table',
        columns: {
          [mode === 'column' ? 'missing' : 'name']: {
            label: 'Name',
            ...(mode === 'renderer'
              ? { renderer: 'missing' }
              : mode === 'replace-renderer'
                ? { renderer: changed() ? 'b' : 'a' }
                : {}),
          },
        },
      })
      return (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <TableView
            description={description()}
            bindings={{
              table,
              cells: { a: A, b: B },
              ...(mode === 'alias'
                ? {
                    headerAliases: () => ({
                      name: 'Name',
                      missing: 'Unexpected',
                    }),
                  }
                : {}),
            }}
          />
        </Errored>
      )
    })
    if (mode === 'replace-renderer') {
      setChanged(true)
      flush()
    }
    expect(mounted.getByRole('alert').textContent).toContain('Generator:')
    expect(mounted.container.querySelector('table')).toBeNull()
  })
}

for (const mode of ['duplicate', 'missing', 'region', 'component'] as const) {
  test(`invalid layout description reports ${mode}`, () => {
    const [changed, setChanged] = createSignal(false)
    const A = () => 'First'
    const B = () => 'Replacement'
    const mounted = render(() => {
      const description = (): LayoutDescription => ({
        id: 'layout',
        panels:
          mode === 'region' && changed()
            ? []
            : [{ id: 'panel', view: 'first' }],
        navigation:
          mode === 'duplicate' || (mode === 'region' && changed())
            ? [{ id: 'panel', view: 'first' }]
            : [],
      })
      return (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <LayoutView
            description={description()}
            bindings={{
              views:
                mode === 'missing'
                  ? {}
                  : { first: mode === 'component' && changed() ? B : A },
            }}
          />
        </Errored>
      )
    })
    if (mode === 'region' || mode === 'component') {
      setChanged(true)
      flush()
    }
    expect(mounted.getByRole('alert').textContent).toContain('Generator:')
  })
}

test('navigation panels preserve local state across navigation and action updates', () => {
  const [revision, setRevision] = createSignal(0)
  let mounts = 0
  let disposals = 0
  const Editor = () => {
    mounts++
    onCleanup(() => {
      disposals++
    })
    const [draft, setDraft] = createSignal('Draft')
    return (
      <Input
        aria-label="Navigation draft"
        value={draft()}
        onValueChange={setDraft}
      />
    )
  }
  const Other = () => 'Other'
  const mounted = render(() => (
    <LayoutView
      description={{
        id: 'navigation',
        panels: [],
        navigation: (revision()
          ? [
              { id: 'other', view: 'other' },
              { id: 'editor', view: 'editor' },
            ]
          : [
              { id: 'editor', view: 'editor' },
              { id: 'other', view: 'other' },
            ]
        ).map((panel) => ({
          ...panel,
          title: revision() ? 'New title' : 'Title',
        })),
        actions: [{ id: 'action', label: 'Action' }],
      }}
      bindings={{
        views: { editor: Editor, other: Other },
        actions: { action: { run: () => setRevision((old) => old + 1) } },
      }}
    />
  ))
  const input = mounted.getByLabelText('Navigation draft') as HTMLInputElement
  fireEvent.input(input, { target: { value: 'Unsaved navigation' } })
  flush()
  setRevision(1)
  flush()
  expect(mounted.getByLabelText('Navigation draft')).toBe(input)
  expect(input.value).toBe('Unsaved navigation')
  expect(mounts).toBe(1)
  mounted.unmount()
  expect(disposals).toBe(1)
})

test('an inherited view name does not count as an application binding', () => {
  const mounted = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <LayoutView
        description={{
          id: 'layout',
          panels: [{ id: 'panel', view: 'constructor' }],
        }}
        bindings={{ views: {} }}
      />
    </Errored>
  ))
  expect(mounted.getByRole('alert').textContent).toContain(
    'missing view binding "constructor"',
  )
})

for (const control of ['checkbox', 'switch'] as const) {
  test(`${control} respects application disabled and read-only bindings`, () => {
    const [disabled, setDisabled] = createSignal(false)
    const [readOnly, setReadOnly] = createSignal(true)
    const [values, setValues] = createSignal({ active: false })
    const mounted = render(() => {
      const form = createForm({
        values,
        defaults: values,
        onValuesChange: setValues,
        validate: () => ({}),
        onSubmit: () => ({ ok: true }),
      })
      return (
        <FormView
          description={{
            id: 'flags',
            fields: [{ field: 'active', label: 'Active', control }],
          }}
          bindings={{ form, disabled, readOnly }}
        />
      )
    })
    const input = mounted.getByRole(control, {
      name: 'Active',
    }) as HTMLInputElement
    fireEvent.click(mounted.getByText('Active'))
    flush()
    expect(values().active).toBe(false)
    setReadOnly(false)
    flush()
    fireEvent.click(mounted.getByText('Active'))
    flush()
    expect(values().active).toBe(true)
    setDisabled(true)
    flush()
    expect(input.disabled).toBe(true)
    fireEvent.click(mounted.getByText('Active'))
    flush()
    expect(values().active).toBe(true)
  })
}

test('generated column sizing accepts and rejects application updates without reading records', () => {
  const [sizes, setSizes] = createSignal<Record<string, number>>({
    name: 180,
    note: 160,
  })
  let accept = true
  let reads = 0
  let replaceHeader!: () => void
  let table!: ReturnType<
    typeof createTable<{ name: string; note: string }, never>
  >
  const mounted = render(() => {
    table = createTable({
      state: {
        get columnSizing() {
          return sizes()
        },
      },
      onColumnSizingChange: (update) => {
        if (accept)
          setSizes(typeof update === 'function' ? update(sizes()) : update)
      },
      source: {
        ids: () => ['a'],
        get: () => {
          reads++
          return { name: 'Ada', note: 'Record' }
        },
      },
      columns: [
        { id: 'name', accessorKey: 'name' },
        { id: 'note', accessorKey: 'note' },
      ],
    })
    const headerEnd = (
      column: NativeColumn<{ name: string; note: string }, never>,
    ) => (
      <TableColumnResize
        label={column.id}
        size={column.getSize()}
        min={120}
        max={400}
        onSizeChange={column.setSize}
      />
    )
    const [renderEnd, setRenderEnd] = createSignal(() => headerEnd)
    replaceHeader = () => setRenderEnd(() => (column) => headerEnd(column))
    return (
      <TableView
        description={{
          id: 'sized',
          columns: { name: { label: 'Name' }, note: { label: 'Note' } },
        }}
        bindings={{
          table,
          width: table
            .getVisibleColumns()
            .reduce((sum, column) => sum + column.getSize(), 0),
          headerEnd: renderEnd(),
        }}
      />
    )
  })
  const separator = mounted.getByRole('separator', {
    name: 'Resize name column',
  })
  const col = () =>
    mounted.container.querySelector<HTMLTableColElement>(
      'col[data-column-width="name"]',
    )!
  const initialReads = reads
  fireEvent.keyDown(separator, { key: 'ArrowRight' })
  flush()
  expect(sizes().name).toBe(190)
  expect(separator.isConnected).toBe(true)
  expect(col().style.width).toBe('190px')
  accept = false
  fireEvent.keyDown(separator, { key: 'ArrowRight' })
  flush()
  expect(sizes().name).toBe(190)
  expect(col().style.width).toBe('190px')
  accept = true
  fireEvent.keyDown(separator, { key: 'Home' })
  flush()
  expect(sizes().name).toBe(120)
  fireEvent.keyDown(separator, { key: 'End' })
  flush()
  expect(sizes().name).toBe(400)
  table.setColumnOrder(['note', 'name'])
  flush()
  expect(col().style.width).toBe('400px')
  table.getColumn('note')!.toggleVisibility(false)
  flush()
  expect(mounted.container.querySelector('table')!.style.width).toBe('400px')
  expect(reads).toBe(initialReads)
  replaceHeader()
  flush()
  expect(separator.isConnected).toBe(false)
  fireEvent.keyDown(separator, { key: 'ArrowRight' })
  flush()
  expect(sizes().name).toBe(400)
  const replacement = mounted.getByRole('separator', {
    name: 'Resize name column',
  })
  expect(replacement).not.toBe(separator)
  fireEvent.keyDown(replacement, { key: 'ArrowLeft' })
  flush()
  expect(sizes().name).toBe(390)
})

test('generated row context preserves identity and live records across sorting, movement and removal', () => {
  type Row = { name: string; value: number }
  const [rows, setRows] = createSignal<Record<string, Row>>({
    a: { name: 'Ada', value: 1 },
    b: { name: 'Bob', value: 2 },
  })
  const chosen: string[] = []
  const removed: string[] = []
  let table!: ReturnType<typeof createTable<Row, never>>
  const Cell = (props: CustomCellProps<Row, never>) => {
    onCleanup(() => {
      removed.push(props.row.id)
    })
    return (
      <Button
        onClick={() => {
          chosen.push(props.row.id)
        }}
      >
        {props.row.original?.name}
      </Button>
    )
  }
  const mounted = render(() => {
    table = createTable({
      source: { ids: () => Object.keys(rows()), get: (id) => rows()[id] },
      columns: [
        {
          id: 'name',
          accessorKey: 'name',
          sortFn: (a, b) => String(a).localeCompare(String(b)),
        },
        { id: 'value', accessorKey: 'value' },
      ],
    })
    return (
      <TableView
        description={{
          id: 'row-context',
          columns: { name: { renderer: 'action' }, value: { label: 'Value' } },
        }}
        bindings={{ table, cells: { action: Cell } }}
      />
    )
  })
  const ada = mounted.getByRole('button', { name: 'Ada', exact: true })
  const bob = mounted.getByRole('button', { name: 'Bob', exact: true })
  table.setSorting([{ id: 'name', desc: true }])
  flush()
  expect(table.getRowIds()).toEqual(['b', 'a'])
  fireEvent.click(bob)
  table.setColumnOrder(['value', 'name'])
  flush()
  expect(mounted.getByRole('button', { name: 'Ada', exact: true })).toBe(ada)
  fireEvent.click(ada)
  setRows({ a: { name: 'Zoe', value: 3 }, b: { name: 'Bob', value: 2 } })
  flush()
  expect(ada.textContent).toBe('Zoe')
  expect(table.getRowIds()).toEqual(['a', 'b'])
  fireEvent.click(ada)
  expect(chosen).toEqual(['b', 'a', 'a'])
  setRows({ b: { name: 'Bob', value: 2 } })
  flush()
  expect(ada.isConnected).toBe(false)
  expect(removed).toEqual(['a'])
  fireEvent.click(ada)
  expect(chosen).toEqual(['b', 'a', 'a'])
  expect(mounted.getByRole('button', { name: 'Bob', exact: true })).toBe(bob)
})

test('generated tables forward application-controlled pane size without replacing record nodes', () => {
  const [size, setSize] = createSignal(30)
  const requests = vi.fn((next: number) => setSize(next))
  const mounted = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ name: 'Ada' }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <TableView
        description={{
          id: 'resizable-records',
          columns: { name: { label: 'Name' } },
        }}
        bindings={{
          table,
          controlsResizable: true,
          controlsSize: size(),
          onControlsSizeChange: requests,
        }}
      />
    )
  })
  const cell = mounted.getByText('Ada')
  const handle = mounted.getByRole('separator', { name: 'Table controls' })
  expect(requests).not.toHaveBeenCalled()
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  flush()
  expect(requests.mock.calls).toEqual([[31]])
  expect(handle.getAttribute('aria-valuenow')).toBe('31')
  setSize(45)
  flush()
  expect(handle.getAttribute('aria-valuenow')).toBe('45')
  expect(mounted.getByText('Ada')).toBe(cell)
  expect(requests).toHaveBeenCalledTimes(1)
})
