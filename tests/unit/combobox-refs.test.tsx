import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Combobox } from '@wfe/components'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

for (const mode of ['absent', 'callback', 'array'] as const) {
  const supplied = mode !== 'absent'
  test(`Combobox input keeps reactive attributes with ${mode} refs`, () => {
    const warnings = vi.spyOn(console, 'warn')
    const [revision, setRevision] = createSignal(0)
    let refs = 0
    let arrayRefs = 0
    let node: HTMLInputElement | undefined
    const attributes = () => ({
      id: 'input-' + revision(),
      class: ['caller', { changed: revision() > 0 }],
    })
    const capture = (value: HTMLInputElement) => {
      node = value
      refs++
    }
    const reference = supplied
      ? { ref: mode === 'array' ? [capture, () => arrayRefs++] : capture }
      : {}
    const mounted = render(() => (
      <Combobox options={['Alpha']} defaultValue="Alpha">
        <Combobox.Control>
          <Combobox.Input {...attributes()} {...reference} />
        </Combobox.Control>
        <Combobox.Label>Choice</Combobox.Label>
        <Combobox.Description id="choice-help">
          Choice help
        </Combobox.Description>
      </Combobox>
    ))
    const input = mounted.container.querySelector('input')!
    for (const revision of [1, 2]) {
      setRevision(revision)
      flush()
      expect(mounted.container.querySelector('input')).toBe(input)
      expect(input.id).toBe('input-' + revision)
      expect(input.classList.contains('changed')).toBe(true)
      expect(input.getAttribute('aria-describedby')).toBe('choice-help')
      expect(
        mounted.container.querySelector('label')?.getAttribute('for'),
      ).toBe(input.id)
      expect(refs).toBe(supplied ? 1 : 0)
      expect(arrayRefs).toBe(mode === 'array' ? 1 : 0)
      if (supplied) expect(node).toBe(input)
    }
    expect(warnings.mock.calls).toEqual([])
    mounted.unmount()
    expect(input.isConnected).toBe(false)
    expect(refs).toBe(supplied ? 1 : 0)
    expect(arrayRefs).toBe(mode === 'array' ? 1 : 0)
  })
}

for (const mode of ['absent', 'callback', 'array'] as const) {
  const supplied = mode !== 'absent'
  test(`Combobox content preserves delayed mounting with ${mode} refs`, async () => {
    const warnings = vi.spyOn(console, 'warn')
    const [revision, setRevision] = createSignal(0)
    const [open, setOpen] = createSignal(false)
    let refs = 0
    let arrayRefs = 0
    let node: HTMLElement | undefined
    const attributes = () => ({
      id: 'content-' + revision(),
      class: ['caller', { changed: revision() > 0 }],
    })
    const capture = (value: HTMLElement) => {
      node = value
      refs++
    }
    const reference = supplied
      ? { ref: mode === 'array' ? [capture, () => arrayRefs++] : capture }
      : {}
    const mounted = render(() => (
      <Combobox options={['Alpha']} open={open()} onOpenChange={setOpen}>
        <Combobox.Control>
          <Combobox.Input aria-label="Choice" />
        </Combobox.Control>
        <Combobox.Content
          {...attributes()}
          {...reference}
          style={{ 'animation-name': 'none' }}
        >
          <span>Choices</span>
        </Combobox.Content>
      </Combobox>
    ))
    expect(mounted.container.querySelector('[id^="content-"]')).toBeNull()
    expect(refs).toBe(0)
    setRevision(1)
    setOpen(true)
    flush()
    const content = mounted.container.querySelector<HTMLElement>('#content-1')!
    expect(content).not.toBeNull()
    setRevision(2)
    flush()
    expect(mounted.container.querySelector('#content-2')).toBe(content)
    expect(content.classList.contains('changed')).toBe(true)
    expect(refs).toBe(supplied ? 1 : 0)
    expect(arrayRefs).toBe(mode === 'array' ? 1 : 0)
    if (supplied) expect(node).toBe(content)
    setOpen(false)
    flush()
    await vi.waitFor(() => expect(content.isConnected).toBe(false))
    setOpen(true)
    flush()
    const reopened = mounted.container.querySelector('#content-2')!
    expect(reopened).not.toBeNull()
    expect(reopened.isConnected).toBe(true)
    expect(reopened).not.toBe(content)
    expect(refs).toBe(supplied ? 2 : 0)
    expect(arrayRefs).toBe(mode === 'array' ? 2 : 0)
    mounted.unmount()
    expect(reopened.isConnected).toBe(false)
    await Promise.resolve()
    expect(warnings.mock.calls).toEqual([])
  })
}
