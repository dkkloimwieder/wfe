import { ownsFocus } from '../internal/ownedFocus'
import { styledClasses, type ClassValue } from '../internal/classes'
import {
  Show,
  createSignal,
  createMemo,
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

export type DashboardNavigation = {
  close: () => void
  compact: () => boolean
  mobile: () => boolean
}
export type DashboardShellProps = {
  header?: JSX.Element
  navigation?: (controls: DashboardNavigation) => JSX.Element
  context?: (controls: DashboardNavigation) => JSX.Element
  contextLabel?: string
  contextToggleLabel?: string
  contextCloseLabel?: string
  footer?: JSX.Element
  footerLabel?: string
  children: JSX.Element
  navigationCollapsed?: boolean
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

type RailOptions = {
  kind: 'navigation' | 'context'
  collapsed: () => boolean
  label: () => string | undefined
  toggleLabel: () => string | undefined
  closeLabel: () => string | undefined
  content: () => DashboardShellProps['navigation']
  open: () => boolean
  onToggle: () => void
  onClose: () => void
  fallback: () => HTMLElement | undefined
}

function createRail(options: RailOptions) {
  const [mobile, setMobile] = createSignal(false)
  const compact = () => options.collapsed() && !mobile()
  const navigationId = `dashboard-${options.kind}-${createUniqueId()}`
  let toggle: HTMLButtonElement | undefined
  let navigation: HTMLElement | undefined
  let alive = true
  let navigationFocused = false
  let toggleFocused = false
  const narrow = () =>
    toggle !== undefined && getComputedStyle(toggle).display !== 'none'
  const close = () => {
    if (!alive) return
    if (narrow() && ownsFocus(navigation))
      toggle?.focus({ preventScroll: true })
    options.onClose()
  }
  const events = ownedElementEvents({
    onFocusIn: (event: FocusEvent) => {
      navigationFocused =
        event.target instanceof Node && ownsFocus(navigation, event.target)
      toggleFocused = event.target === toggle
    },
    onFocusOut: (event: FocusEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        !(event.currentTarget as HTMLElement).contains(event.relatedTarget) &&
        !ownsFocus(navigation, event.relatedTarget)
      ) {
        navigationFocused = toggleFocused = false
      }
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        !narrow() ||
        !untrack(options.open) ||
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
    const query = window.matchMedia(
      options.kind === 'navigation' ? '(width < 48rem)' : '(width < 64rem)',
    )
    const changed = () => {
      if (!alive) return
      setMobile(query.matches)
      if (
        query.matches &&
        !untrack(options.open) &&
        (ownsFocus(navigation) ||
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
    changed()
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
        if (
          alive &&
          typeof document !== 'undefined' &&
          element !== undefined &&
          element.ownerDocument.activeElement === element
        )
          options.fallback()?.focus({ preventScroll: true })
        toggle = undefined
        toggleFocused = false
      }
      element = undefined
    })
    return (
      <Button
        class={
          options.kind === 'navigation'
            ? 'ui-dashboard-toggle'
            : 'ui-dashboard-context-toggle'
        }
        ref={(node) => {
          element = node
          toggle = node
        }}
        aria-controls={navigationId}
        aria-expanded={options.open() ? 'true' : 'false'}
        onClick={() => {
          if (narrow()) toggle?.focus({ preventScroll: true })
          options.onToggle()
        }}
      >
        {options.toggleLabel() ??
          (options.kind === 'navigation' ? 'Navigation' : 'Context')}
      </Button>
    )
  }
  function NavigationRegion() {
    let element: HTMLElement | undefined
    onCleanup(() => {
      if (navigation === element) {
        if (
          alive &&
          typeof document !== 'undefined' &&
          (ownsFocus(element) ||
            (navigationFocused && document.activeElement === document.body))
        ) {
          if (toggle?.isConnected && narrow())
            toggle.focus({ preventScroll: true })
          else options.fallback()?.focus({ preventScroll: true })
        }
        navigation = undefined
        navigationFocused = false
      }
      element = undefined
    })
    return (
      <nav
        id={navigationId}
        class={
          options.kind === 'navigation'
            ? 'ui-dashboard-navigation'
            : 'ui-dashboard-context'
        }
        aria-label={
          options.label() ??
          (options.kind === 'navigation'
            ? 'Primary navigation'
            : 'Context navigation')
        }
        tabindex={-1}
        ref={(node) => {
          element = node
          navigation = node
        }}
      >
        <Button
          class={
            options.kind === 'navigation'
              ? 'ui-dashboard-close'
              : 'ui-dashboard-context-close'
          }
          onClick={close}
        >
          {options.closeLabel() ??
            (options.kind === 'navigation'
              ? 'Close navigation'
              : 'Close context')}
        </Button>
        {options.content()?.({ close, compact, mobile })}
      </nav>
    )
  }
  return { Toggle: NavigationToggle, Region: NavigationRegion, events, compact }
}

/** Persistent menu owners with independent scrolling and responsive placement. */
export function DashboardShell(props: DashboardShellProps) {
  const [active, setActive] = createSignal<'navigation' | 'context'>()
  let main: HTMLElement | undefined
  const rail = (kind: 'navigation' | 'context') =>
    createRail({
      kind,
      collapsed: () =>
        kind === 'navigation' && Boolean(props.navigationCollapsed),
      label: () =>
        kind === 'navigation' ? props.navigationLabel : props.contextLabel,
      toggleLabel: () =>
        kind === 'navigation' ? props.toggleLabel : props.contextToggleLabel,
      closeLabel: () =>
        kind === 'navigation' ? props.closeLabel : props.contextCloseLabel,
      content: () => (kind === 'navigation' ? props.navigation : props.context),
      open: () => active() === kind,
      onToggle: () =>
        setActive((current) => (current === kind ? undefined : kind)),
      onClose: () =>
        setActive((current) => (current === kind ? undefined : current)),
      fallback: () => main,
    })
  const footer = createMemo(() => props.footer)
  const navigation = rail('navigation')
  const context = rail('context')
  onCleanup(() => {
    main = undefined
  })
  return (
    <div
      {...uiScope(props.density, props.theme)}
      id={props.id}
      data-ui-portal-root=""
      class={styledClasses('ui-dashboard', props.class)}
      style={{ ...uiScope(props.density, props.theme).style, ...props.style }}
      data-navigation-collapsed={navigation.compact() ? '' : undefined}
      data-navigation-open={
        props.navigation && active() === 'navigation' ? '' : undefined
      }
      data-context-open={
        props.context && active() === 'context' ? '' : undefined
      }
      data-has-context={props.context ? '' : undefined}
      data-has-footer={footer() !== undefined ? '' : undefined}
      data-has-navigation={props.navigation ? '' : undefined}
      data-scroll={props.scroll ?? 'main'}
      ref={[navigation.events, context.events]}
    >
      <header class="ui-dashboard-header">
        <Show when={props.navigation}>
          <navigation.Toggle />
        </Show>
        <Show when={props.context}>
          <context.Toggle />
        </Show>
        {props.header}
      </header>
      <Show when={props.navigation}>
        <navigation.Region />
      </Show>
      <Show when={props.context}>
        <context.Region />
      </Show>
      <main
        ref={(node) => {
          main = node
        }}
        tabindex={-1}
        class="ui-dashboard-main"
        aria-label={props.mainLabel}
      >
        {props.children}
      </main>
      <Show when={footer() !== undefined}>
        <footer class="ui-dashboard-footer" aria-label={props.footerLabel}>
          {footer()}
        </footer>
      </Show>
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
