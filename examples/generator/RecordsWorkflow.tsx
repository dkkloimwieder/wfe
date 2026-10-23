import {
  For,
  createSignal,
  onCleanup,
  onSettled,
  Show,
  untrack,
} from 'solid-js'
import { Breadcrumbs, Button, ValueDisplay } from '@wfe/components'
import { FormView, LayoutView, TableView } from '@wfe/generator'
import type { CustomCellProps, LayoutDescription } from '@wfe/generator'
import type { JSX } from '@solidjs/web'
import type { RecordValues } from './records-provider'
import { recordRoute, recordUrl } from './record-route'
import type { RecordRoute } from './record-route'
import { createRecordsWorkflow } from './records-workflow'
import { TableColumnResize } from '@wfe/components/table'
import type { NativeColumn } from '@wfe/components/table'

export function RecordsWorkflow(props: {
  initialRoute?: RecordRoute
  initialUrl?: string
  ready?: (api: ReturnType<typeof createRecordsWorkflow>) => void
}) {
  const app = createRecordsWorkflow(
    untrack(() => props.initialRoute ?? { screen: 'records' }),
  )
  props.ready?.(app)
  const [navigationBase, setNavigationBase] = createSignal(
    untrack(() => {
      const url = new URL(
        props.initialUrl ?? '?app=records',
        'http://records.example',
      )
      // Fragments do not reach HTTP servers. Restore the browser fragment after attachment.
      url.hash = ''
      return url.pathname + url.search
    }),
  )
  let root: HTMLDivElement | undefined
  let returnFocus: HTMLButtonElement | undefined
  let alive = true
  let attempt = 0
  onCleanup(() => {
    alive = false
    root = undefined
    returnFocus = undefined
    attempt++
  })
  function apply(route: RecordRoute, trigger?: HTMLButtonElement) {
    if (!alive) return
    if (trigger && app.route().screen === 'records') returnFocus = trigger
    const focused = document.activeElement
    if (focused instanceof HTMLElement && root?.contains(focused))
      focused.blur()
    app.enter(route)
    const currentAttempt = ++attempt
    queueMicrotask(() => {
      if (!alive || currentAttempt !== attempt) return
      const target =
        route.screen === 'records'
          ? returnFocus?.isConnected
            ? returnFocus
            : root?.querySelector<HTMLElement>('[data-record-action]')
          : root?.querySelector<HTMLElement>('[data-record-heading]')
      target?.focus({ preventScroll: true })
    })
  }
  function navigate(route: RecordRoute, trigger?: HTMLButtonElement) {
    if (!alive) return
    const url = recordUrl(window.location.href, route)
    if (url.href !== window.location.href)
      window.history.pushState(null, '', url)
    setNavigationBase(url.href)
    apply(route, trigger)
  }
  const viewRoute = (): RecordRoute => {
    const route = app.route()
    return route.screen === 'view' || route.screen === 'edit'
      ? { screen: 'view', id: route.id }
      : { screen: 'records' }
  }
  const routeHref = (route: RecordRoute) => {
    const url = recordUrl(navigationBase(), route)
    return url.pathname + url.search + url.hash
  }
  const follow =
    (route: RecordRoute): JSX.EventHandler<HTMLAnchorElement, MouseEvent> =>
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.currentTarget.hasAttribute('download') ||
        (event.currentTarget.target && event.currentTarget.target !== '_self')
      )
        return
      event.preventDefault()
      navigate(route)
    }
  onSettled(() => {
    setNavigationBase(window.location.href)
    const pop = () => {
      setNavigationBase(window.location.href)
      apply(recordRoute(window.location.href))
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  })
  const Actions = (cell: CustomCellProps<RecordValues, never>) => (
    <div class="record-row-actions">
      <Button
        data-record-action="view"
        aria-label={`View ${cell.row.original?.name}`}
        onClick={(event) =>
          navigate({ screen: 'view', id: cell.row.id }, event.currentTarget)
        }
      >
        View
      </Button>
      <Button
        data-record-action="edit"
        aria-label={`Edit ${cell.row.original?.name}`}
        onClick={(event) =>
          navigate({ screen: 'edit', id: cell.row.id }, event.currentTarget)
        }
      >
        Edit
      </Button>
    </div>
  )
  const Active = (cell: CustomCellProps<RecordValues, never>) => (
    <ValueDisplay value={cell.value} format="boolean-symbol" />
  )
  const resize = (column: NativeColumn<RecordValues, never>) => (
    <TableColumnResize
      label={
        app.tableDescription.columns[
          column.id as keyof typeof app.tableDescription.columns
        ]?.label ?? column.id
      }
      size={column.getSize()}
      min={40}
      max={4000}
      onSizeChange={column.setSize}
    />
  )
  const Workspace = () => (
    <div
      class="record-workflow"
      ref={(node) => {
        root = node
      }}
    >
      <section
        class="record-screen record-table-screen"
        hidden={app.route().screen !== 'records'}
        inert={app.route().screen !== 'records'}
        aria-label="Records table"
      >
        <TableView
          description={app.tableDescription}
          bindings={{
            table: app.table,
            width: app.table
              .getVisibleColumns()
              .reduce((sum, column) => sum + column.getSize(), 0),
            headerEnd: resize,
            cells: { actions: Actions, active: Active },
            controlsCollapsed: app.controlsCollapsed(),
            onControlsCollapsedChange: app.setControlsCollapsed,
          }}
        />
      </section>
      <Show when={app.route().screen !== 'records'}>
        <section class="record-screen" aria-label="Record screen">
          <Breadcrumbs aria-label="Record navigation">
            <Breadcrumbs.List>
              <Breadcrumbs.Item>
                <Breadcrumbs.Link
                  href={routeHref({ screen: 'records' })}
                  onClick={follow({ screen: 'records' })}
                  data-ui-text="system"
                >
                  Records
                </Breadcrumbs.Link>
              </Breadcrumbs.Item>
              <Breadcrumbs.Item>
                <Breadcrumbs.Separator />
                <Show
                  when={app.selected() && app.route().screen === 'edit'}
                  fallback={
                    <Breadcrumbs.Current>
                      {app.selected()?.name ?? 'Record not found'}
                    </Breadcrumbs.Current>
                  }
                >
                  <Breadcrumbs.Link
                    href={routeHref(viewRoute())}
                    onClick={follow(viewRoute())}
                  >
                    {app.selected()!.name}
                  </Breadcrumbs.Link>
                </Show>
              </Breadcrumbs.Item>
              <Show when={app.selected() && app.route().screen === 'edit'}>
                <Breadcrumbs.Item>
                  <Breadcrumbs.Separator />
                  <Breadcrumbs.Current data-ui-text="system">
                    Edit
                  </Breadcrumbs.Current>
                </Breadcrumbs.Item>
              </Show>
            </Breadcrumbs.List>
          </Breadcrumbs>
          <Show
            when={app.selected()}
            fallback={
              <h1 data-record-heading tabindex={-1} role="alert">
                Record not found
              </h1>
            }
          >
            <h1 data-record-heading tabindex={-1} data-ui-text="value">
              {app.selected()!.name}
            </h1>
            <Show when={app.route().screen === 'view'}>
              <dl class="record-details">
                <For
                  each={[
                    { label: 'Name', value: () => app.selected()!.name },
                    {
                      label: 'Category',
                      value: () =>
                        app.selected()!.category === 'a' ? 'Alpha' : 'Beta',
                    },
                    {
                      label: 'Quantity',
                      value: () => String(app.selected()!.quantity ?? ''),
                    },
                    {
                      label: 'Active',
                      value: () => (
                        <ValueDisplay
                          value={app.selected()!.active}
                          format="boolean-symbol"
                        />
                      ),
                    },
                    {
                      label: 'Alerts',
                      value: () => (
                        <ValueDisplay
                          value={app.selected()!.alerts}
                          format="boolean-symbol"
                        />
                      ),
                    },
                    { label: 'Notes', value: () => app.selected()!.notes },
                  ]}
                >
                  {(entry) => (
                    <div>
                      <dt data-ui-text="system">{entry.label}</dt>
                      <dd>{entry.value()}</dd>
                    </div>
                  )}
                </For>
              </dl>
              <Button
                onClick={() => {
                  const route = app.route()
                  if (route.screen === 'view')
                    navigate({ screen: 'edit', id: route.id })
                }}
              >
                Edit
              </Button>
            </Show>
            <For
              each={app.route().screen === 'edit' ? [app.route()] : []}
              keyed={(route) => (route.screen === 'edit' ? route.id : '')}
            >
              {() => (
                <>
                  <FormView
                    description={app.description}
                    bindings={{
                      form: app.form,
                      choices: {
                        category: () => [
                          { value: 'a' as const, label: 'Alpha' },
                          { value: 'b' as const, label: 'Beta' },
                        ],
                      },
                      actions: { reset: { run: () => app.form.reset() } },
                    }}
                  />
                  <Show when={app.form.phase === 'success'}>
                    <p role="status">Saved.</p>
                  </Show>
                  <Button onClick={() => navigate({ screen: 'records' })}>
                    Cancel
                  </Button>
                </>
              )}
            </For>
          </Show>
        </section>
      </Show>
    </div>
  )
  const layout = () =>
    ({
      id: 'records-workflow',
      title: 'Records',
      columns: 1,
      scroll: 'content',
      panels: [
        {
          id: 'records-panel',
          view: 'workspace',
          fill: true,
        },
      ],
    }) as const satisfies LayoutDescription<'workspace'>
  return (
    <LayoutView
      description={layout()}
      bindings={{ views: { workspace: Workspace } }}
    />
  )
}
