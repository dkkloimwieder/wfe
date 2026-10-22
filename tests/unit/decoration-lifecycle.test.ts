import { afterEach, describe, expect, it, vi } from 'vitest'
import { decorateActions } from '../../packages/components/src/theme/decorations'

class Observer {
  static instances: Observer[] = []
  observed = new Set<Element>()
  constructor(private callback: ResizeObserverCallback) {
    Observer.instances.push(this)
  }
  observe(node: Element) {
    this.observed.add(node)
  }
  unobserve(node: Element) {
    this.observed.delete(node)
  }
  disconnect() {
    this.observed.clear()
  }
  emit(node: Element) {
    this.callback(
      [{ target: node } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
}
const owners: ReturnType<typeof decorateActions>[] = []
afterEach(() => {
  owners.splice(0).forEach((owner) => owner.dispose())
  document.body.replaceChildren()
  Observer.instances = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function fixture() {
  vi.stubGlobal('ResizeObserver', Observer)
  const root = document.createElement('div')
  root.dataset.uiThemeOwner = ''
  const button = document.createElement('button')
  button.className = 'ui-button'
  root.append(button)
  document.body.append(root)
  const owner = decorateActions(root)
  owners.push(owner)
  return { root, button, owner, observer: Observer.instances.at(-1)! }
}
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve))
describe('decoration lifecycle', () => {
  it('retains random samples across size, visibility and configuration changes', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.7)
    const { button, owner, observer } = fixture()
    let width = 0
    Object.defineProperty(button, 'offsetWidth', { get: () => width })
    const count = random.mock.calls.length
    observer.emit(button)
    width = 400
    observer.emit(button)
    owner.configure({ taper: 0.7, rotation: 1.3, randomizeOnHover: false })
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    expect(random).toHaveBeenCalledTimes(count)
    owner.configure({ randomizeOnHover: true })
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    expect(random.mock.calls.length).toBeGreaterThan(count)
  })
  it('transfers observation between owners and releases removed nodes', async () => {
    const first = fixture(),
      second = fixture()
    second.root.append(first.button)
    await tick()
    expect(first.observer.observed.has(first.button)).toBe(false)
    expect(second.observer.observed.has(first.button)).toBe(true)
    first.button.remove()
    await tick()
    expect(second.observer.observed.has(first.button)).toBe(false)
  })
  it('excludes nested owners and stops all work after disposal', async () => {
    const random = vi.spyOn(Math, 'random')
    const outer = fixture(),
      inner = fixture()
    outer.root.append(inner.root)
    await tick()
    expect(outer.observer.observed.has(inner.button)).toBe(false)
    expect(inner.observer.observed.has(inner.button)).toBe(true)
    outer.owner.dispose()
    const count = random.mock.calls.length
    outer.button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    outer.observer.emit(outer.button)
    outer.owner.configure({ rotation: 4 })
    const extra = document.createElement('button')
    extra.className = 'ui-button'
    outer.root.append(extra)
    await tick()
    expect(outer.observer.observed.size).toBe(0)
    expect(random).toHaveBeenCalledTimes(count)
  })
  it('keeps controls usable without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const root = document.createElement('div')
    root.dataset.uiThemeOwner = ''
    const button = document.createElement('button')
    button.className = 'ui-button'
    root.append(button)
    document.body.append(root)
    const listener = vi.fn()
    button.addEventListener('click', listener)
    const owner = decorateActions(root)
    owners.push(owner)
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    button.click()
    expect(listener).toHaveBeenCalledOnce()
  })
})
