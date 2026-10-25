import { expect, test, vi } from 'vitest'
import { OBSERVE, createRoot, createSignal, flush } from 'solid-js'
import { Virtualizer } from '../../packages/components/src/vendor/virtual-core/index'
import { createTableVirtualizer } from '@wfe/components/virtual'

test('keyed geometry follows same-count reorder and preserves measured sizes by logical key', () => {
  const capture = OBSERVE!.diagnostics.capture()
  const h = createRoot((dispose) => {
    const [keys, setKeys] = createSignal(['a', 'b', 'c'])
    const virtualizer = createTableVirtualizer({
      mode: 'measured',
      get keys() {
        return keys()
      },
      getScrollElement: () => null,
      estimateSize: () => 30,
      initialRect: { width: 200, height: 100 },
    })
    return { virtualizer, setKeys, dispose }
  })
  flush()
  h.virtualizer.instance.resizeItem(0, 60)
  flush()
  h.setKeys(['c', 'b', 'a'])
  flush()
  expect(h.virtualizer.instance.options.getItemKey(0)).toBe('c')
  expect(h.virtualizer.instance.itemSizeCache.get('a')).toBe(60)
  expect(h.virtualizer.getTotalSize()).toBe(120)
  h.setKeys(['c', 'b'])
  flush()
  expect(h.virtualizer.instance.itemSizeCache.has('a')).toBe(false)
  expect(h.virtualizer.getTotalSize()).toBe(60)
  h.dispose()
  expect(capture.stop()).toEqual([])
})

test('column layout revision clears stale height measurements without changing record keys', () => {
  const h = createRoot((dispose) => {
    const [version, setVersion] = createSignal(0)
    const virtualizer = createTableVirtualizer({
      mode: 'measured',
      keys: ['a', 'b'],
      getScrollElement: () => null,
      estimateSize: () => 30,
      get measurementVersion() {
        return version()
      },
    })
    return { virtualizer, setVersion, dispose }
  })
  flush()
  h.virtualizer.instance.resizeItem(0, 70)
  flush()
  expect(h.virtualizer.getTotalSize()).toBe(100)
  h.setVersion(1)
  flush()
  expect(h.virtualizer.getTotalSize()).toBe(60)
  h.dispose()
})

test('disposal before settlement attaches no DOM observers', () => {
  const element = document.createElement('div')
  const add = vi.spyOn(element, 'addEventListener')
  const dispose = createRoot((dispose) => {
    createTableVirtualizer({
      mode: 'measured',
      keys: ['a'],
      getScrollElement: () => element,
      estimateSize: () => 30,
    })
    return dispose
  })
  dispose()
  flush()
  expect(add).not.toHaveBeenCalled()
})

test('both row modes use the same vendored engine and fixed windows ignore page metadata', () => {
  const getItemKey = vi.fn((index: number) => index)
  const h = createRoot((dispose) => {
    const [page, setPage] = createSignal({ count: 1_000_000, offset: 0 })
    const fixed = createTableVirtualizer({
      mode: 'fixed',
      get count() {
        return page().count
      },
      rowHeight: 32,
      getItemKey,
      getScrollElement: () => null,
      initialRect: { width: 200, height: 600 },
    })
    const measured = createTableVirtualizer({
      mode: 'measured',
      keys: ['a', 'b'],
      estimateSize: () => 30,
      getScrollElement: () => null,
      initialRect: { width: 200, height: 600 },
    })
    return { fixed, measured, setPage, dispose }
  })
  flush()
  expect(h.fixed.instance).toBeInstanceOf(Virtualizer)
  expect(h.measured.instance).toBeInstanceOf(Virtualizer)
  expect(h.fixed.getTotalSize()).toBe(32_000_000)
  expect(h.fixed.getKeys().length).toBeLessThan(30)
  expect(getItemKey.mock.calls.length).toBeLessThan(100)
  expect(h.fixed.instance.itemSizeCache.size).toBe(0)
  expect(Object.keys(h.fixed.instance.measurementsCache)).toEqual([])
  const keys = h.fixed.getKeys()
  const calls = getItemKey.mock.calls.length
  h.setPage({ count: 1_000_000, offset: 500_000 })
  flush()
  expect(h.fixed.getKeys()).toBe(keys)
  expect(getItemKey.mock.calls.length).toBe(calls)
  h.measured.instance.resizeItem(0, 60)
  flush()
  expect(h.measured.getTotalSize()).toBe(90)
  h.dispose()
})

test('fixed geometry supports distant ranges, header offsets, overscan, and count changes', () => {
  const key = vi.fn((index: number) => index)
  const estimate = vi.fn(() => {
    throw new Error('Fixed rows must not be estimated individually')
  })
  const options = {
    count: 1_000_000,
    fixedItemSize: 40,
    getItemKey: key,
    estimateSize: estimate,
    initialOffset: 500_000 * 40 + 100,
    scrollMargin: 100,
    initialRect: { width: 200, height: 120 },
    overscan: 2,
    getScrollElement: () => null,
    observeElementRect: () => {},
    observeElementOffset: () => {},
    scrollToFn: () => {},
  }
  const instance = new Virtualizer<HTMLElement, HTMLElement>(options)
  const items = instance.getVirtualItems()
  expect(items[0]!.index).toBe(499998)
  expect(items.some((item) => item.index === 500000)).toBe(true)
  expect(items.length).toBeLessThan(10)
  expect(items[0]!.start).toBe(499998 * 40 + 100)
  expect(instance.getTotalSize()).toBe(40_000_000)
  expect(instance.getVirtualItemForOffset(750000 * 40 + 100)?.index).toBe(
    750000,
  )
  expect(key.mock.calls.length).toBeLessThan(100)
  expect(estimate).not.toHaveBeenCalled()
  instance.resizeItem(500000, 999)
  const element = document.createElement('div')
  element.dataset.index = '500000'
  instance.measureElement(element)
  expect(instance.elementsCache.size).toBe(0)
  expect(instance.itemSizeCache.size).toBe(0)
  expect(instance.getTotalSize()).toBe(40_000_000)
  instance.setOptions({ ...options, count: 2, initialOffset: 0 })
  expect(instance.getTotalSize()).toBe(80)
  expect(instance.measurementsCache[1]!.end).toBe(180)
  instance.setOptions({ ...options, count: 0 })
  expect(instance.getTotalSize()).toBe(0)
  expect(instance.getVirtualItems()).toEqual([])
  for (const fixedItemSize of [0, -1, NaN, Infinity]) {
    expect(() => instance.setOptions({ ...options, fixedItemSize })).toThrow(
      'Fixed item size',
    )
  }
  expect(() => instance.setOptions({ ...options, lanes: 2 })).toThrow(
    'one lane',
  )
})

for (const mode of ['fixed', 'measured'] as const) {
  for (const action of [
    'key',
    'index',
    'invalid',
    'none',
    'dispose',
  ] as const) {
    test(`${mode} queued anchor restoration respects ${action} navigation`, () => {
      const frames = new Map<number, FrameRequestCallback>()
      let sequence = 0
      vi.stubGlobal(
        'requestAnimationFrame',
        (callback: FrameRequestCallback) => {
          frames.set(++sequence, callback)
          return sequence
        },
      )
      vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
      const h = createRoot((dispose) => {
        const [margin, setMargin] = createSignal(0)
        const virtualizer = createTableVirtualizer({
          ...(mode === 'fixed'
            ? {
                mode,
                count: 1000,
                rowHeight: 32,
                getItemKey: (index: number) => `r${index}`,
                getIndexForKey: (key: string) =>
                  key === 'r500' ? 500 : undefined,
              }
            : {
                mode,
                keys: Array.from({ length: 1000 }, (_, index) => `r${index}`),
                estimateSize: () => 32,
              }),
          getScrollElement: () => null,
          initialRect: { width: 200, height: 100 },
          get scrollMargin() {
            return margin()
          },
        })
        return { virtualizer, setMargin, dispose }
      })
      try {
        flush()
        const restore = vi.spyOn(h.virtualizer.instance, 'scrollToOffset')
        const navigate = vi.spyOn(h.virtualizer.instance, 'scrollToIndex')
        h.setMargin(24)
        flush()
        expect(frames.size).toBe(1)
        if (action === 'key')
          expect(h.virtualizer.scrollToKey('r500')).toBe(true)
        if (action === 'index') h.virtualizer.scrollToIndex(500)
        if (action === 'invalid')
          expect(h.virtualizer.scrollToKey('missing')).toBe(false)
        if (action === 'dispose') h.dispose()
        for (const callback of frames.values()) callback(0)
        if (action === 'key' || action === 'index') {
          expect(navigate).toHaveBeenCalledWith(500, {
            align: action === 'key' ? 'auto' : 'start',
          })
          expect(restore).not.toHaveBeenCalled()
        } else if (action === 'dispose') {
          expect(restore).not.toHaveBeenCalled()
        } else {
          expect(restore).toHaveBeenCalledOnce()
        }
      } finally {
        h.dispose()
        vi.unstubAllGlobals()
      }
    })
  }
}

for (const mode of ['fixed', 'measured'] as const) {
  for (const action of ['key', 'index', 'rounded'] as const) {
    test(`${mode}: ${action} navigation before header update preserves the viewport`, () => {
      const frames = new Map<number, FrameRequestCallback>()
      let sequence = 0
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        frames.set(++sequence, cb)
        return sequence
      })
      vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
      const element = document.createElement('div')
      document.body.append(element)
      Object.defineProperties(element, {
        offsetWidth: { value: 200 },
        offsetHeight: { value: 100 },
        clientHeight: { value: 100 },
        scrollHeight: { value: 32024 },
      })
      // jsdom lacks scrolling. Preserve the browser contract: the DOM offset
      // changes now, while its native scroll event arrives in a later task.
      element.scrollTo = (options: ScrollToOptions | number = {}) => {
        if (typeof options !== 'number')
          element.scrollTop =
            action === 'rounded'
              ? Math.round(options.top ?? element.scrollTop)
              : (options.top ?? element.scrollTop)
      }
      const h = createRoot((dispose) => {
        const [margin, setMargin] = createSignal(0)
        const virtualizer = createTableVirtualizer({
          ...(mode === 'fixed'
            ? {
                mode,
                count: 1000,
                rowHeight: 32.25,
                getItemKey: (index: number) => `r${index}`,
                getIndexForKey: (key: string) => Number(key.slice(1)),
              }
            : {
                mode,
                keys: Array.from({ length: 1000 }, (_, i) => `r${i}`),
                estimateSize: () => 32.25,
              }),
          getScrollElement: () => element,
          get scrollMargin() {
            return margin()
          },
        })
        return { virtualizer, setMargin, dispose }
      })
      try {
        flush()
        expect(h.virtualizer.instance.scrollElement).toBe(element)
        expect(h.virtualizer.instance.scrollOffset).toBe(0)
        const restore = vi.spyOn(h.virtualizer.instance, 'scrollToOffset')
        if (action !== 'index')
          expect(h.virtualizer.scrollToKey('r500')).toBe(true)
        if (action === 'index') h.virtualizer.scrollToIndex(500)
        const target = element.scrollTop
        expect(target).toBeGreaterThan(15000)
        expect(h.virtualizer.instance.scrollOffset).toBe(0)
        if (action === 'rounded') {
          element.dispatchEvent(new Event('scroll'))
          flush()
          expect(h.virtualizer.instance.scrollOffset).not.toBe(
            element.scrollTop,
          )
          expect(
            Math.abs(h.virtualizer.instance.scrollOffset! - element.scrollTop),
          ).toBeLessThan(1.5)
        }
        h.setMargin(24)
        flush()
        // Deliver the actual scroll event before queued anchor restoration.
        element.dispatchEvent(new Event('scroll'))
        flush()
        const callbacks = [...frames.values()]
        frames.clear()
        for (const cb of callbacks) cb(0)

        if (action === 'rounded') {
          expect(element.scrollTop).toBeGreaterThan(15000)
          expect(restore).toHaveBeenCalledOnce()
        } else {
          expect(element.scrollTop).toBeGreaterThan(15000)
          expect(restore).not.toHaveBeenCalled()
        }
      } finally {
        h.dispose()
        element.remove()
        vi.unstubAllGlobals()
      }
    })
  }
}
