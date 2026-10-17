import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Checkbox, RadioGroup, Switch } from '@wfe/components'

afterEach(cleanup)

for (const kind of ['checkbox', 'switch', 'radio'] as const) {
  test(
    kind +
      ' keeps generated IDs stable and accepts reactive explicit IDs through spreads',
    () => {
      const warnings = vi.spyOn(console, 'warn')
      const [revision, setRevision] = createSignal(0)
      const [explicit, setExplicit] = createSignal(false)
      let refs = 0
      const rootProps = () => ({
        id: 'root-' + revision(),
        get class() {
          return 'revision-' + revision()
        },
        'data-part': 'root',
      })
      const parts = (name: string) => ({
        ...(name === 'input' ? { ref: () => refs++ } : {}),
        ...(explicit() ? { id: 'caller-' + name + '-' + revision() } : {}),
        get class() {
          return 'revision-' + revision()
        },
        'data-part': name,
      })
      const mounted = render(() => {
        if (kind === 'radio')
          return (
            <RadioGroup {...rootProps()}>
              <RadioGroup.Label {...parts('group-label')}>
                Group
              </RadioGroup.Label>
              <RadioGroup.Item {...parts('item')} value="a">
                <RadioGroup.ItemInput {...parts('input')} />
                <RadioGroup.ItemControl {...parts('control')}>
                  <RadioGroup.ItemIndicator
                    forceMount
                    {...parts('indicator')}
                  />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemLabel {...parts('label')}>
                  Option
                </RadioGroup.ItemLabel>
                <RadioGroup.ItemDescription {...parts('help')}>
                  Help
                </RadioGroup.ItemDescription>
              </RadioGroup.Item>
            </RadioGroup>
          )
        const Toggle = kind === 'checkbox' ? Checkbox : Switch
        return (
          <Toggle {...rootProps()} validationState="invalid">
            <Toggle.Input {...parts('input')} />
            <Toggle.Control {...parts('control')}>
              {kind === 'checkbox' ? (
                <Checkbox.Indicator forceMount {...parts('indicator')} />
              ) : (
                <Switch.Thumb {...parts('thumb')} />
              )}
            </Toggle.Control>
            <Toggle.Label {...parts('label')}>Option</Toggle.Label>
            <Toggle.Description {...parts('help')}>Help</Toggle.Description>
            <Toggle.ErrorMessage {...parts('error')}>Error</Toggle.ErrorMessage>
          </Toggle>
        )
      })
      flush()
      const nodes = [
        ...mounted.container.querySelectorAll<HTMLElement>('[data-part]'),
      ]
      const part = (name: string) =>
        mounted.container.querySelector<HTMLElement>(
          '[data-part="' + name + '"]',
        )!
      const defaults = nodes.map((node) => node.id)
      expect(defaults.every(Boolean)).toBe(true)
      expect(new Set(defaults).size).toBe(defaults.length)
      function associations() {
        const input = part('input')
        expect(part('label').getAttribute('for')).toBe(input.id)
        const labelled = (input.getAttribute('aria-labelledby') ?? '').split(
          ' ',
        )
        expect(labelled).toContain(part('label').id)
        const described = (input.getAttribute('aria-describedby') ?? '').split(
          ' ',
        )
        expect(described).toContain(part('help').id)
        if (kind !== 'radio') expect(described).toContain(part('error').id)
        for (const node of nodes)
          expect(node.isConnected, node.dataset.part).toBe(true)
        expect(refs).toBe(1)
      }
      try {
        associations()
        setRevision(1)
        flush()
        expect(part('root').id).toBe('root-1')
        expect(nodes.slice(1).map((node) => node.id)).toEqual(defaults.slice(1))
        associations()
        setExplicit(true)
        flush()
        expect(part('input').id).toBe('caller-input-1')
        associations()
        setRevision(2)
        flush()
        expect(part('input').id).toBe('caller-input-2')
        expect(part('label').id).toBe('caller-label-2')
        associations()
        expect(mounted.container.querySelector('#caller-input-1')).toBeNull()
        setExplicit(false)
        flush()
        expect(nodes.slice(1).map((node) => node.id)).toEqual(defaults.slice(1))
        associations()
        mounted.unmount()
        flush()
        expect(nodes.every((node) => !node.isConnected)).toBe(true)
        expect(warnings.mock.calls).toEqual([])
      } finally {
        warnings.mockRestore()
      }
    },
  )
}

for (const kind of ['checkbox', 'radio'] as const) {
  test(
    kind + ' reads the current indicator ref when a hidden element mounts',
    () => {
      const first = vi.fn()
      const second = vi.fn()
      const third = vi.fn()
      const [callback, setCallback] = createSignal<(node: HTMLElement) => void>(
        () => first,
      )
      const [visible, setVisible] = createSignal(false)
      render(() =>
        kind === 'checkbox' ? (
          <Checkbox checked={visible()}>
            <Checkbox.Indicator ref={callback()} />
          </Checkbox>
        ) : (
          <RadioGroup value={visible() ? 'a' : ''}>
            <RadioGroup.Item value="a">
              <RadioGroup.ItemIndicator ref={callback()} />
            </RadioGroup.Item>
          </RadioGroup>
        ),
      )
      flush()
      setCallback(() => second)
      flush()
      expect(first).not.toHaveBeenCalled()
      expect(second).not.toHaveBeenCalled()
      setVisible(true)
      flush()
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
      setVisible(false)
      flush()
      setCallback(() => third)
      setVisible(true)
      flush()
      expect(second).toHaveBeenCalledTimes(1)
      expect(third).toHaveBeenCalledTimes(1)
    },
  )
}
