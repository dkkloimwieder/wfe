import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  Checkbox,
  Combobox,
  DropdownMenu,
  Icon,
  Select,
  ValueDisplay,
} from '@wfe/components'
import type { IconName } from '@wfe/components'

afterEach(cleanup)

test('shared glyphs retain their SVG node through name and structured class changes', () => {
  const [name, setName] = createSignal<IconName>('check')
  const [active, setActive] = createSignal(false)
  const mounted = render(() => (
    <Icon name={name()} class={['caller', { active: active() }]} />
  ))
  const svg = mounted.container.querySelector('svg')!
  const original = svg.querySelector('path')!.getAttribute('d')
  expect(svg.getAttribute('aria-hidden')).toBe('true')
  expect(svg.getAttribute('focusable')).toBe('false')
  expect(svg.hasAttribute('tabindex')).toBe(false)
  setName('minus')
  setActive(true)
  flush()
  expect(mounted.container.querySelector('svg')).toBe(svg)
  expect(svg.querySelector('path')!.getAttribute('d')).not.toBe(original)
  expect(svg.classList.contains('ui-icon')).toBe(true)
  expect(svg.classList.contains('active')).toBe(true)
})

test('checkbox and boolean displays share reactive glyphs and retain custom indicator children', () => {
  const [mixed, setMixed] = createSignal(false)
  const [value, setValue] = createSignal(true)
  const mounted = render(() => (
    <>
      <Checkbox checked indeterminate={mixed()}>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox>
      <Checkbox checked>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator>
            <span data-custom>Custom</span>
          </Checkbox.Indicator>
        </Checkbox.Control>
      </Checkbox>
      <ValueDisplay value={value()} format="boolean-symbol" />
    </>
  ))
  const paths = () =>
    [...mounted.container.querySelectorAll('svg path')].map((p) =>
      p.getAttribute('d'),
    )
  const initial = paths()
  expect(initial[0]).toBe(initial[1])
  expect(mounted.container.querySelector('[data-custom]')?.textContent).toBe(
    'Custom',
  )
  setMixed(true)
  setValue(false)
  flush()
  expect(paths()[0]).not.toBe(initial[0])
  expect(paths()[1]).not.toBe(initial[1])
  expect(
    mounted.container.querySelector('[role="img"]')?.getAttribute('aria-label'),
  ).toBe('No')
})

for (const kind of ['select', 'combobox', 'menu'] as const) {
  test(
    kind +
      ' icon slot preserves polymorphism, custom children, and explicit empty content',
    () => {
      const [custom, setCustom] = createSignal<
        'default' | 'custom' | 'empty' | 'false'
      >('default')
      const slot = () =>
        custom() === 'custom' ? (
          <span data-custom>Custom</span>
        ) : custom() === 'empty' ? (
          ''
        ) : custom() === 'false' ? (
          false
        ) : undefined
      const mounted = render(() =>
        kind === 'select' ? (
          <Select options={['a']}>
            <Select.Trigger>
              <Select.Value />
              <Select.Icon as="i" class={{ caller: true }}>
                {slot()}
              </Select.Icon>
            </Select.Trigger>
          </Select>
        ) : kind === 'menu' ? (
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <DropdownMenu.Icon as="i" class={{ caller: true }}>
                {slot()}
              </DropdownMenu.Icon>
            </DropdownMenu.Trigger>
          </DropdownMenu>
        ) : (
          <Combobox options={['a']}>
            <Combobox.Control>
              <Combobox.Input />
              <Combobox.Trigger>
                <Combobox.Icon as="i" class={{ caller: true }}>
                  {slot()}
                </Combobox.Icon>
              </Combobox.Trigger>
            </Combobox.Control>
          </Combobox>
        ),
      )
      const icon = mounted.container.querySelector('i')!
      expect(icon.classList.contains('ui-choice-icon')).toBe(true)
      expect(icon.classList.contains('caller')).toBe(true)
      expect(icon.querySelector('svg')).not.toBeNull()
      setCustom('custom')
      flush()
      expect(mounted.container.querySelector('i')).toBe(icon)
      expect(icon.querySelector('svg')).toBeNull()
      expect(icon.textContent).toBe('Custom')
      setCustom('empty')
      flush()
      expect(icon.childNodes.length).toBe(0)
      setCustom('false')
      flush()
      expect(icon.childNodes.length).toBe(0)
      setCustom('default')
      flush()
      expect(mounted.container.querySelector('i')).toBe(icon)
      expect(icon.querySelector('svg')).not.toBeNull()
    },
  )
}
