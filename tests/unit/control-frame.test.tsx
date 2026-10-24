import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { Input } from '@wfe/components'
import {
  CompoundControl,
  ControlFrame,
} from '../../packages/components/src/internal/controlDecoration'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('compound frames keep reactive children live without adding a DOM wrapper', () => {
  const original = console.warn.bind(console)
  const warnings = vi.spyOn(console, 'warn').mockImplementation(original)
  const [value, setValue] = createSignal('First')
  const view = render(() => (
    <div data-testid="host">
      <CompoundControl value={true}>
        <ControlFrame>{value()}</ControlFrame>
      </CompoundControl>
    </div>
  ))
  flush()
  const host = view.getByTestId('host')
  expect(host.textContent).toBe('First')
  expect(host.children.length).toBe(0)
  setValue('Second')
  flush()
  expect(host.textContent).toBe('Second')
  expect(host.children.length).toBe(0)
  view.unmount()
  setValue('Disposed')
  flush()
  expect(
    warnings.mock.calls.filter((args) =>
      args.some(
        (value) =>
          typeof value === 'string' &&
          value.includes('[STRICT_READ_UNTRACKED]'),
      ),
    ),
  ).toEqual([])
})

test('compound frames retain native input references, focus, handlers and child cleanup ownership', () => {
  const [label, setLabel] = createSignal('First')
  const disposed = vi.fn()
  const changed = vi.fn()
  const refs: HTMLInputElement[] = []
  let mounts = 0
  const Child = () => {
    mounts++
    onCleanup(disposed)
    return (
      <Input
        aria-label={label()}
        ref={(node) => {
          refs.push(node)
        }}
        onInput={changed}
      />
    )
  }
  const view = render(() => (
    <div data-testid="host">
      <CompoundControl value={true}>
        <ControlFrame>
          <Child />
        </ControlFrame>
      </CompoundControl>
    </div>
  ))
  flush()
  const input = view.getByRole<HTMLInputElement>('textbox', { name: 'First' })
  expect(input.parentElement).toBe(view.getByTestId('host'))
  expect(refs).toEqual([input])
  input.focus()
  input.value = 'Draft'
  input.dispatchEvent(new InputEvent('input', { bubbles: true }))
  expect(changed).toHaveBeenCalledTimes(1)
  setLabel('Second')
  flush()
  expect(view.getByRole('textbox', { name: 'Second' })).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(input.value).toBe('Draft')
  expect(mounts).toBe(1)
  expect(refs).toEqual([input])
  view.unmount()
  flush()
  expect(disposed).toHaveBeenCalledTimes(1)
})
