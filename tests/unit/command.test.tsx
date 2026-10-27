import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  Command,
  type CommandItem,
  type CommandMessages,
} from '../../packages/components/src/components/Command'

afterEach(cleanup)
const items: CommandItem[] = [
  {
    id: 'open',
    label: 'Open project',
    keywords: ['workspace'],
    group: 'Projects',
  },
  { id: 'locked', label: 'Delete project', disabled: true, group: 'Projects' },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Change preferences',
    group: 'Account',
  },
  { id: 'logout', label: 'Sign out', group: 'Account' },
]
function current(input: HTMLElement) {
  const id = input.getAttribute('aria-activedescendant')
  return id ? input.ownerDocument.getElementById(id) : null
}

test('command reuses fuzzy matching for labels and keywords and supports duplicate labels with stable IDs', () => {
  const h = render(() => (
    <Command
      label="Commands"
      items={[
        ...items,
        { id: 'second-settings', label: 'Settings', group: 'Other' },
      ]}
    />
  ))
  const input = h.getByRole<HTMLInputElement>('combobox', { name: 'Commands' })
  const list = h.getByRole('listbox', { name: 'Commands' })
  expect(input.getAttribute('aria-controls')).toBe(list.id)
  expect(h.getAllByRole('option', { name: 'Settings' })).toHaveLength(2)
  fireEvent.input(input, { target: { value: 'wrkspc' } })
  flush()
  expect(h.getAllByRole('option')).toHaveLength(1)
  expect(current(input)).toBe(h.getByRole('option', { name: 'Open project' }))
  fireEvent.input(input, { target: { value: 'unmatched' } })
  flush()
  expect(h.queryByRole('option')).toBeNull()
  expect(input.hasAttribute('aria-activedescendant')).toBe(false)
  expect(h.getByRole('status').textContent).toBe('No results.')
})

test('command keeps input focus, skips disabled commands and lets callbacks cancel before suppressing Enter submission', () => {
  const selected = vi.fn(
    (_item: CommandItem, event: MouseEvent | KeyboardEvent) => {
      expect(event.defaultPrevented).toBe(false)
    },
  )
  const h = render(() => (
    <form>
      <Command label="Commands" items={items} onSelect={selected} />
    </form>
  ))
  const input = h.getByRole('combobox')
  input.focus()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  flush()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Settings' }))
  expect(document.activeElement).toBe(input)
  const enter = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  })
  input.dispatchEvent(enter)
  flush()
  expect(selected).toHaveBeenCalledOnce()
  expect(selected.mock.calls[0]![0].id).toBe('settings')
  expect(enter.defaultPrevented).toBe(true)
  fireEvent.keyDown(input, { key: 'End' })
  flush()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Sign out' }))
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  flush()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Open project' }))
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  flush()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Sign out' }))
  fireEvent.keyDown(input, { key: 'Home' })
  flush()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Open project' }))
})

test('command active identity survives reorder and falls back permanently when removed or disabled', () => {
  const [values, setValues] = createSignal(items)
  const h = render(() => (
    <Command label="Commands" items={values()} filter="none" />
  ))
  const input = h.getByRole('combobox')
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  flush()
  const activeId = input.getAttribute('aria-activedescendant')
  setValues([items[3]!, items[2]!, items[0]!])
  flush()
  expect(input.getAttribute('aria-activedescendant')).toBe(activeId)
  expect(current(input)?.textContent).toContain('Settings')
  setValues([items[3]!, items[0]!])
  flush()
  expect(current(input)?.textContent).toBe('Sign out')
  setValues(items)
  flush()
  expect(current(input)?.textContent).toBe('Sign out')
  setValues(
    items.map((item) =>
      item.id === 'logout' ? { ...item, disabled: true } : item,
    ),
  )
  flush()
  expect(current(input)?.textContent).toBe('Open project')
  expect(h.getAllByRole('option', { selected: true })).toHaveLength(1)
})

test('controlled command queries can be rejected and external results keep their supplied order', () => {
  const [query, setQuery] = createSignal('')
  const [accept, setAccept] = createSignal(false)
  const changed = vi.fn((value: string) => {
    if (accept()) setQuery(value)
  })
  const h = render(() => (
    <Command
      label="Commands"
      items={[
        items[0]!,
        items[2]!,
        { id: 'again', label: 'Another project', group: 'Projects' },
      ]}
      query={query()}
      onQueryChange={changed}
      filter="none"
    />
  ))
  const input = h.getByRole<HTMLInputElement>('combobox')
  fireEvent.input(input, { target: { value: 'server query' } })
  flush()
  expect(changed).toHaveBeenLastCalledWith('server query')
  expect(input.value).toBe('')
  setAccept(true)
  flush()
  fireEvent.input(input, { target: { value: 'server query' } })
  flush()
  expect(input.value).toBe('server query')
  expect(
    h
      .getAllByRole('option')
      .map((node) => node.getAttribute('aria-labelledby')),
  ).toEqual([
    expect.stringContaining('option-open-label'),
    expect.stringContaining('option-settings-label'),
    expect.stringContaining('option-again-label'),
  ])
})

test('command composition does not navigate, activate or dismiss', () => {
  const selected = vi.fn(),
    escape = vi.fn()
  const h = render(() => (
    <Command
      label="Commands"
      items={items}
      onSelect={selected}
      onEscape={escape}
    />
  ))
  const input = h.getByRole('combobox')
  const first = input.getAttribute('aria-activedescendant')
  fireEvent.compositionStart(input)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter' })
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(input.getAttribute('aria-activedescendant')).toBe(first)
  expect(selected).not.toHaveBeenCalled()
  expect(escape).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input)
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(selected).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(escape).toHaveBeenCalledOnce()
})

test('command pointer actions keep focus and disabled commands cannot activate', () => {
  const changed = vi.fn()
  const h = render(() => (
    <Command label="Commands" items={items} onSelect={changed} />
  ))
  const input = h.getByRole('combobox')
  fireEvent.pointerMove(h.getByRole('option', { name: 'Settings' }))
  flush()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Settings' }))
  fireEvent.click(h.getByRole('option', { name: 'Settings' }))
  flush()
  expect(changed).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(input)
  fireEvent.click(h.getByRole('option', { name: 'Delete project' }))
  fireEvent.pointerMove(h.getByRole('option', { name: 'Delete project' }))
  flush()
  expect(changed).toHaveBeenCalledOnce()
  expect(current(input)).toBe(h.getByRole('option', { name: 'Settings' }))
})

test('command links keep href, modified clicks and cancelable native activation', () => {
  const changed = vi.fn(
    (_item: CommandItem, event: MouseEvent | KeyboardEvent) =>
      event.preventDefault(),
  )
  const itemSelected = vi.fn()
  const h = render(() => (
    <Command
      label="Links"
      items={[
        {
          id: 'docs',
          label: 'Documentation',
          href: '#docs',
          target: '_blank',
          onSelect: itemSelected,
        },
        {
          id: 'disabled',
          label: 'Disabled link',
          href: '#blocked',
          disabled: true,
        },
      ]}
      onSelect={changed}
    />
  ))
  const input = h.getByRole('combobox')
  const link = h.getByRole<HTMLAnchorElement>('option', {
    name: 'Documentation',
  })
  expect(link.tagName).toBe('A')
  expect(link.getAttribute('href')).toBe('#docs')
  expect(link.target).toBe('_blank')
  const modified = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
  })
  link.dispatchEvent(modified)
  expect(modified.defaultPrevented).toBe(false)
  expect(changed).not.toHaveBeenCalled()
  expect(itemSelected).not.toHaveBeenCalled()
  input.focus()
  fireEvent.keyDown(input, { key: 'Enter' })
  flush()
  expect(changed).toHaveBeenCalledOnce()
  expect(itemSelected).toHaveBeenCalledOnce()
  expect(changed.mock.calls[0]![1]).toBeInstanceOf(MouseEvent)
  expect(document.activeElement).toBe(input)
  expect(
    h.getByRole('option', { name: 'Disabled link' }).hasAttribute('href'),
  ).toBe(false)
})

test('item cancellation prevents the command owner callback for pointer and keyboard', () => {
  const cancel = vi.fn((event: MouseEvent | KeyboardEvent) =>
    event.preventDefault(),
  )
  const selected = vi.fn()
  const h = render(() => (
    <Command
      label="Commands"
      items={[{ id: 'cancel', label: 'Cancel', onSelect: cancel }]}
      onSelect={selected}
    />
  ))
  fireEvent.keyDown(h.getByRole('combobox'), { key: 'Enter' })
  fireEvent.click(h.getByRole('option'))
  expect(cancel).toHaveBeenCalledTimes(2)
  expect(selected).not.toHaveBeenCalled()
})

test('command status messages update without replacing input or losing active results', () => {
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string>()
  const [messages, setMessages] = createSignal<Partial<CommandMessages>>()
  const h = render(() => (
    <Command
      label="Commands"
      items={items}
      loading={loading()}
      error={error()}
      messages={messages()}
    />
  ))
  const input = h.getByRole('combobox')
  input.focus()
  expect(h.getByRole('status').textContent).toBe('Loading…')
  expect(h.getByRole('listbox').getAttribute('aria-busy')).toBe('true')
  setMessages({ loading: 'Searching records' })
  flush()
  expect(h.getByRole('status').textContent).toBe('Searching records')
  setLoading(false)
  setError('Service unavailable')
  flush()
  expect(h.getByRole('alert').textContent).toBe('Service unavailable')
  expect(h.getByRole('combobox')).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(
    within(h.getByRole('group', { name: 'Projects' })).getAllByRole('option'),
  ).toHaveLength(2)
})

test('removed and disposed command options release action handlers', () => {
  const selected = vi.fn()
  const [items, setItems] = createSignal<readonly CommandItem[]>([
    { id: 'a', label: 'First' },
  ])
  const h = render(() => (
    <Command label="Commands" items={items()} onSelect={selected} />
  ))
  const removed = h.getByRole('option')
  setItems([{ id: 'b', label: 'Second' }])
  flush()
  fireEvent.click(removed)
  expect(selected).not.toHaveBeenCalled()
  const disposed = h.getByRole('option')
  h.unmount()
  fireEvent.click(disposed)
  expect(selected).not.toHaveBeenCalled()
})
