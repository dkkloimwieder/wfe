import {
  decorationAngles,
  resolveDecorationGeometry,
} from './decorationGeometry'
import type {
  DecorationGeometry,
  DecorationSamples,
} from './decorationGeometry'

/** One geometry owner per Theme. Resize keeps samples and never changes layout. */
export function decorateActions(root: HTMLDivElement) {
  const selector =
    '.ui-button, .ui-dashboard-navigation a[href], .ui-dashboard-menu a[href], .ui-entry-panel-surface, [data-ui-control-surface], [data-ui-section-decoration]'
  type State = {
    samples: DecorationSamples
    width: number
    height: number
    sectionHeight?: number
  }
  const nodes = new Map<HTMLElement, State>()
  let options = resolveDecorationGeometry()
  let alive = true
  const owns = (node: HTMLElement) =>
    root.contains(node) && node.closest('[data-ui-theme-owner]') === root
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
      state.width,
      state.height,
      state.samples,
      options,
    )
    node.style.setProperty('--ui-action-angle', `${angles[0].toFixed(4)}deg`)
    node.style.setProperty('--ui-action-taper', `${angles[1].toFixed(4)}deg`)
    node.style.setProperty('--ui-action-taper-y', `${angles[2].toFixed(4)}deg`)
  }
  const measure = (node: HTMLElement, state: State) => {
    state.width = node.offsetWidth
    state.height = node.offsetHeight
    if (node instanceof HTMLFieldSetElement)
      state.sectionHeight = node.clientHeight
  }
  const resize =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver((entries) => {
          if (!alive) return
          const pending: [HTMLElement, State][] = []
          for (const entry of entries) {
            const node = entry.target as HTMLElement
            const state = nodes.get(node)
            if (!state || !owns(node)) continue
            measure(node, state)
            pending.push([node, state])
          }
          for (const [node, state] of pending) paint(node, state)
        })
  const pin = (node: Element) => {
    if (!(node instanceof HTMLElement) || !owns(node) || nodes.has(node)) return
    const state: State = { samples: sample(), width: 0, height: 0 }
    nodes.set(node, state)
    if (resize) resize.observe(node, { box: 'border-box' })
    else {
      measure(node, state)
      paint(node, state)
    }
  }
  const scan = (node: Element) => {
    if (node.matches(selector)) pin(node)
    node.querySelectorAll(selector).forEach(pin)
  }
  const prune = () => {
    for (const node of nodes.keys()) {
      if (owns(node)) continue
      resize?.unobserve(node)
      nodes.delete(node)
    }
  }
  scan(root)
  const observer = new MutationObserver((records) => {
    if (!alive) return
    if (records.some((record) => record.removedNodes.length)) prune()
    for (const record of records) {
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
    const state = nodes.get(node)!
    if (options.randomizeOnHover) state.samples = sample()
    measure(node, state)
    paint(node, state)
  }
  root.addEventListener('pointerover', enter)
  return {
    configure(next: Partial<DecorationGeometry>) {
      if (!alive) return
      options = resolveDecorationGeometry(next)
      prune()
      for (const [node, state] of nodes) {
        // Initial measurements arrive before paint through ResizeObserver.
        if (state.width || state.height || !resize) paint(node, state)
      }
    },
    dispose() {
      alive = false
      observer.disconnect()
      resize?.disconnect()
      root.removeEventListener('pointerover', enter)
      nodes.clear()
    },
  }
}
