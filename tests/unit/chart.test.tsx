import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@solidjs/testing-library'
import { createMemo, createSignal, flush, onCleanup } from 'solid-js'
import {
  Chart,
  defineChart,
  lineY,
  scaleLinear,
  tooltip,
} from '@wfe/components/chart'

const definition = () =>
  defineChart({
    marks: [lineY([1, 3, 2])],
    scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
    tooltip,
    maxFocusDistance: 1000,
  })
afterEach(cleanup)

test('updates the existing SVG with accepted definition, dimensions and accessible name', () => {
  const [values, setValues] = createSignal([1, 3, 2])
  const [width, setWidth] = createSignal(480)
  const [label, setLabel] = createSignal('Requests')
  const spec = createMemo(() =>
    defineChart({ ...definition(), marks: [lineY(values())] }),
  )
  const h = render(() => (
    <Chart
      definition={spec()}
      ariaLabel={label()}
      width={width()}
      height={260}
    />
  ))
  flush()
  const svg = h.container.querySelector('svg')!
  const line = svg.querySelector('.ts-chart__line path')!
  expect(svg).not.toBeNull()
  const geometry = line.getAttribute('d')
  setValues([3, 1, 4])
  setLabel('Updated requests')
  setWidth(600)
  flush()
  expect(h.container.querySelector('svg')).toBe(svg)
  expect(svg.querySelector('.ts-chart__line path')).toBe(line)
  expect(svg.getAttribute('aria-label')).toBe('Updated requests')
  expect(svg.getAttribute('viewBox')).toBe('0 0 600 260')
  expect(line.getAttribute('d')).not.toBe(geometry)
})

test('maintains one custom tooltip owner through focused point updates and disposes it', () => {
  let mounts = 0
  const destroy = vi.fn()
  const h = render(() => (
    <Chart
      definition={definition()}
      ariaLabel="Requests"
      width={480}
      height={260}
      renderTooltipBody={(context) => {
        mounts++
        onCleanup(destroy)
        return (
          <div data-custom-tooltip>
            <input aria-label="Tooltip note" />
            {context.defaultBody}
            <span>{context.primaryPoint?.yValue}</span>
          </div>
        )
      }}
    />
  ))
  flush()
  const svg = h.container.querySelector('svg')!
  fireEvent.focusIn(svg)
  fireEvent.keyDown(svg, { key: 'ArrowRight' })
  flush()
  const input = document.querySelector<HTMLInputElement>(
    '[data-custom-tooltip] input',
  )!
  expect(input).not.toBeNull()
  input.value = 'Retained'
  fireEvent.keyDown(svg, { key: 'ArrowRight' })
  flush()
  expect(document.querySelector('[data-custom-tooltip] input')).toBe(input)
  expect(input.value).toBe('Retained')
  expect(mounts).toBe(1)
  h.unmount()
  flush()
  expect(destroy).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[data-custom-tooltip]')).toBeNull()
})

test('disconnects observers and ignores late resize callbacks after disposal', () => {
  const disconnect = vi.fn()
  let resize: ResizeObserverCallback | undefined
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect
    },
  )
  try {
    const rendered = vi.fn()
    const h = render(() => (
      <Chart
        definition={definition()}
        ariaLabel="Requests"
        height={260}
        onRender={rendered}
      />
    ))
    flush()
    h.unmount()
    flush()
    const calls = rendered.mock.calls.length
    expect(disconnect).toHaveBeenCalled()
    resize?.([], {} as ResizeObserver)
    flush()
    expect(rendered).toHaveBeenCalledTimes(calls)
    expect(document.querySelector('svg')).toBeNull()
  } finally {
    vi.unstubAllGlobals()
  }
})

test.each([0, -1, Infinity, Number.NaN])(
  'invalid aspect ratio %s uses a positive fallback and recovers on the same chart',
  (aspectRatio) => {
    const [ratio, setRatio] = createSignal(aspectRatio)
    const h = render(() => (
      <Chart
        definition={definition()}
        ariaLabel="Requests"
        width={480}
        aspectRatio={ratio()}
      />
    ))
    flush()
    const host = h.container.querySelector<HTMLElement>('.ui-chart')!
    const fallbackHeight = Number.parseFloat(host.style.height)
    expect(Number.isFinite(fallbackHeight) && fallbackHeight > 0).toBe(true)
    expect(host.style.aspectRatio).toBe('')
    const svg = h.getByRole('img', { name: 'Requests' })
    const dimensions = svg.getAttribute('viewBox')!.split(/\s+/).map(Number)
    expect(dimensions.every(Number.isFinite)).toBe(true)
    expect(dimensions[2]).toBe(480)
    expect(dimensions[3]).toBeGreaterThan(0)
    const path = svg.querySelector('.ts-chart__line path')!
    const geometry = path.getAttribute('d')
    expect(geometry).toBeTruthy()
    expect(geometry).not.toMatch(/NaN|Infinity/)
    setRatio(2)
    flush()
    expect(h.getByRole('img', { name: 'Requests' }) === svg).toBe(true)
    expect(svg.querySelector('.ts-chart__line path') === path).toBe(true)
    expect(svg.getAttribute('viewBox')).toBe('0 0 480 240')
  },
)

test('replacing a custom tooltip renderer destroys its owner without replacing the SVG', () => {
  const disposedA = vi.fn()
  const disposedB = vi.fn()
  const rendererA = () => {
    onCleanup(disposedA)
    return <span data-renderer="a">A</span>
  }
  const rendererB = () => {
    onCleanup(disposedB)
    return <span data-renderer="b">B</span>
  }
  const [renderer, setRenderer] = createSignal(() => rendererA)
  const h = render(() => (
    <Chart
      definition={definition()}
      ariaLabel="Requests"
      width={480}
      height={260}
      renderTooltipBody={renderer()}
    />
  ))
  flush()
  const svg = h.container.querySelector('svg')!
  fireEvent.focusIn(svg)
  fireEvent.keyDown(svg, { key: 'ArrowRight' })
  flush()
  expect(document.querySelector('[data-renderer="a"]')).not.toBeNull()
  setRenderer(() => rendererB)
  flush()
  expect(h.container.querySelector('svg')).toBe(svg)
  expect(disposedA).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[data-renderer="b"]')).not.toBeNull()
  h.unmount()
  flush()
  expect(disposedB).toHaveBeenCalledTimes(1)
})

test('selection callbacks receive raw records and reactive callback replacements take effect', () => {
  const rows = [
    { x: 0, y: 2 },
    { x: 1, y: 3 },
  ]
  const first = vi.fn()
  const second = vi.fn()
  const [select, setSelect] = createSignal(() => first)
  const spec = defineChart({
    marks: [lineY(rows, { x: 'x', y: 'y' })],
    scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
    tooltip,
  })
  const h = render(() => (
    <Chart
      definition={spec}
      ariaLabel="Requests"
      width={480}
      height={260}
      onSelect={select()}
    />
  ))
  flush()
  const svg = h.container.querySelector('svg')!
  fireEvent.focusIn(svg)
  fireEvent.keyDown(svg, { key: 'ArrowRight' })
  fireEvent.keyDown(svg, { key: 'Enter' })
  flush()
  expect(rows).toContain(first.mock.calls[0]![0].datum)
  const prior = first.mock.calls.length
  setSelect(() => second)
  flush()
  fireEvent.keyDown(svg, { key: 'ArrowRight' })
  fireEvent.keyDown(svg, { key: 'Enter' })
  flush()
  expect(rows).toContain(second.mock.calls[0]![0].datum)
  expect(first).toHaveBeenCalledTimes(prior)
})
