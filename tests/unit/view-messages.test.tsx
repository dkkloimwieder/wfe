import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Input, resolveMessages } from '@wfe/components'
import { createForm } from '@wfe/form'
import {
  DeleteView,
  DetailView,
  FormView,
  GridView,
  LayoutView,
  TableView,
} from '@wfe/generator'
import type { GeneratorMessages } from '@wfe/generator'
import { createTable } from '@wfe/components/table'
import { ChartView } from '@wfe/generator/chart'
import { ShellView } from '@wfe/shell'
import type { ShellMessages } from '@wfe/shell'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('public message resolution remains lazy, per-key and independent for each caller', () => {
  const [override, setOverride] = createSignal<{
    label?: string
    count?: (n: number) => string
  }>({ label: 'Hola' })
  const first = resolveMessages(
    { label: 'Hello', count: (n: number) => `${n} items` },
    override,
  )
  const second = resolveMessages({ label: 'Other' }, () => undefined)
  expect(first.label).toBe('Hola')
  expect(first.count(2)).toBe('2 items')
  setOverride({ label: undefined, count: (n) => `${n} elementos` })
  flush()
  expect(first.label).toBe('Hello')
  expect(first.count(2)).toBe('2 elementos')
  expect(second.label).toBe('Other')
})

test('generated form translates only owned failure/status text while retaining draft and explicit action labels', async () => {
  const [messages, setMessages] = createSignal<Partial<GeneratorMessages>>({
    loading: 'Cargando',
    formActionFailed: 'Falló la acción',
  })
  const save = vi.fn(() => {
    throw new Error('application failure')
  })
  let submit!: () => Promise<unknown>
  const h = render(() => {
    const [values, setValues] = createSignal({ name: 'Ada' })
    const form = createForm({
      values,
      defaults: () => ({ name: 'Ada' }),
      onValuesChange: setValues,
      validate: () => ({}),
      onSubmit: save,
    })
    submit = () => form.submit()
    return (
      <FormView
        messages={messages()}
        description={
          {
            id: 'translated-form',
            fields: [{ field: 'name', label: 'Record name', control: 'text' }],
            submit: { id: 'save', label: 'Save record' },
          } as const
        }
        bindings={{ form, status: () => ({ loading: true }) }}
      />
    )
  })
  await submit()
  flush()
  const input = h.getByRole('textbox', { name: 'Record name' })
  input.focus()
  expect(h.getByRole('alert').textContent).toBe('Falló la acción')
  expect(h.getByRole('button', { name: 'Save record' })).toBeTruthy()
  setMessages({ loading: 'Chargement', formActionFailed: 'Échec' })
  flush()
  expect(h.getByRole('alert').textContent).toBe('Échec')
  expect(h.getByRole('status').textContent).toBe('Chargement')
  expect(h.getByRole('textbox', { name: 'Record name' }) === input).toBe(true)
  expect(document.activeElement).toBe(input)
  expect(save).toHaveBeenCalledTimes(1)
})

test('repeated row translations retain keys and focused controls while add/remove keep application acceptance', () => {
  const [messages, setMessages] = createSignal<Partial<GeneratorMessages>>({
    addRow: 'Agregar',
    removeRow: 'Quitar',
    removeRowLabel: (label, row) => `Quitar ${label} ${row}`,
    repeatedRowTitle: (label, row) => `${label}: ${row}`,
  })
  const h = render(() => {
    const defaults = { people: [{ id: 'a', name: 'Ada' }] }
    const [values, setValues] = createSignal(defaults)
    let next = 0
    const form = createForm({
      values,
      defaults: () => defaults,
      onValuesChange: setValues,
      validate: () => ({}),
      onSubmit: () => ({ ok: true }),
    })
    return (
      <FormView
        messages={messages()}
        description={
          {
            id: 'people',
            fields: [
              {
                field: 'people',
                label: 'People',
                control: 'repeat',
                fields: [{ field: 'name', label: 'Name', control: 'text' }],
              },
            ],
          } as const
        }
        bindings={{
          form,
          repeated: {
            people: {
              rowKey: (row) => row.id,
              createRow: () => ({ id: `new-${++next}`, name: '' }),
            },
          },
        }}
      />
    )
  })
  const input = h.getByRole('textbox', { name: 'Name' })
  input.focus()
  setMessages({
    addRow: 'Ajouter',
    removeRow: 'Retirer',
    removeRowLabel: (label, row) => `Retirer ${label} ${row}`,
  })
  flush()
  expect(h.getByRole('textbox', { name: 'Name' }) === input).toBe(true)
  expect(document.activeElement).toBe(input)
  fireEvent.click(h.getByRole('button', { name: 'Ajouter' }))
  flush()
  expect(h.getAllByRole('textbox', { name: 'Name' })).toHaveLength(2)
  fireEvent.click(h.getByRole('button', { name: 'Retirer People 2' }))
  flush()
  expect(h.getAllByRole('textbox', { name: 'Name' })).toHaveLength(1)
  expect(h.getByRole('textbox', { name: 'Name' }) === input).toBe(true)
})

test('detail/grid/table messages retain caller values and table messages forward separately', () => {
  const [messages, setMessages] = createSignal<Partial<GeneratorMessages>>({
    loading: 'Cargando',
    rowHeader: 'Fila',
  })
  const h = render(() => {
    const table = createTable({
      source: { ids: () => [], get: () => undefined },
      columns: [{ id: 'name' }],
    })
    return (
      <>
        <DetailView
          messages={messages()}
          description={
            {
              id: 'detail',
              fields: [{ field: 'name', label: 'Person' }],
            } as const
          }
          bindings={{
            record: () => ({ name: 'Ada' }),
            status: () => ({ loading: true }),
          }}
        />
        <GridView
          messages={messages()}
          description={{ id: 'matrix', rows: [], columns: [] } as const}
          bindings={{ value: () => false, onValueChange: () => {} }}
        />
        <TableView
          messages={messages()}
          description={{ id: 'records', columns: { name: {} } }}
          bindings={{ table, messages: { noRecords: 'Sin registros' } }}
        />
      </>
    )
  })
  expect(h.getByRole('columnheader', { name: 'Fila' })).toBeTruthy()
  expect(h.getByText('Sin registros')).toBeTruthy()
  const output = h.getByText('Ada')
  setMessages({ loading: 'Chargement', rowHeader: 'Ligne' })
  flush()
  expect(h.getByText('Ada') === output).toBe(true)
  expect(h.getByRole('columnheader', { name: 'Ligne' })).toBeTruthy()
})

test('delete defaults translate without replacing open buttons or overriding authored confirmation labels', async () => {
  const [messages, setMessages] = createSignal<Partial<GeneratorMessages>>({
    delete: 'Eliminar',
    cancel: 'Volver',
  })
  const confirm = vi.fn()
  const h = render(() => (
    <DeleteView
      messages={messages()}
      description={{
        id: 'delete',
        title: 'Delete record',
        confirmation: 'Confirm the application record',
        confirmLabel: 'Confirm deletion',
      }}
      bindings={{ recordKey: () => 'a', onConfirm: confirm }}
    />
  ))
  fireEvent.click(h.getByRole('button', { name: 'Eliminar' }))
  flush()
  const cancel = await screen.findByRole('button', { name: 'Volver' })
  cancel.focus()
  setMessages({ delete: 'Supprimer', cancel: 'Annuler' })
  flush()
  expect(screen.getByRole('button', { name: 'Annuler' }) === cancel).toBe(true)
  expect(document.activeElement).toBe(cancel)
  fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }))
  flush()
  await waitFor(() => expect(confirm).toHaveBeenCalledExactlyOnceWith('a'))
})

test('shell messages retain page/header/navigation owners and explicit labels win', () => {
  const [messages, setMessages] = createSignal<Partial<ShellMessages>>({
    audience: 'Audiencia',
    breadcrumbs: 'Ruta',
    navigationLabel: 'Menú',
  })
  let mounts = 0
  const Page = () => {
    mounts++
    return <Input aria-label="Page draft" defaultValue="Retained" />
  }
  const h = render(() => (
    <ShellView
      messages={messages()}
      description={
        {
          id: 'translated-shell',
          audiences: [{ id: 'a', label: 'Application audience' }],
          routes: [{ id: 'home', label: 'Application home', view: 'page' }],
        } as const
      }
      bindings={{
        audience: () => 'a',
        route: () => 'home',
        href: () => '/home',
        views: { page: Page },
        onAudienceChange: () => {},
        onNavigate: () => {},
      }}
    />
  ))
  const input = h.getByRole('textbox', { name: 'Page draft' })
  input.focus()
  const audience = h.getByRole('button', { name: /Audiencia/ })
  expect(h.getByRole('navigation', { name: 'Ruta' })).toBeTruthy()
  setMessages({
    audience: 'Public',
    breadcrumbs: 'Chemin',
    navigationLabel: 'Navigation traduite',
  })
  flush()
  expect(h.getByRole('button', { name: /Public/ }) === audience).toBe(true)
  expect(h.getByRole('textbox', { name: 'Page draft' }) === input).toBe(true)
  expect(document.activeElement).toBe(input)
  expect(mounts).toBe(1)
  h.unmount()
  const explicit = render(() => (
    <ShellView
      messages={{ audience: 'Ignored', navigationLabel: 'Ignored menu' }}
      audienceLabel="Explicit audience"
      navigationLabel="Explicit navigation"
      description={
        {
          id: 'explicit-shell',
          audiences: [{ id: 'a', label: 'Audience' }],
          routes: [{ id: 'home', label: 'Home', view: 'page' }],
        } as const
      }
      bindings={{
        audience: () => 'a',
        route: () => 'home',
        href: () => '/home',
        views: { page: Page },
        onAudienceChange: () => {},
        onNavigate: () => {},
      }}
    />
  ))
  expect(
    explicit.getByRole('button', { name: /Explicit audience/ }),
  ).toBeTruthy()
  expect(
    explicit.getByRole('navigation', { name: 'Explicit navigation' }),
  ).toBeTruthy()
  expect(explicit.queryByRole('button', { name: /Ignored/ })).toBeNull()
  explicit.unmount()
  const custom = render(() => (
    <ShellView
      messages={{ audience: 'Ignored', navigationLabel: 'Ignored menu' }}
      audienceLabel="Explicit audience"
      navigationLabel="Explicit navigation"
      header={null}
      navigation={false}
      description={
        {
          id: 'custom-shell',
          audiences: [{ id: 'a', label: 'Audience' }],
          routes: [{ id: 'home', label: 'Home', view: 'page' }],
        } as const
      }
      bindings={{
        audience: () => 'a',
        route: () => 'home',
        href: () => '/home',
        views: { page: Page },
        onAudienceChange: () => {},
        onNavigate: () => {},
      }}
    />
  ))
  expect(custom.queryByRole('button', { name: /Ignored/ })).toBeNull()
  expect(custom.queryByRole('navigation')).toBeNull()
})

test('generated layout translates navigation defaults without replacing application panel owners', () => {
  const [messages, setMessages] = createSignal<Partial<GeneratorMessages>>({
    navigationLabel: 'Menú',
    contextLabel: 'Contexto',
  })
  let mounts = 0
  const Panel = () => {
    mounts++
    return <Input aria-label="Panel draft" />
  }
  const h = render(() => (
    <LayoutView
      messages={messages()}
      description={
        {
          id: 'layout',
          title: 'Application title',
          panels: [{ id: 'main', view: 'content' }],
          navigation: [{ id: 'nav', view: 'menu' }],
          context: [{ id: 'context', view: 'context' }],
          contextLabel: 'Explicit context',
        } as const
      }
      bindings={{
        views: {
          content: Panel,
          menu: () => 'Menu contents',
          context: () => 'Context contents',
        },
      }}
    />
  ))
  const input = h.getByRole('textbox', { name: 'Panel draft' })
  input.focus()
  expect(h.getByRole('navigation', { name: 'Menú' })).toBeTruthy()
  expect(h.getByRole('navigation', { name: 'Explicit context' })).toBeTruthy()
  setMessages({ navigationLabel: 'Menu traduit', contextLabel: 'Ignored' })
  flush()
  expect(h.getByRole('navigation', { name: 'Menu traduit' })).toBeTruthy()
  expect(h.getByRole('navigation', { name: 'Explicit context' })).toBeTruthy()
  expect(h.getByRole('textbox', { name: 'Panel draft' }) === input).toBe(true)
  expect(document.activeElement).toBe(input)
  expect(mounts).toBe(1)
})

test('public resolver supports frozen defaults and layered own keys without capturing translations', () => {
  const defaults: Readonly<{
    label: string
    empty: string
    count: (n: number) => string
  }> = Object.freeze({
    label: 'Hello',
    empty: 'Default',
    count: (n: number) => `${n} items`,
  })
  const [overrides, setOverrides] = createSignal<Partial<typeof defaults>>({
    label: 'Hola',
    empty: '',
  })
  const messages = resolveMessages(defaults, overrides)
  expect(messages.label).toBe('Hola')
  expect(messages.empty).toBe('')
  expect(Object.hasOwn(messages, 'label')).toBe(true)
  expect(Object.keys(messages)).toEqual(Object.keys(defaults))
  expect({ ...messages }).toEqual({
    label: 'Hola',
    empty: '',
    count: defaults.count,
  })
  const layered = resolveMessages(messages, () => ({ empty: undefined }))
  expect(layered.label).toBe('Hola')
  setOverrides(
    Object.assign(Object.create({ label: 'Inherited' }), { empty: undefined }),
  )
  flush()
  expect(messages.label).toBe('Hello')
  expect(messages.empty).toBe('Default')
  expect(layered.label).toBe('Hello')
  expect(defaults.label).toBe('Hello')
})

test('generated chart loading messages update without replacing chart ownership', () => {
  const [messages, setMessages] = createSignal<Partial<GeneratorMessages>>({
    loading: 'Cargando',
  })
  const rows = [{ x: 1, y: 2 }]
  const h = render(() => (
    <ChartView
      messages={messages()}
      description={{
        id: 'translated-chart',
        kind: 'line',
        ariaLabel: 'Application chart',
        x: { field: 'x', scale: 'linear' },
        y: { field: 'y' },
      }}
      bindings={{ rows: () => rows, status: () => ({ loading: true }) }}
    />
  ))
  const chart = h.container.querySelector('[data-generator-view]')
  expect(h.getByRole('status').textContent).toBe('Cargando')
  setMessages({ loading: 'Chargement' })
  flush()
  expect(h.getByRole('status').textContent).toBe('Chargement')
  expect(h.container.querySelector('[data-generator-view]') === chart).toBe(
    true,
  )
})
