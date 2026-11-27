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
  emit(node: Element, width = 100, height = 30, vertical = false) {
    const size = (w: number, h: number) =>
      vertical
        ? { inlineSize: h, blockSize: w }
        : { inlineSize: w, blockSize: h }
    const contentWidth = Math.max(0, width - 2)
    const contentHeight = Math.max(0, height - 2)
    const entry = {
      target: node,
      borderBoxSize: [size(width, height)],
      contentBoxSize: [size(contentWidth, contentHeight)],
      contentRect: new DOMRectReadOnly(0, 0, contentWidth, contentHeight),
      devicePixelContentBoxSize: [],
    }
    this.callback([entry], this)
  }
}
const owners: ReturnType<typeof decorateActions>[] = []
afterEach(() => {
  owners.splice(0).forEach((owner) => owner.dispose())
  document.body.replaceChildren()
  Observer.instances = []
  vi.restoreAllMocks()
  vi.useRealTimers()
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
    const count = random.mock.calls.length
    observer.emit(button, 0, 0)
    observer.emit(button, 400)
    owner.configure({
      taperReduction: 0.7,
      rotationReduction: 1.3,
      randomizeOnHover: false,
    })
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    expect(random).toHaveBeenCalledTimes(count)
    owner.configure({ randomizeOnHover: true })
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    expect(random.mock.calls.length).toBeGreaterThan(count)
  })
  it('uses horizontal and vertical observer sizes without layout reads', () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    })
    const { button, observer, owner } = fixture()
    const width = vi.fn(() => 100)
    const height = vi.fn(() => 30)
    Object.defineProperty(button, 'offsetWidth', { get: width })
    Object.defineProperty(button, 'offsetHeight', { get: height })
    observer.emit(button)
    vi.advanceTimersToNextFrame()
    observer.emit(button, 100, 30, true)
    expect(vi.getTimerCount()).toBe(0)
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    owner.configure({ randomizeOnHover: false })
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    expect(width).not.toHaveBeenCalled()
    expect(height).not.toHaveBeenCalled()
  })
  it('reads the snapped offset only for a fractional dimension', () => {
    const { button, observer } = fixture()
    const width = vi.fn(() => 101)
    const height = vi.fn(() => 30)
    Object.defineProperty(button, 'offsetWidth', { get: width })
    Object.defineProperty(button, 'offsetHeight', { get: height })
    observer.emit(button, 100.25)
    expect(width).toHaveBeenCalledOnce()
    expect(height).not.toHaveBeenCalled()
  })
  it('batches decoration writes after resize delivery and cancels them on disposal', () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    })
    const { button, observer, owner } = fixture()
    const write = vi.spyOn(button.style, 'setProperty')
    observer.emit(button)
    observer.emit(button)
    expect(write).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersToNextFrame()
    expect(write).toHaveBeenCalledTimes(3)
    observer.emit(button)
    expect(vi.getTimerCount()).toBe(0)
    observer.emit(button, 110)
    owner.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('shares one observer and one write frame across themes', () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    })
    const first = fixture(),
      second = fixture()
    expect(Observer.instances).toHaveLength(1)
    first.observer.emit(first.button)
    second.observer.emit(second.button)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersToNextFrame()
    expect(
      first.button.style.getPropertyValue('--ui-action-angle'),
    ).toBeTruthy()
    expect(
      second.button.style.getPropertyValue('--ui-action-angle'),
    ).toBeTruthy()
  })
  it('transfers observation even when the new theme receives mutations first', async () => {
    const first = fixture(),
      second = fixture()
    const observe = vi.spyOn(first.observer, 'observe')
    first.root.append(second.button)
    await tick()
    expect(observe).toHaveBeenCalledWith(second.button, { box: 'border-box' })
    second.owner.dispose()
    expect(first.observer.observed.has(second.button)).toBe(true)
    // Removal must release a previously observed node if its selector changed.
    second.button.className = ''
    second.button.remove()
    await tick()
    expect(first.observer.observed.has(second.button)).toBe(false)
  })
  it('excludes nested owners and stops all work after disposal', async () => {
    const random = vi.spyOn(Math, 'random')
    const outer = fixture(),
      inner = fixture()
    const observe = vi.spyOn(outer.observer, 'observe')
    outer.root.append(inner.root)
    await tick()
    expect(observe).not.toHaveBeenCalled()
    expect(inner.observer.observed.has(inner.button)).toBe(true)
    outer.owner.dispose()
    const count = random.mock.calls.length
    outer.button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    outer.observer.emit(outer.button)
    outer.owner.configure({ rotationReduction: 4 })
    const extra = document.createElement('button')
    extra.className = 'ui-button'
    outer.root.append(extra)
    await tick()
    expect([...outer.observer.observed]).toEqual([inner.button])
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
