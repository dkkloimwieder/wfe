import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Combobox } from '@wfe/components'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

for (const mode of ['absent', 'callback', 'array'] as const) {
  test(`Combobox control preserves its nodes with ${mode} refs`, () => {
    const warnings = vi.spyOn(console, 'warn')
    const [revision, setRevision] = createSignal(0)
    let refs = 0
    let arrayRefs = 0
    let ref: HTMLElement | undefined
    const capture = (node: HTMLElement) => {
      ref = node
      refs++
    }
    const reference =
      mode === 'absent'
        ? {}
        : { ref: mode === 'callback' ? capture : [capture, () => arrayRefs++] }
    const attributes = () => ({
      id: 'control-' + revision(),
      class: ['caller', { changed: revision() > 0 }],
    })
    const mounted = render(() => (
      <Combobox options={['Alpha']}>
        <Combobox.Control {...attributes()} {...reference}>
          <span data-child>Content</span>
        </Combobox.Control>
      </Combobox>
    ))
    const control = mounted.container.querySelector('#control-0')!
    const child = control.querySelector('[data-child]')!
    for (const revision of [1, 2]) {
      setRevision(revision)
      flush()
      expect(mounted.container.querySelector('#control-' + revision)).toBe(
        control,
      )
      expect(control.querySelector('[data-child]')).toBe(child)
      expect(control.classList.contains('changed')).toBe(true)
      expect(refs).toBe(mode === 'absent' ? 0 : 1)
      expect(arrayRefs).toBe(mode === 'array' ? 1 : 0)
      if (mode !== 'absent') expect(ref).toBe(control)
    }
    mounted.unmount()
    expect(control.isConnected).toBe(false)
    expect(child.isConnected).toBe(false)
    expect(refs).toBe(mode === 'absent' ? 0 : 1)
    expect(warnings.mock.calls).toEqual([])
  })
}
