import { expect, test, vi } from 'vitest'
import { render } from '@solidjs/web'
import { OBSERVE, createRoot, flush, onCleanup, onSettled } from 'solid-js'
import { createFixtureDisposal } from '../../examples/shared/fixtureDisposal'

test('fixture disposal reads the current optional release without taking mount ownership', () => {
  let release: (() => void) | undefined
  const dispose = createFixtureDisposal(() => {
    release?.()
  })
  dispose()
  flush()
  const first = vi.fn()
  release = first
  expect(first).not.toHaveBeenCalled()
  dispose()
  flush()
  expect(first).toHaveBeenCalledTimes(1)
  release = undefined
  dispose()
  flush()
  expect(first).toHaveBeenCalledTimes(1)
  const second = vi.fn()
  release = second
  dispose()
  flush()
  expect(second).toHaveBeenCalledTimes(1)
  expect(first).toHaveBeenCalledTimes(1)
})

test('fixture disposal leaves repeated-stop guards and post-disposal work with the caller', () => {
  const order: string[] = []
  const dispose = createFixtureDisposal(() => {
    order.push('root')
  })
  let active = true
  const stop = () => {
    if (!active) return
    active = false
    dispose()
    order.push('release references')
    flush()
    order.push('after flush')
  }
  expect(order).toEqual([])
  stop()
  stop()
  expect(order).toEqual(['root', 'release references', 'after flush'])
})

test('repeated root lifetimes release settled listeners and cleanup exactly once', () => {
  const capture = OBSERVE!.diagnostics.capture()
  const clicked = vi.fn()
  const cleaned = vi.fn()
  const settledCleanup = vi.fn()
  const retained: HTMLButtonElement[] = []
  for (let index = 0; index < 3; index++) {
    const node = document.createElement('button')
    const release = createRoot((end) => {
      onCleanup(cleaned)
      onSettled(() => {
        node.addEventListener('click', clicked)
        return () => {
          node.removeEventListener('click', clicked)
          settledCleanup()
        }
      })
      return end
    })
    flush()
    node.click()
    const dispose = createFixtureDisposal(release)
    dispose()
    flush()
    dispose()
    flush()
    retained.push(node)
  }
  expect(clicked).toHaveBeenCalledTimes(3)
  expect(cleaned).toHaveBeenCalledTimes(3)
  expect(settledCleanup).toHaveBeenCalledTimes(3)
  for (const node of retained) node.click()
  expect(clicked).toHaveBeenCalledTimes(3)
  expect(capture.stop()).toEqual([])
})

test('rendered fixtures retain explicit host clearing after owner disposal', () => {
  const host = document.createElement('div')
  const cleaned = vi.fn()
  document.body.append(host)
  try {
    for (let index = 0; index < 3; index++) {
      const release = render(() => {
        onCleanup(cleaned)
        return <input aria-label="Draft" />
      }, host)
      flush()
      const input = host.querySelector('input')!
      input.value = 'retained draft'
      const dispose = createFixtureDisposal(release)
      dispose()
      flush()
      host.replaceChildren()
      expect(input.isConnected).toBe(false)
      expect(host.childElementCount).toBe(0)
    }
    expect(cleaned).toHaveBeenCalledTimes(3)
  } finally {
    host.remove()
  }
})
