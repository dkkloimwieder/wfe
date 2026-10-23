import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { OBSERVE, createRoot, createSignal, flush } from 'solid-js'
import { Button } from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { ownedElementEvents } from '../../packages/components/src/internal/events'
import type { JSX } from '@solidjs/web'

afterEach(cleanup)

test('fixed native listeners capture the map at settlement and retain the captured handlers', () => {
  const first = vi.fn()
  const settled = vi.fn((event: MouseEvent) => event.preventDefault())
  const late = vi.fn()
  const handlers: { click: (event: MouseEvent) => void } = { click: first }
  const node = document.createElement('button')
  const lifetime = createRoot((dispose) => ({
    ref: nativeEvents<HTMLButtonElement>(handlers),
    dispose,
  }))
  lifetime.ref(node)
  handlers.click = settled
  flush()
  handlers.click = late
  const event = new MouseEvent('click', { cancelable: true })
  node.dispatchEvent(event)
  expect(event.isTrusted).toBe(false)
  expect(event.defaultPrevented).toBe(true)
  expect(settled).toHaveBeenCalledWith(event)
  expect(first).not.toHaveBeenCalled()
  expect(late).not.toHaveBeenCalled()
  lifetime.dispose()
  node.dispatchEvent(new MouseEvent('click'))
  expect(settled).toHaveBeenCalledTimes(1)
})

test('owned props dispatch the latest function or tuple once with the same native event', () => {
  type Handler = JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
  const first = vi.fn()
  const tuple = vi.fn((_value: string, event: MouseEvent) =>
    event.preventDefault(),
  )
  const latest = vi.fn()
  const [handler, setHandler] = createSignal<Handler | undefined>(() => first)
  let button: HTMLButtonElement | undefined
  const view = render(() => (
    <Button ref={(node) => (button = node)} onClick={handler()}>
      Save
    </Button>
  ))
  flush()
  const node = view.getByRole('button')
  expect(node).toBe(button)
  node.click()
  expect(first).toHaveBeenCalledTimes(1)
  setHandler([tuple, 'payload'])
  flush()
  const event = new MouseEvent('click', { cancelable: true })
  node.dispatchEvent(event)
  expect(tuple).toHaveBeenCalledWith('payload', event)
  expect(tuple).toHaveBeenCalledTimes(1)
  expect(event.defaultPrevented).toBe(true)
  setHandler(undefined)
  flush()
  node.click()
  expect(tuple).toHaveBeenCalledTimes(1)
  setHandler(() => latest)
  flush()
  const prevented = new MouseEvent('click', { cancelable: true })
  prevented.preventDefault()
  node.dispatchEvent(prevented)
  expect(latest).toHaveBeenCalledWith(prevented)
  expect(view.getByRole('button')).toBe(node)
  view.unmount()
  node.click()
  expect(latest).toHaveBeenCalledTimes(1)
})

test('owned props keep their initial event-name inventory without reading handler values at setup', () => {
  const clicked = vi.fn()
  const read = vi.fn(() => clicked)
  const present = Object.defineProperty({}, 'onClick', {
    configurable: true,
    get: read,
  })
  const absent: { onClick?: () => void } = {}
  const first = document.createElement('button')
  const second = document.createElement('button')
  const lifetime = createRoot((dispose) => ({
    first: ownedElementEvents(present),
    second: ownedElementEvents(absent),
    dispose,
  }))
  expect(read).not.toHaveBeenCalled()
  lifetime.first(first)
  lifetime.second(second)
  absent.onClick = clicked
  flush()
  expect(read).not.toHaveBeenCalled()
  first.click()
  second.click()
  expect(read).toHaveBeenCalledTimes(1)
  expect(clicked).toHaveBeenCalledTimes(1)
  lifetime.dispose()
  first.click()
  expect(read).toHaveBeenCalledTimes(1)
})

test('both listener families release detached nodes across repeated owner lifetimes', () => {
  const capture = OBSERVE!.diagnostics.capture()
  const clicked = vi.fn()
  const retained: HTMLButtonElement[] = []
  for (const family of ['fixed', 'current'] as const) {
    for (let index = 0; index < 3; index++) {
      const node = document.createElement('button')
      const lifetime = createRoot((dispose) => ({
        ref:
          family === 'fixed'
            ? nativeEvents<HTMLButtonElement>({ click: clicked })
            : ownedElementEvents({ onClick: clicked }),
        dispose,
      }))
      lifetime.ref(node)
      flush()
      node.click()
      lifetime.dispose()
      retained.push(node)
    }
  }
  expect(clicked).toHaveBeenCalledTimes(6)
  for (const node of retained) node.click()
  expect(clicked).toHaveBeenCalledTimes(6)
  expect(capture.stop()).toEqual([])
})

test('owned props reject unowned setup before reading props and add nothing if disposed before settlement', () => {
  const read = vi.fn(() => false)
  const props = new Proxy({}, { has: read })
  expect(() => ownedElementEvents(props)).toThrow('inside a Solid owner')
  expect(read).not.toHaveBeenCalled()
  const node = document.createElement('button')
  const add = vi.spyOn(node, 'addEventListener')
  const lifetime = createRoot((dispose) => ({
    ref: ownedElementEvents({ onClick: vi.fn() }),
    dispose,
  }))
  lifetime.ref(node)
  lifetime.dispose()
  flush()
  expect(add).not.toHaveBeenCalled()
})
