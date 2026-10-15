import {
  Show,
  createSignal,
  createEffect,
  createUniqueId,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import type { JSX } from '@solidjs/web'

export type TableWorkspaceProps = {
  controlsPlacement?: 'left' | 'top'
  controlsCollapsed?: boolean
  defaultControlsCollapsed?: boolean
  onControlsCollapsedChange?: (collapsed: boolean) => void
  controls: JSX.Element
  controlsHeader?: JSX.Element
  resultsHeader?: JSX.Element
  footer?: JSX.Element
  children: JSX.Element
  label?: string
  controlsLabel?: string
  toggleLabel?: string
  closeLabel?: string
  class?: string
  style?: JSX.CSSProperties
}

/** Independent controls and results. The application assigns the workspace height. */
export function TableWorkspace(props: TableWorkspaceProps) {
  const [open, setOpen] = createSignal(false)
  const [localCollapsed, setLocalCollapsed] = createSignal(
    untrack(() => props.defaultControlsCollapsed ?? false),
  )
  const collapsed = () => props.controlsCollapsed ?? localCollapsed()
  const panelId = `table-controls-${createUniqueId()}`
  let desktopToggle: HTMLButtonElement | undefined
  let toggle: HTMLButtonElement | undefined
  let panel: HTMLElement | undefined
  let results: HTMLDivElement | undefined
  let alive = true
  let panelFocused = false
  let toggleFocused = false
  let desktopToggleFocused = false
  let narrowQuery: MediaQueryList | undefined
  const narrow = () => narrowQuery?.matches ?? false
  function controlsOwnFocus(target: Node | null = document.activeElement) {
    if (!target || !panel) return false
    if (panel.contains(target)) return true
    // Portaled popups belong to their controls through the standard ARIA link.
    for (const control of panel.querySelectorAll(
      '[aria-expanded="true"][aria-controls]',
    )) {
      for (const id of control.getAttribute('aria-controls')!.split(/\s+/)) {
        if (panel.ownerDocument.getElementById(id)?.contains(target))
          return true
      }
    }
    return false
  }
  function changeCollapsed(next: boolean) {
    if (!alive) return
    if (next && controlsOwnFocus())
      desktopToggle?.focus({ preventScroll: true })
    if (props.controlsCollapsed === undefined) setLocalCollapsed(next)
    props.onControlsCollapsedChange?.(next)
  }
  function close() {
    if (!alive) return
    if (narrow() && panel?.contains(document.activeElement))
      toggle?.focus({ preventScroll: true })
    setOpen(false)
  }
  const events = nativeEvents<HTMLElement>({
    focusin: (event) => {
      panelFocused = Boolean(panel?.contains(event.target as Node))
      toggleFocused = event.target === toggle
      desktopToggleFocused = event.target === desktopToggle
      // Keep focused results unobscured when keyboard users leave the drawer.
      if (narrow() && results?.contains(event.target as Node) && untrack(open))
        close()
    },
    focusout: (event) => {
      if (
        event.relatedTarget instanceof Node &&
        !event.currentTarget.contains(event.relatedTarget) &&
        !controlsOwnFocus(event.relatedTarget)
      )
        panelFocused = toggleFocused = desktopToggleFocused = false
    },
    keydown: (event) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        (narrow() ? !untrack(open) : untrack(collapsed))
      )
        return
      if (
        !(event.target instanceof Node) ||
        !(
          panel?.contains(event.target) ||
          event.target === toggle ||
          event.target === desktopToggle
        )
      )
        return
      event.preventDefault()
      event.stopPropagation()
      if (narrow()) close()
      else changeCollapsed(true)
    },
  })
  onSettled(() => {
    const query = window.matchMedia('(width < 48rem)')
    narrowQuery = query
    const changed = () => {
      if (!alive) return
      if (
        query.matches &&
        !untrack(open) &&
        (controlsOwnFocus() ||
          document.activeElement === desktopToggle ||
          ((panelFocused || desktopToggleFocused) &&
            document.activeElement === document.body))
      )
        toggle?.focus({ preventScroll: true })
      else if (
        !query.matches &&
        (document.activeElement === toggle ||
          (toggleFocused && document.activeElement === document.body))
      )
        (untrack(collapsed) ? desktopToggle : panel)?.focus({
          preventScroll: true,
        })
    }
    const doc = panel?.ownerDocument ?? document
    // A popup can finish autofocus after its owning pane collapses.
    const guardHiddenFocus = (event: FocusEvent) => {
      if (
        narrow() ||
        !untrack(collapsed) ||
        !controlsOwnFocus(event.target as Node)
      )
        return
      queueMicrotask(() => {
        if (alive && !narrow() && untrack(collapsed) && controlsOwnFocus())
          desktopToggle?.focus({ preventScroll: true })
      })
    }
    query.addEventListener('change', changed)
    doc.addEventListener('focusin', guardHiddenFocus)
    return () => {
      query.removeEventListener('change', changed)
      doc.removeEventListener('focusin', guardHiddenFocus)
    }
  })
  createEffect(collapsed, (hidden) => {
    if (
      hidden &&
      !narrow() &&
      (controlsOwnFocus() ||
        (panelFocused && document.activeElement === document.body))
    )
      desktopToggle?.focus({ preventScroll: true })
  })
  onCleanup(() => {
    alive = false
    narrowQuery = undefined
    desktopToggle = undefined
    toggle = undefined
    panel = undefined
    results = undefined
  })
  return (
    <section
      data-ui=""
      class={'table-workspace ' + (props.class ?? '')}
      style={props.style}
      aria-label={props.label ?? 'Table workspace'}
      data-controls-open={open() ? '' : undefined}
      data-controls-collapsed={collapsed() ? '' : undefined}
      data-controls-placement={props.controlsPlacement ?? 'left'}
      ref={events}
    >
      <div class="table-workspace-toolbar">
        <Button
          class="table-controls-toggle"
          ref={(node) => {
            toggle = node
          }}
          aria-controls={panelId}
          aria-expanded={open() ? 'true' : 'false'}
          onClick={() => (open() ? close() : setOpen(true))}
        >
          {props.toggleLabel ?? 'Table controls'}
        </Button>
      </div>
      <aside
        id={panelId}
        class="table-workspace-controls"
        aria-label={props.controlsLabel ?? 'Table controls'}
        tabindex={-1}
        ref={(node) => {
          panel = node
        }}
      >
        <Button class="table-controls-close" onClick={close}>
          {props.closeLabel ?? 'Close table controls'}
        </Button>
        <Show when={props.controlsHeader} keyed>
          {(header) => (
            <div class="table-workspace-controls-header">{header}</div>
          )}
        </Show>
        <div class="table-workspace-controls-body">{props.controls}</div>
      </aside>
      <div
        class="table-workspace-results"
        ref={(node) => {
          results = node
        }}
      >
        <div class="table-workspace-results-header">
          <Show when={props.resultsHeader} keyed>
            {(header) => header}
          </Show>
          <Button
            class="table-controls-desktop-toggle"
            ref={(node) => {
              desktopToggle = node
            }}
            aria-label={props.toggleLabel ?? 'Table controls'}
            aria-controls={panelId}
            aria-expanded={collapsed() ? 'false' : 'true'}
            onClick={() => changeCollapsed(!collapsed())}
          >
            {collapsed() ? 'Show controls' : 'Hide controls'}
          </Button>
        </div>
        {props.children}
        <Show when={props.footer != null && props.footer !== false}>
          <footer class="table-workspace-summary" role="status">
            {props.footer}
          </footer>
        </Show>
      </div>
    </section>
  )
}

export function TableControlSection(props: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: JSX.Element
}) {
  const initiallyOpen = untrack(() => props.defaultOpen)
  return (
    <details class="table-control-section" open={initiallyOpen}>
      <summary>
        <span>{props.title}</span>
        <span class="table-control-summary">{props.summary}</span>
      </summary>
      <div class="table-control-content">{props.children}</div>
    </details>
  )
}
