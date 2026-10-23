import {
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button, Input, ValueDisplay } from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import type { DashboardNavigation } from '@wfe/components/layout'
import { createTable } from '@wfe/components/table'
import { createForm } from '@wfe/form'
import { FormView, TableView } from '@wfe/generator'
import type { CustomCellProps, FormDescription } from '@wfe/generator'
import { ShellView } from '@wfe/shell'
import type { ShellBindings, ShellPageProps, ShellMessages } from '@wfe/shell'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { description, defaultRoute, readLocation, routeHref } from './routes'
import type { AudienceId, RouteId } from './routes'
import './style.css'

type Values = { name: string; active: boolean; notes: string }
type Row = Values & { id: string }
export type ShellFixture = {
  current: () => ReturnType<typeof readLocation>
  requests: { kind: 'route' | 'audience'; id: string }[]
  lifecycle: {
    mounts: number
    disposals: number
    listeners: number
    removals: number
    popEvents: number
  }
  reject: (value: boolean) => void
  accept: (id: RouteId) => void
  setMessages: (messages: Partial<ShellMessages> | undefined) => void
  refreshMetadata: () => void
  setHeader: (custom: boolean) => void
  setNavigation: (mode: 'default' | 'custom' | 'none') => void
  chromeLifecycle: { navigationMounts: number; navigationDisposals: number }
}
const formDescription = {
  id: 'record-details',
  fields: [
    { field: 'name', label: 'Name', control: 'text', required: true },
    { field: 'active', label: 'Active', control: 'checkbox' },
    { field: 'notes', label: 'Notes', control: 'textarea' },
  ],
  layout: { columns: 1 },
  submit: { id: 'save', label: 'Save' },
} as const satisfies FormDescription<Values>

export function App(props: {
  initialUrl: string
  ready?: (api: ShellFixture) => void
}) {
  const initialUrl = untrack(() => props.initialUrl)
  const translated = new URL(
    initialUrl,
    'http://shell.example',
  ).searchParams.has('messages')
  const [messages, setMessages] = createSignal<
    Partial<ShellMessages> | undefined
  >(
    translated
      ? {
          audience: 'Audiencia',
          breadcrumbs: 'Ruta',
          navigationLabel: 'Menú',
          toggleLabel: 'Navegar',
          closeLabel: 'Cerrar menú',
        }
      : undefined,
  )
  const [address, setAddress] = createSignal(initialUrl.split('#')[0]!)
  const [current, setCurrent] = createSignal(readLocation(initialUrl))
  const duplicateShells = new URL(
    initialUrl,
    'http://shell.example',
  ).searchParams.has('duplicate-shells')
  const [metadata, setMetadata] = createSignal({
    ...description,
    id: duplicateShells ? 'shared shell metadata' : description.id,
  })
  const customChrome = new URL(
    initialUrl,
    'http://shell.example',
  ).searchParams.has('custom-chrome')
  const [customHeader, setHeader] = createSignal(customChrome)
  const [navigationMode, setNavigation] = createSignal<
    'default' | 'custom' | 'none'
  >(customChrome ? 'custom' : 'default')
  const chromeLifecycle = { navigationMounts: 0, navigationDisposals: 0 }
  const requests: ShellFixture['requests'] = []
  const lifecycle = {
    mounts: 0,
    disposals: 0,
    listeners: 0,
    removals: 0,
    popEvents: 0,
  }
  let rejected = false
  let alive = true
  const resources = Object.fromEntries(
    description.audiences.map(({ id }) => {
      const initial: Values = {
        name: id === 'operations' ? 'Harbor' : 'Meadow',
        active: true,
        notes: '',
      }
      const [values, setValues] = createSignal(initial)
      const form = createForm<Values>({
        values,
        defaults: () => initial,
        onValuesChange: setValues,
        validate: (value) =>
          value.name.trim() ? {} : { fields: { name: 'Enter a name.' } },
        onSubmit: () => ({ ok: true }),
      })
      const rows: Row[] = [
        { id: 'a', ...initial },
        { id: 'b', name: 'Ridge', active: false, notes: '' },
      ]
      const byId = new Map(rows.map((row) => [row.id, row]))
      const table = createTable<Row, never>({
        source: {
          ids: () => rows.map((row) => row.id),
          get: (key) => byId.get(key),
        },
        columns: [
          { id: 'id', accessorKey: 'id' },
          { id: 'name', accessorKey: 'name' },
          { id: 'active', accessorKey: 'active' },
        ],
      })
      return [id, { form, table }]
    }),
  ) as Record<
    AudienceId,
    {
      form: ReturnType<typeof createForm<Values>>
      table: ReturnType<typeof createTable<Row, never>>
    }
  >
  function pageLifetime() {
    lifecycle.mounts++
    onCleanup(() => {
      lifecycle.disposals++
    })
  }
  const BooleanCell = (cell: CustomCellProps<Row, never>) => (
    <ValueDisplay value={cell.value} format="boolean-symbol" />
  )
  const TablePage = (page: ShellPageProps<typeof description>) => {
    pageLifetime()
    return (
      <TableView
        description={{
          id: 'shell-records',
          title: page.route.label,
          columns: {
            id: { label: 'ID' },
            name: { label: 'Name' },
            active: { label: 'Active', renderer: 'boolean' },
          },
        }}
        bindings={{
          table: resources[page.audience.id].table,
          cells: { boolean: BooleanCell },
          filter: (column) =>
            column.id === 'active' ? { kind: 'boolean' } : undefined,
        }}
      />
    )
  }
  const DetailPage = (page: ShellPageProps<typeof description>) => {
    pageLifetime()
    return (
      <DashboardPanel fill>
        <FormView
          description={formDescription}
          bindings={{ form: resources[page.audience.id].form }}
        />
      </DashboardPanel>
    )
  }
  const SummaryPage = (page: ShellPageProps<typeof description>) => {
    pageLifetime()
    return (
      <DashboardPanel fill class="shell-summary">
        <h2 data-ui-text="system">{page.audience.label}</h2>
        <dl>
          <dt data-ui-text="system">Records</dt>
          <dd>2</dd>
        </dl>
        <p>
          These invented records demonstrate an application that uses shared
          table and form descriptions.
        </p>
      </DashboardPanel>
    )
  }
  function accept(id: RouteId) {
    if (!alive) return
    const route = description.routes.find((entry) => entry.id === id)!
    const next = { route: id, audience: route.audience }
    if (current().route === id && current().audience === next.audience) return
    if (typeof window !== 'undefined') {
      history.pushState(null, '', routeHref(location.href, id))
      setAddress(location.href)
    }
    setCurrent(next)
  }
  const bindings: ShellBindings<typeof description> = {
    audience: () => current().audience,
    route: () => current().route,
    href: (id) => routeHref(address(), id),
    views: { table: TablePage, detail: DetailPage, summary: SummaryPage },
    onNavigate: (id) => {
      requests.push({ kind: 'route', id })
      if (!rejected) accept(id)
    },
    onAudienceChange: (id) => {
      requests.push({ kind: 'audience', id })
      if (!rejected) accept(defaultRoute(id))
    },
  }
  const CustomHeader = () => (
    <>
      <h1>Custom workspace</h1>
      <Input aria-label="Workspace note" placeholder="Application header" />
    </>
  )
  const CustomNavigation = (controls: DashboardNavigation) => {
    chromeLifecycle.navigationMounts++
    onCleanup(() => {
      chromeLifecycle.navigationDisposals++
    })
    return (
      <div class="ui-dashboard-menu">
        <output aria-label="Navigation state">
          {controls.mobile() ? 'mobile' : 'desktop'} /{' '}
          {controls.compact() ? 'compact' : 'expanded'}
        </output>
        <Button onClick={() => bindings.onNavigate('overview')}>
          Open overview
        </Button>
        <Button onClick={() => bindings.onNavigate('record')}>
          Open record
        </Button>
        <Button onClick={controls.close}>Close custom navigation</Button>
      </div>
    )
  }
  onSettled(() => {
    setAddress(location.href)
    const pop = () => {
      lifecycle.popEvents++
      setAddress(location.href)
      setCurrent(readLocation(location.href))
    }
    lifecycle.listeners++
    window.addEventListener('popstate', pop)
    return () => {
      lifecycle.removals++
      window.removeEventListener('popstate', pop)
    }
  })
  createEffect(
    () => current().route,
    (id) => {
      if (typeof document !== 'undefined')
        document.title = `${description.routes.find((entry) => entry.id === id)!.label} | Workspace`
    },
  )
  onCleanup(() => {
    alive = false
  })
  props.ready?.({
    current,
    requests,
    lifecycle,
    chromeLifecycle,
    setHeader,
    setNavigation,
    accept,
    reject: (value) => {
      rejected = value
    },
    setMessages: (next) => {
      if (alive) setMessages(next)
    },
    refreshMetadata: () =>
      setMetadata((old) => ({ ...old, title: 'Workspace' })),
  })
  return (
    <DefaultAppearance class="shell-example">
      <ShellView
        messages={messages()}
        description={metadata()}
        bindings={bindings}
        footer={null}
        header={customHeader() ? <CustomHeader /> : undefined}
        navigation={
          navigationMode() === 'none'
            ? false
            : navigationMode() === 'custom'
              ? CustomNavigation
              : undefined
        }
      />
      {duplicateShells && (
        <ShellView description={metadata()} bindings={bindings} footer={null} />
      )}
    </DefaultAppearance>
  )
}
