import { Dynamic, type JSX } from '@solidjs/web'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Show,
  untrack,
} from 'solid-js'
import { Input } from './NativeFields'
import { FieldContext } from '../internal/fieldContext'
import { styledClasses, type ClassValue } from '../internal/classes'
import { resolveMessages } from '../internal/messages'
import { matchSorter } from '../search'
import { ListCollection } from '../vendor/kobalte/core/src/list/list-collection'
import { ListKeyboardDelegate } from '../vendor/kobalte/core/src/list/list-keyboard-delegate'

export type CommandItem = {
  /** Unique stable identity, independent of the displayed label. */
  id: string
  label: string
  keywords?: readonly string[]
  description?: string
  icon?: JSX.Element
  shortcut?: string
  group?: string
  disabled?: boolean
  href?: string
  target?: string
  onSelect?: (event: MouseEvent | KeyboardEvent) => void
}
export interface CommandMessages {
  loading: string
  empty: string
  results: (count: number) => string
}
export const commandMessages: Readonly<CommandMessages> = {
  loading: 'Loading…',
  empty: 'No results.',
  results: (count) => `${count} ${count === 1 ? 'result' : 'results'}.`,
}
export type CommandProps = {
  items: readonly CommandItem[]
  label: string
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  filter?: 'fuzzy' | 'none'
  placeholder?: string
  loading?: boolean
  error?: JSX.Element
  empty?: JSX.Element
  messages?: Partial<CommandMessages>
  onSelect?: (item: CommandItem, event: MouseEvent | KeyboardEvent) => void
  onEscape?: (event: KeyboardEvent) => void
  inputRef?: (node: HTMLInputElement) => void
  class?: ClassValue
}
type Group = { key: string; label?: string; items: CommandItem[] }

/** Inline command results; application code owns requests, navigation and actions. */
export function Command(props: CommandProps) {
  const id = createUniqueId()
  const inputId = `${id}-input`
  const listId = `${id}-list`
  const messages = resolveMessages(commandMessages, () => props.messages)
  const [localQuery, setLocalQuery] = createSignal(
    untrack(() => props.defaultQuery ?? ''),
  )
  const query = () => props.query ?? localQuery()
  const items = createMemo(() => {
    const keys = new Set<string>()
    for (const item of props.items) {
      if (keys.has(item.id))
        throw new Error(`Command item IDs must be unique: ${item.id}`)
      keys.add(item.id)
    }
    return props.items
  })
  const results = createMemo(() =>
    props.filter === 'none' || !query().trim()
      ? [...items()]
      : matchSorter(items(), query().trim(), {
          keys: [(item) => [item.label, ...(item.keywords ?? [])]],
          baseSort: (left, right) => left.index - right.index,
        }),
  )
  const collection = createMemo(
    () =>
      new ListCollection(
        results().map((item, index) => ({
          type: 'item' as const,
          key: item.id,
          rawValue: item,
          textValue: item.label,
          disabled: item.disabled ?? false,
          level: 0,
          index,
        })),
      ),
  )
  const delegate = new ListKeyboardDelegate(collection)
  const [requestedActive, setActive] = createSignal<string>()
  const active = createMemo(() => {
    const key = requestedActive()
    const item = key === undefined ? undefined : collection().getItem(key)
    return item && !item.disabled ? key : delegate.getFirstKey()
  })
  // Commit the fallback so an item that later returns does not steal activity.
  createEffect(active, (key) => {
    setActive(key)
  })
  const groups = createMemo(() => {
    const groups: Group[] = []
    for (const item of results()) {
      let group = groups.at(-1)
      if (!group || group.label !== item.group) {
        group = { key: item.id, label: item.group, items: [] }
        groups.push(group)
      }
      group.items.push(item)
    }
    return groups
  })
  const optionId = (key: string) => `${id}-option-${encodeURIComponent(key)}`
  let input: HTMLInputElement | undefined
  let list: HTMLDivElement | undefined
  let composing = false
  createEffect(
    () => ({ key: active(), results: results() }),
    ({ key }) => {
      if (key === undefined || !list) return
      const option = list.ownerDocument.getElementById(optionId(key))
      if (!option || !list.contains(option)) return
      const optionBox = option.getBoundingClientRect(),
        listBox = list.getBoundingClientRect()
      if (optionBox.top < listBox.top)
        list.scrollTop -= listBox.top - optionBox.top
      else if (optionBox.bottom > listBox.bottom)
        list.scrollTop += optionBox.bottom - listBox.bottom
    },
  )
  function select(item: CommandItem, event: MouseEvent | KeyboardEvent) {
    if (item.disabled) {
      event.preventDefault()
      return
    }
    item.onSelect?.(event)
    if (!event.defaultPrevented) props.onSelect?.(item, event)
  }
  function click(item: CommandItem, event: MouseEvent) {
    if (item.disabled) {
      event.preventDefault()
      return
    }
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return
    setActive(item.id)
    input?.focus({ preventScroll: true })
    select(item, event)
  }
  function keydown(event: KeyboardEvent, focusedId?: string) {
    if (event.isComposing || composing || event.keyCode === 229) return
    const current = focusedId ?? active()
    let next: string | undefined
    if (event.key === 'Tab') {
      const destination =
        focusedId !== undefined && event.shiftKey
          ? input
          : focusedId === undefined && !event.shiftKey && current !== undefined
            ? list?.ownerDocument.getElementById(optionId(current))
            : undefined
      if (destination) {
        // Own this transfer even while an enclosing trap refreshes its tab stops.
        event.stopImmediatePropagation()
        event.preventDefault()
        destination.focus({ preventScroll: true })
      }
      return
    }
    if (event.key === 'ArrowDown')
      next =
        current === undefined
          ? delegate.getFirstKey()
          : (delegate.getKeyBelow(current) ?? delegate.getFirstKey())
    else if (event.key === 'ArrowUp')
      next =
        current === undefined
          ? delegate.getLastKey()
          : (delegate.getKeyAbove(current) ?? delegate.getLastKey())
    else if (event.key === 'Home') next = delegate.getFirstKey()
    else if (event.key === 'End') next = delegate.getLastKey()
    else if (event.key === 'Escape') {
      props.onEscape?.(event)
      return
    } else if (event.key === 'Enter') {
      if (current === undefined) {
        event.preventDefault()
        return
      }
      const item = collection().getItem(current)?.rawValue as
        CommandItem | undefined
      if (!item || item.disabled) {
        event.preventDefault()
        return
      }
      try {
        if (item.href) {
          // Native anchor activation preserves href/target and modified navigation.
          // Link callbacks receive this MouseEvent rather than the input's key event.
          const anchor = input?.ownerDocument.getElementById(optionId(item.id))
          const view = input?.ownerDocument.defaultView
          if (anchor && view)
            anchor.dispatchEvent(
              new view.MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey,
              }),
            )
        } else {
          select(item, event)
        }
      } finally {
        // Allow application cancellation before suppressing implicit form submission.
        event.preventDefault()
      }
      return
    } else return
    event.preventDefault()
    setActive(next)
    if (event.currentTarget !== input && next !== undefined)
      list?.ownerDocument.getElementById(optionId(next))?.focus()
  }
  return (
    <div class={styledClasses('ui-command', props.class)} data-ui="">
      <FieldContext value={null}>
        <label class="ui-label" for={inputId}>
          {props.label}
        </label>
        <Input
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={
            active() === undefined ? undefined : optionId(active()!)
          }
          autocomplete="off"
          placeholder={props.placeholder}
          value={query()}
          ref={(node) => {
            input = node
            props.inputRef?.(node)
          }}
          onCompositionStart={() => {
            composing = true
          }}
          onCompositionEnd={() => {
            composing = false
          }}
          onKeyDown={keydown}
          onValueChange={(value) => {
            if (props.query === undefined) setLocalQuery(value)
            props.onQueryChange?.(value)
          }}
        />
      </FieldContext>
      <div
        class="ui-command-list"
        id={listId}
        role="listbox"
        aria-label={props.label}
        aria-busy={props.loading ? 'true' : undefined}
        ref={(node) => {
          list = node
        }}
      >
        <For each={groups()} keyed={(group) => group.key}>
          {(group) => (
            <div
              role={group().label ? 'group' : undefined}
              aria-labelledby={
                group().label
                  ? `${id}-group-${encodeURIComponent(group().key)}`
                  : undefined
              }
            >
              <Show when={group().label}>
                <div
                  class="ui-menu-label ui-command-group-label"
                  id={`${id}-group-${encodeURIComponent(group().key)}`}
                >
                  {group().label}
                </div>
              </Show>
              <For each={group().items} keyed={(item) => item.id}>
                {(item) => (
                  <Dynamic
                    component={item().href ? 'a' : 'div'}
                    id={optionId(item().id)}
                    role="option"
                    class="ui-menu-item ui-command-option"
                    tabindex={active() === item().id ? 0 : -1}
                    onFocus={() => setActive(item().id)}
                    onKeyDown={(event: KeyboardEvent) =>
                      keydown(event, item().id)
                    }
                    href={item().disabled ? undefined : item().href}
                    target={item().target}
                    rel={
                      item().target === '_blank'
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    aria-selected={active() === item().id ? 'true' : 'false'}
                    aria-disabled={item().disabled ? 'true' : undefined}
                    aria-labelledby={`${optionId(item().id)}-label`}
                    aria-describedby={
                      item().description
                        ? `${optionId(item().id)}-description`
                        : undefined
                    }
                    data-highlighted={active() === item().id ? '' : undefined}
                    data-disabled={item().disabled ? '' : undefined}
                    onPointerMove={() => {
                      if (!item().disabled) setActive(item().id)
                    }}
                    onMouseDown={(event: MouseEvent) => {
                      if (
                        event.button === 0 &&
                        !event.ctrlKey &&
                        !event.metaKey &&
                        !event.shiftKey &&
                        !event.altKey
                      )
                        event.preventDefault()
                    }}
                    onClick={(event: MouseEvent) => click(item(), event)}
                    onAuxClick={(event: MouseEvent) => {
                      if (item().disabled) event.preventDefault()
                    }}
                  >
                    <Show when={item().icon}>
                      <span class="ui-command-icon" aria-hidden="true">
                        {item().icon}
                      </span>
                    </Show>
                    <span class="ui-command-text" data-value="">
                      <span id={`${optionId(item().id)}-label`}>
                        {item().label}
                      </span>
                      <Show when={item().description}>
                        <span
                          class="ui-command-description"
                          id={`${optionId(item().id)}-description`}
                        >
                          {item().description}
                        </span>
                      </Show>
                    </span>
                    <Show when={item().shortcut}>
                      <span class="ui-command-shortcut" aria-hidden="true">
                        {item().shortcut}
                      </span>
                    </Show>
                  </Dynamic>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <Show
        when={props.error}
        fallback={
          <Show
            when={props.loading}
            fallback={
              <Show
                when={results().length === 0}
                fallback={
                  <span class="sr-only" role="status">
                    {messages.results(results().length)}
                  </span>
                }
              >
                <div class="ui-command-status" role="status">
                  {props.empty ?? messages.empty}
                </div>
              </Show>
            }
          >
            <div class="ui-command-status" role="status">
              {messages.loading}
            </div>
          </Show>
        }
      >
        <div class="ui-command-status" role="alert">
          {props.error}
        </div>
      </Show>
    </div>
  )
}
