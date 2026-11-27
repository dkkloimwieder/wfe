import { createContainerLayout } from '../internal/containerLayout'
import { resolveTableMessages, type TableMessages } from './messages'
import { ownsFocus } from '../internal/ownedFocus'
import { ResizeHandle } from '../components/Resizable'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { Icon } from '../components/Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import {
  Show,
  createSignal,
  createMemo,
  createEffect,
  createRenderEffect,
  createUniqueId,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import { Button, Field, IconButton, Label } from '../components/NativeFields'
import { SelectField } from '../components/Select'
import { createTableViews } from './createTableViews'
import { TableViewControls } from './TableViewControls'
import {
  copyTableViewValue,
  readTableViewState,
  type TableControlsPlacement,
  type TableViewState,
  type TableWorkspaceViewsOptions,
} from './tableViewState'
import { nativeEvents } from '../utils/nativeEvents'
import type { JSX } from '@solidjs/web'

export type TableControlsHandle = {
  focus: (target?: HTMLElement) => void
}

export type TableWorkspaceProps = {
  messages?: Partial<TableMessages>
  /** Omit the title/actions bar and configuration pane, retaining column headings. */
  headerEnabled?: boolean
  /** Omit the summary and pagination without constructing their slots. */
  footerEnabled?: boolean
  /** Fixed controls are the default. Enable resizing explicitly for custom content. */
  controlsEnabled?: boolean
  controlsResizable?: boolean
  controlsSize?: number
  defaultControlsSize?: number
  onControlsSizeChange?: (size: number) => void
  controlsPlacement?: TableControlsPlacement
  defaultControlsPlacement?: TableControlsPlacement
  onControlsPlacementChange?: (placement: TableControlsPlacement) => void
  views?: TableWorkspaceViewsOptions
  controlsCollapsed?: boolean
  defaultControlsCollapsed?: boolean
  onControlsCollapsedChange?: (collapsed: boolean) => void
  controls: JSX.Element
  controlsHeader?: JSX.Element
  controlsRef?: (handle: TableControlsHandle) => void
  resultsHeader?: JSX.Element
  footer?: JSX.Element
  footerActions?: JSX.Element
  children: JSX.Element
  label?: string
  controlsLabel?: string
  toggleLabel?: string
  closeLabel?: string
  fill?: boolean
  toolbarLayout?: 'wrap'
  class?: ClassValue
  style?: JSX.CSSProperties
}

/** Independent controls and results. The application assigns the workspace height. */
export function TableWorkspace(props: TableWorkspaceProps) {
  const messages = resolveTableMessages(() => props.messages)
  const headerEnabled = createMemo(() => props.headerEnabled !== false)
  const footerEnabled = createMemo(() => props.footerEnabled !== false)
  const controlsEnabled = createMemo(
    () => headerEnabled() && props.controlsEnabled !== false,
  )
  const viewOptions = createMemo(() =>
    controlsEnabled() ? props.views : undefined,
  )
  const [localPlacement, setLocalPlacement] = createSignal(
    // The default seeds the uncontrolled placement once.
    untrack(() => props.defaultControlsPlacement ?? 'left'),
  )
  const placement = () => props.controlsPlacement ?? localPlacement()
  const canPlace = () =>
    props.controlsPlacement === undefined ||
    Boolean(props.onControlsPlacementChange)
  function changePlacement(next: TableControlsPlacement) {
    if (!canPlace() || next === placement()) return
    if (props.controlsPlacement === undefined) setLocalPlacement(next)
    props.onControlsPlacementChange?.(next)
  }
  const controls = createMemo(() =>
    controlsEnabled() ? props.controls : undefined,
  )
  const footer = createMemo(() => (footerEnabled() ? props.footer : undefined))
  const footerActions = createMemo(() =>
    footerEnabled() ? props.footerActions : undefined,
  )
  const [open, setOpen] = createSignal(false, { ownedWrite: true })
  const [localCollapsed, setLocalCollapsed] = createSignal(
    untrack(() => props.defaultControlsCollapsed ?? false),
  )
  const collapsed = () =>
    !controlsEnabled() || (props.controlsCollapsed ?? localCollapsed())
  const [localSize, setLocalSize] = createSignal(
    untrack(() => props.defaultControlsSize),
  )
  const [measuredSize, setMeasuredSize] = createSignal(30)
  const [headerHeight, setHeaderHeight] = createSignal(0, { ownedWrite: true })
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
  let footerElement: HTMLElement | undefined
  let headerFocused = false
  let footerFocused = false
  function availableSize() {
    if (!panel || !results) return 0
    const first = panel.getBoundingClientRect()
    const second = results.getBoundingClientRect()
    return placement() === 'top'
      ? first.height + second.height
      : first.width + second.width
  }
  function changeSize(next: number) {
    if (props.controlsSize === undefined) setLocalSize(next)
    props.onControlsSizeChange?.(next)
  }
  const panelId = `table-controls-${createUniqueId()}`
  let toggle: HTMLButtonElement | undefined
  let panelObserver: ResizeObserver | undefined
  let measurePanel: (() => void) | undefined
  let panel: HTMLElement | undefined
  let results: HTMLDivElement | undefined
  let headerActions: HTMLDivElement | undefined
  let alive = true
  let panelFocused = false
  const [narrow, setNarrow] = createSignal(false)
  const [layoutReady, setLayoutReady] = createSignal(false)
  function controlsOwnFocus(target: Node | null = document.activeElement) {
    return Boolean(
      target && (separator?.contains(target) || ownsFocus(panel, target)),
    )
  }
  createRenderEffect(controlsEnabled, (enabled) => {
    if (enabled !== false || !workspace) return
    const active = document.activeElement
    if (
      workspace &&
      (controlsOwnFocus(active) ||
        toggle === active ||
        (panelFocused && active === document.body))
    )
      workspace?.focus({ preventScroll: true })
    setOpen(false)
    panelFocused = false
    toggle = undefined
    if (panel) panelObserver?.unobserve(panel)
    panel = undefined
    separator = undefined
  })
  createRenderEffect(headerEnabled, (enabled) => {
    if (enabled || !workspace) return
    const active = document.activeElement
    if (
      ownsFocus(header, active) ||
      (headerFocused && active === document.body)
    )
      workspace.focus({ preventScroll: true })
    if (header) panelObserver?.unobserve(header)
    header = undefined
    headerActions = undefined
    headerFocused = false
    setHeaderHeight(0)
  })
  createRenderEffect(footerEnabled, (enabled) => {
    if (enabled || !workspace) return
    const active = document.activeElement
    if (
      ownsFocus(footerElement, active) ||
      (footerFocused && active === document.body)
    )
      workspace.focus({ preventScroll: true })
    footerElement = undefined
    footerFocused = false
  })
  const panelCollapsed = () => (narrow() ? !open() : collapsed())
  function changeCollapsed(next: boolean) {
    if (!alive) return
    if (
      next &&
      controlsOwnFocus() &&
      !separator?.contains(document.activeElement)
    )
      toggle?.focus({ preventScroll: true })
    if (viewOptions()) setOpen(!next)
    if (!viewOptions() || next !== collapsed()) {
      if (props.controlsCollapsed === undefined) setLocalCollapsed(next)
      props.onControlsCollapsedChange?.(next)
    }
  }
  function close() {
    if (!alive) return
    if (untrack(narrow) && panel?.contains(document.activeElement))
      toggle?.focus({ preventScroll: true })
    if (viewOptions()) changeCollapsed(true)
    else setOpen(false)
  }
  function focusControls(target?: HTMLElement) {
    if (
      !alive ||
      !controlsEnabled() ||
      !panel?.isConnected ||
      (target && !panel.contains(target))
    )
      return
    if (untrack(narrow)) {
      if (viewOptions()) changeCollapsed(false)
      else setOpen(true)
    } else if (untrack(collapsed)) changeCollapsed(false)
    for (
      let ancestor = target?.parentElement;
      ancestor && ancestor !== panel;
      ancestor = ancestor.parentElement
    )
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true
    queueMicrotask(() => {
      if (
        !alive ||
        !controlsEnabled() ||
        !panel?.isConnected ||
        (target && !panel.contains(target)) ||
        (untrack(narrow) ? !untrack(open) : untrack(collapsed))
      )
        return
      const destination = target ?? panel
      destination.focus()
    })
  }
  function captureView(): TableViewState | undefined {
    const data = readTableViewState(
      copyTableViewValue(viewOptions()?.capture()),
    )
    if (!data) return
    return {
      ...data,
      controls: {
        placement: placement(),
        collapsed: panelCollapsed(),
        size: props.controlsResizable === true ? (size() ?? null) : undefined,
      },
    }
  }
  const views = createTableViews({
    // Capture the initial open state after the workspace chooses a pane or drawer.
    configuration: () => (layoutReady() ? viewOptions() : undefined),
    capture: captureView,
    normalize: (
      { controls, ...state },
      { controls: initial, ...baseline },
    ) => ({
      ...(viewOptions()?.normalize?.(state, baseline) ?? state),
      controls: {
        placement: canPlace() ? controls?.placement : placement(),
        collapsed:
          narrow() ||
          props.controlsCollapsed === undefined ||
          props.onControlsCollapsedChange
            ? controls?.collapsed
            : collapsed(),
        size:
          props.controlsResizable !== true
            ? undefined
            : props.controlsSize === undefined ||
                (props.onControlsSizeChange && controls?.size !== null)
              ? controls?.size !== undefined
                ? controls.size
                : (initial?.size ?? null)
              : size(),
      },
    }),
    restore: ({ controls, ...state }) => {
      if (controls?.placement) changePlacement(controls.placement)
      if (typeof controls?.collapsed === 'boolean')
        changeCollapsed(controls.collapsed)
      if (controls?.size === null && props.controlsSize === undefined)
        setLocalSize(undefined)
      else if (typeof controls?.size === 'number' && controls.size !== size())
        changeSize(controls.size)
      viewOptions()?.restore(state)
    },
  })
  const events = nativeEvents<HTMLElement>({
    focusin: (event) => {
      headerFocused = ownsFocus(header, event.target as Node)
      footerFocused = ownsFocus(footerElement, event.target as Node)
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
      ) {
        panelFocused = false
        if (!ownsFocus(header, event.relatedTarget)) headerFocused = false
        if (!ownsFocus(footerElement, event.relatedTarget))
          footerFocused = false
      }
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
    if (!workspace) return
    const layout = createContainerLayout(
      workspace,
      ['controls'],
      typeof ResizeObserver !== 'undefined',
      (state) => {
        if (!alive) return
        setNarrow(Boolean(state.controls))
        setLayoutReady(true)
        const hidden = Boolean(state.controls)
          ? !untrack(open)
          : untrack(collapsed)
        if (
          hidden &&
          (controlsOwnFocus() ||
            (panelFocused && document.activeElement === document.body))
        )
          toggle?.focus({ preventScroll: true })
      },
    )
    const observedBoxes = new WeakMap<
      Element,
      { width: number; height: number }
    >()
    const observeBox = (entry: ResizeObserverEntry) => {
      const box = entry.borderBoxSize?.[0]
      observedBoxes.set(
        entry.target,
        box
          ? { width: box.inlineSize, height: box.blockSize }
          : entry.contentRect,
      )
    }
    const measure = (entries?: readonly ResizeObserverEntry[]) =>
      untrack(() => {
        if (!alive || !workspace?.isConnected) return
        const box = (node: HTMLElement | undefined) =>
          node &&
          (entries ? observedBoxes.get(node) : node.getBoundingClientRect())
        const height = box(header)?.height ?? 0
        if (entries) layout.observe(entries)
        else layout.measure()
        setHeaderHeight(height)
        if (
          props.controlsResizable === true &&
          !collapsed() &&
          !narrow() &&
          size() === undefined
        ) {
          const dimension = placement() === 'top' ? 'height' : 'width'
          const current = box(panel)?.[dimension]
          const remaining = box(results)?.[dimension]
          if (
            current !== undefined &&
            remaining !== undefined &&
            current + remaining > 0
          )
            setMeasuredSize((current / (current + remaining)) * 100)
        }
      })
    let frame: number | undefined
    let workspaceEntry: ResizeObserverEntry | undefined
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver((entries) => {
            for (const entry of entries) {
              observeBox(entry)
              if (entry.target === workspace) workspaceEntry = entry
            }
            if (frame !== undefined) return
            // The header offset and drawer state can resize the observed boxes.
            frame = requestAnimationFrame(() => {
              frame = undefined
              const entry = workspaceEntry
              workspaceEntry = undefined
              measure(entry ? [entry] : [])
            })
          })
    panelObserver = observer
    measurePanel = observer ? undefined : measure
    for (const node of [workspace, header, panel, results])
      if (node) observer?.observe(node, { box: 'border-box' })
    // ResizeObserver delivers the initial size after the browser lays out.
    if (!observer) measure()
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
    doc.addEventListener('focusin', guardHiddenFocus)
    return () => {
      observer?.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
      panelObserver = undefined
      measurePanel = undefined
      layout.dispose()
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
    footerElement = undefined
  })
  return (
    <section
      data-ui=""
      tabindex={-1}
      class={styledClasses('table-workspace', props.class)}
      data-table-fill={props.fill ? '' : undefined}
      data-toolbar-layout={props.toolbarLayout}
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
        controlsEnabled() && props.controlsResizable === true ? '' : undefined
      }
      data-controls-sized={size() !== undefined ? '' : undefined}
      aria-label={props.label ?? messages.workspace}
      data-controls-open={open() ? '' : undefined}
      data-controls-collapsed={collapsed() ? '' : undefined}
      data-controls-placement={placement()}
      data-table-views={viewOptions() ? '' : undefined}
      ref={[
        (node: HTMLElement) => {
          workspace = node
        },
        events,
      ]}
    >
      <Show when={headerEnabled()} keyed>
        {(_enabled) => (
          <header
            class="table-workspace-header"
            ref={(node) => {
              header = node
              panelObserver?.observe(node, { box: 'border-box' })
              if (measurePanel)
                queueMicrotask(() => {
                  if (alive && header === node && node.isConnected)
                    measurePanel?.()
                })
            }}
          >
            <div class="table-workspace-title">
              <Show when={props.resultsHeader} keyed>
                {(title) => (
                  <div
                    class="table-workspace-title-face ui-button"
                    data-variant="outline"
                    data-tone="neutral"
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
              <Show when={controlsEnabled()} keyed>
                {(_enabled) => (
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
                    aria-label={props.toggleLabel ?? messages.controls}
                    aria-expanded={
                      (narrow() ? open() : !collapsed()) ? 'true' : 'false'
                    }
                    onClick={() => {
                      if (viewOptions()) changeCollapsed(!panelCollapsed())
                      else if (narrow()) {
                        if (open()) close()
                        else setOpen(true)
                      } else changeCollapsed(!collapsed())
                    }}
                  >
                    <Icon class="table-controls-icon" name="controls" />
                  </IconButton>
                )}
              </Show>
              <Show when={viewOptions()}>
                <TableViewControls views={views} messages={messages} />
              </Show>
              <Show when={props.controlsHeader} keyed>
                {(actions) => actions}
              </Show>
            </div>
          </header>
        )}
      </Show>
      <Show when={controlsEnabled()} keyed>
        {(_enabled) => (
          <>
            <aside
              id={panelId}
              class="table-workspace-controls"
              aria-label={props.controlsLabel ?? messages.controls}
              tabindex={-1}
              ref={(node) => {
                panel = node
                panelObserver?.observe(node, { box: 'border-box' })
                // Initial measurement belongs to onSettled. Suspended owners can
                // outlive their DOM, so deferred remount work also checks connection.
                if (measurePanel)
                  queueMicrotask(() => {
                    if (alive && panel === node && node.isConnected)
                      measurePanel?.()
                  })
              }}
            >
              <Button class="table-controls-close" onClick={close}>
                {props.closeLabel ?? messages.closeControls}
              </Button>
              <div class="table-workspace-controls-body">
                <Show when={viewOptions() && canPlace()}>
                  <Field class="table-view-placement">
                    <Label>{messages.controlsPlacement}</Label>
                    <SelectField
                      label={messages.controlsPlacement}
                      choices={[
                        { value: 'left', label: messages.controlsLeft },
                        { value: 'top', label: messages.controlsTop },
                        { value: 'right', label: messages.controlsRight },
                      ]}
                      value={placement()}
                      onValueChange={(value) => {
                        if (
                          value === 'left' ||
                          value === 'top' ||
                          value === 'right'
                        )
                          changePlacement(value)
                      }}
                    />
                  </Field>
                </Show>
                {controls()}
              </div>
            </aside>
            <ResizeHandle
              class="table-workspace-resize"
              ref={(node) => {
                separator = node
              }}
              aria-label={props.controlsLabel ?? messages.controls}
              aria-controls={panelId}
              value={collapsed() ? 0 : (size() ?? measuredSize())}
              collapsed={collapsed()}
              onToggle={() => changeCollapsed(!collapsed())}
              onValueChange={changeSize}
              disabled={props.controlsResizable !== true || narrow()}
              orientation={placement() === 'top' ? 'horizontal' : 'vertical'}
              reverse={placement() === 'right'}
              getAvailableSize={availableSize}
            />
          </>
        )}
      </Show>
      <div
        class="table-workspace-results"
        ref={(node) => {
          results = node
        }}
      >
        <div class="table-workspace-content">{props.children}</div>
        <Show
          when={
            (footer() != null && footer() !== false) ||
            (footerActions() != null && footerActions() !== false)
          }
        >
          <footer
            class="table-workspace-summary"
            ref={(node) => {
              footerElement = node
            }}
          >
            <div role="status">{footer()}</div>
            {footerActions()}
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
    <CollapsibleSection
      class="table-control-section"
      contentClass="table-control-content"
      defaultOpen={props.defaultOpen}
      title={props.title}
      count={props.summary}
    >
      {props.children}
    </CollapsibleSection>
  )
}
