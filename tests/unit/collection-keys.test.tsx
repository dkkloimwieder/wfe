import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Combobox } from '@wfe/components'
import { ListCollection } from '../../packages/components/src/vendor/kobalte/core/src/list/list-collection'
import { ListKeyboardDelegate } from '../../packages/components/src/vendor/kobalte/core/src/list/list-keyboard-delegate'

const keys = ['start', 'quoted"key', 'path\\key', 'end']
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

for (const key of keys.slice(1, 3)) {
  test(`list paging compares the exact key ${JSON.stringify(key)}`, () => {
    const collection = new ListCollection(
      keys.map((key, index) => ({
        type: 'item' as const,
        key,
        rawValue: key,
        textValue: key,
        disabled: false,
        level: 0,
        index,
      })),
    )
    const list = document.createElement('div')
    Object.defineProperties(list, {
      offsetHeight: { value: 40 },
      scrollHeight: { value: 80 },
    })
    for (const [index, key] of keys.entries()) {
      const item = document.createElement('div')
      item.dataset.key = key
      Object.defineProperties(item, {
        offsetTop: { value: index * 20 },
        offsetHeight: { value: 20 },
      })
      list.append(item)
    }
    const delegate = new ListKeyboardDelegate(
      () => collection,
      () => list,
    )
    const index = keys.indexOf(key)
    expect(delegate.getKeyPageAbove(key)).toBe(keys[index - 1])
    expect(delegate.getKeyPageBelow(key)).toBe(keys[index + 1])
    expect(delegate.getKeyPageBelow('missing')).toBeUndefined()
  })
}

for (const key of keys.slice(1, 3)) {
  test(`combobox focus and selection preserve the exact key ${JSON.stringify(key)}`, async () => {
    const warnings = vi.spyOn(console, 'warn')
    const options = [
      { id: key, label: 'Target' },
      { id: 'other', label: 'Other' },
    ]
    const [value, setValue] = createSignal<(typeof options)[number] | null>(
      null,
    )
    const changes = vi.fn((next: (typeof options)[number] | null) =>
      setValue(next),
    )
    const view = render(() => (
      <Combobox
        options={options}
        value={value()}
        onChange={changes}
        optionValue="id"
        optionTextValue="label"
        optionLabel="label"
        defaultOpen={true}
        itemComponent={(props) => (
          <Combobox.Item item={props.item}>
            <Combobox.ItemLabel>{props.item.rawValue.label}</Combobox.ItemLabel>
          </Combobox.Item>
        )}
      >
        <Combobox.Label>Target choice</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input />
        </Combobox.Control>
        <Combobox.Content style={{ 'animation-name': 'none' }}>
          <Combobox.Listbox />
        </Combobox.Content>
      </Combobox>
    ))
    const input = view.getByRole('combobox', { name: 'Target choice' })
    await waitFor(() => expect(view.getAllByRole('option')).toHaveLength(2))
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Home' })
    flush()
    await waitFor(() => {
      const active = document.getElementById(
        input.getAttribute('aria-activedescendant') ?? '',
      )
      expect(active?.getAttribute('data-key')).toBe(key)
    })
    fireEvent.keyDown(input, { key: 'Enter' })
    flush()
    await waitFor(() =>
      expect(input.getAttribute('aria-expanded')).toBe('false'),
    )
    expect(value()).toBe(options[0])
    expect(changes).toHaveBeenCalledTimes(1)
    expect((input as HTMLInputElement).value).toBe('Target')
    expect(warnings.mock.calls).toEqual([])
  })
}
