import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  omit,
  onSettled,
  untrack,
  useContext,
} from 'solid-js'
import type { Component } from 'solid-js'
import type { JSX, ValidComponent } from '@solidjs/web'
import { DropdownMenu } from './DropdownMenu'
import type {
  DropdownMenuRootProps,
  DropdownMenuContentProps,
  DropdownMenuSubContentProps,
} from './DropdownMenu'
import type { PolymorphicProps } from '../vendor/kobalte/core/src/polymorphic'
import { usePopupScope } from './popupScope'
import { nativeEventProps, ownedElementEvents } from '../internal/events'
import { nativeEvents } from '../utils/nativeEvents'
import { styledClasses } from '../internal/classes'
import { useMenuContext } from '../vendor/kobalte/core/src/menu/menu-context'

type Point = { x: number; y: number; width: number; height: number }
const ContextScope = createContext<{
  position: (point: Point) => void
}>()

export type ContextMenuRootProps = Omit<
  DropdownMenuRootProps,
  'getAnchorRect' | 'observeAnchorLayout'
>

export function ContextMenuRoot(props: ContextMenuRootProps) {
  const [point, setPoint] = createSignal<Point>()
  const anchorRect = createMemo(() => {
    const current = point()
    return () => current
  })
  return (
    <ContextScope value={{ position: setPoint }}>
      <DropdownMenu.Root
        {...props}
        getAnchorRect={anchorRect()}
        observeAnchorLayout={false}
      />
    </ContextScope>
  )
}

export type ContextMenuTriggerProps = JSX.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean
  /** Touch hold duration in milliseconds. Moving or releasing cancels the hold. */
  longPressDelay?: number
}

/** A focusable region whose ordinary click remains available to the application. */
export function ContextMenuTrigger(props: ContextMenuTriggerProps) {
  const context = useContext(ContextScope)
  if (!context) throw new Error('Use ContextMenu.Trigger inside ContextMenu')
  const menu = useMenuContext()
  const popup = usePopupScope()
  const generated = `context-trigger-${createUniqueId()}`
  const id = () => props.id || generated
  let timer: ReturnType<typeof setTimeout> | undefined
  let touch: { id: number; x: number; y: number } | undefined
  let suppressContext = false
  let suppressClick = false
  let trigger: HTMLDivElement | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    touch = undefined
  }
  onSettled(() => {
    const node = trigger
    const click = (event: MouseEvent) => {
      if (!suppressClick) return
      suppressClick = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    node?.addEventListener('click', click, true)
    return () => {
      cancel()
      node?.removeEventListener('click', click, true)
      trigger = undefined
    }
  })
  createEffect(id, (value) => menu.registerTriggerId(value))
  createEffect(
    () => props.disabled,
    (disabled) => {
      if (disabled) cancel()
    },
  )
  function editable(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(target.closest('input, textarea, [contenteditable="true"]'))
    )
  }
  function open(x: number, y: number) {
    if (props.disabled) return
    context!.position({ x, y, width: 0, height: 0 })
    menu.open('first')
  }
  const caller = ownedElementEvents(props)
  const events = nativeEvents<HTMLDivElement>({
    contextmenu: (event) => {
      cancel()
      if (suppressContext) {
        suppressContext = false
        event.preventDefault()
        return
      }
      if (event.defaultPrevented || props.disabled || editable(event.target))
        return
      event.preventDefault()
      if (event.clientX === 0 && event.clientY === 0) {
        const rect = event.currentTarget.getBoundingClientRect()
        open(rect.left, rect.bottom)
      } else open(event.clientX, event.clientY)
    },
    keydown: (event) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        props.disabled ||
        editable(event.target) ||
        !(
          event.key === 'ContextMenu' ||
          (event.shiftKey && event.key === 'F10')
        )
      )
        return
      event.preventDefault()
      cancel()
      const rect = event.currentTarget.getBoundingClientRect()
      open(rect.left, rect.bottom)
    },
    pointerdown: (event) => {
      cancel()
      suppressContext = false
      suppressClick = false
      if (
        event.defaultPrevented ||
        props.disabled ||
        event.isPrimary === false ||
        event.pointerType !== 'touch' ||
        event.button !== 0 ||
        editable(event.target) ||
        (event.target instanceof Element &&
          event.target.closest('button, a, [role="button"]'))
      )
        return
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY }
      timer = setTimeout(
        () => {
          untrack(() => {
            const point = touch
            cancel()
            if (!point || props.disabled) return
            suppressContext = true
            suppressClick = true
            open(point.x, point.y)
          })
        },
        Math.max(0, props.longPressDelay ?? 600),
      )
    },
    pointermove: (event) => {
      if (
        touch &&
        (event.pointerId !== touch.id ||
          Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8)
      )
        cancel()
    },
    pointerup: cancel,
    pointercancel: cancel,
    pointerleave: cancel,
    dragstart: cancel,
  })
  const attributes = omit(
    props,
    'ref',
    'disabled',
    'longPressDelay',
    ...nativeEventProps,
  )
  return (
    <div
      {...attributes}
      id={id()}
      role={props.role ?? 'group'}
      tabindex={props.tabindex ?? 0}
      aria-haspopup="menu"
      aria-expanded={menu.isOpen() ? 'true' : 'false'}
      aria-controls={menu.isOpen() ? menu.contentId() : undefined}
      aria-disabled={props.disabled ? 'true' : undefined}
      data-ui=""
      class={styledClasses('ui-context-trigger', props.class)}
      ref={[
        untrack(() => props.ref),
        (node) => {
          trigger = node
        },
        menu.setTriggerRef,
        popup.setTrigger,
        caller,
        events,
      ]}
    />
  )
}

function ContextMenuContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuContentProps<T>>,
) {
  const Content = DropdownMenu.Content as Component<typeof props>
  return (
    <Content
      data-ui-section-decoration="primary"
      data-ui-section-always=""
      {...props}
    />
  )
}

function ContextMenuSubContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>,
) {
  const Content = DropdownMenu.SubContent as Component<typeof props>
  return (
    <Content
      data-ui-section-decoration="primary"
      data-ui-section-always=""
      {...props}
    />
  )
}

/** Context opening shares the existing menu engine, portal, items and submenus. */
export const ContextMenu = /* @__PURE__ */ Object.assign(ContextMenuRoot, {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Portal: DropdownMenu.Portal,
  Content: ContextMenuContent,
  Item: DropdownMenu.Item,
  ItemLabel: DropdownMenu.ItemLabel,
  ItemDescription: DropdownMenu.ItemDescription,
  ItemIndicator: DropdownMenu.ItemIndicator,
  CheckboxItem: DropdownMenu.CheckboxItem,
  RadioGroup: DropdownMenu.RadioGroup,
  RadioItem: DropdownMenu.RadioItem,
  Group: DropdownMenu.Group,
  GroupLabel: DropdownMenu.GroupLabel,
  Separator: DropdownMenu.Separator,
  Sub: DropdownMenu.Sub,
  SubTrigger: DropdownMenu.SubTrigger,
  SubContent: ContextMenuSubContent,
  Arrow: DropdownMenu.Arrow,
})
