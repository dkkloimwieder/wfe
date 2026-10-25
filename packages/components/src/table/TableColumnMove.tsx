import {
  createSortable,
  createSortableItem,
  createSortableTarget,
} from '../sortable'
import type { SortableScope, SortableMove } from '../sortable'
import { resolveTableMessages, type TableMessages } from './messages'
import {
  For,
  createEffect,
  createSignal,
  createUniqueId,
  onSettled,
  untrack,
} from 'solid-js'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'

export type ColumnDestination = { id: string; side: 'before' | 'after' }

/** Move IDs without dropping hidden columns or changing their relative order. */
export function moveColumn(
  order: ReadonlyArray<string>,
  id: string,
  destination: ColumnDestination,
) {
  if (
    id === destination.id ||
    !order.includes(id) ||
    !order.includes(destination.id)
  )
    return order
  const next = order.filter((key) => key !== id)
  const index = next.indexOf(destination.id)
  next.splice(index + Number(destination.side === 'after'), 0, id)
  return next.every((key, position) => key === order[position]) ? order : next
}

export function columnMoveDestination(
  ids: ReadonlyArray<string>,
  move: SortableMove,
): ColumnDestination | undefined {
  if (move.destination.beforeId !== null)
    return { id: String(move.destination.beforeId), side: 'before' }
  const last = ids.filter((id) => id !== move.itemId).at(-1)
  return last === undefined ? undefined : { id: last, side: 'after' }
}

export function TableColumnMove(props: {
  /** A table supplies one shared sorter. Standalone controls own a local scope. */
  scope?: SortableScope
  messages?: Partial<TableMessages>
  id: string
  disabled?: boolean
  label: string
  ids: ReadonlyArray<string>
  onMove: (destination: ColumnDestination) => void
  /** Legacy listener delta is zero: the shared engine owns transient listeners. */
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
  const [header, setHeader] = createSignal<HTMLElement>()
  const supplied = untrack(() => props.scope)
  const scope =
    supplied ??
    createSortable({
      autoScroll: 'horizontal',
      get containers() {
        return [{ id: 'columns', items: props.ids }]
      },
      orientation: 'horizontal',
      get disabled() {
        return props.disabled || props.ids.length < 2
      },
      onMove(move) {
        const destination = columnMoveDestination(props.ids, move)
        if (destination && move.itemId === props.id && !props.disabled)
          props.onMove(destination)
      },
    })
  const item = createSortableItem(scope, {
    get id() {
      return props.id
    },
    get label() {
      return props.label
    },
    get disabled() {
      return props.disabled || props.ids.length < 2 || !header()
    },
    keyboard: false,
    activation: { distance: 5 },
  })
  const index = () => props.ids.indexOf(props.id)
  const first = () => index() <= 0
  const last = () => index() >= props.ids.length - 1
  const headers = () =>
    Array.from(
      handle
        ?.closest('[data-column-header]')
        ?.parentElement?.querySelectorAll<HTMLElement>(
          '[data-column-header]',
        ) ?? [],
    )
  function FallbackTarget(target: { id: string }) {
    const registration = createSortableTarget(scope, {
      get id() {
        return target.id
      },
      get label() {
        return target.id
      },
    })
    onSettled(() =>
      registration.ref(
        headers().find((node) => node.dataset.columnHeader === target.id),
      ),
    )
    return null
  }
  onSettled(() => {
    const node =
      handle.closest<HTMLElement>('[data-column-header]') ?? undefined
    setHeader(node)
    item.ref(node)
    const unsubscribe = scope.dragDrop.subscribe((event) => {
      if (event.operation.source.data.id !== untrack(() => props.id)) return
      if (event.type === 'start') {
        suppressClick = true
        menu.hidePopover()
        handle.focus({ preventScroll: true })
      }
      untrack(() => props.onActivity)?.(
        event.type === 'drop'
          ? 'end'
          : event.type === 'over'
            ? 'move'
            : event.type,
        0,
      )
    })
    return () => {
      try {
        if (
          scope.dragDrop.operation()?.source.data.id === untrack(() => props.id)
        )
          scope.cancel()
      } finally {
        unsubscribe()
      }
    }
  })
  createEffect(
    () => ({
      scope: props.scope,
      id: props.id,
      ids: props.ids,
      header: header(),
      operation: scope.dragDrop.operation(),
      preview: scope.preview(),
    }),
    (value) => {
      if (value.scope !== supplied)
        throw new Error('Remount TableColumnMove to replace its sorting scope')
      if (!value.header || value.operation?.source.data.id !== value.id)
        return undefined
      value.header.dataset.columnMoving = 'true'
      const destination = value.preview
        ? columnMoveDestination(value.ids, value.preview)
        : undefined
      const target = value.operation.target?.data
      const markerId =
        target?.kind === 'item' ? String(target.id) : destination?.id
      const marker =
        destination &&
        headers().find((node) => node.dataset.columnHeader === markerId)
      if (marker && destination)
        marker.dataset.columnDrop =
          target?.kind === 'item'
            ? value.preview?.destination.beforeId === target.id
              ? 'before'
              : 'after'
            : destination.side
      return () => {
        value.header?.removeAttribute('data-column-moving')
        marker?.removeAttribute('data-column-drop')
      }
    },
  )
  function keyboardMove(key: string) {
    if (props.disabled) return
    const position = index()
    if (position < 0) return
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
            item.handleRef(node)
          },
          nativeEvents<HTMLButtonElement>({
            pointerdown: () => {
              suppressClick = false
            },
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
                scope.dragDrop.operation() ||
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
      <For each={supplied ? [] : props.ids.filter((id) => id !== props.id)}>
        {(id) => <FallbackTarget id={id} />}
      </For>
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
