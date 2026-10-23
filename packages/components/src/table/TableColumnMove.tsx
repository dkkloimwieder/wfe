import { createColumnPointer } from '../internal/columnPointer'
import { resolveTableMessages, type TableMessages } from './messages'
import { createEffect, createUniqueId } from 'solid-js'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'

export type ColumnDestination = { id: string; side: 'before' | 'after' }

/** Move IDs without dropping hidden columns or changing their relative order. */
export function moveColumn(
  order: ReadonlyArray<string>,
  id: string,
  destination: ColumnDestination,
) {
  if (id === destination.id || !order.includes(destination.id)) return order
  const next = order.filter((key) => key !== id)
  const index = next.indexOf(destination.id)
  next.splice(index + Number(destination.side === 'after'), 0, id)
  return next.every((key, position) => key === order[position]) ? order : next
}

export function TableColumnMove(props: {
  messages?: Partial<TableMessages>
  id: string
  disabled?: boolean
  label: string
  ids: ReadonlyArray<string>
  onMove: (destination: ColumnDestination) => void
  onActivity?: (
    event: 'start' | 'move' | 'end' | 'cancel',
    listeners: number,
  ) => void
}) {
  const messages = resolveTableMessages(() => props.messages)
  const helpId = createUniqueId()
  const menuId = createUniqueId()
  let handle!: HTMLButtonElement
  let menu!: HTMLDivElement
  let suppressClick = false
  let frame = 0
  let marker: HTMLElement | undefined
  type Drag = {
    pointerId: number
    x: number
    lastX: number
    moved: boolean
    ids: ReadonlyArray<string>
    scroll: HTMLElement
    header: HTMLElement
    destination?: ColumnDestination
  }
  const pointer = createColumnPointer<Drag>({
    disabled: () => Boolean(props.disabled),
    cleanup: (current) => {
      cancelAnimationFrame(frame)
      clearMarker()
      current.header.removeAttribute('data-column-moving')
    },
    escape: () => {
      suppressClick = true
    },
    activity: (event, listeners) => props.onActivity?.(event, listeners),
  })
  const index = () => props.ids.indexOf(props.id)
  const first = () => index() <= 0
  const last = () => index() >= props.ids.length - 1
  function clearMarker() {
    marker?.removeAttribute('data-column-drop')
    marker = undefined
  }
  function updateTarget() {
    if (!pointer.current?.moved) return
    clearMarker()
    pointer.current.destination = undefined
    const headers = Array.from(
      pointer.current.header.parentElement!.querySelectorAll<HTMLElement>(
        '[data-column-header]',
      ),
    ).filter((node) => props.ids.includes(node.dataset.columnHeader!))
    // Only header geometry is read. The record collection is never visited.
    const target = headers.find((node, position) =>
      position === headers.length - 1
        ? true
        : pointer.current!.lastX < node.getBoundingClientRect().right,
    )
    if (!target) return
    const box = target.getBoundingClientRect()
    const destination: ColumnDestination = {
      id: target.dataset.columnHeader!,
      side:
        pointer.current.lastX < box.left + box.width / 2 ? 'before' : 'after',
    }
    if (moveColumn(props.ids, props.id, destination) === props.ids) return
    pointer.current.destination = destination
    marker = target
    marker.dataset.columnDrop = destination.side
  }
  function autoScroll() {
    if (!pointer.current?.moved) return
    const box = pointer.current.scroll.getBoundingClientRect()
    const direction =
      pointer.current.lastX < box.left + 28
        ? -1
        : pointer.current.lastX > box.right - 28
          ? 1
          : 0
    if (!direction) return
    const previous = pointer.current.scroll.scrollLeft
    pointer.current.scroll.scrollLeft += direction * 12
    updateTarget()
    if (pointer.current.scroll.scrollLeft !== previous)
      frame = requestAnimationFrame(autoScroll)
  }
  function start(event: PointerEvent) {
    if (!pointer.canStart(event) || props.ids.length < 2) return
    const header = handle.closest<HTMLElement>('[data-column-header]')
    const scroll = header?.closest<HTMLElement>('.table-scroll')
    if (!header?.parentElement || !scroll) return
    suppressClick = false
    menu.hidePopover()
    pointer.start(
      event,
      handle,
      () => ({
        pointerId: event.pointerId,
        x: event.clientX,
        lastX: event.clientX,
        moved: false,
        ids: props.ids,
        scroll,
        header,
      }),
      () => ({ target: scroll, changed: updateTarget }),
    )
  }
  function move(event: PointerEvent) {
    if (!pointer.current || event.pointerId !== pointer.current.pointerId)
      return
    if (props.disabled || props.ids !== pointer.current.ids)
      return pointer.cancel()
    pointer.current.lastX = event.clientX
    pointer.current.moved ||= Math.abs(event.clientX - pointer.current.x) >= 5
    if (!pointer.current.moved) return
    suppressClick = true
    pointer.current.header.dataset.columnMoving = 'true'
    updateTarget()
    cancelAnimationFrame(frame)
    autoScroll()
    props.onActivity?.('move', 0)
  }
  function finish(event: PointerEvent) {
    if (!pointer.current || event.pointerId !== pointer.current.pointerId)
      return
    move(event)
    const current = pointer.finish()
    if (!current) return
    if (current.destination)
      if (!props.disabled) props.onMove(current.destination)
  }
  function keyboardMove(key: string) {
    if (props.disabled) return
    const position = index()
    const target =
      key === 'Home'
        ? 0
        : key === 'End'
          ? props.ids.length - 1
          : position + (key === 'ArrowLeft' ? -1 : 1)
    if (target < 0 || target >= props.ids.length || target === position) return
    menu.hidePopover()
    handle.focus({ preventScroll: true })
    props.onMove({
      id: props.ids[target]!,
      side: target < position ? 'before' : 'after',
    })
  }
  createEffect(
    () => props.ids,
    (ids) => {
      if (pointer.current && ids !== pointer.current.ids) pointer.cancel()
    },
  )
  return (
    <>
      <Button
        tone="neutral"
        type="button"
        class="column-move"
        aria-label={messages.moveColumn(props.label)}
        aria-describedby={helpId}
        aria-controls={menuId}
        aria-expanded="false"
        disabled={props.disabled || props.ids.length < 2}
        ref={[
          (node) => {
            handle = node
          },
          nativeEvents<HTMLButtonElement>({
            pointerdown: start,
            pointermove: move,
            pointerup: finish,
            pointercancel: pointer.cancelPointer,
            lostpointercapture: pointer.cancelPointer,
            click: (event) => {
              event.stopPropagation()
              if (props.disabled || (suppressClick && event.detail !== 0))
                return
              const box = handle.getBoundingClientRect()
              menu.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - 188))}px`
              menu.style.top = `${Math.max(8, Math.min(box.bottom + 4, window.innerHeight - 190))}px`
              menu.togglePopover()
              if (menu.matches(':popover-open'))
                menu
                  .querySelector<HTMLButtonElement>('button:not(:disabled)')
                  ?.focus()
            },
            keydown: (event) => {
              if (
                event.isComposing ||
                pointer.current ||
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              )
                return
              event.preventDefault()
              event.stopPropagation()
              keyboardMove(event.key)
            },
          }),
        ]}
      >
        {props.label}
      </Button>
      <span id={helpId} class="sr-only">
        {messages.moveHelp}
      </span>
      <div
        id={menuId}
        popover="auto"
        class="column-move-menu"
        role="group"
        aria-label={messages.moveColumn(props.label)}
        ref={[
          (node) => {
            menu = node
          },
          nativeEvents<HTMLDivElement>({
            beforetoggle: (event) => {
              handle.setAttribute(
                'aria-expanded',
                String(event.newState === 'open'),
              )
            },
          }),
        ]}
      >
        <Button
          disabled={props.disabled || first()}
          ref={nativeEvents({ click: () => keyboardMove('Home') })}
        >
          {messages.moveFirst}
        </Button>
        <Button
          disabled={props.disabled || first()}
          ref={nativeEvents({ click: () => keyboardMove('ArrowLeft') })}
        >
          {messages.moveLeft}
        </Button>
        <Button
          disabled={props.disabled || last()}
          ref={nativeEvents({ click: () => keyboardMove('ArrowRight') })}
        >
          {messages.moveRight}
        </Button>
        <Button
          disabled={props.disabled || last()}
          ref={nativeEvents({ click: () => keyboardMove('End') })}
        >
          {messages.moveLast}
        </Button>
      </div>
    </>
  )
}
