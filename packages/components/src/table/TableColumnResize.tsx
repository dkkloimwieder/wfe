import { createColumnPointer } from '../internal/columnPointer'
import { resolveTableMessages, type TableMessages } from './messages'
import { createEffect, createMemo, createUniqueId } from 'solid-js'
import { nativeEvents } from '../utils/nativeEvents'

/** Controlled width input. Pointer movement updates the rendered column. */
export function TableColumnResize(props: {
  messages?: Partial<TableMessages>
  disabled?: boolean
  label: string
  size: number
  min: number
  max: number
  onSizeChange: (size: number) => void
  onActivity?: (
    event: 'start' | 'move' | 'end' | 'cancel' | 'change',
    listeners: number,
  ) => void
}) {
  const messages = resolveTableMessages(() => props.messages)
  const helpId = createUniqueId()
  let handle!: HTMLDivElement
  type Drag = {
    pointerId: number
    x: number
    width: number
    min: number
    max: number
    scroll: HTMLElement | null
    scrollLeft: number
    lastX: number
    next: number
  }
  const pointer = createColumnPointer<Drag>({
    disabled: () => Boolean(props.disabled),
    cleanup: () => {},
    activity: (event, listeners) => props.onActivity?.(event, listeners),
  })
  const configuration = createMemo(
    () => [props.size, props.min, props.max] as const,
    {
      equals: (left, right) =>
        left.every((value, index) => value === right[index]),
    },
  )
  const clamp = (value: number) =>
    Math.min(props.max, Math.max(props.min, Math.round(value)))
  function update(x: number) {
    if (!pointer.current) return
    if (props.disabled) {
      pointer.cancel()
      return
    }
    if (
      props.size !== pointer.current.next ||
      props.min !== pointer.current.min ||
      props.max !== pointer.current.max
    ) {
      pointer.cancel()
      return
    }
    pointer.current.lastX = x
    const next = clamp(
      pointer.current.width +
        x -
        pointer.current.x +
        (pointer.current.scroll?.scrollLeft ?? 0) -
        pointer.current.scrollLeft,
    )
    pointer.current.next = next
    change(next)
  }
  function scroll() {
    if (pointer.current) update(pointer.current.lastX)
  }
  function start(event: PointerEvent) {
    if (!pointer.canStart(event)) return
    pointer.start(
      event,
      handle,
      () => {
        const scroller = handle.closest<HTMLElement>('.table-scroll')
        return {
          pointerId: event.pointerId,
          x: event.clientX,
          lastX: event.clientX,
          width: props.size,
          min: props.min,
          max: props.max,
          next: props.size,
          scroll: scroller,
          scrollLeft: scroller?.scrollLeft ?? 0,
        }
      },
      (value) =>
        value.scroll ? { target: value.scroll, changed: scroll } : undefined,
    )
  }
  function change(size: number) {
    if (props.disabled) return
    const next = clamp(size)
    if (next === props.size) return
    props.onSizeChange(next)
    props.onActivity?.('change', 0)
  }
  function finish(event: PointerEvent) {
    if (!pointer.current || pointer.current.pointerId !== event.pointerId)
      return
    update(event.clientX)
    pointer.finish()
  }
  // Observe caller changes and release a gesture whose width or bounds changed.
  createEffect(configuration, ([size, min, max]) => {
    if (
      pointer.current &&
      (size !== pointer.current.next ||
        min !== pointer.current.min ||
        max !== pointer.current.max)
    ) {
      pointer.cancel()
    }
  })
  return (
    <>
      <div
        class="column-resize"
        role="separator"
        tabindex={props.disabled ? -1 : 0}
        aria-disabled={props.disabled ? 'true' : undefined}
        aria-orientation="vertical"
        aria-label={messages.resizeColumn(props.label)}
        aria-describedby={helpId}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuenow={props.size}
        aria-valuetext={messages.pixelSize(props.size)}
        ref={[
          (node) => {
            handle = node
          },
          nativeEvents<HTMLDivElement>({
            pointerdown: start,
            pointermove: (event) => {
              if (
                !pointer.current ||
                event.pointerId !== pointer.current.pointerId
              )
                return
              update(event.clientX)
              props.onActivity?.('move', 0)
            },
            pointerup: finish,
            pointercancel: pointer.cancelPointer,
            lostpointercapture: pointer.cancelPointer,
            click: (event) => event.stopPropagation(),
            keydown: (event) => {
              if (props.disabled || pointer.current || event.isComposing) return
              const step = event.shiftKey ? 50 : 10
              const value =
                event.key === 'ArrowLeft'
                  ? props.size - step
                  : event.key === 'ArrowRight'
                    ? props.size + step
                    : event.key === 'Home'
                      ? props.min
                      : event.key === 'End'
                        ? props.max
                        : undefined
              if (value !== undefined) {
                event.preventDefault()
                event.stopPropagation()
                change(value)
              }
            },
          }),
        ]}
      >
        <span class="resize-grip" aria-hidden="true" />
      </div>
      <span id={helpId} class="sr-only">
        {messages.resizeHelp}
      </span>
    </>
  )
}
