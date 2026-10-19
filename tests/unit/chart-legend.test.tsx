import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { ChartLegend } from '@wfe/components/chart'
afterEach(cleanup)
const initial = [
  {
    id: 'actual',
    label: 'Actual requests',
    color: 'var(--ui-accent)',
    visible: true,
  },
  {
    id: 'planned',
    label: 'Planned requests',
    color: 'var(--ui-accent)',
    visible: false,
  },
]
test('requests visibility changes without accepting rejected application state', () => {
  const request = vi.fn()
  const h = render(() => (
    <ChartLegend
      label="Request series"
      items={initial}
      onVisibilityChange={request}
    />
  ))
  const actual = h.getByRole('button', { name: 'Actual requests' })
  fireEvent.click(actual)
  flush()
  expect(request.mock.calls).toEqual([['actual', false]])
  expect(actual.getAttribute('aria-pressed')).toBe('true')
})
test('preserves button identity and focus across immutable visibility, label and order changes', () => {
  const [items, setItems] = createSignal(initial)
  const h = render(() => (
    <ChartLegend
      label="Request series"
      items={items()}
      onVisibilityChange={(id, visible) =>
        setItems(
          items().map((item) => (item.id === id ? { ...item, visible } : item)),
        )
      }
    />
  ))
  const actual = h.getByRole('button', { name: 'Actual requests' })
  actual.focus()
  fireEvent.click(actual)
  flush()
  expect(actual.getAttribute('aria-pressed')).toBe('false')
  setItems(
    [...items()]
      .reverse()
      .map((item) =>
        item.id === 'actual' ? { ...item, label: 'Accepted requests' } : item,
      ),
  )
  flush()
  expect(h.getByRole('button', { name: 'Accepted requests' })).toBe(actual)
  expect(document.activeElement).toBe(actual)
  expect(h.getAllByRole('button')[1]).toBe(actual)
})
test('uses native disabled buttons and never sends disabled requests', () => {
  const request = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  const h = render(() => (
    <ChartLegend
      label="Request series"
      items={[{ ...initial[0]!, disabled: true }, initial[1]!]}
      disabled={disabled()}
      onVisibilityChange={request}
    />
  ))
  const [actual, planned] = h.getAllByRole('button')
  expect(actual).toHaveProperty('disabled', true)
  fireEvent.click(actual!)
  flush()
  expect(request).not.toHaveBeenCalled()
  setDisabled(true)
  flush()
  expect(planned).toHaveProperty('disabled', true)
  fireEvent.click(planned!)
  flush()
  expect(request).not.toHaveBeenCalled()
})

test('legend line cues preserve the application supplied dash style', () => {
  const h = render(() => (
    <ChartLegend
      label="Request series"
      items={[{ ...initial[0]!, lineStyle: 'dashed' }]}
      onVisibilityChange={() => {}}
    />
  ))
  const swatch = h.container.querySelector<HTMLElement>('[data-line-style]')!
  expect(swatch.dataset.lineStyle).toBe('dashed')
  expect(swatch.style.borderBlockStartStyle).toBe('dashed')
  expect(swatch.style.background).toBe('')
})

test('adds and removes legend items while retaining survivors and the latest callback', () => {
  const first = vi.fn()
  const latest = vi.fn()
  const [items, setItems] = createSignal(initial)
  const [request, setRequest] = createSignal(() => first)
  const h = render(() => (
    <ChartLegend
      label="Request series"
      items={items()}
      onVisibilityChange={request()}
    />
  ))
  const actual = h.getByRole('button', { name: 'Actual requests' })
  const removed = h.getByRole('button', { name: 'Planned requests' })
  actual.focus()
  setRequest(() => latest)
  setItems([
    { ...initial[0]!, label: 'Retained requests' },
    { ...initial[1]!, id: 'new', label: 'New requests' },
  ])
  flush()
  expect(h.getByRole('button', { name: 'Retained requests' })).toBe(actual)
  expect(document.activeElement).toBe(actual)
  expect(removed.isConnected).toBe(false)
  fireEvent.click(actual)
  fireEvent.click(h.getByRole('button', { name: 'New requests' }))
  fireEvent.click(removed)
  flush()
  expect(first).not.toHaveBeenCalled()
  expect(latest.mock.calls).toEqual([
    ['actual', false],
    ['new', true],
  ])
  h.unmount()
  fireEvent.click(actual)
  flush()
  expect(latest).toHaveBeenCalledTimes(2)
})
