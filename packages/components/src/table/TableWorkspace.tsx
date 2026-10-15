import {
  Show,
  createSignal,
  createUniqueId,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import type { JSX } from '@solidjs/web'

export type TableWorkspaceProps = {
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
  const panelId = `table-controls-${createUniqueId()}`
  let toggle: HTMLButtonElement | undefined
  let panel: HTMLElement | undefined
  let results: HTMLDivElement | undefined
  let alive = true
  let panelFocused = false
  let toggleFocused = false
  const narrow = () =>
    Boolean(toggle && getComputedStyle(toggle).display !== 'none')
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
      // Keep focused results unobscured when keyboard users leave the drawer.
      if (results?.contains(event.target as Node) && untrack(open)) close()
    },
    focusout: (event) => {
      if (
        event.relatedTarget instanceof Node &&
        !event.currentTarget.contains(event.relatedTarget)
      )
        panelFocused = toggleFocused = false
    },
    keydown: (event) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        !narrow() ||
        !untrack(open)
      )
        return
      if (
        !(event.target instanceof Node) ||
        !(panel?.contains(event.target) || event.target === toggle)
      )
        return
      event.preventDefault()
      event.stopPropagation()
      close()
    },
  })
  onSettled(() => {
    const query = window.matchMedia('(width < 48rem)')
    const changed = () => {
      if (!alive) return
      if (
        query.matches &&
        !untrack(open) &&
        (panel?.contains(document.activeElement) ||
          (panelFocused && document.activeElement === document.body))
      )
        toggle?.focus({ preventScroll: true })
      else if (
        !query.matches &&
        (document.activeElement === toggle ||
          (toggleFocused && document.activeElement === document.body))
      )
        panel?.focus({ preventScroll: true })
    }
    query.addEventListener('change', changed)
    return () => query.removeEventListener('change', changed)
  })
  onCleanup(() => {
    alive = false
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
        <Show when={props.resultsHeader} keyed>
          {(header) => (
            <div class="table-workspace-results-header">{header}</div>
          )}
        </Show>
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
