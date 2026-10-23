import { afterEach, expect, test, vi } from 'vitest'
import { createContainerLayout } from '../../packages/components/src/internal/containerLayout'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

function fixture(observe = true) {
  const node = document.createElement('div')
  document.body.append(node)
  let width = 2000
  const media: Array<{
    matches: boolean
    notify: (() => void) | undefined
    remove: ReturnType<typeof vi.fn>
  }> = []
  vi.spyOn(node, 'getBoundingClientRect').mockImplementation(
    () => ({ width }) as DOMRect,
  )
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    fontSize: '16px',
  } as CSSStyleDeclaration)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => {
      const query = {
        matches: false,
        notify: undefined as (() => void) | undefined,
        remove: vi.fn(),
      }
      media.push(query)
      return {
        get matches() {
          return query.matches
        },
        addEventListener: (_name: string, listener: () => void) => {
          query.notify = listener
        },
        removeEventListener: query.remove,
      } as unknown as MediaQueryList
    }),
  )
  const changed = vi.fn()
  const layout = createContainerLayout(
    node,
    ['navigation', 'context'],
    observe,
    changed,
  )
  return {
    node,
    media,
    changed,
    layout,
    setWidth: (value: number) => {
      width = value
      layout.measure()
    },
  }
}

test('measured containers enter drawers independently and apply layout before notification', () => {
  const h = fixture()
  h.layout.measure()
  expect(h.changed).toHaveBeenLastCalledWith({
    navigation: false,
    context: false,
  })
  h.setWidth(900)
  expect(h.changed).toHaveBeenLastCalledWith({
    navigation: false,
    context: true,
  })
  h.changed.mockImplementation(() =>
    expect(h.node.hasAttribute('data-navigation-drawer')).toBe(true),
  )
  h.setWidth(500)
  expect(h.changed).toHaveBeenLastCalledWith({
    navigation: true,
    context: true,
  })
  const calls = h.changed.mock.calls.length
  h.layout.measure()
  expect(h.changed).toHaveBeenCalledTimes(calls)
  h.layout.dispose()
})

test('viewport fallback applies without an observer or with a hidden root', () => {
  const h = fixture(false)
  h.setWidth(100)
  expect(h.changed).toHaveBeenLastCalledWith({
    navigation: false,
    context: false,
  })
  h.media[0]!.matches = true
  h.media[0]!.notify?.()
  expect(h.changed).toHaveBeenLastCalledWith({
    navigation: true,
    context: false,
  })
  h.layout.dispose()
})

test('zero-width and detached roots do not retain stale container decisions; disposal removes listeners', () => {
  const h = fixture()
  h.setWidth(500)
  h.setWidth(0)
  expect(h.changed).toHaveBeenLastCalledWith({
    navigation: false,
    context: false,
  })
  h.node.remove()
  const calls = h.changed.mock.calls.length
  h.setWidth(500)
  expect(h.changed).toHaveBeenCalledTimes(calls)
  document.body.append(h.node)
  h.layout.dispose()
  for (const query of h.media) expect(query.remove).toHaveBeenCalledTimes(1)
  h.setWidth(500)
  window.dispatchEvent(new Event('resize'))
  expect(h.changed).toHaveBeenCalledTimes(calls)
})
