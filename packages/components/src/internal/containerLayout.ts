/** Existing responsive thresholds, measured in the browser's initial font units. */
export const layoutBreakpoints = {
  navigation: 48,
  context: 64,
  controls: 48,
} as const
export type LayoutRegion = keyof typeof layoutBreakpoints
export type LayoutState = Readonly<Partial<Record<LayoutRegion, boolean>>>

/** Own media listeners and attributes; the component reuses its root observer. */
export function createContainerLayout(
  node: HTMLElement,
  regions: readonly LayoutRegion[],
  containerObservation: boolean,
  changed: (state: LayoutState) => void,
) {
  const doc = node.ownerDocument
  const win = doc.defaultView!
  const queries = regions.map(
    (region) =>
      [
        region,
        win.matchMedia(`(width < ${layoutBreakpoints[region]}rem)`),
      ] as const,
  )
  let alive = true
  let initialFont = 0
  let previous: LayoutState = {}
  const readInitialFont = () => {
    const probe = doc.createElement('span')
    probe.style.cssText =
      'all:initial;position:absolute;visibility:hidden;pointer-events:none;font-size:initial'
    doc.documentElement.append(probe)
    initialFont = Number.parseFloat(win.getComputedStyle(probe).fontSize)
    probe.remove()
  }
  const measure = () => {
    if (!alive || !node.isConnected) return
    const width = containerObservation ? node.getBoundingClientRect().width : 0
    const state: Partial<Record<LayoutRegion, boolean>> = {}
    let different = false
    for (const [region, query] of queries) {
      const narrow =
        query.matches ||
        (width > 0 &&
          initialFont > 0 &&
          width < initialFont * layoutBreakpoints[region])
      state[region] = narrow
      different ||= previous[region] !== narrow
      // Apply layout before moving focus out of a pane that has become hidden.
      node.toggleAttribute(`data-${region}-drawer`, narrow)
    }
    if (!node.hasAttribute('data-ui-responsive-ready'))
      node.setAttribute('data-ui-responsive-ready', '')
    if (different) {
      previous = state
      changed(state)
    }
  }
  const resize = () => {
    if (!alive) return
    readInitialFont()
    measure()
  }
  readInitialFont()
  for (const [, query] of queries) query.addEventListener('change', measure)
  win.addEventListener('resize', resize)
  return {
    measure,
    dispose() {
      alive = false
      for (const [, query] of queries)
        query.removeEventListener('change', measure)
      win.removeEventListener('resize', resize)
    },
  }
}
