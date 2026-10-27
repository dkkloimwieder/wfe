import { ApplicationAccessViews } from './ApplicationAccessViews'
import { isApplicationAccessRoute } from './route'
import { InvitationView } from './InvitationView'
import { ProjectTables } from './ProjectTables'
import { CreateProjectView } from './CreateProjectView'
import { EnvironmentView } from './EnvironmentView'
import type { PlatformApplication } from './view-types'
import { AccessViews } from './AccessViews'
import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Breadcrumbs, Button, InlineAlert } from '@wfe/components'
import { DashboardShell } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { AppearanceReview } from '../shared/appearance/AppearanceReview'
import {
  accents,
  schemes,
  appearanceStyle,
  defaultLayers,
} from '../shared/appearance/appearance'
import type { SurfaceLayers, Depth } from '../shared/appearance/appearance'
import { createPlatformApplication } from './application'
import { platformRoute, platformScenario, platformUrl } from './route'
import type { PlatformRoute } from './route'
import projectMetadata from './snapshot/metadata/project/create.operation.json'
import './style.css'
import '../shared/appearance/style.css'

export function PlatformApp(props: {
  initialUrl: string
  ready?: (app: PlatformApplication) => void
}) {
  const initialUrl = untrack(() => props.initialUrl)
  const app = createPlatformApplication(
    platformRoute(initialUrl),
    platformScenario(initialUrl),
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
  const [scheme, setScheme] = createSignal(schemes[1]!)
  const [accent, setAccent] = createSignal(accents[1]!)
  const [depth, setDepth] = createSignal<Depth>(2)
  const [layers, setLayers] = createSignal<SurfaceLayers>({
    ...defaultLayers,
  })
  let root: HTMLDivElement | undefined,
    alive = true,
    focusSequence = 0
  const projectsRoute = () =>
    [
      'projects',
      'project',
      'environment',
      'members',
      'create',
      'app-users',
      'app-user',
      'app-roles',
      'app-role',
    ].includes(app.route().screen)
  const peopleRoute = () =>
    ['users', 'access', 'invite'].includes(app.route().screen)
  const title = () => {
    const route = app.route()
    if (isApplicationAccessRoute(route))
      return route.screen === 'app-users'
        ? 'Application users'
        : route.screen === 'app-user'
          ? 'Application role assignment'
          : route.screen === 'app-roles'
            ? 'Application roles'
            : `Permissions · ${route.role}`
    return route.screen === 'invite'
      ? 'Invite a user'
      : route.screen === 'projects'
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
  const routeRole = () => {
    const current = app.route()
    return current.screen === 'app-role' ? current.role : ''
  }
  const projectRoute = (): PlatformRoute => {
    const route = app.route()
    return 'project' in route
      ? { screen: 'project', project: route.project }
      : { screen: 'projects' }
  }
  const accessible = () =>
    !app.session().loading &&
    !app.session().error &&
    (app.authority()?.orgAdmin || Boolean(app.authority()?.projects.length))
  return (
    <DefaultAppearance
      class="platform-example"
      style={appearanceStyle(scheme(), accent(), depth(), layers())}
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
            ['access', 'invite'].includes(app.route().screen)
              ? 'content'
              : 'main'
          }
          style={{
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
                          ? ['access', 'invite'].includes(app.route().screen)
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
                          app.route().screen === 'members' ||
                          isApplicationAccessRoute(app.route())
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
                  <Show when={isApplicationAccessRoute(app.route())}>
                    <Breadcrumbs.Item>
                      <Breadcrumbs.Separator />
                      <Breadcrumbs.Link
                        href={href({
                          screen: 'environment',
                          project: routeProject(),
                          env: routeEnvironment(),
                        })}
                        onClick={follow({
                          screen: 'environment',
                          project: routeProject(),
                          env: routeEnvironment(),
                        })}
                      >
                        {routeEnvironment()}
                      </Breadcrumbs.Link>
                    </Breadcrumbs.Item>
                    <Breadcrumbs.Item>
                      <Breadcrumbs.Separator />
                      <Breadcrumbs.Current
                        data-ui-text={routeRole() ? undefined : 'system'}
                      >
                        <Show when={routeRole()} fallback={title()}>
                          <span data-ui-text="system">Permissions</span> ·{' '}
                          {routeRole()}
                        </Show>
                      </Breadcrumbs.Current>
                    </Breadcrumbs.Item>
                  </Show>
                  <Show
                    when={
                      app.route().screen === 'environment' ||
                      app.route().screen === 'create' ||
                      app.route().screen === 'members' ||
                      ['access', 'invite'].includes(app.route().screen)
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
                          : ['access', 'invite'].includes(app.route().screen)
                            ? app.route().screen === 'invite'
                              ? 'Invite a user'
                              : 'Manage access'
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
          <ProjectTables
            app={app}
            navigate={navigate}
            accessible={accessible()}
            routeProject={routeProject()}
          />
          <AccessViews app={app} navigate={navigate} />
          <ApplicationAccessViews app={app} navigate={navigate} />
          <InvitationView app={app} navigate={navigate} />
          <Show
            when={
              !app.session().loading && !app.session().error && accessible()
            }
          >
            <Show when={app.route().screen === 'create'}>
              <CreateProjectView app={app} href={href} follow={follow} />
            </Show>
            <Show when={app.route().screen === 'environment'}>
              <EnvironmentView
                app={app}
                navigate={navigate}
                title={title()}
                routeProject={routeProject()}
                routeEnvironment={routeEnvironment()}
              />
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
