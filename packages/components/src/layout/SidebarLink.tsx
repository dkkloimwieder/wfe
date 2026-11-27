import { merge, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import { styledClasses } from '../internal/classes'

type LinkClick = Parameters<JSX.EventHandler<HTMLAnchorElement, MouseEvent>>[0]

export type SidebarLinkProps = Omit<
  JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onSelect'
> & {
  href: string
  active?: boolean
  /** Handle an ordinary same-window activation in the application. */
  onSelect?: (event: LinkClick) => void
  closeGroup?: () => void
  closeNavigation?: () => void
  /** Resolve the destination heading after navigation. */
  focusTarget?: () => HTMLElement | null | undefined
  /** Resolve the destination scroll container after navigation. */
  scrollTarget?: () => HTMLElement | null | undefined
}

/** A native sidebar link with optional in-app navigation and destination focus. */
export function SidebarLink(props: SidebarLinkProps) {
  const attributes = omit(
    props,
    'active',
    'closeGroup',
    'closeNavigation',
    'focusTarget',
    'scrollTarget',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(
    merge(omit(props, 'onSelect'), {
      onClick(event: LinkClick) {
        callHandler(event, props.onClick)
        const link = event.currentTarget
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          (link.target && link.target.toLowerCase() !== '_self') ||
          link.hasAttribute('download') ||
          !props.onSelect
        )
          return
        event.preventDefault()
        const document = link.ownerDocument
        const focusTarget = props.focusTarget
        const scrollTarget = props.scrollTarget
        props.onSelect(event)
        props.closeGroup?.()
        props.closeNavigation?.()
        if (!focusTarget && !scrollTarget) return
        const origin = document.activeElement
        queueMicrotask(() => {
          const scroll = scrollTarget?.()
          if (scroll?.isConnected) scroll.scrollTo(0, 0)
          if (
            document.activeElement === origin ||
            document.activeElement === document.body
          ) {
            const target = focusTarget?.()
            if (target?.isConnected) target.focus({ preventScroll: true })
          }
        })
      },
    }),
  )
  return (
    <a
      {...attributes}
      class={styledClasses('ui-sidebar-link', props.class)}
      aria-current={props.active ? 'page' : props['aria-current']}
      data-ui-text={props['data-ui-text'] ?? 'system'}
      ref={[props.ref, events]}
    />
  )
}
