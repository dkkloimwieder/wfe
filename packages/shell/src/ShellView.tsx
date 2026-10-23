import {
  createEffect,
  createMemo,
  createUniqueId,
  For,
  onCleanup,
  Show,
  untrack,
  type Component,
} from 'solid-js'
import { Dynamic } from '@solidjs/web'
import { Breadcrumbs, SelectField } from '@wfe/components'
import {
  DashboardShell,
  type DashboardNavigation,
} from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { createShellModel, requireValue } from './model'
import type {
  ShellDescription,
  ShellViewProps,
  ShellViewId,
  ShellPageProps,
} from './types'

/** A described navigation frame. Applications own accepted routes and addresses. */
export function ShellView<const D extends ShellDescription>(
  props: ShellViewProps<D>,
) {
  const model = createMemo(() => createShellModel(props.description))
  const identity = untrack(() => model().id)
  const header = createMemo(() => props.header)
  const titleId = `shell-heading-${createUniqueId()}`
  const domId = `shell-${createUniqueId()}`
  const state = createMemo(() => {
    const bindings = props.bindings
    requireValue(
      bindings !== null && typeof bindings === 'object',
      'invalid bindings',
    )
    for (const name of [
      'audience',
      'route',
      'href',
      'onAudienceChange',
      'onNavigate',
    ] as const)
      requireValue(
        typeof bindings[name] === 'function',
        `missing binding "${name}"`,
      )
    const m = model()
    requireValue(m.id === identity, 'remount the shell to replace its identity')
    const audience = m.audiences.get(bindings.audience())
    const route = m.routes.get(bindings.route())
    requireValue(audience !== undefined, 'unknown accepted audience')
    requireValue(route !== undefined, 'unknown accepted route')
    const views = bindings.views
    requireValue(
      views !== null && typeof views === 'object' && !Array.isArray(views),
      'invalid view bindings',
    )
    const components = new Map<string, Component<ShellPageProps<D>>>()
    const hrefs = new Map<string, string>()
    for (const entry of m.routes.values()) {
      if (!components.has(entry.view)) {
        const view = Object.hasOwn(views, entry.view)
          ? views[entry.view as ShellViewId<D>]
          : undefined
        requireValue(typeof view === 'function', `missing view "${entry.view}"`)
        components.set(entry.view, view)
      }
      const href = bindings.href(entry.id)
      requireValue(
        typeof href === 'string' && Boolean(href.trim()),
        `invalid href for "${entry.id}"`,
      )
      hrefs.set(entry.id, href)
    }
    return { audience, route, components, hrefs }
  })
  const pageId = createMemo<string>(() => state().route.id)
  const choices = createMemo(() =>
    [...model().audiences.values()].map((audience) => ({
      value: audience.id,
      label: audience.label,
    })),
  )
  const menuIds = createMemo(() =>
    [...model().routes.values()]
      .filter(
        (route) =>
          route.audience === undefined ||
          route.audience === state().audience.id,
      )
      .map((route) => route.id),
  )
  const pathIds = createMemo(() => {
    const ids: string[] = []
    let route: D['routes'][number] | undefined = state().route
    while (route) {
      ids.push(route.id)
      route =
        route.parent === undefined
          ? undefined
          : model().routes.get(route.parent)
    }
    return ids.reverse()
  })
  let heading: HTMLHeadingElement | undefined
  let closeNavigation: (() => void) | undefined
  let alive = true
  let focusAttempt = 0
  let previousRoute = untrack(() => state().route.id)
  createEffect(
    () => state().route.id,
    (route) => {
      if (route === previousRoute) return
      previousRoute = route
      focusRoute(route)
    },
  )
  createEffect(
    () => props.navigation === false,
    (removed) => {
      if (removed) closeNavigation?.()
    },
  )
  onCleanup(() => {
    alive = false
    focusAttempt++
    heading = undefined
    closeNavigation = undefined
  })
  function focusRoute(route: string) {
    // Close first so the shared drawer cannot restore focus over the new heading.
    closeNavigation?.()
    const attempt = ++focusAttempt
    queueMicrotask(() => {
      if (
        alive &&
        untrack(header) === undefined &&
        attempt === focusAttempt &&
        heading?.isConnected &&
        untrack(() => state().route.id) === route
      )
        heading.focus({ preventScroll: true })
    })
  }
  function navigate(event: MouseEvent, id: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    const route = untrack(() => model().routes.get(id))
    if (alive && route) {
      const previous = untrack(() => state().route.id)
      untrack(() => props.bindings.onNavigate(route.id))
      if (
        alive &&
        route.id === previous &&
        route.id === untrack(() => state().route.id)
      )
        focusRoute(route.id)
    }
  }
  function DefaultHeader() {
    let element: HTMLHeadingElement | undefined
    onCleanup(() => {
      if (heading === element) heading = undefined
      element = undefined
    })
    return (
      <>
        <Show when={props.description.title}>
          <span data-ui-text="system">{props.description.title}</span>
        </Show>
        <SelectField
          label={props.audienceLabel ?? 'Audience'}
          data-ui-text="system"
          choices={choices()}
          value={state().audience.id}
          onValueChange={(id) => {
            const audience = untrack(() => model().audiences.get(id))
            if (alive && audience)
              untrack(() => props.bindings.onAudienceChange(audience.id))
          }}
        />
        <Breadcrumbs aria-label="Breadcrumbs" data-ui-text="system">
          <Breadcrumbs.List>
            <For each={pathIds()}>
              {(id, index) => (
                <Breadcrumbs.Item>
                  <Show when={index() > 0}>
                    <Breadcrumbs.Separator />
                  </Show>
                  <Show
                    when={id === state().route.id}
                    fallback={
                      <Breadcrumbs.Link
                        href={state().hrefs.get(id)!}
                        ref={nativeEvents<HTMLAnchorElement>({
                          click: (event) => navigate(event, id),
                        })}
                      >
                        {model().routes.get(id)!.label}
                      </Breadcrumbs.Link>
                    }
                  >
                    <Breadcrumbs.Current>
                      {model().routes.get(id)!.label}
                    </Breadcrumbs.Current>
                  </Show>
                </Breadcrumbs.Item>
              )}
            </For>
          </Breadcrumbs.List>
        </Breadcrumbs>
        <h1
          id={titleId}
          data-ui-text="system"
          tabindex={-1}
          ref={(node) => {
            element = node
            heading = node
          }}
          style={{ margin: '0', font: 'inherit', 'font-weight': '600' }}
        >
          {state().route.label}
        </h1>
      </>
    )
  }
  function DefaultNavigation() {
    return (
      <div class="ui-dashboard-menu">
        <For each={menuIds()}>
          {(id) => (
            <a
              href={state().hrefs.get(id)!}
              aria-current={id === state().route.id ? 'page' : undefined}
              data-ui-text="system"
              ref={nativeEvents<HTMLAnchorElement>({
                click: (event) => navigate(event, id),
              })}
            >
              {model().routes.get(id)!.label}
            </a>
          )}
        </For>
      </div>
    )
  }
  function renderNavigation(controls: DashboardNavigation) {
    closeNavigation = controls.close
    return (
      <Show
        when={
          typeof props.navigation === 'function' ? props.navigation : undefined
        }
        fallback={<DefaultNavigation />}
      >
        {(render) => render()(controls)}
      </Show>
    )
  }
  return (
    <DashboardShell
      id={domId}
      class={props.class}
      style={props.style}
      density={props.density}
      theme={props.theme}
      scroll={props.scroll ?? 'content'}
      footer={props.footer}
      footerLabel={props.footerLabel}
      navigationLabel={props.navigationLabel}
      toggleLabel={props.toggleLabel}
      closeLabel={props.closeLabel}
      mainLabel={props.mainLabel ?? state().route.label}
      context={props.context}
      contextLabel={props.contextLabel}
      contextToggleLabel={props.contextToggleLabel}
      contextCloseLabel={props.contextCloseLabel}
      header={
        <Show when={header() === undefined} fallback={header()}>
          <DefaultHeader />
        </Show>
      }
      navigation={props.navigation === false ? undefined : renderNavigation}
    >
      <Show when={pageId()} keyed>
        {(id) => (
          <Dynamic
            component={state().components.get(model().routes.get(id)!.view)!}
            route={state().route}
            audience={state().audience}
          />
        )}
      </Show>
    </DashboardShell>
  )
}
