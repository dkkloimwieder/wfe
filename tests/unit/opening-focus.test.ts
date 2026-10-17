import { afterEach, expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { createListState } from '../../packages/components/src/vendor/kobalte/core/src/list/create-list-state'
import { createSelectableCollection } from '../../packages/components/src/vendor/kobalte/core/src/selection/create-selectable-collection'

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.useRealTimers()
})

function setup(
  options: {
    defer?: boolean | (() => boolean)
    selected?: string
    strategy?: true | 'first' | 'last'
    virtual?: boolean
  } = {},
) {
  vi.useFakeTimers()
  const element = document.createElement('div')
  element.tabIndex = 0
  const outside = document.createElement('button')
  document.body.append(element, outside)
  outside.focus()
  const handle = createRoot((dispose) => {
    const state = createListState({
      selectionMode: 'single',
      defaultSelectedKeys: options.selected ? [options.selected] : [],
      dataSource: ['a', 'b', 'c'],
    })
    const controls = createSelectableCollection(
      {
        selectionManager: state.selectionManager,
        keyboardDelegate: {
          getFirstKey: () => 'a',
          getLastKey: () => 'c',
          getKeyBelow: (key) => (key === 'a' ? 'b' : 'c'),
        },
        autoFocus: options.strategy ?? 'first',
        deferAutoFocus: options.defer ?? true,
        shouldUseVirtualFocus: options.virtual,
      },
      () => element,
    )
    element.addEventListener('keydown', (event) =>
      controls.onKeyDown(
        event as KeyboardEvent & {
          currentTarget: HTMLElement
          target: Element
        },
      ),
    )
    element.addEventListener('focusin', (event) =>
      controls.onFocusIn(
        event as FocusEvent & { currentTarget: HTMLElement; target: Element },
      ),
    )
    element.addEventListener('focusout', (event) =>
      controls.onFocusOut(
        event as FocusEvent & { currentTarget: HTMLElement; target: Element },
      ),
    )
    return { dispose, manager: state.selectionManager() }
  })
  cleanups.push(() => {
    handle.dispose()
    flush()
    element.remove()
    outside.remove()
  })
  flush()
  return { ...handle, element, outside }
}

test('a false defer accessor applies initial focus before timers run', () => {
  const { manager } = setup({ defer: () => false, selected: 'b' })
  expect(manager.focusedKey()).toBe('b')
})

test('deferred focus preserves the selected item and the empty last-item strategy', () => {
  const selected = setup({ selected: 'b', defer: () => true })
  expect(selected.manager.focusedKey()).toBeUndefined()
  vi.runOnlyPendingTimers()
  flush()
  expect(selected.manager.focusedKey()).toBe('b')
  const empty = setup({ strategy: 'last' })
  vi.runOnlyPendingTimers()
  flush()
  expect(empty.manager.focusedKey()).toBe('c')
})

test('pending opening focus does not reset immediate Home and ArrowDown navigation', () => {
  const { manager, element } = setup({ selected: 'c' })
  manager.setFocused(true)
  manager.setFocusedKey('c')
  flush()
  for (const key of ['Home', 'ArrowDown']) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
    flush()
  }
  expect(manager.focusedKey()).toBe('b')
  vi.runOnlyPendingTimers()
  flush()
  expect(manager.focusedKey()).toBe('b')
})

test('pending opening focus respects a later external focus target', () => {
  const { manager, outside } = setup({ selected: 'b' })
  const later = document.createElement('button')
  document.body.append(later)
  cleanups.push(() => later.remove())
  later.focus()
  vi.runOnlyPendingTimers()
  flush()
  expect(document.activeElement).toBe(later)
  expect(manager.focusedKey()).toBeUndefined()
  expect(outside).not.toBe(document.activeElement)
})

test('virtual focus sets the initial key without moving DOM focus', () => {
  const { manager, outside } = setup({ strategy: true, virtual: true })
  vi.runOnlyPendingTimers()
  flush()
  expect(manager.isFocused()).toBe(true)
  expect(manager.focusedKey()).toBeUndefined()
  expect(document.activeElement).toBe(outside)
})

test('disposing a collection cancels pending opening focus', () => {
  const { dispose, manager } = setup({ selected: 'b' })
  dispose()
  flush()
  vi.runOnlyPendingTimers()
  flush()
  expect(manager.focusedKey()).toBeUndefined()
})

test('empty boolean autofocus focuses the collection without selecting its first item', () => {
  const { manager, element } = setup({ strategy: true })
  vi.runOnlyPendingTimers()
  flush()
  expect(document.activeElement).toBe(element)
  expect(manager.isFocused()).toBe(true)
  expect(manager.focusedKey()).toBeUndefined()
})
