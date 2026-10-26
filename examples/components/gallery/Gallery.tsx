import { GalleryExample } from './Preview'
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
  Field,
  Icon,
  Label,
  SelectField,
} from '@wfe/components'
import { DashboardShell, SidebarGroup } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { DefaultAppearance } from '../../shared/appearance/DefaultAppearance'
import { AppearanceReview } from '../../shared/appearance/AppearanceReview'
import {
  appearanceStyle,
  schemes,
  accents,
} from '../../shared/appearance/appearance'
import {
  entries,
  entryFor,
  galleryUrl,
  readRoute,
  galleryThemeOptions,
  layersForPreset,
} from './catalog'
import type { GalleryRoute } from './catalog'
import '../../shared/appearance/style.css'
import './gallery.css'

export function Gallery() {
  const [route, setRoute] = createSignal(
    untrack(() => readRoute(new URL(window.location.href))),
  )
  const [collapsed, setCollapsed] = createSignal(false)
  const [sidebarBehavior, setSidebarBehavior] = createSignal<
    'flyout' | 'expand'
  >('flyout')
  const [appearanceOpen, setAppearanceOpen] = createSignal(false)
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({
    [entryFor(untrack(route).id).group]: true,
  })
  function reveal(id: GalleryRoute['id']) {
    setOpenGroups((groups) => ({ ...groups, [entryFor(id).group]: true }))
  }
  let heading: HTMLHeadingElement | undefined
  let alive = true
  let focusAttempt = 0
  const entry = () => entryFor(route().id)
  const oldTitle = untrack(() => document.title)
  createEffect(
    () => entry().label,
    (label) => {
      document.title = `${label} · Component gallery`
    },
  )
  const href = (next: GalleryRoute) =>
    galleryUrl(new URL(window.location.href), next).pathname +
    galleryUrl(new URL(window.location.href), next).search
  function focusTitle() {
    const attempt = ++focusAttempt
    queueMicrotask(() => {
      if (alive && attempt === focusAttempt)
        heading?.focus({ preventScroll: true })
    })
  }
  function change(next: Partial<GalleryRoute>, commit = true) {
    if (!alive) return
    const candidate = { ...untrack(route), ...next }
    const parsed = readRoute(
      galleryUrl(new URL(window.location.href), candidate),
    )
    const url = galleryUrl(new URL(window.location.href), parsed)
    if (commit && url.href !== window.location.href)
      window.history.pushState(null, '', url)
    const changed = parsed.id !== untrack(route).id
    setRoute(parsed)
    if (changed) {
      reveal(parsed.id)
      focusTitle()
    }
  }
  onSettled(() => {
    const pop = () => {
      const previous = untrack(route).id
      const next = readRoute(new URL(window.location.href))
      setRoute(next)
      if (next.id !== previous) {
        reveal(next.id)
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
  })
  return (
    <DefaultAppearance
      class="gallery-shell"
      options={galleryThemeOptions(route())}
      preset={route().preset}
      mode={
        route().scheme === 2
          ? 'dark'
          : route().scheme === 0
            ? 'monochrome'
            : 'light'
      }
      style={
        route().preset === 'default'
          ? appearanceStyle(
              schemes[route().scheme]!,
              accents[route().accent]!,
              route().depth,
              route().layers,
              undefined,
              route().decorations,
            )
          : undefined
      }
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
                  'Forms',
                  'Tables',
                  'Components',
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
                            Forms: 'form',
                            Tables: 'grid',
                            Components: 'grid',
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
            <Field>
              <Label>Theme</Label>
              <SelectField
                label="Theme"
                value={route().preset}
                choices={[
                  { value: 'default', label: 'Sketchy' },
                  { value: 'vanilla', label: 'Vanilla' },
                ]}
                onValueChange={(preset) =>
                  change({
                    preset: preset === 'vanilla' ? 'vanilla' : 'default',
                    layers: layersForPreset(
                      preset === 'vanilla' ? 'vanilla' : 'default',
                    ),
                  })
                }
              />
            </Field>
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
              showDecorationControls={route().preset === 'default'}
              decorations={route().decorations}
              onDecorationsChange={(decorations, commit) =>
                change({ decorations }, commit)
              }
              scheme={schemes[route().scheme]!}
              accent={accents[route().accent]!}
              depth={route().depth}
              layers={route().layers}
              onSchemeChange={(value) =>
                change({ scheme: schemes.indexOf(value) })
              }
              onAccentChange={(value) =>
                change({ accent: accents.indexOf(value) })
              }
              onDepthChange={(depth) => change({ depth })}
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
          <a href={href(route())} data-ui-text="system">
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
                <GalleryExample id={id} state={route().state} />
              </div>
            )}
          </Show>
        </section>
      </DashboardShell>
    </DefaultAppearance>
  )
}
