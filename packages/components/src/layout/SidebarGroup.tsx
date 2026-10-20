import { ownedElementEvents } from '../internal/events'
import { nativeEvents } from '../utils/nativeEvents'
import { ownsFocus } from '../internal/ownedFocus'
import { Show, createSignal, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Collapsible } from '../components/Collapsible'
import { Button } from '../components/NativeFields'
import { Popover } from '../components/Popover'
import { Icon } from '../components/Icon'
import { buttonAttributes } from '../internal/buttonPresentation'

export type SidebarGroupProps = {
  label: string
  icon: JSX.Element
  active?: boolean
  compact: boolean
  behavior?: 'flyout' | 'expand'
  open: boolean
  onOpenChange: (open: boolean) => void
  onExpand: () => void
  children: (close: () => void) => JSX.Element
}

/** Navigation presentation only. The application supplies links and selection. */
export function SidebarGroup(props: SidebarGroupProps) {
  let section: HTMLDivElement | undefined
  let alive = true
  let focused: HTMLElement | undefined
  const focusHandlers = {
    onFocusIn: (event: FocusEvent) => {
      focused = event.target as HTMLElement
    },
    onFocusOut: (event: FocusEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        !ownsFocus(section, event.relatedTarget)
      )
        focused = undefined
    },
  }
  const focusEvents = ownedElementEvents(focusHandlers)
  function retainFocus() {
    onCleanup(() => {
      const previous = focused
      const document = section?.ownerDocument
      if (
        !previous ||
        !document ||
        (document.activeElement !== previous &&
          !(document.activeElement === document.body && !previous.isConnected))
      )
        return
      queueMicrotask(() => {
        if (
          !alive ||
          !section?.isConnected ||
          (document.activeElement !== previous &&
            document.activeElement !== document.body)
        )
          return
        const replacement =
          section.querySelector<HTMLElement>('summary, button')
        if (
          !replacement?.getClientRects().length ||
          replacement.closest('[hidden], [inert], [aria-hidden="true"]') ||
          getComputedStyle(replacement).visibility !== 'visible'
        )
          return
        replacement.focus({ preventScroll: true })
      })
    })
  }
  onCleanup(() => {
    alive = false
    section = undefined
    focused = undefined
  })
  function expand() {
    props.onOpenChange(true)
    props.onExpand()
  }
  function Inline() {
    retainFocus()
    return (
      <Collapsible
        summary={
          <>
            <span
              {...buttonAttributes({ class: 'ui-sidebar-group-icon' })}
              aria-hidden="true"
              data-ui-active={props.active ? 'true' : undefined}
            >
              {props.icon}
            </span>
            <span class="ui-sidebar-group-label">{props.label}</span>
            <span class="ui-sidebar-group-chevron">
              <Icon name="chevron-right" />
            </span>
          </>
        }
        open={props.open}
        onOpenChange={props.onOpenChange}
      >
        <div class="ui-dashboard-menu">{props.children(() => {})}</div>
      </Collapsible>
    )
  }
  function Expand() {
    retainFocus()
    return (
      <Button
        aria-label={props.label}
        title={props.label}
        aria-pressed={props.active ? 'true' : 'false'}
        onClick={expand}
      >
        {props.icon}
      </Button>
    )
  }

  function Flyout() {
    retainFocus()
    // Transient popup state belongs to this presentation, not the inline group.
    const [open, setOpen] = createSignal(false)
    function Content() {
      let content: HTMLElement | undefined
      onCleanup(() => {
        content = undefined
      })
      return (
        <Popover.Content
          class="ui-sidebar-flyout"
          onCloseAutoFocus={(event) => {
            const document = section?.ownerDocument
            const active = document?.activeElement
            if (
              active &&
              active !== document?.body &&
              !ownsFocus(section, active) &&
              !content?.contains(active)
            )
              event.preventDefault()
          }}
          ref={[
            (node) => {
              content = node
            },
            nativeEvents({
              focusin: focusHandlers.onFocusIn,
              focusout: focusHandlers.onFocusOut,
            }),
          ]}
        >
          <Popover.Title>{props.label}</Popover.Title>
          <div class="ui-dashboard-menu">
            {props.children(() => setOpen(false))}
          </div>
        </Popover.Content>
      )
    }
    return (
      <Popover
        open={open()}
        onOpenChange={setOpen}
        placement="right-start"
        gutter={12}
      >
        <Popover.Trigger
          aria-label={props.label}
          title={props.label}
          aria-pressed={props.active ? 'true' : 'false'}
        >
          {props.icon}
        </Popover.Trigger>
        <Popover.Portal>
          <Content />
        </Popover.Portal>
      </Popover>
    )
  }
  return (
    <div
      class="ui-sidebar-group"
      data-compact={props.compact ? '' : undefined}
      ref={[
        (node) => {
          section = node
        },
        focusEvents,
      ]}
    >
      <Show when={props.compact} fallback={<Inline />}>
        <Show
          when={(props.behavior ?? 'flyout') === 'flyout'}
          fallback={<Expand />}
        >
          <Flyout />
        </Show>
      </Show>
    </div>
  )
}
