import { ownsFocus } from '../internal/ownedFocus'
import {
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  merge,
  omit,
  onCleanup,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'

export type ResizeHandleProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  | 'role'
  | 'tabindex'
  | 'aria-orientation'
  | 'aria-valuenow'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'children'
> & {
  value: number
  onValueChange: (value: number) => void
  /** Separator orientation. A vertical separator adjusts pane widths. */
  orientation?: 'vertical' | 'horizontal'
  /** The primary pane follows the separator in logical layout order. */
  reverse?: boolean
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  collapsed?: boolean
  onToggle?: () => void
  getAvailableSize: () => number
  'aria-controls': string
} & (
    | { 'aria-label': string; 'aria-labelledby'?: string }
    | { 'aria-label'?: string; 'aria-labelledby': string }
  )

function bounds(min = 10, max = 90, step = 1) {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min <= 0 ||
    max >= 100 ||
    min > max ||
    !Number.isFinite(step) ||
    step <= 0
  )
    throw new Error(
      'Resizable requires finite bounds within 0 and 100 and a positive step',
    )
  return { min, max, step }
}
function percent(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100)
    throw new Error('Resizable size must be a finite percentage from 0 to 100')
  return value
}

/** One controlled separator for pane grids, including TableWorkspace. */
export function ResizeHandle(props: ResizeHandleProps) {
  function configuration() {
    return bounds(props.min, props.max, props.step)
  }
  untrack(() => {
    configuration()
    percent(props.value)
  })
  let node: HTMLDivElement | undefined
  let gesture:
    | {
        id: number
        start: number
        value: number
        requested: number
        extent: number
        sign: number
      }
    | undefined
  let previousPointerDragged = false
  let pointerDragged = false
  let detach: (() => void) | undefined
  const vertical = () => props.orientation !== 'horizontal'
  const disabled = () =>
    Boolean(props.disabled || (props.min ?? 10) === (props.max ?? 90))
  function sign() {
    return (
      (props.reverse ? -1 : 1) *
      (vertical() && node && getComputedStyle(node).direction === 'rtl'
        ? -1
        : 1)
    )
  }
  function stop() {
    const previous = gesture
    gesture = undefined
    detach?.()
    detach = undefined
    if (node) {
      node.removeAttribute('data-resizing')
      if (previous && node.hasPointerCapture?.(previous.id))
        node.releasePointerCapture(previous.id)
    }
  }
  function request(value: number) {
    const { min, max } = configuration()
    const rounded = Math.round(value * 10000) / 10000
    const next = Math.max(min, Math.min(max, rounded))
    if (gesture) gesture.requested = next
    if (next !== props.value) props.onValueChange(next)
  }
  function move(event: PointerEvent, released = false) {
    const drag = gesture
    if (!drag || drag.id !== event.pointerId) return
    const extent = props.getAvailableSize()
    if (
      !Number.isFinite(extent) ||
      extent <= 0 ||
      Math.abs(props.value - drag.requested) > 0.0001 ||
      (!released && event.buttons === 0) ||
      disabled() ||
      Math.abs(extent - drag.extent) > 0.5 ||
      sign() !== drag.sign
    ) {
      stop()
      return
    }
    const delta = (vertical() ? event.clientX : event.clientY) - drag.start
    if (!pointerDragged && Math.abs(delta) <= 3) return
    pointerDragged = true
    event.preventDefault()
    request(
      drag.value +
        ((((vertical() ? event.clientX : event.clientY) - drag.start) *
          drag.sign) /
          drag.extent) *
          100,
    )
  }
  const events = ownedElementEvents(
    merge(props, {
      onPointerDown(
        event: PointerEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        if (
          callHandler(event, props.onPointerDown) ||
          disabled() ||
          event.button !== 0 ||
          !event.isPrimary ||
          !node ||
          gesture
        )
          return
        previousPointerDragged = pointerDragged
        pointerDragged = false
        if (props.collapsed) return
        const extent = props.getAvailableSize()
        if (!Number.isFinite(extent) || extent <= 0) return
        event.preventDefault()
        node.focus({ preventScroll: true })
        node.setPointerCapture(event.pointerId)
        gesture = {
          id: event.pointerId,
          start: vertical() ? event.clientX : event.clientY,
          value: props.value,
          requested: props.value,
          extent,
          sign: sign(),
        }
        node.setAttribute('data-resizing', '')
        const doc = node.ownerDocument
        const view = doc.defaultView
        const hidden = () => {
          if (doc.hidden) stop()
        }
        view?.addEventListener('blur', stop)
        doc.addEventListener('visibilitychange', hidden)
        detach = () => {
          view?.removeEventListener('blur', stop)
          doc.removeEventListener('visibilitychange', hidden)
        }
      },
      onPointerMove(
        event: PointerEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        if (!callHandler(event, props.onPointerMove)) move(event)
      },
      onPointerUp(
        event: PointerEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        if (!callHandler(event, props.onPointerUp)) move(event, true)
        if (gesture?.id === event.pointerId) stop()
      },
      onPointerCancel(
        event: PointerEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        callHandler(event, props.onPointerCancel)
        if (gesture?.id === event.pointerId) stop()
      },
      onLostPointerCapture(
        event: PointerEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        callHandler(event, props.onLostPointerCapture)
        if (gesture?.id === event.pointerId) stop()
      },
      onDblClick(
        event: MouseEvent & { currentTarget: HTMLDivElement; target: Element },
      ) {
        if (
          callHandler(event, props.onDblClick) ||
          previousPointerDragged ||
          pointerDragged ||
          disabled() ||
          !props.onToggle
        )
          return
        event.preventDefault()
        stop()
        props.onToggle()
      },
      onKeyDown(
        event: KeyboardEvent & {
          currentTarget: HTMLDivElement
          target: Element
        },
      ) {
        if (
          callHandler(event, props.onKeyDown) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        if (event.key === 'Escape' && gesture) {
          event.preventDefault()
          stop()
          return
        }
        if (disabled()) return
        if (event.key === 'Enter' && props.onToggle) {
          event.preventDefault()
          if (!event.repeat) {
            stop()
            props.onToggle()
          }
          return
        }
        if (props.collapsed) return
        const { min, max, step } = configuration()
        const increase = vertical() ? 'ArrowRight' : 'ArrowDown'
        const decrease = vertical() ? 'ArrowLeft' : 'ArrowUp'
        if (![increase, decrease, 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        stop()
        request(
          event.key === 'Home'
            ? min
            : event.key === 'End'
              ? max
              : props.value +
                (event.key === increase ? 1 : -1) *
                  sign() *
                  step *
                  (event.shiftKey ? 10 : 1),
        )
      },
    }),
  )
  const dragConfiguration = createMemo(
    () =>
      [
        Boolean(props.disabled),
        props.orientation ?? 'vertical',
        Boolean(props.reverse),
        props.min ?? 10,
        props.max ?? 90,
        props.step ?? 1,
        Boolean(props.collapsed),
      ] as const,
    {
      equals: (left, right) =>
        left.every((value, index) => value === right[index]),
    },
  )
  createEffect(dragConfiguration, ([, , , min, max, step]) => {
    bounds(min, max, step)
    stop()
  })
  createEffect(
    () => props.value,
    (value) => {
      percent(value)
      if (gesture && Math.abs(value - gesture.requested) > 0.0001) stop()
    },
  )
  onCleanup(() => {
    stop()
    node = undefined
  })
  const attributes = omit(
    props,
    'value',
    'onValueChange',
    'orientation',
    'reverse',
    'min',
    'max',
    'step',
    'disabled',
    'getAvailableSize',
    'collapsed',
    'onToggle',
    'class',
    'ref',
    ...nativeEventProps,
  )
  const references = untrack(() => [
    (element: HTMLDivElement) => {
      node = element
    },
    props.ref,
    events,
  ])
  return (
    <div
      {...attributes}
      data-ui=""
      title={
        props.title ??
        (props.onToggle
          ? 'Double-click or press Enter to close or reopen the pane'
          : undefined)
      }
      class={styledClasses('ui-resize-handle', props.class)}
      ref={references}
      role="separator"
      tabindex={disabled() ? -1 : 0}
      aria-disabled={disabled() ? 'true' : undefined}
      aria-orientation={vertical() ? 'vertical' : 'horizontal'}
      aria-valuenow={props.value}
      aria-valuemin={Math.min(props.min ?? 10, props.value)}
      aria-valuemax={Math.max(props.max ?? 90, props.value)}
    />
  )
}

export type ResizableProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'style'
> & {
  style?: JSX.CSSProperties
  primary: JSX.Element
  children: JSX.Element
  primaryLabel: string
  secondaryLabel?: string
  orientation?: 'horizontal' | 'vertical'
  size?: number
  defaultSize?: number
  onSizeChange?: (size: number) => void
  minSize?: number
  maxSize?: number
  step?: number
  disabled?: boolean
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

/** Two retained panes. Size is the primary share of space excluding the handle. */
export function Resizable(props: ResizableProps) {
  const [localCollapsed, setLocalCollapsed] = createSignal(
    untrack(() => props.defaultCollapsed ?? false),
  )
  const collapsed = () => props.collapsed ?? localCollapsed()
  let primary: HTMLDivElement | undefined
  let secondary: HTMLDivElement | undefined
  let handle: HTMLDivElement | undefined
  function changeCollapsed(next: boolean) {
    if (next && ownsFocus(primary)) handle?.focus({ preventScroll: true })
    if (props.collapsed === undefined) setLocalCollapsed(next)
    props.onCollapsedChange?.(next)
  }
  createRenderEffect(collapsed, (hidden) => {
    if (hidden && ownsFocus(primary)) handle?.focus({ preventScroll: true })
  })
  const controlled = untrack(() => props.size !== undefined)
  const [local, setLocal] = createSignal(untrack(() => props.defaultSize ?? 30))
  const size = () => props.size ?? local()
  const id = `resizable-primary-${createUniqueId()}`
  function validate(
    value: number,
    minSize?: number,
    maxSize?: number,
    step?: number,
  ) {
    const { min, max } = bounds(minSize, maxSize, step)
    const current = percent(value)
    if (current < min || current > max)
      throw new Error('Resizable size must stay within its bounds')
  }
  untrack(() => validate(size(), props.minSize, props.maxSize, props.step))
  createEffect(
    () =>
      [props.size, local(), props.minSize, props.maxSize, props.step] as const,
    ([value, current, min, max, step]) => {
      if ((value !== undefined) !== controlled)
        throw new Error('Resizable cannot change control mode')
      validate(value ?? current, min, max, step)
    },
  )
  function change(next: number) {
    if (!controlled) setLocal(next)
    props.onSizeChange?.(next)
  }
  const attributes = omit(
    props,
    'collapsed',
    'defaultCollapsed',
    'onCollapsedChange',
    'primary',
    'children',
    'primaryLabel',
    'secondaryLabel',
    'orientation',
    'size',
    'defaultSize',
    'onSizeChange',
    'minSize',
    'maxSize',
    'step',
    'disabled',
    'class',
    'style',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  const references = untrack(() => [props.ref, events])
  onCleanup(() => {
    primary = undefined
    secondary = undefined
    handle = undefined
  })
  return (
    <div
      {...attributes}
      data-ui=""
      class={styledClasses('ui-resizable', props.class)}
      data-collapsed={collapsed() ? '' : undefined}
      data-orientation={props.orientation ?? 'horizontal'}
      ref={references}
      style={{
        ...props.style,
        '--ui-primary-size': `${collapsed() ? 0 : size()}fr`,
        '--ui-secondary-size': `${collapsed() ? 100 : 100 - size()}fr`,
      }}
    >
      <div
        class="ui-resizable-pane"
        id={id}
        hidden={collapsed()}
        role="region"
        aria-label={props.primaryLabel}
        ref={(node) => {
          primary = node
        }}
      >
        {props.primary}
      </div>
      <ResizeHandle
        value={collapsed() ? 0 : size()}
        collapsed={collapsed()}
        onToggle={() => changeCollapsed(!collapsed())}
        ref={(node) => {
          handle = node
        }}
        onValueChange={change}
        min={props.minSize}
        max={props.maxSize}
        step={props.step}
        disabled={props.disabled}
        aria-label={props.primaryLabel}
        aria-controls={id}
        orientation={
          props.orientation === 'vertical' ? 'horizontal' : 'vertical'
        }
        getAvailableSize={() =>
          props.orientation === 'vertical'
            ? (primary?.getBoundingClientRect().height ?? 0) +
              (secondary?.getBoundingClientRect().height ?? 0)
            : (primary?.getBoundingClientRect().width ?? 0) +
              (secondary?.getBoundingClientRect().width ?? 0)
        }
      />
      <div
        class="ui-resizable-pane"
        role={props.secondaryLabel ? 'region' : undefined}
        aria-label={props.secondaryLabel}
        ref={(node) => {
          secondary = node
        }}
      >
        {props.children}
      </div>
    </div>
  )
}
