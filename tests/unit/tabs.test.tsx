import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup, Errored } from 'solid-js'
import { Tabs } from '@wfe/components/tabs'
import { TabsKeyboardDelegate } from '../../packages/components/src/vendor/kobalte/core/src/tabs/tabs-keyboard-delegate'
afterEach(cleanup)
test('controlled selection preserves panel identity and moves focused children before hiding', () => {
  const [value, setValue] = createSignal('a')
  const request = vi.fn()
  const h = render(() => (
    <Tabs value={value()} onValueChange={request}>
      <Tabs.List aria-label="Sections">
        <Tabs.Trigger value="a">First</Tabs.Trigger>
        <Tabs.Trigger value="b">Second</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="a">
        <input />
      </Tabs.Content>
      <Tabs.Content value="b">Second content</Tabs.Content>
    </Tabs>
  ))
  flush()
  const input = h.container.querySelector('input')!
  input.value = 'Unsaved'
  input.focus()
  setValue('b')
  flush()
  expect(document.activeElement).toBe(h.getByRole('tab', { name: 'Second' }))
  expect(input.closest('[role="tabpanel"]')!.hasAttribute('hidden')).toBe(true)
  expect(input.closest('[role="tabpanel"]')!.hasAttribute('inert')).toBe(true)
  setValue('a')
  flush()
  expect(h.container.querySelector('input')).toBe(input)
  expect(input.value).toBe('Unsaved')
  expect(request).not.toHaveBeenCalled()
})
test('active panel lifetime disposes children and owned tab listeners', () => {
  const disposal = vi.fn()
  function Draft() {
    onCleanup(disposal)
    return <input />
  }
  const [value, setValue] = createSignal('a')
  const request = vi.fn()
  const h = render(() => (
    <Tabs value={value()} panelMount="active" onValueChange={request}>
      <Tabs.List aria-label="Sections">
        <Tabs.Trigger value="a">First</Tabs.Trigger>
        <Tabs.Trigger value="b">Second</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="a">
        <Draft />
      </Tabs.Content>
      <Tabs.Content value="b">Second</Tabs.Content>
    </Tabs>
  ))
  flush()
  const tab = h.getByRole('tab', { name: 'First' })
  h.container.querySelector('input')!.focus()
  setValue('b')
  flush()
  expect(document.activeElement).toBe(h.getByRole('tab', { name: 'Second' }))
  expect(h.container.querySelector('input')).toBeNull()
  expect(disposal).toHaveBeenCalledTimes(1)
  h.unmount()
  tab.click()
  flush()
  expect(request).not.toHaveBeenCalled()
})
test('all-disabled traversal terminates instead of looping', () => {
  const collection = {
    getFirstKey: () => 'a',
    getLastKey: () => 'b',
    getKeyAfter: (key: string) => (key === 'a' ? 'b' : undefined),
    getKeyBefore: (key: string) => (key === 'b' ? 'a' : undefined),
    getItem: (key: string) => ({ key, disabled: true }),
  }
  const delegate = new TabsKeyboardDelegate(
    () => collection as never,
    () => 'ltr',
    () => 'horizontal',
  )
  expect(delegate.getFirstKey()).toBeUndefined()
  expect(delegate.getLastKey()).toBeUndefined()
  expect(delegate.getNextKey('a')).toBeUndefined()
  expect(delegate.getPreviousKey('b')).toBeUndefined()
})

for (const invalid of [undefined, '']) {
  test(
    'reactive control mode and empty selection are rejected: ' +
      String(invalid),
    () => {
      const [value, setValue] = createSignal<string | undefined>('a')
      const h = render(() => (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <Tabs value={value() as string}>
            <Tabs.List aria-label="Sections">
              <Tabs.Trigger value="a">First</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="a">First content</Tabs.Content>
          </Tabs>
        </Errored>
      ))
      flush()
      setValue(invalid)
      flush()
      expect(h.getByRole('alert').textContent).toContain(
        invalid === undefined ? 'control mode' : 'nonempty value',
      )
    },
  )
}

test('uncontrolled selection falls back after the selected trigger leaves', () => {
  const [visible, setVisible] = createSignal(true)
  const changes = vi.fn()
  const h = render(() => (
    <Tabs defaultValue="a" onValueChange={changes}>
      <Tabs.List aria-label="Dynamic sections">
        <Tabs.Trigger value="a">First</Tabs.Trigger>
        {visible() && <Tabs.Trigger value="b">Second</Tabs.Trigger>}
      </Tabs.List>
      <Tabs.Content value="a">First content</Tabs.Content>
      <Tabs.Content value="b">Second content</Tabs.Content>
    </Tabs>
  ))
  flush()
  expect(changes).not.toHaveBeenCalled()
  h.getByRole('tab', { name: 'Second' }).click()
  flush()
  expect(
    h.getByRole('tab', { name: 'Second' }).getAttribute('aria-selected'),
  ).toBe('true')
  setVisible(false)
  flush()
  expect(
    h.getByRole('tab', { name: 'First' }).getAttribute('aria-selected'),
  ).toBe('true')
  expect(changes.mock.calls).toEqual([['b'], ['a']])
})
