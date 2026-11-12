/** Existing responsive thresholds, measured in the browser's initial font units. */
export const layoutBreakpoints = {
  navigation: 48,
  context: 64,
  controls: 48,
} as const
export type LayoutRegion = keyof typeof layoutBreakpoints
export type LayoutState = Readonly<Partial<Record<LayoutRegion, boolean>>>

// Nested workspaces share the browser's initial font, independent of themes.
const initialFonts = new WeakMap<
  Document,
  { size: number; owners: number; resize?: Event }
>()

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
  const font = initialFonts.get(doc) ?? { size: 0, owners: 0 }
  initialFonts.set(doc, font)
  font.owners++
  const readInitialFont = (event?: Event) => {
    if (font.size > 0 && (!event || font.resize === event)) {
      initialFont = font.size
      return
    }
    const probe = doc.createElement('span')
    probe.style.cssText = 'all:initial;display:none;font-size:initial'
    doc.documentElement.append(probe)
    initialFont = Number.parseFloat(win.getComputedStyle(probe).fontSize)
    probe.remove()
    font.size = initialFont
    font.resize = event
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
  const resize = (event: Event) => {
    if (!alive) return
    readInitialFont(event)
    measure()
  }
  readInitialFont()
  for (const [, query] of queries) query.addEventListener('change', measure)
  win.addEventListener('resize', resize)
  return {
    measure,
    dispose() {
      if (!alive) return
      alive = false
      if (--font.owners === 0) initialFonts.delete(doc)
      for (const [, query] of queries)
        query.removeEventListener('change', measure)
      win.removeEventListener('resize', resize)
    },
  }
}
