import { Collapsible } from '../components/Collapsible'
import { Icon } from '../components/Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import {
  Show,
  createSignal,
  createEffect,
  createUniqueId,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button, IconButton } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import type { JSX } from '@solidjs/web'

export type TableControlsHandle = {
  focus: (target?: HTMLElement) => void
}

export type TableWorkspaceProps = {
  controlsPlacement?: 'left' | 'top' | 'right'
  controlsCollapsed?: boolean
  defaultControlsCollapsed?: boolean
  onControlsCollapsedChange?: (collapsed: boolean) => void
  controls: JSX.Element
  controlsHeader?: JSX.Element
  controlsRef?: (handle: TableControlsHandle) => void
  resultsHeader?: JSX.Element
  footer?: JSX.Element
  children: JSX.Element
  label?: string
  controlsLabel?: string
  toggleLabel?: string
  closeLabel?: string
  class?: ClassValue
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
  let toggle: HTMLButtonElement | undefined
  let panel: HTMLElement | undefined
  let results: HTMLDivElement | undefined
  let headerActions: HTMLDivElement | undefined
  let alive = true
  let panelFocused = false
  const [narrow, setNarrow] = createSignal(false)
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
    if (next && controlsOwnFocus()) toggle?.focus({ preventScroll: true })
    if (props.controlsCollapsed === undefined) setLocalCollapsed(next)
    props.onControlsCollapsedChange?.(next)
  }
  function close() {
    if (!alive) return
    if (untrack(narrow) && panel?.contains(document.activeElement))
      toggle?.focus({ preventScroll: true })
    setOpen(false)
  }
  function focusControls(target?: HTMLElement) {
    if (!alive || !panel || (target && !panel.contains(target))) return
    if (untrack(narrow)) setOpen(true)
    else if (untrack(collapsed)) changeCollapsed(false)
    for (
      let ancestor = target?.parentElement;
      ancestor && ancestor !== panel;
      ancestor = ancestor.parentElement
    )
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true
    queueMicrotask(() => {
      if (
        !alive ||
        !panel ||
        (target && !panel.contains(target)) ||
        (untrack(narrow) ? !untrack(open) : untrack(collapsed))
      )
        return
      const destination = target ?? panel
      destination.focus()
    })
  }
  const events = nativeEvents<HTMLElement>({
    focusin: (event) => {
      panelFocused = Boolean(panel?.contains(event.target as Node))
      // Keep focused results unobscured when keyboard users leave the drawer.
      if (
        untrack(narrow) &&
        event.target !== toggle &&
        results?.contains(event.target as Node) &&
        untrack(open)
      )
        close()
    },
    focusout: (event) => {
      if (
        event.relatedTarget instanceof Node &&
        !event.currentTarget.contains(event.relatedTarget) &&
        !controlsOwnFocus(event.relatedTarget)
      )
        panelFocused = false
    },
    keydown: (event) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        (untrack(narrow) ? !untrack(open) : untrack(collapsed))
      )
        return
      if (
        !(event.target instanceof Node) ||
        !(
          panel?.contains(event.target) || headerActions?.contains(event.target)
        )
      )
        return
      event.preventDefault()
      event.stopPropagation()
      if (untrack(narrow)) close()
      else changeCollapsed(true)
    },
  })
  onSettled(() => {
    const query = window.matchMedia('(width < 48rem)')
    const changed = () => {
      if (!alive) return
      setNarrow(query.matches)
      const hidden = query.matches ? !untrack(open) : untrack(collapsed)
      if (
        hidden &&
        (controlsOwnFocus() ||
          (panelFocused && document.activeElement === document.body))
      )
        toggle?.focus({ preventScroll: true })
    }
    changed()
    props.controlsRef?.({ focus: focusControls })
    const doc = panel?.ownerDocument ?? document
    // A popup can finish autofocus after its owning pane collapses.
    const guardHiddenFocus = (event: FocusEvent) => {
      if (
        untrack(narrow) ||
        !untrack(collapsed) ||
        !controlsOwnFocus(event.target as Node)
      )
        return
      queueMicrotask(() => {
        if (
          alive &&
          !untrack(narrow) &&
          untrack(collapsed) &&
          controlsOwnFocus()
        )
          toggle?.focus({ preventScroll: true })
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
      !untrack(narrow) &&
      (controlsOwnFocus() ||
        (panelFocused && document.activeElement === document.body))
    )
      toggle?.focus({ preventScroll: true })
  })
  onCleanup(() => {
    alive = false
    toggle = undefined
    panel = undefined
    results = undefined
    headerActions = undefined
  })
  return (
    <section
      data-ui=""
      class={styledClasses('table-workspace', props.class)}
      style={props.style}
      aria-label={props.label ?? 'Table workspace'}
      data-controls-open={open() ? '' : undefined}
      data-controls-collapsed={collapsed() ? '' : undefined}
      data-controls-placement={props.controlsPlacement ?? 'left'}
      ref={events}
    >
      <header class="table-workspace-header">
        <div class="table-workspace-title">
          <Show when={props.resultsHeader} keyed>
            {(title) => title}
          </Show>
        </div>
        <div
          class="table-workspace-header-actions"
          ref={(node) => {
            headerActions = node
          }}
        >
          <IconButton
            class="table-controls-toggle"
            ref={(node) => {
              toggle = node
            }}
            title={
              (narrow() ? open() : !collapsed())
                ? 'HIDE CONTROLS'
                : 'SHOW CONTROLS'
            }
            aria-controls={panelId}
            aria-label={props.toggleLabel ?? 'Table controls'}
            aria-expanded={
              (narrow() ? open() : !collapsed()) ? 'true' : 'false'
            }
            onClick={() => {
              if (narrow()) {
                if (open()) close()
                else setOpen(true)
              } else changeCollapsed(!collapsed())
            }}
          >
            <Icon class="table-controls-icon" name="controls" />
          </IconButton>
          <Show when={props.controlsHeader} keyed>
            {(actions) => actions}
          </Show>
        </div>
      </header>
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
        <div class="table-workspace-controls-body">{props.controls}</div>
      </aside>
      <div
        class="table-workspace-results"
        ref={(node) => {
          results = node
        }}
      >
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
  return (
    <Collapsible
      class="table-control-section"
      contentClass="table-control-content"
      defaultOpen={props.defaultOpen}
      summary={
        <>
          <span>{props.title}</span>
          <span class="table-control-summary">{props.summary}</span>
        </>
      }
    >
      {props.children}
    </Collapsible>
  )
}
