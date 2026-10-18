import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button } from '@wfe/components'
import { DashboardShell } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { DefaultAppearance } from '../../shared/appearance/DefaultAppearance'
import { AppearanceReview } from '../../shared/appearance/AppearanceReview'
import {
  appearanceStyle,
  schemes,
  accents,
} from '../../shared/appearance/appearance'
import { entries, entryFor, galleryUrl, readRoute } from './catalog'
import type { GalleryRoute } from './catalog'
import '../../shared/appearance/style.css'
import './gallery.css'

export function Gallery() {
  const [route, setRoute] = createSignal(
    untrack(() => readRoute(new URL(window.location.href))),
  )
  const [appearanceOpen, setAppearanceOpen] = createSignal(false)
  let frame: HTMLIFrameElement | undefined
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
  function send() {
    if (!alive) return
    const { scheme, accent, depth, layers, state } = untrack(route)
    frame?.contentWindow?.postMessage(
      {
        type: 'wfe-gallery-config',
        config: { scheme, accent, depth, layers, state },
      },
      window.location.origin,
    )
  }
  function change(next: Partial<GalleryRoute>) {
    if (!alive) return
    const candidate = { ...untrack(route), ...next }
    const parsed = readRoute(
      galleryUrl(new URL(window.location.href), candidate),
    )
    const url = galleryUrl(new URL(window.location.href), parsed)
    if (url.href !== window.location.href)
      window.history.pushState(null, '', url)
    const changed = parsed.id !== untrack(route).id
    setRoute(parsed)
    if (changed) focusTitle()
  }
  function PreviewFrame(props: { id: string }) {
    const initialUrl = untrack(
      () =>
        galleryUrl(
          new URL(window.location.href),
          { ...route(), id: props.id as GalleryRoute['id'] },
          true,
        ).href,
    )
    let node: HTMLIFrameElement | undefined
    onCleanup(() => {
      if (frame === node) frame = undefined
      node = undefined
    })
    return (
      <iframe
        class="gallery-frame"
        data-viewport={route().viewport}
        title={`${entryFor(props.id).label} preview`}
        src={initialUrl}
        ref={(element) => {
          node = element
          frame = element
        }}
      />
    )
  }
  createEffect(route, () => {
    send()
  })
  onSettled(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source === frame?.contentWindow &&
        event.origin === window.location.origin &&
        event.data?.type === 'wfe-gallery-ready'
      )
        send()
    }
    const pop = () => {
      const previous = untrack(route).id
      const next = readRoute(new URL(window.location.href))
      setRoute(next)
      if (next.id !== previous) focusTitle()
    }
    window.addEventListener('message', receive)
    window.addEventListener('popstate', pop)
    return () => {
      window.removeEventListener('message', receive)
      window.removeEventListener('popstate', pop)
    }
  })
  onCleanup(() => {
    document.title = oldTitle
    alive = false
    frame = undefined
    heading = undefined
    focusAttempt++
  })
  return (
    <DefaultAppearance
      class="gallery-shell"
      style={appearanceStyle(
        schemes[route().scheme]!,
        accents[route().accent]!,
        route().depth,
        route().layers,
      )}
    >
      <DashboardShell
        class="gallery-dashboard"
        scroll="content"
        mainLabel="Component review"
        toggleLabel="Components"
        closeLabel="Close components"
        navigationLabel="Component catalog"
        header={
          <>
            <h1
              ref={(node) => {
                heading = node
              }}
              tabindex={-1}
            >
              {entry().label}
            </h1>
            <Button
              aria-expanded={appearanceOpen() ? 'true' : 'false'}
              aria-controls="gallery-appearance"
              onClick={() => setAppearanceOpen(!appearanceOpen())}
            >
              Appearance
            </Button>
          </>
        }
        navigation={(controls) => (
          <For each={['Forms', 'Components', 'Navigation', 'Layout']}>
            {(group) => (
              <section class="gallery-navigation-group">
                <h2>{group}</h2>
                <For each={entries.filter((entry) => entry.group === group)}>
                  {(item) => (
                    <a
                      href={href({ ...route(), id: item.id, state: 'normal' })}
                      aria-current={route().id === item.id ? 'page' : undefined}
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
                          controls.close()
                          focusTitle()
                        },
                      })}
                    >
                      {item.label}
                    </a>
                  )}
                </For>
              </section>
            )}
          </For>
        )}
      >
        <Show when={appearanceOpen()}>
          <section id="gallery-appearance" class="gallery-appearance">
            <AppearanceReview
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
                      ? 'Tablet · 768px'
                      : 'Phone · 320px'}
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
          aria-label="Preview viewport"
          tabindex={0}
        >
          <Show when={route().id} keyed>
            {(id) => <PreviewFrame id={id} />}
          </Show>
        </section>
      </DashboardShell>
    </DefaultAppearance>
  )
}
