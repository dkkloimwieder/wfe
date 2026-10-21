import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Button, Input } from '../components/NativeFields'
import { Popover } from '../components/Popover'
import { Icon } from '../components/Icon'
import { matchSorter } from '../search'

export type SidebarContext = {
  /** Unique opaque key supplied by the application. */
  id: string
  kind: string
  name: string
  disabled?: boolean
}

export type SidebarContextSwitcherProps = {
  /** Accepted context. It need not occur in options. */
  value: SidebarContext
  options: readonly SidebarContext[]
  parent?: SidebarContext
  onValueChange: (context: SidebarContext) => void
  compact?: boolean
  icon?: JSX.Element
  disabled?: boolean
  label?: string
  searchLabel?: string
  emptyLabel?: string
  parentLabel?: string
}

/** Presentation only. The application owns context availability and navigation. */
export function SidebarContextSwitcher(props: SidebarContextSwitcherProps) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const [input, setInput] = createSignal<HTMLInputElement>()
  const [content, setContent] = createSignal<HTMLDivElement>()
  const icon = createMemo(() => props.icon)
  const options = createMemo(() => {
    const values = new Map(props.options.map((item) => [item.id, item]))
    if (values.size !== props.options.length)
      throw new Error('SidebarContextSwitcher options require unique IDs.')
    return values
  })
  const matches = createMemo(() =>
    matchSorter([...options().values()], query(), {
      keys: ['kind', 'name'],
    }).map((item) => item.id),
  )
  const text = (item: SidebarContext) => `${item.kind} ${item.name}`
  const label = () => props.label ?? 'Change context'
  let alive = true
  let focused: HTMLButtonElement | undefined
  onCleanup(() => {
    alive = false
    focused = undefined
  })

  function changeOpen(next: boolean) {
    if (!alive || (next && props.disabled)) return
    setOpen(next)
    if (!next) setQuery('')
  }
  function request(item: SidebarContext | undefined) {
    if (!alive || props.disabled || !item || item.disabled) return
    props.onValueChange(item)
    if (alive) changeOpen(false)
  }
  const buttons = () => [
    ...(untrack(content)?.querySelectorAll<HTMLButtonElement>(
      '[data-context-option]:not(:disabled)',
    ) ?? []),
  ]
  function move(event: KeyboardEvent, fromSearch = false) {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return
    if (fromSearch && event.key !== 'ArrowDown') return
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = buttons()
    if (!items.length) return
    const current = items.indexOf(event.currentTarget as HTMLButtonElement)
    const index =
      event.key === 'Home' || fromSearch
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
            items.length
    event.preventDefault()
    items[index]?.focus()
  }
  createEffect(
    () => ({ disabled: props.disabled, ids: matches(), parent: props.parent }),
    ({ disabled }) => {
      if (disabled) changeOpen(false)
      const previous = focused
      const field = untrack(input)
      queueMicrotask(() => {
        if (
          !alive ||
          !untrack(() => open() && !props.disabled) ||
          !previous ||
          focused !== previous ||
          !field?.isConnected
        )
          return
        const active = field.ownerDocument.activeElement
        if (
          (!previous.isConnected || previous.disabled) &&
          (active === previous || active === field.ownerDocument.body)
        )
          field.focus()
      })
    },
  )

  return (
    <div
      class="ui-sidebar-context"
      data-compact={props.compact ? '' : undefined}
    >
      <Popover
        open={open()}
        onOpenChange={changeOpen}
        placement={props.compact ? 'right-start' : 'bottom-start'}
        gutter={8}
      >
        <Popover.Trigger
          ref={setTrigger}
          class="ui-sidebar-context-trigger"
          disabled={props.disabled}
          aria-label={`${label()}: ${text(props.value)}`}
          title={text(props.value)}
        >
          <Show
            when={icon()}
            keyed
            fallback={
              <Show when={props.compact}>
                <span aria-hidden="true">
                  {Array.from(props.value.kind.trim())[0] ?? '?'}
                </span>
              </Show>
            }
          >
            {(value) => (
              <span class="ui-sidebar-group-icon" aria-hidden="true">
                {value}
              </span>
            )}
          </Show>
          <Show when={!props.compact}>
            <span class="ui-sidebar-context-label">
              <span data-ui-text="system">{props.value.kind}</span>
              <span data-ui-text="value">{props.value.name}</span>
            </span>
            <Icon name="chevron-down" />
          </Show>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            ref={setContent}
            class="ui-sidebar-context-popup"
            onOpenAutoFocus={(event) => {
              const field = untrack(input)
              if (field) {
                event.preventDefault()
                field.focus()
              }
            }}
            onCloseAutoFocus={(event) => {
              const node = untrack(trigger)
              const active = node?.ownerDocument.activeElement
              if (
                active &&
                active !== node?.ownerDocument.body &&
                active !== node &&
                !untrack(content)?.contains(active)
              )
                event.preventDefault()
            }}
          >
            <Popover.Title>{label()}</Popover.Title>
            <Show when={props.parent ? ':' + props.parent.id : undefined} keyed>
              {(key) => (
                <Button
                  class="ui-sidebar-context-parent"
                  disabled={props.disabled || props.parent?.disabled}
                  onFocus={(event) => {
                    focused = event.currentTarget
                  }}
                  onClick={() => {
                    if (props.parent && ':' + props.parent.id === key)
                      request(props.parent)
                  }}
                >
                  <Icon name="chevron-left" />
                  <span>
                    {props.parentLabel ?? 'Up one level'}: {props.parent?.kind}{' '}
                    <span data-ui-text="value">{props.parent?.name}</span>
                  </span>
                </Button>
              )}
            </Show>
            <Input
              ref={setInput}
              aria-label={props.searchLabel ?? 'Search contexts'}
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => move(event, true)}
            />
            <ul class="ui-sidebar-context-options" aria-label={label()}>
              <For each={matches()}>
                {(id) => {
                  const initial = untrack(() => options().get(id))!
                  const item = () => options().get(id) ?? initial
                  return (
                    <li>
                      <Button
                        data-context-option=""
                        disabled={props.disabled || item().disabled}
                        aria-current={
                          props.value.id === id ? 'true' : undefined
                        }
                        data-ui-active={
                          props.value.id === id ? 'true' : undefined
                        }
                        onFocus={(event) => {
                          focused = event.currentTarget
                        }}
                        onKeyDown={(event) => move(event)}
                        onClick={() => request(options().get(id))}
                      >
                        <span>
                          <span data-ui-text="system">{item().kind}</span>{' '}
                          <span data-ui-text="value">{item().name}</span>
                        </span>
                        <Show when={props.value.id === id}>
                          <Icon name="check" />
                        </Show>
                      </Button>
                    </li>
                  )
                }}
              </For>
            </ul>
            <Show when={!matches().length}>
              <p class="ui-help-text" role="status">
                {props.emptyLabel ?? 'No matching contexts'}
              </p>
            </Show>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    </div>
  )
}
