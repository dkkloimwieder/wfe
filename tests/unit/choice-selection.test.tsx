import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Combobox, Select } from '@wfe/components'

afterEach(cleanup)

for (const [name, Choice] of [
  ['Select', Select],
  ['Combobox', Combobox],
] as const) {
  test(`${name} supplies decorative markers for controlled selected options`, () => {
    const [value, setValue] = createSignal(['Alpha', 'Beta'])
    const h = render(() => (
      <Choice<string>
        multiple
        open
        options={['Alpha', 'Beta', 'Gamma']}
        value={value()}
        onChange={setValue}
        itemComponent={(props) => (
          <Choice.Item item={props.item}>
            <Choice.ItemLabel>{props.item.rawValue}</Choice.ItemLabel>
            <Choice.ItemIndicator
              data-testid={`marker-${props.item.rawValue}`}
            />
          </Choice.Item>
        )}
      >
        <Choice.Trigger aria-label="Choose records" />
        <Choice.Content>
          <Choice.Listbox />
        </Choice.Content>
      </Choice>
    ))
    flush()
    for (const label of ['Alpha', 'Beta']) {
      const marker = h.getByTestId(`marker-${label}`)
      expect(marker.getAttribute('aria-hidden')).toBe('true')
      const icon = marker.querySelector('svg')!
      expect(icon).not.toBeNull()
      expect(icon.getAttribute('aria-hidden')).toBe('true')
      expect(icon.querySelector('path')?.getAttribute('d')).toBeTruthy()
      expect(
        h.getByRole('option', { name: label }).getAttribute('aria-selected'),
      ).toBe('true')
    }
    expect(h.queryByTestId('marker-Gamma')).toBeNull()
    setValue(['Beta'])
    flush()
    expect(h.queryByTestId('marker-Alpha')).toBeNull()
    expect(h.getByTestId('marker-Beta').querySelector('svg')).not.toBeNull()
    expect(
      h.getByRole('option', { name: 'Alpha' }).getAttribute('aria-selected'),
    ).toBe('false')
    setValue([])
    flush()
    expect(h.queryByTestId('marker-Beta')).toBeNull()
  })

  test(`${name} preserves custom and explicitly empty selection markers`, () => {
    const h = render(() => (
      <Choice<string>
        multiple
        open
        options={['Custom', 'Empty']}
        value={['Custom', 'Empty']}
        itemComponent={(props) => (
          <Choice.Item item={props.item}>
            <Choice.ItemLabel>{props.item.rawValue}</Choice.ItemLabel>
            <Choice.ItemIndicator data-testid={`marker-${props.item.rawValue}`}>
              {props.item.rawValue === 'Custom' ? <span>Chosen</span> : false}
            </Choice.ItemIndicator>
          </Choice.Item>
        )}
      >
        <Choice.Trigger aria-label="Choose records" />
        <Choice.Content>
          <Choice.Listbox />
        </Choice.Content>
      </Choice>
    ))
    flush()
    const custom = h.getByTestId('marker-Custom')
    expect(custom.textContent).toBe('Chosen')
    expect(custom.querySelector('svg')).toBeNull()
    const empty = h.getByTestId('marker-Empty')
    expect(empty.textContent).toBe('')
    expect(empty.querySelector('svg')).toBeNull()
  })
}
