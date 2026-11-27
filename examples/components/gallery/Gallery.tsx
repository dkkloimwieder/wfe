import { GalleryExample } from './Preview'
import { UserViewSettings } from './BlocksUserState'
import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Breadcrumbs, Button, Icon, InlineAlert } from '@wfe/components'
import { DashboardShell, SidebarGroup } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { DefaultAppearance } from '../../shared/appearance/DefaultAppearance'
import { AppearanceReview } from '../../shared/appearance/AppearanceReview'
import { DemoThemePicker } from '../../shared/settings/DemoThemePicker'
import { useGalleryAppearance } from './galleryAppearance'
import { schemeIndex } from '../../shared/settings/demoAppearance'
import {
  schemes,
  schemeMode,
  primaryColors,
  accentColors,
} from '../../shared/appearance/appearance'
import { entries, entryFor, galleryUrl, galleryThemeOptions } from './catalog'
import type { GalleryRoute } from './catalog'
import '../../shared/appearance/style.css'

export function Gallery() {
  return (
    <UserViewSettings>
      <GalleryContent />
    </UserViewSettings>
  )
}

function GalleryContent() {
  const appearance = useGalleryAppearance()
  const { route } = appearance
  const [collapsed, setCollapsed] = createSignal(false)
  const [sidebarBehavior, setSidebarBehavior] = createSignal<
    'flyout' | 'expand'
  >('flyout')
  const [appearanceOpen, setAppearanceOpen] = createSignal(false)
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({
    // Open the initial group. Later navigation reveals groups explicitly.
    [entryFor(untrack(route).id).group]: true,
  })
  function reveal(id: GalleryRoute['id']) {
    setOpenGroups((groups) => ({ ...groups, [entryFor(id).group]: true }))
  }
  let heading: HTMLHeadingElement | undefined
  let alive = true
  let focusAttempt = 0
  let focusFrame: number | undefined
  const entry = () => entryFor(route().id)
  const oldTitle = document.title
  createEffect(
    () => entry().label,
    (label) => {
      document.title = `${label} · Component gallery`
    },
  )
  const routeUrl = (next: GalleryRoute) => {
    const { preset, scheme } = appearance.overrides()
    return galleryUrl(appearance.url(), next, {
      preset,
      scheme: scheme === undefined ? undefined : schemeIndex[scheme],
    })
  }
  const directHref = () => {
    const current = route()
    const url = galleryUrl(appearance.url(), current, current)
    return url.pathname + url.search
  }
  const href = (next: GalleryRoute) => {
    const url = routeUrl(next)
    return url.pathname + url.search
  }
  function focusTitle() {
    const attempt = ++focusAttempt
    const origin = document.activeElement
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
    // Let the replacement page lay out before checking focusability.
    focusFrame = requestAnimationFrame(() => {
      focusFrame = requestAnimationFrame(() => {
        focusFrame = undefined
        if (
          alive &&
          attempt === focusAttempt &&
          (document.activeElement === origin ||
            document.activeElement === document.body)
        )
          heading?.focus({ preventScroll: true })
      })
    })
  }
  function change(next: Partial<GalleryRoute>, commit = true) {
    if (!alive) return
    const current = route()
    const candidate = { ...current, ...next }
    const url = routeUrl(candidate)
    if (commit && url.href !== window.location.href)
      window.history.pushState(null, '', url)
    appearance.setUrl(url)
    if (candidate.id !== current.id) {
      reveal(candidate.id)
      focusTitle()
    }
  }
  onSettled(() => {
    const pop = () => {
      const previous = route().id
      const url = new URL(window.location.href)
      const next = entryFor(
        url.searchParams.get('gallery') ??
          url.searchParams.get('galleryPreview'),
      ).id
      appearance.setUrl(url)
      if (next !== previous) {
        reveal(next)
        focusTitle()
      }
    }
    window.addEventListener('popstate', pop)
    return () => {
      window.removeEventListener('popstate', pop)
    }
  })
  onCleanup(() => {
    document.title = oldTitle
    alive = false
    heading = undefined
    focusAttempt++
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
  })
  return (
    <DefaultAppearance
      class="gallery-shell"
      options={galleryThemeOptions(route())}
      preset={route().preset}
      mode={appearance.mode()}
    >
      <DashboardShell
        class="gallery-dashboard"
        scroll="content"
        mainLabel="Component review"
        toggleLabel="Components"
        closeLabel="Close components"
        navigationLabel="Component catalog"
        navigationCollapsed={collapsed()}
        onNavigationCollapsedChange={setCollapsed}
        header={
          <>
            <Breadcrumbs aria-label="Gallery location">
              <Breadcrumbs.List>
                <Breadcrumbs.Item>
                  <span data-ui-text="system">Gallery</span>
                </Breadcrumbs.Item>
                <Breadcrumbs.Item>
                  <Breadcrumbs.Separator />
                  <span data-ui-text="system">{entry().group}</span>
                </Breadcrumbs.Item>
                <Breadcrumbs.Item>
                  <Breadcrumbs.Separator />
                  <h1
                    ref={(node) => {
                      heading = node
                    }}
                    tabindex={-1}
                  >
                    <Breadcrumbs.Current data-ui-text="system">
                      {entry().label}
                    </Breadcrumbs.Current>
                  </h1>
                </Breadcrumbs.Item>
              </Breadcrumbs.List>
            </Breadcrumbs>
            <Button
              aria-expanded={appearanceOpen() ? 'true' : 'false'}
              aria-controls="gallery-appearance"
              onClick={() => setAppearanceOpen(!appearanceOpen())}
            >
              Appearance
            </Button>
          </>
        }
        footer={null}
        navigation={(controls) => (
          <>
            <For
              each={
                [
                  'Blocks',
                  'Forms',
                  'Tables',
                  'Components',
                  'Charts',
                  'Diagrams',
                  'Navigation',
                  'Layout',
                ] as const
              }
            >
              {(group) => (
                <SidebarGroup
                  label={group}
                  icon={
                    <Icon
                      name={
                        (
                          {
                            Blocks: 'layout',
                            Forms: 'form',
                            Tables: 'grid',
                            Components: 'grid',
                            Charts: 'grid',
                            Diagrams: 'grid',
                            Navigation: 'navigation',
                            Layout: 'layout',
                          } as const
                        )[group]
                      }
                    />
                  }
                  active={entry().group === group}
                  compact={controls.compact()}
                  behavior={sidebarBehavior()}
                  onExpand={() => setCollapsed(false)}
                  open={Boolean(openGroups()[group])}
                  onOpenChange={(open) =>
                    setOpenGroups((groups) => ({ ...groups, [group]: open }))
                  }
                >
                  {(close) => (
                    <For
                      each={entries.filter((entry) => entry.group === group)}
                    >
                      {(item) => (
                        <a
                          href={href({
                            ...route(),
                            id: item.id,
                            state: 'normal',
                          })}
                          aria-current={
                            route().id === item.id ? 'page' : undefined
                          }
                          data-ui-text="system"
                          ref={nativeEvents<HTMLAnchorElement>({
                            click: (event) => {
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
                              change({ id: item.id, state: 'normal' })
                              close()
                              controls.close()
                              focusTitle()
                            },
                          })}
                        >
                          {item.label}
                        </a>
                      )}
                    </For>
                  )}
                </SidebarGroup>
              )}
            </For>
          </>
        )}
      >
        <Show when={appearanceOpen()}>
          <section id="gallery-appearance" class="gallery-appearance">
            <DemoThemePicker
              value={route().preset}
              onChange={(value) => void appearance.setPreset(value)}
            />
            <Show when={appearance.failure()}>
              <InlineAlert announce="assertive" tone="error">
                {appearance.failure()}
              </InlineAlert>
            </Show>
            <div
              class="appearance-options gallery-sidebar-options"
              role="group"
              aria-label="Icon sidebar behavior"
            >
              <span data-ui-text="system">Icon sidebar</span>
              <For each={['flyout', 'expand'] as const}>
                {(behavior) => (
                  <Button
                    aria-pressed={
                      sidebarBehavior() === behavior ? 'true' : 'false'
                    }
                    onClick={() => {
                      setSidebarBehavior(behavior)
                      setCollapsed(true)
                    }}
                  >
                    {behavior === 'flyout'
                      ? 'Open beside icons'
                      : 'Expand sidebar'}
                  </Button>
                )}
              </For>
            </div>
            <AppearanceReview
              themeOptions={{
                ...galleryThemeOptions(route()),
                preset: route().preset,
                mode: appearance.mode(),
              }}
              showDecorationControls={route().preset === 'default'}
              decorations={route().decorations}
              onDecorationsChange={(decorations, commit) =>
                change({ decorations }, commit)
              }
              scheme={schemes[route().scheme]!}
              primary={primaryColors[route().primary]!}
              accent={accentColors[route().accent]}
              layers={route().layers}
              systemScheme={appearance.choice() === 'system'}
              onSystemScheme={() => void appearance.setChoice('system')}
              onSchemeChange={(value) =>
                void appearance.setChoice(schemeMode(value))
              }
              onPrimaryChange={(value) =>
                change({ primary: primaryColors.indexOf(value) })
              }
              onAccentChange={(value) =>
                change({ accent: accentColors.indexOf(value) })
              }
              onLayersChange={(layers) => change({ layers })}
            />
          </section>
        </Show>
        <div class="gallery-toolbar">
          <Show when={entry().states.length > 1}>
            <div role="group" aria-label="Example state">
              <For each={entry().states}>
                {(state) => (
                  <Button
                    aria-pressed={route().state === state ? 'true' : 'false'}
                    onClick={() => change({ state })}
                  >
                    {state}
                  </Button>
                )}
              </For>
            </div>
          </Show>
          <div role="group" aria-label="Preview width">
            <For each={['full', 'tablet', 'phone'] as const}>
              {(viewport) => (
                <Button
                  aria-pressed={
                    route().viewport === viewport ? 'true' : 'false'
                  }
                  onClick={() => change({ viewport })}
                >
                  {viewport === 'full'
                    ? 'Full width'
                    : viewport === 'tablet'
                      ? '768px panel'
                      : '320px panel'}
                </Button>
              )}
            </For>
          </div>
          <a href={directHref()} data-ui-text="system">
            Direct link
          </a>
        </div>
        <section
          class="gallery-stage"
          data-example={route().id}
          aria-label="Preview viewport"
          tabindex={0}
        >
          <Show when={route().id} keyed>
            {(id) => (
              <div
                class="gallery-example-host"
                data-viewport={route().viewport}
                aria-label={`${entryFor(id).label} preview`}
              >
                <GalleryExample
                  id={id}
                  state={route().state}
                  appearance={appearance}
                  onNavigate={(id) => change({ id, state: 'normal' })}
                />
              </div>
            )}
          </Show>
        </section>
      </DashboardShell>
    </DefaultAppearance>
  )
}
