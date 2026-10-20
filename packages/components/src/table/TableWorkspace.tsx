import { ownsFocus } from '../internal/ownedFocus'
import { ResizeHandle } from '../components/Resizable'
import { Collapsible } from '../components/Collapsible'
import { Icon } from '../components/Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import {
  Show,
  createSignal,
  createEffect,
  createRenderEffect,
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
  /** Fixed controls are the default. Enable resizing explicitly for custom content. */
  controlsResizable?: boolean
  controlsSize?: number
  defaultControlsSize?: number
  onControlsSizeChange?: (size: number) => void
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
  const [localSize, setLocalSize] = createSignal(
    untrack(() => props.defaultControlsSize),
  )
  const [measuredSize, setMeasuredSize] = createSignal(30)
  const [headerHeight, setHeaderHeight] = createSignal(0)
  const size = () => props.controlsSize ?? localSize()
  const controlledSize = untrack(() => props.controlsSize !== undefined)
  function validateSize(current: number | undefined) {
    if (
      current !== undefined &&
      (!Number.isFinite(current) || current < 10 || current > 90)
    )
      throw new Error('Table controls size must be a percentage from 10 to 90')
  }
  untrack(() => validateSize(size()))
  createEffect(
    () => [props.controlsSize, localSize()] as const,
    ([value, current]) => {
      if ((value !== undefined) !== controlledSize)
        throw new Error('Table controls cannot change size control mode')
      validateSize(value ?? current)
    },
  )
  let workspace: HTMLElement | undefined
  let separator: HTMLDivElement | undefined
  let header: HTMLElement | undefined
  function availableSize() {
    if (!panel || !results) return 0
    const first = panel.getBoundingClientRect()
    const second = results.getBoundingClientRect()
    return props.controlsPlacement === 'top'
      ? first.height + second.height
      : first.width + second.width
  }
  function changeSize(next: number) {
    if (props.controlsSize === undefined) setLocalSize(next)
    props.onControlsSizeChange?.(next)
  }
  const panelId = `table-controls-${createUniqueId()}`
  let toggle: HTMLButtonElement | undefined
  let panel: HTMLElement | undefined
  let results: HTMLDivElement | undefined
  let headerActions: HTMLDivElement | undefined
  let alive = true
  let panelFocused = false
  const [narrow, setNarrow] = createSignal(false)
  function controlsOwnFocus(target: Node | null = document.activeElement) {
    return Boolean(
      target && (separator?.contains(target) || ownsFocus(panel, target)),
    )
  }
  function changeCollapsed(next: boolean) {
    if (!alive) return
    if (
      next &&
      controlsOwnFocus() &&
      !separator?.contains(document.activeElement)
    )
      toggle?.focus({ preventScroll: true })
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
      panelFocused = Boolean(
        panel?.contains(event.target as Node) ||
        separator?.contains(event.target as Node),
      )
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
    const measure = () =>
      untrack(() => {
        if (!alive) return
        setHeaderHeight(header?.getBoundingClientRect().height ?? 0)
        const available = availableSize()
        if (
          props.controlsResizable === true &&
          panel &&
          available > 0 &&
          !collapsed() &&
          !narrow() &&
          size() === undefined
        ) {
          const current =
            props.controlsPlacement === 'top'
              ? panel.getBoundingClientRect().height
              : panel.getBoundingClientRect().width
          setMeasuredSize(
            Math.max(0, Math.min(100, (current / available) * 100)),
          )
        }
      })
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure)
    for (const node of [workspace, header, panel])
      if (node) observer?.observe(node)
    measure()
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
        !controlsOwnFocus(event.target as Node) ||
        separator?.contains(event.target as Node)
      )
        return
      queueMicrotask(() => {
        if (
          alive &&
          !untrack(narrow) &&
          untrack(collapsed) &&
          controlsOwnFocus() &&
          !separator?.contains(document.activeElement)
        )
          toggle?.focus({ preventScroll: true })
      })
    }
    query.addEventListener('change', changed)
    doc.addEventListener('focusin', guardHiddenFocus)
    return () => {
      observer?.disconnect()
      query.removeEventListener('change', changed)
      doc.removeEventListener('focusin', guardHiddenFocus)
    }
  })
  createRenderEffect(
    () => props.controlsResizable,
    (enabled) => {
      if (enabled !== true && separator?.contains(document.activeElement))
        toggle?.focus({ preventScroll: true })
    },
  )
  createEffect(collapsed, (hidden) => {
    if (
      hidden &&
      !untrack(narrow) &&
      ((controlsOwnFocus() && !separator?.contains(document.activeElement)) ||
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
    workspace = undefined
    separator = undefined
    header = undefined
  })
  return (
    <section
      data-ui=""
      class={styledClasses('table-workspace', props.class)}
      style={{
        ...props.style,
        '--ui-table-header-height': `${headerHeight()}px`,
        '--ui-table-controls-resized-width':
          size() === undefined
            ? undefined
            : `calc((100% - ${props.controlsResizable !== true ? '0px' : 'var(--ui-resize-handle-size, 6px)'}) * ${size()! / 100})`,
        '--ui-table-controls-resized-height':
          size() === undefined
            ? undefined
            : `calc((100% - var(--ui-table-header-height) - ${props.controlsResizable !== true ? '0px' : 'var(--ui-resize-handle-size, 6px)'}) * ${size()! / 100})`,
      }}
      data-controls-resizable={
        props.controlsResizable === true ? '' : undefined
      }
      data-controls-sized={size() !== undefined ? '' : undefined}
      aria-label={props.label ?? 'Table workspace'}
      data-controls-open={open() ? '' : undefined}
      data-controls-collapsed={collapsed() ? '' : undefined}
      data-controls-placement={props.controlsPlacement ?? 'left'}
      ref={[
        (node: HTMLElement) => {
          workspace = node
        },
        events,
      ]}
    >
      <header
        class="table-workspace-header"
        ref={(node) => {
          header = node
        }}
      >
        <div class="table-workspace-title">
          <Show when={props.resultsHeader} keyed>
            {(title) => (
              <div
                class="table-workspace-title-face ui-button"
                data-variant="outline"
                data-tone="neutral"
                data-ui-active="true"
              >
                <div class="table-workspace-title-text">{title}</div>
              </div>
            )}
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
      <ResizeHandle
        class="table-workspace-resize"
        ref={(node) => {
          separator = node
        }}
        aria-label={props.controlsLabel ?? 'Table controls'}
        aria-controls={panelId}
        value={collapsed() ? 0 : (size() ?? measuredSize())}
        collapsed={collapsed()}
        onToggle={() => changeCollapsed(!collapsed())}
        onValueChange={changeSize}
        disabled={props.controlsResizable !== true || narrow()}
        orientation={
          props.controlsPlacement === 'top' ? 'horizontal' : 'vertical'
        }
        reverse={props.controlsPlacement === 'right'}
        getAvailableSize={availableSize}
      />
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
