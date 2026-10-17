import { styledClasses, type ClassValue } from '../internal/classes'
import {
  Show,
  createSignal,
  createUniqueId,
  omit,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button } from '../components/NativeFields'
import { Card } from '../components/Display'
import { nativeEventProps, ownedElementEvents } from '../internal/events'
import { uiScope } from '../styles/density'
import type { JSX } from '@solidjs/web'
import type { CardProps } from '../components/Display'
import type { UIDensity } from '../styles/density'

export type DashboardNavigation = { close: () => void }
export type DashboardShellProps = {
  header?: JSX.Element
  navigation?: (controls: DashboardNavigation) => JSX.Element
  children: JSX.Element
  navigationLabel?: string
  toggleLabel?: string
  closeLabel?: string
  mainLabel?: string
  scroll?: 'main' | 'content'
  density?: UIDensity
  theme?: 'dark'
  id?: string
  class?: ClassValue
  style?: JSX.CSSProperties
}

/** One persistent navigation tree. CSS chooses its desktop or narrow placement. */
export function DashboardShell(props: DashboardShellProps) {
  const [open, setOpen] = createSignal(false)
  const navigationId = `dashboard-navigation-${createUniqueId()}`
  let toggle: HTMLButtonElement | undefined
  let navigation: HTMLElement | undefined
  let alive = true
  let navigationFocused = false
  let toggleFocused = false
  const narrow = () =>
    toggle !== undefined && getComputedStyle(toggle).display !== 'none'
  const close = () => {
    if (!alive) return
    if (narrow() && navigation?.contains(document.activeElement))
      toggle?.focus({ preventScroll: true })
    setOpen(false)
  }
  const events = ownedElementEvents({
    onFocusIn: (event: FocusEvent) => {
      navigationFocused =
        event.target instanceof Node &&
        Boolean(navigation?.contains(event.target))
      toggleFocused = event.target === toggle
    },
    onFocusOut: (event: FocusEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
      ) {
        navigationFocused = toggleFocused = false
      }
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        !narrow() ||
        !untrack(open) ||
        !(event.target instanceof Node) ||
        !(navigation?.contains(event.target) || event.target === toggle)
      )
        return
      event.preventDefault()
      event.stopPropagation()
      close()
    },
  })
  onSettled(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(width < 48rem)')
    const changed = () => {
      if (!alive) return
      if (
        query.matches &&
        !untrack(open) &&
        (navigation?.contains(document.activeElement) ||
          (navigationFocused && document.activeElement === document.body))
      )
        toggle?.focus({ preventScroll: true })
      else if (
        !query.matches &&
        (document.activeElement === toggle ||
          (toggleFocused && document.activeElement === document.body))
      )
        navigation?.focus({ preventScroll: true })
    }
    query.addEventListener('change', changed)
    return () => query.removeEventListener('change', changed)
  })
  onCleanup(() => {
    alive = false
    toggle = undefined
    navigation = undefined
  })
  function NavigationToggle() {
    let element: HTMLButtonElement | undefined
    onCleanup(() => {
      if (toggle === element) {
        toggle = undefined
        toggleFocused = false
      }
      element = undefined
    })
    return (
      <Button
        class="ui-dashboard-toggle"
        ref={(node) => {
          element = node
          toggle = node
        }}
        aria-controls={navigationId}
        aria-expanded={open() ? 'true' : 'false'}
        onClick={() => setOpen((value) => !value)}
      >
        {props.toggleLabel ?? 'Navigation'}
      </Button>
    )
  }
  function NavigationRegion() {
    let element: HTMLElement | undefined
    onCleanup(() => {
      if (navigation === element) {
        navigation = undefined
        navigationFocused = false
      }
      element = undefined
    })
    return (
      <nav
        id={navigationId}
        class="ui-dashboard-navigation"
        aria-label={props.navigationLabel ?? 'Primary navigation'}
        tabindex={-1}
        ref={(node) => {
          element = node
          navigation = node
        }}
      >
        <Button class="ui-dashboard-close" onClick={close}>
          {props.closeLabel ?? 'Close navigation'}
        </Button>
        {props.navigation?.({ close })}
      </nav>
    )
  }
  return (
    <div
      {...uiScope(props.density, props.theme)}
      id={props.id}
      data-ui-portal-root=""
      class={styledClasses('ui-dashboard', props.class)}
      style={{ ...uiScope(props.density, props.theme).style, ...props.style }}
      data-navigation-open={open() ? '' : undefined}
      data-has-navigation={props.navigation ? '' : undefined}
      data-scroll={props.scroll ?? 'main'}
      ref={events}
    >
      <header class="ui-dashboard-header">
        <Show when={props.navigation}>
          <NavigationToggle />
        </Show>
        {props.header}
      </header>
      <Show when={props.navigation}>
        <NavigationRegion />
      </Show>
      <main class="ui-dashboard-main" aria-label={props.mainLabel}>
        {props.children}
      </main>
    </div>
  )
}

export type DashboardPanelProps = CardProps & { fill?: boolean }
export function DashboardPanel(props: DashboardPanelProps) {
  const rest = omit(props, 'fill')
  return (
    <Card
      {...rest}
      class={styledClasses('ui-dashboard-panel', props.class)}
      data-fill={props.fill ? '' : undefined}
    />
  )
}

export type DashboardGridProps = JSX.HTMLAttributes<HTMLDivElement>
export function DashboardGrid(props: DashboardGridProps) {
  const rest = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...rest}
      class={styledClasses('ui-dashboard-grid', props.class)}
      ref={[props.ref, events]}
    />
  )
}
