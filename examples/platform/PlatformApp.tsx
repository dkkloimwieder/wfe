import { exampleSizing } from '../shared/appearance/sizing'
import { createPlatformTableSelection } from './table-selection'
import { AccessViews } from './AccessViews'
import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import {
  Breadcrumbs,
  Button,
  IconButton,
  Icon,
  InlineAlert,
  ValueDisplay,
} from '@wfe/components'
import { DashboardShell, DashboardPanel } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { TableColumnResize } from '@wfe/components/table'
import type {
  TableFilterCriteria,
  NativeTable,
  NativeColumn,
} from '@wfe/components/table'
import { FormView, TableView } from '@wfe/generator'
import type {
  CustomCellProps,
  FormDescription,
  TableDescription,
} from '@wfe/generator'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { AppearanceReview } from '../shared/appearance/AppearanceReview'
import {
  accents,
  schemes,
  appearanceStyle,
} from '../shared/appearance/appearance'
import type { SurfaceLayers, Depth } from '../shared/appearance/appearance'
import { createPlatformApplication } from './application'
import type { NameRow } from './application'
import type { ProjectValues } from './provider'
import { platformRoute, platformScenario, platformUrl } from './route'
import type { PlatformRoute } from './route'
import projectMetadata from './snapshot/metadata/project/create.operation.json'
import './style.css'
import '../shared/appearance/style.css'

type Application = ReturnType<typeof createPlatformApplication>
export function PlatformApp(props: {
  initialUrl: string
  ready?: (app: Application) => void
}) {
  const initialUrl = untrack(() => props.initialUrl)
  const app = createPlatformApplication(
    platformRoute(initialUrl),
    platformScenario(initialUrl),
  )
  const projectsSelection = createPlatformTableSelection(app.projectsTable)
  const environmentsSelection = createPlatformTableSelection(
    app.environmentsTable,
  )
  props.ready?.(app)
  const [base, setBase] = createSignal(
    untrack(() => {
      const url = new URL(initialUrl, 'http://platform.example')
      url.hash = ''
      return url.href
    }),
  )
  const [appearance, setAppearance] = createSignal(false)
  const [projectsCollapsed, setProjectsCollapsed] = createSignal(true)
  const [environmentsCollapsed, setEnvironmentsCollapsed] = createSignal(true)
  const [scheme, setScheme] = createSignal(schemes[1]!)
  const [accent, setAccent] = createSignal(accents[1]!)
  const [depth, setDepth] = createSignal<Depth>(2)
  const [layers, setLayers] = createSignal<SurfaceLayers>({
    canvas: 1,
    pane: 0,
    content: 0,
  })
  let root: HTMLDivElement | undefined,
    alive = true,
    focusSequence = 0
  const projectsRoute = () =>
    ['projects', 'project', 'environment', 'members', 'create'].includes(
      app.route().screen,
    )
  const peopleRoute = () =>
    app.route().screen === 'users' || app.route().screen === 'access'
  const title = () => {
    const route = app.route()
    return route.screen === 'projects'
      ? 'Projects'
      : route.screen === 'users'
        ? 'Users'
        : route.screen === 'members'
          ? `Members · ${route.project}`
          : route.screen === 'access'
            ? 'Manage access'
            : route.screen === 'create'
              ? projectMetadata.label
              : route.screen === 'project'
                ? route.project
                : route.screen === 'environment'
                  ? `${route.project} / ${route.env}`
                  : 'Page not found'
  }
  const href = (route: PlatformRoute) => {
    const url = platformUrl(base(), route)
    return url.pathname + url.search + url.hash
  }
  function focusHeading() {
    const attempt = ++focusSequence
    queueMicrotask(() => {
      if (alive && attempt === focusSequence)
        root
          ?.querySelector<HTMLElement>('[data-platform-heading]')
          ?.focus({ preventScroll: true })
    })
  }
  function navigate(route: PlatformRoute) {
    if (!alive) return
    const url = platformUrl(window.location.href, route)
    if (url.href !== window.location.href)
      window.history.pushState(null, '', url)
    setBase(url.href)
    app.enter(route)
    focusHeading()
  }
  const follow =
    (
      route: PlatformRoute,
      close?: () => void,
    ): ((event: MouseEvent & { currentTarget: HTMLAnchorElement }) => void) =>
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.currentTarget.hasAttribute('download') ||
        (event.currentTarget.target && event.currentTarget.target !== '_self')
      )
        return
      event.preventDefault()
      navigate(route)
      close?.()
      focusHeading()
    }
  onSettled(() => {
    setBase(window.location.href)
    void app.initialize()
    const pop = () => {
      setBase(window.location.href)
      app.enter(platformRoute(window.location.href))
      focusHeading()
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  })
  const oldTitle = untrack(() =>
    typeof document === 'undefined' ? '' : document.title,
  )
  createEffect(title, (value) => {
    if (typeof document !== 'undefined')
      document.title = `${value} · WAMN platform example`
  })
  onCleanup(() => {
    alive = false
    focusSequence++
    root = undefined
    if (typeof document !== 'undefined') document.title = oldTitle
  })
  const routeProject = () => {
    const current = app.route()
    return 'project' in current ? current.project : ''
  }
  const routeEnvironment = () => {
    const current = app.route()
    return 'env' in current ? current.env : ''
  }
  const projectHeader = (column: NativeColumn<NameRow, unknown>) => (
    <TableColumnResize
      size={column.getSize()}
      min={40}
      max={4000}
      onSizeChange={column.setSize}
      label={column.id === 'name' ? 'Project' : 'Actions'}
    />
  )
  const environmentHeader = (column: NativeColumn<NameRow, unknown>) => (
    <TableColumnResize
      size={column.getSize()}
      min={40}
      max={4000}
      onSizeChange={column.setSize}
      label={column.id === 'name' ? 'Environment' : 'Actions'}
    />
  )
  const projectRoute = (): PlatformRoute => {
    const route = app.route()
    return 'project' in route
      ? { screen: 'project', project: route.project }
      : { screen: 'projects' }
  }
  const ProjectAction = (props: CustomCellProps<NameRow, unknown>) => {
    const target = (): PlatformRoute => ({
      screen: 'project',
      project: props.row.id,
    })
    return (
      <div class="platform-inline-actions">
        <IconButton
          aria-label={`Open project ${props.row.id}`}
          title={`Open project ${props.row.id}`}
          onClick={() => navigate(target())}
        >
          <Icon name="view" />
        </IconButton>
        <IconButton
          aria-label={`View members of ${props.row.id}`}
          title={`View members of ${props.row.id}`}
          onClick={() => navigate({ screen: 'members', project: props.row.id })}
        >
          <Icon name="people" />
        </IconButton>
      </div>
    )
  }
  const EnvironmentAction = (props: CustomCellProps<NameRow, unknown>) => {
    const target = (): PlatformRoute => {
      const route = app.route()
      return 'project' in route
        ? { screen: 'environment', project: route.project, env: props.row.id }
        : { screen: 'projects' }
    }
    return (
      <IconButton
        aria-label={`View environment ${props.row.id}`}
        title={`View environment ${props.row.id}`}
        onClick={() => navigate(target())}
      >
        <Icon name="view" />
      </IconButton>
    )
  }
  const controls = {
    filtering: false,
    grouping: false,
    columnReordering: false,
  } as const
  const projectDescription = {
    id: 'platform-projects',
    title: 'Projects',
    columns: {
      name: { label: 'Project' },
      actions: { label: 'Actions', renderer: 'openProject' },
    },
    controls,
    actions: [{ id: 'create', label: 'Create a project' }],
  } as const satisfies TableDescription
  const environmentDescription = () =>
    ({
      id: 'platform-environments',
      title: `Environments · ${routeProject()}`,
      columns: {
        name: { label: 'Environment' },
        actions: { label: 'Actions', renderer: 'openEnvironment' },
      },
      controls,
      actions: [{ id: 'members', label: 'Members' }],
    }) as const satisfies TableDescription
  const formDescription = {
    id: 'platform-create-project',
    fields: [
      {
        field: 'project',
        label: 'Project',
        control: 'text',
        required: true,
        help: 'Use 1 to 40 UTF-8 bytes. Surrounding whitespace is removed by the server.',
      },
    ],
    submit: { id: 'create', label: projectMetadata.label },
  } as const satisfies FormDescription<ProjectValues>
  const apply = (
    table: NativeTable<NameRow, unknown>,
    criteria: TableFilterCriteria,
  ) => {
    table.setGlobalFilter(criteria.globalFilter)
    table.setColumnFilters(criteria.columnFilters)
    void app.refresh()
  }
  const accessible = () =>
    !app.session().loading &&
    !app.session().error &&
    (app.authority()?.orgAdmin || Boolean(app.authority()?.projects.length))
  return (
    <DefaultAppearance
      class="platform-example"
      style={{
        ...appearanceStyle(scheme(), accent(), depth(), layers()),
        '--ui-text': 'var(--ui-muted-text)',
      }}
    >
      <div
        class="platform-root"
        ref={(node) => {
          root = node
        }}
      >
        <DashboardShell
          scroll={
            app.route().screen === 'projects' ||
            app.route().screen === 'project' ||
            app.route().screen === 'users' ||
            app.route().screen === 'members' ||
            app.route().screen === 'create' ||
            app.route().screen === 'access'
              ? 'content'
              : 'main'
          }
          style={{
            ...exampleSizing,
            '--ui-navigation-width': '11rem',
            '--ui-context-width': '13rem',
          }}
          footer={null}
          footerLabel="Organization footer"
          contextLabel={
            routeProject() ? 'Project navigation' : 'Projects navigation'
          }
          contextToggleLabel="Context menu"
          context={
            projectsRoute() && accessible()
              ? (context) => (
                  <div class="ui-dashboard-menu">
                    <h2 data-ui-text="system">
                      {routeProject() || 'Projects'}
                    </h2>
                    <Show
                      when={routeProject()}
                      fallback={
                        <>
                          <a
                            href={href({ screen: 'projects' })}
                            data-ui-text="system"
                            aria-current={
                              app.route().screen === 'projects'
                                ? 'page'
                                : undefined
                            }
                            ref={nativeEvents<HTMLAnchorElement>({
                              click: follow(
                                { screen: 'projects' },
                                context.close,
                              ),
                            })}
                          >
                            All projects
                          </a>
                          <Show when={app.authority()?.orgAdmin}>
                            <a
                              href={href({ screen: 'create' })}
                              data-ui-text="system"
                              aria-current={
                                app.route().screen === 'create'
                                  ? 'page'
                                  : undefined
                              }
                              ref={nativeEvents<HTMLAnchorElement>({
                                click: follow(
                                  { screen: 'create' },
                                  context.close,
                                ),
                              })}
                            >
                              Create a project
                            </a>
                          </Show>
                        </>
                      }
                    >
                      <a
                        href={href(projectRoute())}
                        data-ui-text="system"
                        aria-current={
                          app.route().screen === 'project' ? 'page' : undefined
                        }
                        ref={nativeEvents<HTMLAnchorElement>({
                          click: follow(projectRoute(), context.close),
                        })}
                      >
                        Environments
                      </a>
                      <Show
                        when={app.access.allowed('project', routeProject())}
                      >
                        <a
                          href={href({
                            screen: 'members',
                            project: routeProject(),
                          })}
                          data-ui-text="system"
                          aria-current={
                            app.route().screen === 'members'
                              ? 'page'
                              : undefined
                          }
                          ref={nativeEvents<HTMLAnchorElement>({
                            click: follow(
                              { screen: 'members', project: routeProject() },
                              context.close,
                            ),
                          })}
                        >
                          Members
                        </a>
                      </Show>
                    </Show>
                  </div>
                )
              : undefined
          }
          mainLabel="Platform workspace"
          navigationLabel="Platform navigation"
          toggleLabel="Navigation"
          header={
            <>
              <Breadcrumbs aria-label="Platform location">
                <Breadcrumbs.List>
                  <Breadcrumbs.Item>
                    <Breadcrumbs.Link
                      href={href({ screen: 'projects' })}
                      onClick={follow({ screen: 'projects' })}
                      data-ui-text="system"
                    >
                      acme
                    </Breadcrumbs.Link>
                  </Breadcrumbs.Item>
                  <Breadcrumbs.Item>
                    <Breadcrumbs.Separator />
                    <Show
                      when={
                        peopleRoute()
                          ? app.route().screen === 'access'
                          : app.route().screen !== 'projects'
                      }
                      fallback={
                        <Breadcrumbs.Current data-ui-text="system">
                          {peopleRoute() ? 'Users' : 'Projects'}
                        </Breadcrumbs.Current>
                      }
                    >
                      <Breadcrumbs.Link
                        href={href(
                          peopleRoute()
                            ? { screen: 'users' }
                            : { screen: 'projects' },
                        )}
                        onClick={follow(
                          peopleRoute()
                            ? { screen: 'users' }
                            : { screen: 'projects' },
                        )}
                        data-ui-text="system"
                      >
                        {peopleRoute() ? 'Users' : 'Projects'}
                      </Breadcrumbs.Link>
                    </Show>
                  </Breadcrumbs.Item>
                  <Show when={'project' in app.route()}>
                    <Breadcrumbs.Item>
                      <Breadcrumbs.Separator />
                      <Show
                        when={
                          app.route().screen === 'environment' ||
                          app.route().screen === 'members'
                        }
                        fallback={
                          <Breadcrumbs.Current>
                            {routeProject()}
                          </Breadcrumbs.Current>
                        }
                      >
                        <Breadcrumbs.Link
                          href={href(projectRoute())}
                          onClick={follow(projectRoute())}
                        >
                          {routeProject()}
                        </Breadcrumbs.Link>
                      </Show>
                    </Breadcrumbs.Item>
                  </Show>
                  <Show
                    when={
                      app.route().screen === 'environment' ||
                      app.route().screen === 'create' ||
                      app.route().screen === 'members' ||
                      app.route().screen === 'access'
                    }
                  >
                    <Breadcrumbs.Item>
                      <Breadcrumbs.Separator />
                      <Breadcrumbs.Current
                        data-ui-text={
                          app.route().screen === 'environment'
                            ? undefined
                            : 'system'
                        }
                      >
                        {app.route().screen === 'members'
                          ? 'Members'
                          : app.route().screen === 'access'
                            ? 'Manage access'
                            : app.route().screen === 'create'
                              ? 'Create a project'
                              : app.route().screen === 'environment'
                                ? routeEnvironment()
                                : ''}
                      </Breadcrumbs.Current>
                    </Breadcrumbs.Item>
                  </Show>
                </Breadcrumbs.List>
              </Breadcrumbs>
              <div class="ui-dashboard-header-actions">
                <Button
                  aria-expanded={appearance() ? 'true' : 'false'}
                  aria-controls="platform-appearance"
                  onClick={() => setAppearance(!appearance())}
                >
                  Appearance
                </Button>
              </div>
            </>
          }
          navigation={(navigation) => (
            <div class="ui-dashboard-menu">
              <a
                href={href({ screen: 'projects' })}
                aria-current={projectsRoute() ? 'page' : undefined}
                ref={nativeEvents<HTMLAnchorElement>({
                  click: follow({ screen: 'projects' }, navigation.close),
                })}
                data-ui-text="system"
              >
                Projects
              </a>
              <Show when={accessible()}>
                <a
                  href={href({ screen: 'users' })}
                  aria-current={peopleRoute() ? 'page' : undefined}
                  ref={nativeEvents<HTMLAnchorElement>({
                    click: follow({ screen: 'users' }, navigation.close),
                  })}
                  data-ui-text="system"
                >
                  Users
                </a>
              </Show>
            </div>
          )}
        >
          <Show when={appearance()}>
            <section id="platform-appearance" class="platform-appearance">
              <AppearanceReview
                scheme={scheme()}
                accent={accent()}
                depth={depth()}
                layers={layers()}
                onSchemeChange={setScheme}
                onAccentChange={setAccent}
                onDepthChange={setDepth}
                onLayersChange={setLayers}
              />
            </section>
          </Show>
          <h1 data-platform-heading tabindex={-1} class="platform-sr-only">
            {title()}
          </h1>
          <Show when={app.session().loading}>
            <p role="status" data-ui-text="system">
              Loading platform scope
            </p>
          </Show>
          <Show when={app.session().error}>
            <InlineAlert announce="assertive" tone="error">
              {app.session().error}
              <Button onClick={() => void app.initialize()}>Retry</Button>
            </InlineAlert>
          </Show>
          <Show when={app.notice()}>
            <InlineAlert announce="polite">{app.notice()}</InlineAlert>
          </Show>
          <Show
            when={
              !app.session().loading && !app.session().error && !accessible()
            }
          >
            <p role="status">No access has been granted.</p>
          </Show>
          <div
            class="platform-table-screen"
            hidden={app.route().screen !== 'projects' || !accessible()}
          >
            <TableView
              description={projectDescription}
              bindings={{
                table: app.projectsTable,
                selection: projectsSelection,
                width: app.projectsTable
                  .getVisibleColumns()
                  .reduce((sum, column) => sum + column.getSize(), 0),
                cells: { openProject: ProjectAction },
                status: app.listing,
                controlsCollapsed: projectsCollapsed(),
                onControlsCollapsedChange: setProjectsCollapsed,
                actions: {
                  create: {
                    run: () => navigate({ screen: 'create' }),
                    disabled: () => !app.authority()?.orgAdmin,
                  },
                },
                headerEnd: projectHeader,
                onApplyFilters: (criteria) =>
                  apply(app.projectsTable, criteria),
              }}
            />
            <Show
              when={
                !app.listing().loading &&
                !app.listing().error &&
                app.projects().length === 0
              }
            >
              <p role="status">No projects exist in this organization.</p>
            </Show>
          </div>
          <div
            class="platform-table-screen"
            hidden={app.route().screen !== 'project' || !accessible()}
          >
            <TableView
              description={environmentDescription()}
              bindings={{
                table: app.environmentsTable,
                selection: environmentsSelection,
                width: app.environmentsTable
                  .getVisibleColumns()
                  .reduce((sum, column) => sum + column.getSize(), 0),
                cells: { openEnvironment: EnvironmentAction },
                actions: {
                  members: {
                    run: () =>
                      navigate({ screen: 'members', project: routeProject() }),
                  },
                },
                status: app.detail,
                controlsCollapsed: environmentsCollapsed(),
                onControlsCollapsedChange: setEnvironmentsCollapsed,
                headerEnd: environmentHeader,
                onApplyFilters: (criteria) =>
                  apply(app.environmentsTable, criteria),
              }}
            />
            <Show
              when={
                !app.detail().loading &&
                !app.detail().error &&
                app.environments().length === 0
              }
            >
              <p role="status">No environments exist in this project.</p>
            </Show>
          </div>
          <AccessViews app={app} navigate={navigate} />
          <Show
            when={
              !app.session().loading && !app.session().error && accessible()
            }
          >
            <Show when={app.route().screen === 'create'}>
              <DashboardPanel fill class="platform-details platform-form-page">
                <h2 data-ui-text="system">{projectMetadata.label}</h2>
                <Show
                  when={app.authority()?.orgAdmin}
                  fallback={
                    <InlineAlert announce="assertive" tone="error">
                      Access was refused for this operation.
                    </InlineAlert>
                  }
                >
                  <Show
                    when={!app.created()}
                    fallback={
                      <>
                        <p role="status">Project created: {app.created()}</p>
                        <a
                          data-ui-text="system"
                          href={href({
                            screen: 'project',
                            project: app.created(),
                          })}
                          onClick={follow({
                            screen: 'project',
                            project: app.created(),
                          })}
                        >
                          Open project
                        </a>
                      </>
                    }
                  >
                    <FormView
                      description={formDescription}
                      bindings={{ form: app.form }}
                    />
                  </Show>
                </Show>
                <a
                  data-ui-text="system"
                  href={href({ screen: 'projects' })}
                  onClick={follow({ screen: 'projects' })}
                >
                  {app.form.pending ? 'Stop waiting' : 'Back to projects'}
                </a>
              </DashboardPanel>
            </Show>
            <Show when={app.route().screen === 'environment'}>
              <DashboardPanel class="platform-details">
                <h2>{title()}</h2>
                <Button onClick={() => void app.refresh()}>
                  Refresh environment
                </Button>
                <Show when={app.detail().loading}>
                  <p role="status" data-ui-text="system">
                    Loading environment status
                  </p>
                </Show>
                <Show when={app.detail().error}>
                  <InlineAlert announce="assertive" tone="error">
                    {app.detail().error}
                  </InlineAlert>
                </Show>
                <Show when={app.status()}>
                  {(status) => (
                    <>
                      <dl class="platform-values">
                        <div>
                          <dt data-ui-text="system">Release digest</dt>
                          <dd>{status().digest ?? 'Unavailable'}</dd>
                        </div>
                        <For
                          each={[
                            {
                              label: 'Replicas',
                              value: status().rollout.replicas,
                            },
                            {
                              label: 'Updated replicas',
                              value: status().rollout.updatedReplicas,
                            },
                            {
                              label: 'Ready replicas',
                              value: status().rollout.readyReplicas,
                            },
                            {
                              label: 'Available replicas',
                              value: status().rollout.availableReplicas,
                            },
                          ]}
                        >
                          {(entry) => (
                            <div>
                              <dt data-ui-text="system">{entry.label}</dt>
                              <dd>
                                <ValueDisplay
                                  value={entry.value}
                                  format="number-grouped"
                                />
                              </dd>
                            </div>
                          )}
                        </For>
                      </dl>
                      <h3 data-ui-text="system">Workloads</h3>
                      <Show
                        when={status().workloads.length}
                        fallback={<p>No workloads were reported.</p>}
                      >
                        <For each={status().workloads}>
                          {(workload) => (
                            <section>
                              <h4>{workload.name}</h4>
                              <dl class="platform-values">
                                <For each={workload.conditions}>
                                  {(condition) => (
                                    <div>
                                      <dt>{condition.type}</dt>
                                      <dd>{condition.status}</dd>
                                    </div>
                                  )}
                                </For>
                              </dl>
                            </section>
                          )}
                        </For>
                      </Show>
                      <h3 data-ui-text="system">Live releases</h3>
                      <Show
                        when={status().live.length}
                        fallback={<p>No live releases were reported.</p>}
                      >
                        <For each={status().live}>
                          {(release) => (
                            <dl class="platform-values">
                              <div>
                                <dt data-ui-text="system">Digest</dt>
                                <dd>{release.digest}</dd>
                              </div>
                              <div>
                                <dt data-ui-text="system">Pods</dt>
                                <dd>
                                  <ValueDisplay
                                    value={release.pods}
                                    format="number-grouped"
                                  />
                                </dd>
                              </div>
                            </dl>
                          )}
                        </For>
                      </Show>
                    </>
                  )}
                </Show>
              </DashboardPanel>
            </Show>
            <Show when={app.route().screen === 'missing'}>
              <InlineAlert announce="assertive" tone="error">
                Page not found.
              </InlineAlert>
            </Show>
          </Show>
        </DashboardShell>
      </div>
    </DefaultAppearance>
  )
}
