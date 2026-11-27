import {
  decorationAngles,
  resolveDecorationGeometry,
} from './decorationGeometry'
import type {
  DecorationGeometry,
  DecorationSamples,
} from './decorationGeometry'

/** Elements with a randomized backing. styles/decoration.css transforms the same list. */
export const decoratedSelectors = [
  '.ui-button',
  '.ui-dashboard-navigation a[href]',
  '.ui-dashboard-menu a[href]',
  '.ui-entry-panel-surface',
  '[data-ui-control-surface]',
  '[data-ui-section-decoration]',
  '[data-popper-positioner]:has(> .ui-menu[data-ui-section-decoration])',
] as const

// A menu's positioner owns its backing, so the menu itself is not sampled.
const selector = decoratedSelectors
  .map((item) =>
    item === '[data-ui-section-decoration]' ? `${item}:not(.ui-menu)` : item,
  )
  .join(', ')

const ownerSelector = '[data-ui-theme-owner]'
type ResizeHandler = (entry: ResizeObserverEntry) => void
type Paint = () => void

const observers = new WeakMap<
  Document,
  ReturnType<typeof createDecorationObserver>
>()

function createDecorationObserver(document: Document) {
  const handlers = new Map<Element, ResizeHandler>()
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) handlers.get(entry.target)?.(entry)
  })
  let paints = new Set<Paint>()
  let frame: number | undefined
  let owners = 0
  return {
    retain() {
      owners++
    },
    release() {
      if (--owners !== 0) return
      observer.disconnect()
      observers.delete(document)
    },
    observe(node: Element, handler: ResizeHandler) {
      if (handlers.has(node)) observer.unobserve(node)
      observer.observe(node, { box: 'border-box' })
      handlers.set(node, handler)
    },
    unobserve(node: Element, handler: ResizeHandler) {
      // The new theme can claim a moved node before its old theme releases it.
      if (handlers.get(node) !== handler) return
      handlers.delete(node)
      observer.unobserve(node)
    },
    schedule(paint: Paint) {
      paints.add(paint)
      if (frame !== undefined) return
      // A transformed backing can change scrollable overflow.
      frame = requestAnimationFrame(() => {
        frame = undefined
        const scheduled = paints
        paints = new Set()
        for (const flush of scheduled) flush()
      })
    },
    cancel(paint: Paint) {
      paints.delete(paint)
      if (!paints.size && frame !== undefined) {
        cancelAnimationFrame(frame)
        frame = undefined
      }
    },
  }
}

function observedSize(
  entry: ResizeObserverEntry,
): readonly [number, number] | undefined {
  const border = entry.borderBoxSize?.[0]
  const content = entry.contentBoxSize?.[0]
  if (!border || entry.borderBoxSize.length !== 1 || !content) return
  // Inline elements can report an empty ResizeObserver box.
  if (border.inlineSize === 0 && border.blockSize === 0) return
  const horizontal = content.inlineSize === entry.contentRect.width
  const vertical = content.inlineSize === entry.contentRect.height
  if (horizontal === vertical && border.inlineSize !== border.blockSize) return
  return vertical && !horizontal
    ? [border.blockSize, border.inlineSize]
    : [border.inlineSize, border.blockSize]
}

/** One geometry owner per Theme. Resize keeps the existing random samples. */
export function decorateActions(root: HTMLDivElement) {
  type State = {
    samples: DecorationSamples
    width?: number
    height?: number
    sectionHeight?: number
  }
  const nodes = new Map<HTMLElement, State>()
  const pending = new Set<HTMLElement>()
  let options = resolveDecorationGeometry()
  let alive = true
  const owns = (node: HTMLElement) =>
    root.contains(node) && node.closest(ownerSelector) === root
  const sample = (): DecorationSamples => [
    (Math.random() < 0.5 ? -1 : 1) * (0.125 + Math.random() * 0.875),
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  ]
  const paint = (node: HTMLElement, state: State) => {
    if (node instanceof HTMLFieldSetElement) {
      node.style.setProperty(
        '--ui-section-decoration-height',
        `${state.sectionHeight}px`,
      )
    }
    const angles = decorationAngles(
      state.width ?? 0,
      state.height ?? 0,
      state.samples,
      options,
    )
    node.style.setProperty('--ui-action-angle', `${angles[0].toFixed(4)}deg`)
    node.style.setProperty('--ui-action-taper', `${angles[1].toFixed(4)}deg`)
    node.style.setProperty('--ui-action-taper-y', `${angles[2].toFixed(4)}deg`)
  }
  const document = root.ownerDocument
  const resize =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : (observers.get(document) ?? createDecorationObserver(document))
  if (resize) {
    resize.retain()
    observers.set(document, resize)
  }
  const flush = () => {
    for (const node of pending) {
      const state = nodes.get(node)
      if (state && owns(node)) paint(node, state)
    }
    pending.clear()
  }
  const schedule = (node: HTMLElement) => {
    pending.add(node)
    resize?.schedule(flush)
  }
  const measure = (
    node: HTMLElement,
    state: State,
    entry?: ResizeObserverEntry,
  ) => {
    const size = entry && observedSize(entry)
    // Offset dimensions snap both edges separately. A fractional border-box
    // size cannot tell which integer size those edges produce.
    const width = size && Number.isInteger(size[0]) ? size[0] : node.offsetWidth
    const height =
      size && Number.isInteger(size[1]) ? size[1] : node.offsetHeight
    // The fieldset backing covers the padding box, including the legend.
    const sectionHeight =
      node instanceof HTMLFieldSetElement ? node.clientHeight : undefined
    if (
      width === state.width &&
      height === state.height &&
      sectionHeight === state.sectionHeight
    )
      return false
    state.width = width
    state.height = height
    state.sectionHeight = sectionHeight
    return true
  }
  const resized = (entry: ResizeObserverEntry) => {
    const node = entry.target as HTMLElement
    const state = nodes.get(node)
    if (state && owns(node) && measure(node, state, entry)) schedule(node)
  }
  const pin = (node: Element) => {
    if (!(node instanceof HTMLElement) || !owns(node) || nodes.has(node)) return
    const state: State = { samples: sample() }
    nodes.set(node, state)
    if (resize) resize.observe(node, resized)
    else {
      measure(node, state)
      paint(node, state)
    }
  }
  const scan = (node: Element) => {
    if (node.closest(ownerSelector) !== root) return
    if (node.matches(selector)) pin(node)
    if (node.firstElementChild) node.querySelectorAll(selector).forEach(pin)
  }
  const unpin = (node: Element) => {
    if (!(node instanceof HTMLElement) || !nodes.has(node) || owns(node)) return
    resize?.unobserve(node, resized)
    pending.delete(node)
    nodes.delete(node)
  }
  scan(root)
  const observer = new MutationObserver((records) => {
    if (!alive) return
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (!(node instanceof Element) || !nodes.size) continue
        unpin(node)
        if (node.firstElementChild) node.querySelectorAll('*').forEach(unpin)
      }
      for (const node of record.addedNodes)
        if (node instanceof Element) scan(node)
    }
  })
  observer.observe(root, { childList: true, subtree: true })
  const enter = (event: PointerEvent) => {
    if (!alive || !(event.target instanceof Element)) return
    const node = event.target.closest(selector)
    if (!(node instanceof HTMLElement) || !owns(node)) return
    if (
      event.relatedTarget instanceof Node &&
      node.contains(event.relatedTarget)
    )
      return
    pin(node)
    if (
      node.matches(`.ui-button:is(
        [aria-pressed='true'],
        [aria-selected='true'],
        [aria-current='page'],
        [data-ui-active='true']
      )`)
    )
      return
    const state = nodes.get(node)!
    if (!options.randomizeOnHover && resize) return
    if (options.randomizeOnHover) state.samples = sample()
    // ResizeObserver owns geometry. Hover must not synchronously flush layout.
    if (!resize) {
      measure(node, state)
      paint(node, state)
    } else if (state.width || state.height) {
      schedule(node)
    }
  }
  root.addEventListener('pointerover', enter)
  return {
    configure(next: Partial<DecorationGeometry>) {
      if (!alive) return
      options = resolveDecorationGeometry(next)
      for (const [node, state] of nodes) {
        if (!owns(node)) continue
        if (!resize) paint(node, state)
        else if (state.width || state.height) schedule(node)
      }
    },
    dispose() {
      if (!alive) return
      alive = false
      observer.disconnect()
      resize?.cancel(flush)
      pending.clear()
      root.removeEventListener('pointerover', enter)
      for (const node of nodes.keys()) {
        resize?.unobserve(node, resized)
        node.style.removeProperty('--ui-action-angle')
        node.style.removeProperty('--ui-action-taper')
        node.style.removeProperty('--ui-action-taper-y')
        node.style.removeProperty('--ui-section-decoration-height')
      }
      nodes.clear()
      resize?.release()
    },
  }
}
